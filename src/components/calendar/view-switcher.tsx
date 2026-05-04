"use client";

export type CalendarView = "gantt" | "week" | "day";
export type MobileTab = "today" | "tomorrow" | "week";

interface ViewSwitcherProps {
  currentView: CalendarView;
  onViewChange: (view: CalendarView) => void;
}

const DESKTOP_VIEWS: { id: CalendarView; label: string }[] = [
  { id: "gantt", label: "Gantt" },
  { id: "week", label: "Semana" },
  { id: "day", label: "Dia" },
];

export function ViewSwitcher({ currentView, onViewChange }: ViewSwitcherProps) {
  return (
    <div className="hidden lg:inline-flex rounded-xl border border-zinc-200 bg-[var(--color-surface-bg)] p-1 shadow-[var(--shadow-xs)]">
      {DESKTOP_VIEWS.map((view) => (
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

interface MobileTabsProps {
  currentTab: MobileTab;
  onTabChange: (tab: MobileTab) => void;
}

const MOBILE_TABS: { id: MobileTab; label: string }[] = [
  { id: "today", label: "Hoje" },
  { id: "tomorrow", label: "Amanhã" },
  { id: "week", label: "Esta semana" },
];

export function MobileCalendarTabs({
  currentTab,
  onTabChange,
}: MobileTabsProps) {
  return (
    <div
      className="lg:hidden flex w-full rounded-xl border border-zinc-200 bg-[var(--color-surface-bg)] p-1 shadow-[var(--shadow-xs)]"
      role="tablist"
      aria-label="Vista do calendário"
    >
      {MOBILE_TABS.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={currentTab === tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 px-3 py-2 text-sm font-semibold rounded-[var(--radius-md)] transition-all duration-150 min-h-[44px] ${
            currentTab === tab.id
              ? "bg-[var(--color-brand-600)] text-white shadow-[var(--shadow-sm)]"
              : "text-zinc-500 hover:text-zinc-700 hover:bg-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
