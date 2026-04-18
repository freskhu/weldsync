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
  backlog: { bar: "#94a3b8", badge: "bg-slate-100", badgeText: "text-slate-600" },
  programmed: { bar: "#6366f1", badge: "bg-indigo-100", badgeText: "text-indigo-700" },
  allocated: { bar: "#a855f7", badge: "bg-purple-100", badgeText: "text-purple-700" },
  in_production: { bar: "#f59e0b", badge: "bg-amber-100", badgeText: "text-amber-700" },
  completed: { bar: "#22c55e", badge: "bg-emerald-100", badgeText: "text-emerald-700" },
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
      className={`flex flex-col min-w-[250px] w-[250px] md:min-w-[280px] md:w-[280px] bg-slate-50/80 rounded-[14px] transition-all duration-150 flex-shrink-0 ${
        isOver ? "bg-blue-50 ring-2 ring-blue-300 shadow-md" : ""
      }`}
    >
      {/* Color bar */}
      <div className="h-1.5 rounded-t-[14px]" style={{ backgroundColor: colors.bar }} />
      <div className="flex items-center justify-between px-4 py-3">
        <h2 className="text-sm font-bold text-slate-800">{label}</h2>
        <span className={`text-[11px] font-bold ${colors.badge} ${colors.badgeText} rounded-full px-2.5 py-0.5`}>
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-2">{children}</div>
    </div>
  );
}
