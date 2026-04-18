"use client";

import { useDraggable } from "@dnd-kit/core";
import type { Piece } from "@/lib/types";

interface PieceCardProps {
  piece: Piece;
  projectName: string;
  projectColor: string;
  robotName: string | null;
  isDragging?: boolean;
  isOverlay?: boolean;
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
}: PieceCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: piece.id,
  });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  const deadlineInfo = getDeadlineInfo(piece.scheduled_date);

  return (
    <div
      ref={!isOverlay ? setNodeRef : undefined}
      style={style}
      {...(!isOverlay ? { ...listeners, ...attributes } : {})}
      className={`
        relative bg-[var(--color-surface-card)] rounded-xl
        cursor-grab active:cursor-grabbing
        min-h-[44px] touch-manipulation select-none
        transition-all duration-150
        ${isDragging ? "opacity-30" : ""}
        ${isOverlay ? "shadow-xl ring-2 ring-[var(--color-brand-400)] rotate-2" : "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"}
      `}
    >
      {/* Left border colored by project */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: projectColor }}
      />

      <div className="pl-4 pr-3 py-3">
        {/* Row 1: Reference + urgency + program status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-zinc-900 truncate">
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

        {/* Row 2: Project name */}
        <p className="text-xs text-zinc-500 truncate mt-0.5">{projectName}</p>

        {/* Row 3: Metadata pills */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {robotName && (
            <span className="inline-flex items-center text-[10px] font-medium bg-[var(--color-status-allocated-bg)] text-[var(--color-status-allocated-text)] rounded-full px-2 py-0.5 truncate max-w-[120px]">
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
