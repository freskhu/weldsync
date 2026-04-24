"use client";

import { useActionState, useState } from "react";
import {
  updatePlanningWindowAction,
  type PlanningWindowActionState,
} from "@/app/actions/planning-window-actions";
import type { PlanningWindow } from "@/lib/types";

interface PlanningWindowBarProps {
  window: PlanningWindow | null;
}

/**
 * Inline editor for the active planning window.
 *
 * Behaviour:
 * - When collapsed: shows "Janela: <start> - <end>" + "Editar" button.
 * - When editing: two native date inputs + optional label + Guardar/Cancelar.
 * - Server-action validation via useActionState; errors render inline.
 * - If no active window exists (migration not applied), shows a banner.
 *
 * Note: `editing` is derived — if the last action succeeded, collapse the
 * editor. This avoids a setState-in-effect anti-pattern and is compatible
 * with the Next.js strict-mode lint rules.
 */
export function PlanningWindowBar({ window }: PlanningWindowBarProps) {
  const [userWantsEdit, setUserWantsEdit] = useState(false);
  const [state, formAction, isPending] = useActionState<
    PlanningWindowActionState,
    FormData
  >(updatePlanningWindowAction, null);

  // Collapse automatically after a successful save. The `userWantsEdit` flag
  // is reset by the button handlers, so opening the editor again works
  // normally even after the revalidated data arrives.
  const editing = userWantsEdit && !state?.success;

  if (!window) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-900 shadow-[var(--shadow-xs)]">
        <span className="font-semibold">Sem janela de planeamento activa.</span>
        <span className="text-amber-800">
          Aplica a migration <code className="px-1 rounded bg-amber-100">00005_create_planning_window.sql</code> no Supabase para activar o horizonte.
        </span>
      </div>
    );
  }

  const formatDisplay = (iso: string) => {
    // Render "dd/mm/yyyy" for readability without bringing a date-fns dep.
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 rounded-xl border border-zinc-200 bg-[var(--color-surface-card)] shadow-[var(--shadow-xs)]">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
          Janela
        </span>
        {!editing ? (
          <>
            <span className="font-semibold text-zinc-900">
              {formatDisplay(window.start_date)}
            </span>
            <span className="text-zinc-400">—</span>
            <span className="font-semibold text-zinc-900">
              {formatDisplay(window.end_date)}
            </span>
            {window.label && (
              <span className="ml-2 inline-flex items-center text-[10px] text-zinc-500 bg-zinc-100 rounded-full px-2 py-0.5 font-medium">
                {window.label}
              </span>
            )}
          </>
        ) : null}
      </div>

      {!editing ? (
        <button
          type="button"
          onClick={() => setUserWantsEdit(true)}
          className="ml-auto px-3.5 py-1.5 text-xs font-semibold bg-[var(--color-brand-600)] text-white rounded-lg hover:bg-[var(--color-brand-700)] transition-colors min-h-[36px] shadow-[var(--shadow-xs)]"
        >
          Editar
        </button>
      ) : (
        <form
          action={formAction}
          className="flex flex-wrap items-end gap-3 w-full"
        >
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Início
            </label>
            <input
              type="date"
              name="start_date"
              defaultValue={window.start_date}
              required
              className="px-3 py-2 rounded-lg border border-zinc-300 text-sm min-h-[40px] focus:ring-2 focus:ring-[var(--color-brand-400)] focus:outline-none"
            />
            {state?.fieldErrors?.start_date && (
              <span className="text-[11px] text-red-600 font-medium">
                {state.fieldErrors.start_date[0]}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Fim
            </label>
            <input
              type="date"
              name="end_date"
              defaultValue={window.end_date}
              required
              className="px-3 py-2 rounded-lg border border-zinc-300 text-sm min-h-[40px] focus:ring-2 focus:ring-[var(--color-brand-400)] focus:outline-none"
            />
            {state?.fieldErrors?.end_date && (
              <span className="text-[11px] text-red-600 font-medium">
                {state.fieldErrors.end_date[0]}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
            <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
              Etiqueta (opcional)
            </label>
            <input
              type="text"
              name="label"
              defaultValue={window.label ?? ""}
              placeholder="Ex: Sprint Abril"
              maxLength={100}
              className="px-3 py-2 rounded-lg border border-zinc-300 text-sm min-h-[40px] focus:ring-2 focus:ring-[var(--color-brand-400)] focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm font-semibold bg-[var(--color-brand-600)] text-white rounded-lg hover:bg-[var(--color-brand-700)] transition-colors min-h-[40px] shadow-[var(--shadow-xs)] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? "A guardar..." : "Guardar"}
            </button>
            <button
              type="button"
              onClick={() => setUserWantsEdit(false)}
              disabled={isPending}
              className="px-4 py-2 text-sm font-medium bg-white border border-zinc-300 text-zinc-700 rounded-lg hover:bg-zinc-50 transition-colors min-h-[40px]"
            >
              Cancelar
            </button>
          </div>

          {state?.error && (
            <div className="w-full px-3 py-2 rounded-lg text-xs font-medium bg-red-50 text-red-800 border border-red-200">
              {state.error}
            </div>
          )}
        </form>
      )}
    </div>
  );
}
