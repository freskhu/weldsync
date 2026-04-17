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

export function KanbanColumn({
  id,
  label,
  count,
  isOver,
  children,
}: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[240px] w-[240px] md:min-w-[280px] md:w-[280px] bg-zinc-100 rounded-xl transition-colors flex-shrink-0 ${
        isOver ? "bg-blue-50 ring-2 ring-blue-300" : ""
      }`}
    >
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200">
        <h2 className="text-sm font-semibold text-zinc-700">{label}</h2>
        <span className="text-xs font-medium text-zinc-500 bg-zinc-200 rounded-full px-2 py-0.5">
          {count}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">{children}</div>
    </div>
  );
}
