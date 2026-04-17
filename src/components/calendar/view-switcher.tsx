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
    <div className="inline-flex rounded-lg border border-zinc-200 bg-zinc-50 p-0.5">
      {VIEWS.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors min-h-[44px] ${
            currentView === view.id
              ? "bg-white text-zinc-900 shadow-sm"
              : "text-zinc-500 hover:text-zinc-700"
          }`}
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
