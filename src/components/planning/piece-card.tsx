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

  if (diffDays < 0) return { label, color: "text-red-600" };
  if (diffDays <= 7) return { label, color: "text-orange-500" };
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
        relative bg-white rounded-lg shadow-sm border border-zinc-200
        cursor-grab active:cursor-grabbing
        min-h-[44px] touch-manipulation select-none
        transition-shadow
        ${isDragging ? "opacity-30" : ""}
        ${isOverlay ? "shadow-lg ring-2 ring-blue-400 rotate-2" : "hover:shadow-md"}
      `}
    >
      {/* Left border colored by project */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: projectColor }}
      />

      <div className="pl-4 pr-3 py-2.5">
        {/* Row 1: Reference + urgency */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-bold text-zinc-900 truncate">
            {piece.reference}
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {piece.urgent && (
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" title="Urgente" />
            )}
            {piece.program_id ? (
              <span className="text-green-600 text-xs" title="Programa atribuído">
                &#10003;
              </span>
            ) : (
              <span className="text-zinc-300 text-xs" title="Sem programa">
                &#8212;
              </span>
            )}
          </div>
        </div>

        {/* Row 2: Project name */}
        <p className="text-xs text-zinc-500 truncate mt-0.5">{projectName}</p>

        {/* Row 3: Metadata pills */}
        <div className="flex flex-wrap items-center gap-1.5 mt-2">
          {robotName && (
            <span className="inline-flex items-center text-[10px] font-medium bg-indigo-50 text-indigo-700 rounded-full px-2 py-0.5 truncate max-w-[120px]">
              {robotName}
            </span>
          )}
          {deadlineInfo && (
            <span className={`text-[10px] font-medium ${deadlineInfo.color}`}>
              {deadlineInfo.label}
            </span>
          )}
          {piece.estimated_hours != null && (
            <span className="text-[10px] text-zinc-400">
              {piece.estimated_hours}h
            </span>
          )}
          {piece.quantity > 1 && (
            <span className="text-[10px] text-zinc-400">
              x{piece.quantity}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
