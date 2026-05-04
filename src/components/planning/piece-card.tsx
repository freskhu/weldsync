"use client";

import { useDraggable } from "@dnd-kit/core";
import { Trash2 } from "lucide-react";
import type { Piece } from "@/lib/types";
import {
  deletePieceAction,
  markPieceAsManualWeldAction,
} from "@/app/actions/piece-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";

interface PieceCardProps {
  piece: Piece;
  projectName: string;
  projectColor: string;
  robotName: string | null;
  isDragging?: boolean;
  isOverlay?: boolean;
  /** Called after the piece is successfully deleted on the server. */
  onDeleted?: (pieceId: string) => void;
  /** Show ▲▼ priority arrows. True only on the "planned" column. */
  showReorderArrows?: boolean;
  /** Disable ▲ at the top of the column. */
  canMoveUp?: boolean;
  /** Disable ▼ at the bottom of the column. */
  canMoveDown?: boolean;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  /** Display name of the user who last changed the piece status. */
  changedByName?: string | null;
}

function getDeadlineInfo(deadline: string | null): {
  label: string;
  color: string;
} | null {
  if (!deadline) return null;
  const now = new Date();
  const dl = new Date(deadline);
  const diffMs = dl.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  const label = dl.toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
  });

  if (diffDays < 0) return { label, color: "text-[var(--color-danger-text)]" };
  if (diffDays <= 7) return { label, color: "text-[var(--color-warning-text)]" };
  return { label, color: "text-zinc-500" };
}

export function PieceCard({
  piece,
  projectName,
  projectColor,
  robotName,
  isDragging = false,
  isOverlay = false,
  onDeleted,
  showReorderArrows = false,
  canMoveUp = false,
  canMoveDown = false,
  onMoveUp,
  onMoveDown,
  changedByName,
}: PieceCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: piece.id,
  });
  const confirm = useConfirm();

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const deadlineInfo = getDeadlineInfo(piece.scheduled_date);

  async function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    // Prevent dnd-kit from interpreting this as the start of a drag.
    e.stopPropagation();
    e.preventDefault();
    if (isOverlay) return;
    // The dialog has its own busy + inline error state, so we open it
    // directly. Wrapping confirm() in a React 19 transition would batch the
    // dialog's setState until the transition resolves — and the transition
    // only resolves when the user clicks a button on the dialog that never
    // rendered. Classic deadlock; do NOT use startTransition here.
    //
    // Manual-weld escape hatch: when the piece is already planned or
    // programmed, the shop floor sometimes decides to weld by hand. Show a
    // 3rd button so the planner doesn't have to delete-then-recreate the
    // piece (which would lose history). The server action validates the
    // status transition; we only gate the UI affordance here.
    const offerManualWeld =
      piece.status === "planned" || piece.status === "programmed";

    await confirm({
      title: "Eliminar peça",
      description: `Eliminar peça "${piece.reference}" definitivamente? Esta acção não pode ser revertida.`,
      confirmLabel: "Eliminar",
      cancelLabel: "Cancelar",
      tone: "destructive",
      onConfirm: async () => {
        const fd = new FormData();
        fd.set("id", piece.id);
        fd.set("project_id", piece.project_id);
        const result = await deletePieceAction(fd);
        if (!result.success) {
          // Throw so the dialog stays open and renders the error inline.
          throw new Error(result.error ?? "Erro desconhecido.");
        }
        onDeleted?.(piece.id);
      },
      alternate: offerManualWeld
        ? {
            label: "Soldar à mão",
            tone: "default",
            onAction: async () => {
              const result = await markPieceAsManualWeldAction(piece.id);
              if (!result.success) {
                throw new Error(result.error ?? "Erro desconhecido.");
              }
              // Treat as a "removal" from the current view: the piece is
              // no longer planned/programmed and parent kanban filters by
              // those statuses. Keeps optimistic UI consistent.
              onDeleted?.(piece.id);
            },
          }
        : undefined,
    });
  }

  function handleDeletePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // Stop pointer events from bubbling to the draggable wrapper. Without
    // this the dnd-kit MouseSensor swallows the click before it lands.
    e.stopPropagation();
  }

  function handleReorderClick(
    e: React.MouseEvent<HTMLButtonElement>,
    direction: "up" | "down"
  ) {
    e.stopPropagation();
    e.preventDefault();
    if (isOverlay) return;
    if (direction === "up") {
      onMoveUp?.();
    } else {
      onMoveDown?.();
    }
  }

  function handleReorderPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // Same reason as the delete button: keep dnd-kit's MouseSensor from
    // hijacking the click. Without this the arrow tap starts a drag instead.
    // stopPropagation on both bubble and capture phase to be safe — dnd-kit's
    // listener is attached on the parent, so capture-phase guarantees we
    // beat it.
    e.stopPropagation();
  }

  // Mouse/touch start handlers attached to the wrapper around the arrows.
  // Capture phase ensures dnd-kit (which listens on the draggable parent in
  // the bubble phase via React synthetic events) never sees the event.
  function stopDndPointerDown(e: React.PointerEvent | React.MouseEvent | React.TouchEvent) {
    e.stopPropagation();
  }

  // Footer shown on planned cards: who last moved the status and when.
  // Fallback to updated_at when last_status_change_at is null (e.g. piece
  // was moved by an action that pre-dates the audit feature, or the audit
  // stamp failed to persist for whatever reason). Better to show the
  // best-known timestamp than to render an empty footer.
  const auditTimestamp =
    piece.last_status_change_at ?? piece.updated_at ?? null;
  const showAuditFooter =
    piece.status === "planned" && !isOverlay && !!auditTimestamp;
  const auditDate = auditTimestamp
    ? new Date(auditTimestamp).toLocaleDateString("pt-PT", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : null;

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={style}
      className={`
        group relative bg-[var(--color-surface-card)] rounded-xl
        min-h-[44px] touch-manipulation select-none
        transition-all duration-150
        ${isDragging ? "opacity-30" : ""}
        ${isOverlay ? "shadow-xl ring-2 ring-[var(--color-brand-400)] rotate-2" : "hover:-translate-y-px hover:shadow-md"}
      `}
    >
      {/* Drag handle — left rail. Only this element binds dnd-kit listeners,
          so tapping the card body never starts a drag (cleaner on iPad than
          long-pressing the whole card). The handle is wide enough (44px) to
          be a comfortable touch target on a shop-floor tablet. */}
      {!isOverlay && (
        <div
          {...listeners}
          {...attributes}
          role="button"
          aria-label={`Arrastar peça ${piece.reference}`}
          tabIndex={0}
          className="absolute left-0 top-0 bottom-0 w-9 md:w-6 flex items-center justify-center cursor-grab active:cursor-grabbing rounded-l-xl hover:bg-zinc-50 active:bg-zinc-100 transition-colors z-[1]"
          title="Arrastar"
        >
          <svg
            className="w-3.5 h-4 text-zinc-400 group-hover:text-zinc-600"
            viewBox="0 0 8 16"
            fill="currentColor"
            aria-hidden="true"
          >
            {/* 2-col x 4-row dot grid — universal "drag me" affordance. */}
            <circle cx="2" cy="2" r="1.2" />
            <circle cx="6" cy="2" r="1.2" />
            <circle cx="2" cy="6" r="1.2" />
            <circle cx="6" cy="6" r="1.2" />
            <circle cx="2" cy="10" r="1.2" />
            <circle cx="6" cy="10" r="1.2" />
            <circle cx="2" cy="14" r="1.2" />
            <circle cx="6" cy="14" r="1.2" />
          </svg>
        </div>
      )}

      {/* Left border colored by project — sits on top of the handle area.
          Pointer-events:none so it doesn't intercept taps on the handle. */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-xl pointer-events-none"
        style={{ backgroundColor: projectColor }}
      />

      {/* Action toolbar — top-right. Reorder arrows (planned column only)
          sit to the LEFT of the delete button. Both stay visible on touch
          devices; arrows use a solid blue chip so they're obvious on iPad
          where there's no hover. The wrapper stops pointer events from
          reaching dnd-kit's listener on the draggable parent (capture phase
          + bubble) so taps register as clicks, not drag starts. */}
      {!isOverlay && (
        <div
          className="absolute top-1 right-1 z-10 flex items-center gap-1"
          onPointerDownCapture={stopDndPointerDown}
          onMouseDownCapture={stopDndPointerDown}
          onTouchStartCapture={stopDndPointerDown}
          // Marker attribute for any future @dnd-kit configuration that
          // wants to skip elements explicitly. Harmless on its own.
          data-no-dnd="true"
        >
          {showReorderArrows && (
            <>
              <button
                type="button"
                onClick={(e) => handleReorderClick(e, "up")}
                onPointerDown={handleReorderPointerDown}
                disabled={!canMoveUp}
                className="w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded-md bg-[var(--color-brand-600,#2563eb)] text-white shadow-sm hover:bg-[var(--color-brand-700,#1d4ed8)] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
                title="Subir prioridade"
                aria-label={`Subir prioridade da peça ${piece.reference}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => handleReorderClick(e, "down")}
                onPointerDown={handleReorderPointerDown}
                disabled={!canMoveDown}
                className="w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded-md bg-[var(--color-brand-600,#2563eb)] text-white shadow-sm hover:bg-[var(--color-brand-700,#1d4ed8)] disabled:bg-zinc-200 disabled:text-zinc-400 disabled:cursor-not-allowed transition-colors"
                title="Descer prioridade"
                aria-label={`Descer prioridade da peça ${piece.reference}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={handleDelete}
            onPointerDown={handleDeletePointerDown}
            className="w-11 h-11 md:w-7 md:h-7 flex items-center justify-center rounded-md text-zinc-400 md:opacity-40 md:group-hover:opacity-100 md:focus:opacity-100 hover:bg-zinc-100 hover:text-[var(--color-danger)] disabled:opacity-50 transition-opacity"
            title="Eliminar peça definitivamente"
            aria-label={`Eliminar peça ${piece.reference}`}
          >
            <Trash2 className="w-3.5 h-3.5" strokeWidth={2.5} />
          </button>
        </div>
      )}

      <div className="pl-11 md:pl-8 pr-3 py-3">
        {/* Row 1: Reference + urgency + program status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[14px] md:text-[12.5px] font-bold tracking-tight font-mono truncate" style={{ color: 'var(--color-ink)' }}>
            {piece.reference}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {piece.urgent && (
              <svg className="w-4 h-4 text-[var(--color-danger)] shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-label="Urgente">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            )}
            {piece.program_id && (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)]" title="Programa atribuido">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Piece description (what we're welding) */}
        {piece.description && (
          <p className="text-[13px] md:text-[12px] font-medium truncate mt-1" style={{ color: 'var(--color-ink)' }}>
            {piece.description}
          </p>
        )}

        {/* Row 3: Project name */}
        <p className="text-[13px] md:text-[11px] truncate mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>{projectName}</p>

        {/* Row 4: Material + Weight */}
        {(piece.material || piece.weight_kg != null) && (
          <div className="flex items-center gap-2 mt-1.5 text-[12px] md:text-[10.5px]" style={{ color: 'var(--color-ink-mute)' }}>
            {piece.material && (
              <span className="truncate">{piece.material}</span>
            )}
            {piece.material && piece.weight_kg != null && <span>·</span>}
            {piece.weight_kg != null && (
              <span className="shrink-0">{piece.weight_kg} kg</span>
            )}
          </div>
        )}

        {/* Row 5: Metadata pills */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t" style={{ borderColor: 'var(--color-line-soft)' }}>
          {robotName && (
            <span className="inline-flex items-center text-[12px] md:text-[10px] font-semibold pill-robot rounded-full px-2 py-0.5 truncate max-w-[120px]">
              {robotName}
            </span>
          )}
          {deadlineInfo && (
            <span className={`inline-flex items-center text-[12px] md:text-[10px] font-medium ${deadlineInfo.color} bg-zinc-50 rounded-full px-2 py-0.5`}>
              {deadlineInfo.label}
            </span>
          )}
          {piece.estimated_hours != null && (
            <span className="inline-flex items-center text-[10px] text-zinc-500 bg-zinc-50 rounded-full px-2 py-0.5">
              {piece.estimated_hours}h
            </span>
          )}
          {piece.quantity > 1 && (
            <span className="inline-flex items-center text-[10px] text-zinc-500 bg-zinc-50 rounded-full px-2 py-0.5">
              x{piece.quantity}
            </span>
          )}
        </div>

        {/* Audit footer — planned column only. Shows who last moved the
            piece and the date of that change. Falls back to "—" when the
            display name is unknown (user deleted, RPC missing, etc). */}
        {showAuditFooter && auditDate && (
          <div
            className="mt-2 pt-1.5 text-[10px] truncate"
            style={{ color: 'var(--color-ink-mute)', borderTop: '1px solid var(--color-line-soft)' }}
            title={`Última mudança de estado por ${changedByName ?? "—"} a ${auditDate}`}
          >
            {changedByName ?? "—"} · {auditDate}
          </div>
        )}
      </div>
    </div>
  );
}
