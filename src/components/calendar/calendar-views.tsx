"use client";

import { useMemo, useState } from "react";
import type { Piece, PlanningWindow, Robot } from "@/lib/types";
import {
  ViewSwitcher,
  MobileCalendarTabs,
  type CalendarView,
  type MobileTab,
} from "./view-switcher";
import { GanttDndChart } from "@/components/gantt/gantt-dnd-chart";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { WeekOverview } from "./week-overview";
import { UnplannedSidebar } from "./unplanned-sidebar";

interface CalendarViewsProps {
  pieces: Piece[];
  robots: Robot[];
  projectMap: Record<
    string,
    { name: string; color: string; client_ref: string }
  >;
  planningWindow: PlanningWindow | null;
}

export function CalendarViews({
  pieces,
  robots,
  projectMap,
  planningWindow,
}: CalendarViewsProps) {
  // Desktop view state (Gantt default)
  const [view, setView] = useState<CalendarView>("gantt");
  // Mobile tab state (Today default)
  const [mobileTab, setMobileTab] = useState<MobileTab>("today");

  const robotMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const r of robots) map[r.id] = r.name;
    return map;
  }, [robots]);

  return (
    <div className="flex flex-col h-full">
      {/* View switchers — desktop and mobile show different controls */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <ViewSwitcher currentView={view} onViewChange={setView} />
        <MobileCalendarTabs
          currentTab={mobileTab}
          onTabChange={setMobileTab}
        />
      </div>

      {/* Mobile views (visible <md — phones). On md+ (iPad portrait and up)
          the desktop views are visible and richer; the unplanned sidebar
          appears as a drawer on md..lg and persistent on lg+. */}
      <div className="flex-1 min-h-0 md:hidden">
        {mobileTab === "today" && (
          <DayView
            key="mobile-today"
            pieces={pieces}
            robots={robots}
            projectMap={projectMap}
            initialDate={new Date()}
          />
        )}
        {mobileTab === "tomorrow" && (
          <DayView
            key="mobile-tomorrow"
            pieces={pieces}
            robots={robots}
            projectMap={projectMap}
            initialDate={addDays(new Date(), 1)}
          />
        )}
        {mobileTab === "week" && (
          <WeekOverview
            pieces={pieces}
            robots={robots}
            projectMap={projectMap}
          />
        )}
      </div>

      {/* Desktop / tablet views (visible md+) */}
      <div className="flex-1 min-h-0 hidden md:block">
        {view === "gantt" && (
          <GanttDndChart
            pieces={pieces}
            robots={robots}
            projectMap={projectMap}
            planningWindow={planningWindow}
            leftSidebar={
              <UnplannedSidebar
                pieces={pieces}
                projectMap={projectMap}
                robotMap={robotMap}
              />
            }
          />
        )}
        {view === "week" && (
          <WeekView
            pieces={pieces}
            robots={robots}
            projectMap={projectMap}
          />
        )}
        {view === "day" && (
          <DayView
            pieces={pieces}
            robots={robots}
            projectMap={projectMap}
          />
        )}
      </div>
    </div>
  );
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}
