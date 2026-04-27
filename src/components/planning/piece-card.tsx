"use client";

import { useTransition } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Piece } from "@/lib/types";
import { deletePieceAction } from "@/app/actions/piece-actions";

interface PieceCardProps {
  piece: Piece;
  projectName: string;
  projectColor: string;
  robotName: string | null;
  isDragging?: boolean;
  isOverlay?: boolean;
  /** Called after the piece is successfully deleted on the server. */
  onDeleted?: (pieceId: string) => void;
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
}: PieceCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: piece.id,
  });
  const [isDeleting, startDeleteTransition] = useTransition();

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const deadlineInfo = getDeadlineInfo(piece.scheduled_date);

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    // Prevent dnd-kit from interpreting this as the start of a drag.
    e.stopPropagation();
    e.preventDefault();
    if (isOverlay) return;
    const ok = window.confirm(
      `Eliminar peça "${piece.reference}" definitivamente? Esta acção não pode ser revertida.`
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", piece.id);
    fd.set("project_id", piece.project_id);
    startDeleteTransition(async () => {
      const result = await deletePieceAction(fd);
      if (!result.success) {
        window.alert(
          `Não foi possível eliminar a peça: ${result.error ?? "erro desconhecido"}`
        );
        return;
      }
      onDeleted?.(piece.id);
    });
  }

  function handleDeletePointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    // Stop pointer events from bubbling to the draggable wrapper. Without
    // this the dnd-kit MouseSensor swallows the click before it lands.
    e.stopPropagation();
  }

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={style}
      {...(!isOverlay ? { ...listeners, ...attributes } : {})}
      className={`
        group relative bg-[var(--color-surface-card)] rounded-xl
        cursor-grab active:cursor-grabbing
        min-h-[44px] touch-manipulation select-none
        transition-all duration-150
        ${isDragging ? "opacity-30" : ""}
        ${isOverlay ? "shadow-xl ring-2 ring-[var(--color-brand-400)] rotate-2" : "hover:-translate-y-px hover:shadow-md"}
      `}
    >
      {/* Left border colored by project */}
      <div
        className="absolute left-0 top-0 bottom-0 w-[4px] rounded-l-xl"
        style={{ backgroundColor: projectColor }}
      />

      {/* Delete button — top-right, opacity bumps on hover/focus.
          Discrete on iPad too: stays at 30% so it's always tappable. */}
      {!isOverlay && (
        <button
          type="button"
          onClick={handleDelete}
          onPointerDown={handleDeletePointerDown}
          disabled={isDeleting}
          className="absolute top-1 right-1 z-10 w-7 h-7 flex items-center justify-center rounded-md text-zinc-400 opacity-30 group-hover:opacity-100 focus:opacity-100 hover:bg-zinc-100 hover:text-[var(--color-danger)] disabled:opacity-50 transition-opacity"
          title="Eliminar peça definitivamente"
          aria-label={`Eliminar peça ${piece.reference}`}
        >
          {isDeleting ? (
            <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.3" />
              <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>
      )}

      <div className="pl-4 pr-3 py-3">
        {/* Row 1: Reference + urgency + program status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[12.5px] font-bold tracking-tight font-mono truncate" style={{ color: 'var(--color-ink)' }}>
            {piece.reference}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {piece.urgent && (
              <svg className="w-4 h-4 text-[var(--color-danger)] shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-label="Urgente">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            )}
            {piece.program_id ? (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--color-success-bg)] text-[var(--color-success-text)]" title="Programa atribuido">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </span>
            ) : (
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-zinc-100 text-zinc-400" title="Sem programa">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Piece description (what we're welding) */}
        {piece.description && (
          <p className="text-[12px] font-medium truncate mt-1" style={{ color: 'var(--color-ink)' }}>
            {piece.description}
          </p>
        )}

        {/* Row 3: Project name */}
        <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--color-ink-soft)' }}>{projectName}</p>

        {/* Row 4: Material + Weight */}
        {(piece.material || piece.weight_kg != null) && (
          <div className="flex items-center gap-2 mt-1.5 text-[10.5px]" style={{ color: 'var(--color-ink-mute)' }}>
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
            <span className="inline-flex items-center text-[10px] font-semibold pill-robot rounded-full px-2 py-0.5 truncate max-w-[120px]">
              {robotName}
            </span>
          )}
          {deadlineInfo && (
            <span className={`inline-flex items-center text-[10px] font-medium ${deadlineInfo.color} bg-zinc-50 rounded-full px-2 py-0.5`}>
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
      </div>
    </div>
  );
}
