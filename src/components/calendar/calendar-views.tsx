"use client";

import { useState } from "react";
import type { Piece, Robot } from "@/lib/types";
import { ViewSwitcher, type CalendarView } from "./view-switcher";
import { GanttDndChart } from "@/components/gantt/gantt-dnd-chart";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";

interface CalendarViewsProps {
  pieces: Piece[];
  robots: Robot[];
  projectMap: Record<string, { name: string; color: string }>;
}

export function CalendarViews({
  pieces,
  robots,
  projectMap,
}: CalendarViewsProps) {
  const [view, setView] = useState<CalendarView>("gantt");

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
