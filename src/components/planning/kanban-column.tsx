"use client";

import { useDroppable } from "@dnd-kit/core";
import type { ReactNode } from "react";

interface KanbanColumnProps {
  id: string;
  label: string;
  count: number;
  isOver: boolean;
  children: ReactNode;
}

const STATUS_COLORS: Record<string, { bar: string; badge: string; badgeText: string }> = {
  backlog: { bar: "var(--color-status-backlog)", badge: "bg-[var(--color-status-backlog-bg)]", badgeText: "text-[var(--color-status-backlog-text)]" },
  planned: { bar: "var(--color-status-planned)", badge: "bg-[var(--color-status-planned-bg)]", badgeText: "text-[var(--color-status-planned-text)]" },
  programmed: { bar: "var(--color-status-programmed)", badge: "bg-[var(--color-status-programmed-bg)]", badgeText: "text-[var(--color-status-programmed-text)]" },
  allocated: { bar: "var(--color-status-allocated)", badge: "bg-[var(--color-status-allocated-bg)]", badgeText: "text-[var(--color-status-allocated-text)]" },
  in_production: { bar: "var(--color-status-production)", badge: "bg-[var(--color-status-production-bg)]", badgeText: "text-[var(--color-status-production-text)]" },
  completed: { bar: "var(--color-status-completed)", badge: "bg-[var(--color-status-completed-bg)]", badgeText: "text-[var(--color-status-completed-text)]" },
};

export function KanbanColumn({
  id,
  label,
  count,
  isOver,
  children,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });
  const colors = STATUS_COLORS[id] ?? STATUS_COLORS.backlog;

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col flex-1 min-w-0 md:flex-none md:min-w-[260px] md:w-[260px] lg:min-w-[280px] lg:w-[280px] bg-[var(--color-surface-bg)] rounded-lg md:rounded-xl transition-all duration-150 md:flex-shrink-0 ${
        isOver ? "bg-[var(--color-brand-50)] ring-2 ring-[var(--color-brand-300)] shadow-[var(--shadow-md)]" : ""
      }`}
    >
      {/* Solid color header. On mobile we go ultra-compact: single-letter label
          + count on a stacked layout so a 4-up column fits a 393px viewport
          without horizontal scroll. */}
      <div
        className="flex items-center justify-between px-1.5 py-1.5 md:px-3.5 md:py-2.5 rounded-t-[8px] md:rounded-t-[10px] text-white font-bold text-[10px] md:text-[13px] tracking-wide gap-1"
        style={{ background: colors.bar }}
      >
        <div className="flex items-center gap-1 md:gap-2 min-w-0">
          <span className="hidden md:inline w-2 h-2 rounded-full bg-white/40 flex-shrink-0" />
          <span className="truncate">{label}</span>
        </div>
        <span className="bg-white/20 text-[10px] md:text-[11px] font-bold px-1.5 md:px-2 py-0.5 rounded-[10px] min-w-[18px] md:min-w-[20px] text-center flex-shrink-0">
          {count}
        </span>
      </div>
      <div
        className="flex-1 overflow-y-auto p-1 md:p-2.5 space-y-1.5 md:space-y-2 border border-t-0 rounded-b-[8px] md:rounded-b-[10px] min-h-[160px]"
        style={{ background: 'rgba(255,255,255,0.55)', borderColor: 'var(--color-line)' }}
      >
        {children}
      </div>
    </div>
  );
}
