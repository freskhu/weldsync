"use client";

import { useState, type ReactNode } from "react";
import { useDroppable } from "@dnd-kit/core";
import type { Piece, PieceStatus } from "@/lib/types";
import { PieceCard } from "./piece-card";

/**
 * Mobile-only kanban replacement. The 4-column horizontal layout used on
 * desktop (kanban-board.tsx) collapses to ~1 visible column on a 393px
 * viewport — drag-across-columns with horizontal auto-scroll is flaky on iOS
 * Safari, and the affordance is invisible to anyone who hasn't seen the
 * desktop version first.
 *
 * Mobile layout: vertical sections, one per status. Each section header is a
 * tap target that collapses/expands the section. The section body is a
 * droppable so users can drag a piece from any section into any other (the
 * shared DndContext lives in kanban-board.tsx).
 *
 * Reorder arrows on planned cards still work (taps stop propagating to
 * dnd-kit's TouchSensor on the draggable parent — see PieceCard).
 */

const STATUS_LABELS: Record<string, string> = {
  backlog: "Backlog",
  planned: "Planeados",
  programmed: "Programada",
  allocated: "Alocados",
  in_production: "Em produção",
  completed: "Finalizados",
};

const STATUS_BARS: Record<string, string> = {
  backlog: "var(--color-status-backlog)",
  planned: "var(--color-status-planned)",
  programmed: "var(--color-status-programmed)",
  allocated: "var(--color-status-allocated)",
  in_production: "var(--color-status-production)",
  completed: "var(--color-status-completed)",
};

interface MobileSectionProps {
  id: PieceStatus;
  count: number;
  isOver: boolean;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
}

function MobileSection({
  id,
  count,
  isOver,
  expanded,
  onToggle,
  children,
}: MobileSectionProps) {
  // Same droppable id as desktop columns — kanban-board's handleDragEnd reads
  // over.id and matches against COLUMNS, so any of the 4 main statuses still
  // works. Other statuses (allocated, in_production) are show-only here; they
  // aren't in the COLUMNS array and would be ignored by handleDragEnd.
  const { setNodeRef } = useDroppable({ id });
  const bar = STATUS_BARS[id] ?? STATUS_BARS.backlog;
  const label = STATUS_LABELS[id] ?? id;

  return (
    <div
      className={`rounded-xl bg-[var(--color-surface-bg)] transition-all duration-150 ${
        isOver
          ? "ring-2 ring-[var(--color-brand-300)] shadow-[var(--shadow-md)]"
          : ""
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 rounded-t-xl text-white font-bold text-[14px] tracking-wide min-h-[48px]"
        style={{ background: bar }}
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <svg
            className={`w-4 h-4 transition-transform ${expanded ? "" : "-rotate-90"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
          {label}
        </div>
        <span className="bg-white/20 text-[12px] font-bold px-2.5 py-0.5 rounded-full min-w-[28px] text-center">
          {count}
        </span>
      </button>
      {/* The droppable wrapper must always exist (even when collapsed) so
          dragging a piece toward this section can still trigger an over event
          and auto-expand. Collapse just hides the children. */}
      <div
        ref={setNodeRef}
        className={`${
          expanded ? "p-2.5 space-y-2 border border-t-0 rounded-b-xl" : "h-0 overflow-hidden"
        }`}
        style={
          expanded
            ? {
                background: "rgba(255,255,255,0.55)",
                borderColor: "var(--color-line)",
                minHeight: count === 0 ? 80 : undefined,
              }
            : undefined
        }
      >
        {expanded && count === 0 && (
          <div className="text-center text-[12px] text-zinc-400 py-4">
            (vazio)
          </div>
        )}
        {expanded && children}
      </div>
    </div>
  );
}

interface MobilePieceListProps {
  /** Pieces grouped by status — same map computed by kanban-board. */
  columnPieces: Record<PieceStatus, Piece[]>;
  projectMap: Record<string, { name: string; color: string }>;
  robotMap: Record<number, string>;
  userMap: Record<string, string>;
  activeId: string | null;
  overId: string | null;
  onDeletePiece: (pieceId: string) => void;
  onReorder: (pieceId: string, direction: "up" | "down") => void;
}

const SECTIONS: PieceStatus[] = [
  "backlog",
  "planned",
  "programmed",
  "completed",
];

export function MobilePieceList({
  columnPieces,
  projectMap,
  robotMap,
  userMap,
  activeId,
  overId,
  onDeletePiece,
  onReorder,
}: MobilePieceListProps) {
  // Default expansion: backlog + planned open (the high-traffic sections),
  // others collapsed to keep the list short on a phone screen. User can
  // toggle.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    backlog: true,
    planned: true,
    programmed: false,
    completed: false,
  });

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="flex-1 overflow-y-auto pb-4 px-1 space-y-3">
      {SECTIONS.map((status) => {
        const list = columnPieces[status];
        return (
          <MobileSection
            key={status}
            id={status}
            count={list.length}
            isOver={overId === status}
            expanded={expanded[status]}
            onToggle={() => toggle(status)}
          >
            {list.map((piece, idx, arr) => {
              const isPlanned = status === "planned";
              const changedByName = piece.last_status_change_by
                ? userMap[piece.last_status_change_by] ?? null
                : null;
              return (
                <PieceCard
                  key={piece.id}
                  piece={piece}
                  projectName={projectMap[piece.project_id]?.name ?? "—"}
                  projectColor={
                    projectMap[piece.project_id]?.color ?? "#6B7280"
                  }
                  robotName={
                    piece.robot_id ? robotMap[piece.robot_id] ?? null : null
                  }
                  isDragging={activeId === piece.id}
                  onDeleted={onDeletePiece}
                  showReorderArrows={isPlanned}
                  canMoveUp={isPlanned && idx > 0}
                  canMoveDown={isPlanned && idx < arr.length - 1}
                  onMoveUp={
                    isPlanned ? () => onReorder(piece.id, "up") : undefined
                  }
                  onMoveDown={
                    isPlanned ? () => onReorder(piece.id, "down") : undefined
                  }
                  changedByName={changedByName}
                />
              );
            })}
          </MobileSection>
        );
      })}
    </div>
  );
}
