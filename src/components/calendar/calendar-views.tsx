"use client";

import { useMemo, useState } from "react";
import type { Piece, PlanningWindow, Robot } from "@/lib/types";
import { ViewSwitcher, type CalendarView } from "./view-switcher";
import { GanttDndChart } from "@/components/gantt/gantt-dnd-chart";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
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
  const [view, setView] = useState<CalendarView>("gantt");

  const robotMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const r of robots) map[r.id] = r.name;
    return map;
  }, [robots]);

  return (
    <div className="flex flex-col h-full">
      {/* View switcher */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <ViewSwitcher currentView={view} onViewChange={setView} />
      </div>

      {/* Active view */}
      <div className="flex-1 min-h-0">
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
