"use client";

export type CalendarView = "gantt" | "week" | "day";

interface ViewSwitcherProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const VIEWS: { id: CalendarView; label: string }[] = [
  { id: "gantt", label: "Gantt" },
  { id: "week", label: "Semana" },
  { id: "day", label: "Dia" },
];

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="inline-flex rounded-xl border border-zinc-200 bg-[var(--color-surface-bg)] p-1 shadow-[var(--shadow-xs)]">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`px-5 py-2 text-sm font-semibold rounded-[var(--radius-md)] transition-all duration-150 min-h-[44px] ${
            currentView === view.id
              ? "bg-[var(--color-brand-600)] text-white shadow-[var(--shadow-sm)]"
              : "text-zinc-500 hover:text-zinc-700 hover:bg-white"
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
