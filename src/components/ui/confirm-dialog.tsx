"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Accessible confirmation dialog for destructive (and other) actions.
 *
 * Why this exists: window.confirm() does not work reliably on iOS PWAs
 * (gets blocked or styled inconsistently), can't show loading state, and
 * can't render branded copy. Shop-floor iPad users were the trigger.
 *
 * Architecture: a single <ConfirmDialogProvider> wraps the app and exposes
 * a `confirm(options)` function via the useConfirm() hook. Callers await
 * the promise and get a boolean result. The async action (e.g. server
 * action) is passed in as `onConfirm` and the dialog stays open with a
 * spinner until it resolves; if it throws, the error is shown inline and
 * the dialog stays open so the user can retry or cancel.
 *
 * Touch targets: minimum 44x44 (Apple HIG / WCAG 2.5.5). Buttons stack on
 * mobile width.
 */

type ConfirmTone = "destructive" | "default";

/**
 * Optional 3rd action ("alternate") shown alongside Confirm + Cancel.
 *
 * Use case: a destructive flow where the user might want a non-destructive
 * alternative (e.g. delete a piece OR mark it as welded by hand). The
 * alternate action runs its own async handler; if it succeeds the dialog
 * closes and `confirm()` resolves to false (since the primary destructive
 * action did NOT happen). The caller can detect alternate-path completion
 * via a side effect inside `onAction` (e.g. router.refresh, optimistic UI).
 */
export interface ConfirmAlternateAction {
  label: string;
  onAction: () => Promise<void> | void;
  /** Tone of the alternate button. Default: "default" (neutral). */
  tone?: ConfirmTone;
}

export interface ConfirmOptions {
  title: string;
  description?: string;
  /** Confirm button label. Default: "Confirmar". */
  confirmLabel?: string;
  /** Cancel button label. Default: "Cancelar". */
  cancelLabel?: string;
  /** Tone of the confirm button. Default: "destructive". */
  tone?: ConfirmTone;
  /**
   * Async action to run when the user confirms. If it throws, the error
   * message is rendered inline and the dialog stays open. If it resolves,
   * the dialog closes and the promise returned by `confirm()` resolves to
   * true. If the user cancels, the promise resolves to false.
   *
   * If omitted, the dialog just resolves with the user's choice and the
   * caller is responsible for the side effect.
   */
  onConfirm?: () => Promise<void> | void;
  /**
   * Optional 3rd action — rendered between Cancel and Confirm. Gives the
   * user a non-destructive alternative without forcing them through a
   * separate menu. Same error-handling contract as `onConfirm`.
   */
  alternate?: ConfirmAlternateAction;
}

interface DialogState extends ConfirmOptions {
  resolve: (value: boolean) => void;
}

interface ConfirmContextValue {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextValue | null>(null);

export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DialogState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Refs for focus management
  const cancelButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        setError(null);
        setBusy(false);
        setState({ ...options, resolve });
      }),
    []
  );

  const close = useCallback(
    (result: boolean) => {
      if (!state) return;
      state.resolve(result);
      setState(null);
      setBusy(false);
      setError(null);
    },
    [state]
  );

  const handleCancel = useCallback(() => {
    if (busy) return;
    close(false);
  }, [busy, close]);

  const handleConfirm = useCallback(async () => {
    if (!state) return;
    if (state.onConfirm) {
      setBusy(true);
      setError(null);
      try {
        await state.onConfirm();
        // Keep the resolve(true) AFTER the action succeeded so the awaiter
        // knows the action ran, not just the click.
        close(true);
      } catch (err) {
        setBusy(false);
        setError(
          err instanceof Error ? err.message : "Erro desconhecido."
        );
      }
    } else {
      close(true);
    }
  }, [state, close]);

  const handleAlternate = useCallback(async () => {
    if (!state || !state.alternate) return;
    setBusy(true);
    setError(null);
    try {
      await state.alternate.onAction();
      // Resolve to false: the primary (destructive) action did NOT run.
      // Callers wanting alternate-path success state should rely on side
      // effects inside onAction (router.refresh, optimistic UI, etc).
      close(false);
    } catch (err) {
      setBusy(false);
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
    }
  }, [state, close]);

  // Open lifecycle: capture previous focus, focus cancel button, lock body
  // scroll, listen for Escape.
  useEffect(() => {
    if (!state) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    // Focus the cancel button by default — it's the safer choice for
    // destructive confirmations (avoids accidental Enter-confirm).
    const t = setTimeout(() => cancelButtonRef.current?.focus(), 0);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (!busy) close(false);
      }
    }
    window.addEventListener("keydown", onKey);

    return () => {
      clearTimeout(t);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = originalOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [state, busy, close]);

  const titleId = useId();
  const descId = useId();

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={state.description ? descId : undefined}
        >
          {/* Backdrop. Tappable only when not busy. */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={handleCancel}
            aria-hidden="true"
          />
          {/* Panel */}
          <div
            className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden"
            // Trap-ish: Tab loops between cancel and confirm because they're
            // the only focusables. We don't bother with a full trap since
            // there's nothing else inside the panel to escape to.
          >
            <div className="px-5 pt-5 pb-3">
              <h2
                id={titleId}
                className="text-base md:text-lg font-semibold text-zinc-900"
              >
                {state.title}
              </h2>
              {state.description && (
                <p
                  id={descId}
                  className="mt-2 text-[14px] md:text-[13px] text-zinc-600 leading-relaxed"
                >
                  {state.description}
                </p>
              )}
              {error && (
                <div
                  role="alert"
                  className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
                >
                  {error}
                </div>
              )}
            </div>

            <div className="px-5 pb-5 pt-2 flex flex-col-reverse sm:flex-row sm:justify-end gap-2 bg-zinc-50/50">
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={handleCancel}
                disabled={busy}
                className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg border border-zinc-300 bg-white text-[14px] font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
              >
                {state.cancelLabel ?? "Cancelar"}
              </button>
              {state.alternate && (
                <button
                  type="button"
                  onClick={handleAlternate}
                  disabled={busy}
                  className={
                    "inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-[14px] font-semibold shadow-sm disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation gap-2 " +
                    ((state.alternate.tone ?? "default") === "destructive"
                      ? "bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
                      : "bg-zinc-900 text-white hover:bg-zinc-800 active:bg-zinc-950")
                  }
                >
                  <span>{state.alternate.label}</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                disabled={busy}
                className={
                  "inline-flex items-center justify-center min-h-[44px] px-4 rounded-lg text-[14px] font-semibold text-white shadow-sm disabled:opacity-60 disabled:cursor-not-allowed touch-manipulation gap-2 " +
                  ((state.tone ?? "destructive") === "destructive"
                    ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                    : "bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950")
                }
                autoFocus={false}
              >
                {busy && (
                  <svg
                    className="animate-spin h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      className="opacity-25"
                    />
                    <path
                      d="M4 12a8 8 0 018-8"
                      stroke="currentColor"
                      strokeWidth="4"
                      strokeLinecap="round"
                      className="opacity-75"
                    />
                  </svg>
                )}
                <span>{state.confirmLabel ?? "Confirmar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): (options: ConfirmOptions) => Promise<boolean> {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error(
      "useConfirm() must be used inside <ConfirmDialogProvider>. Mount it once in the root layout."
    );
  }
  return ctx.confirm;
}
