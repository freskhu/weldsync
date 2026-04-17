"use client";

import Link from "next/link";

interface PipelineCount {
  status: string;
  label: string;
  count: number;
  color: string;
}

interface PipelineCardsProps {
  counts: PipelineCount[];
}

export function PipelineCards({ counts }: PipelineCardsProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-900 mb-4">Pipeline</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {counts.map((item) => (
          <Link
            key={item.status}
            href={`/planning?status=${item.status}`}
            className="group flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white p-3 hover:border-zinc-300 hover:shadow-sm transition-all min-h-[88px]"
          >
            <div
              className="w-2.5 h-2.5 rounded-full mb-2"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-xl font-bold text-zinc-900 leading-none">
              {item.count}
            </span>
            <span className="text-[10px] text-zinc-500 mt-1 text-center leading-tight">
              {item.label}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
