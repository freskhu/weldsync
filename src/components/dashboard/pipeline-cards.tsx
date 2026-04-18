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

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; bgClass: string; textClass: string; borderClass: string }> = {
  backlog: {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" strokeLinecap="round" />
      </svg>
    ),
    bgClass: "bg-slate-50",
    textClass: "text-slate-600",
    borderClass: "border-slate-200",
  },
  programmed: {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    bgClass: "bg-indigo-50",
    textClass: "text-indigo-600",
    borderClass: "border-indigo-200",
  },
  allocated: {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    bgClass: "bg-purple-50",
    textClass: "text-purple-600",
    borderClass: "border-purple-200",
  },
  in_production: {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    bgClass: "bg-amber-50",
    textClass: "text-amber-600",
    borderClass: "border-amber-200",
  },
  completed: {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" strokeLinecap="round" />
        <path d="M22 4L12 14.01l-3-3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    bgClass: "bg-emerald-50",
    textClass: "text-emerald-600",
    borderClass: "border-emerald-200",
  },
};

export function PipelineCards({ counts }: PipelineCardsProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
      {counts.map((item) => {
        const config = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.backlog;
        return (
          <Link
            key={item.status}
            href={`/planning?status=${item.status}`}
            className="group relative flex flex-col bg-white rounded-[14px] p-[18px] hover:-translate-y-0.5 hover:shadow-lg transition-all duration-150 min-h-[100px] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            {/* Left accent bar */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-[14px]"
              style={{ backgroundColor: item.color }}
            />

            <div className="flex items-center gap-2 mb-3">
              <div style={{ color: item.color }}>
                {config.icon}
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-ink-soft)' }}>
                {item.label}
              </span>
            </div>
            <span className="text-[32px] font-extrabold leading-none tracking-tight" style={{ color: 'var(--color-ink)' }}>
              {item.count}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
