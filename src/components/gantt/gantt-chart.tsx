"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Piece, PlanningWindow, Robot } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GanttChartProps {
  pieces: Piece[];
  robots: Robot[];
  projectMap: Record<string, { name: string; color: string }>;
  planningWindow: PlanningWindow | null;
}

interface DayColumn {
  date: string; // YYYY-MM-DD
  label: string; // "Seg 14"
  dayOfWeek: number; // 0=Sun ... 6=Sat
  isToday: boolean;
  isWeekend: boolean;
  isInWindow: boolean;
  weekLabel: string | null; // shown on the first day of each week
}

// ---------------------------------------------------------------------------
// Date helpers
// ---------------------------------------------------------------------------

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_NAMES_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function getMonday(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + n);
  return copy;
}

function isoWeek(d: Date): number {
  const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  tmp.setUTCDate(tmp.getUTCDate() + 4 - (tmp.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function buildDays(
  startMonday: Date,
  weeks: number,
  windowStart: string | null,
  windowEnd: string | null
): DayColumn[] {
  const totalDays = weeks * 7;
  const todayStr = formatDateISO(new Date());
  const days: DayColumn[] = [];

  for (let i = 0; i < totalDays; i++) {
    const d = addDays(startMonday, i);
    const dateStr = formatDateISO(d);
    const dow = d.getDay();
    const isMonday = dow === 1;
    const isInWindow =
      windowStart !== null && windowEnd !== null
        ? dateStr >= windowStart && dateStr <= windowEnd
        : true;
    days.push({
      date: dateStr,
      label: `${DAY_NAMES_PT[dow]} ${d.getDate()}`,
      dayOfWeek: dow,
      isToday: dateStr === todayStr,
      isWeekend: dow === 0 || dow === 6,
      isInWindow,
      weekLabel: isMonday ? `Sem ${isoWeek(d)}` : null,
    });
  }
  return days;
}

/**
 * Weeks needed to cover the planning window starting from the Monday before
 * (or equal to) `windowStart`. Always returns at least `minWeeks`.
 */
function weeksForWindow(
  windowStart: string,
  windowEnd: string,
  minWeeks: number
): number {
  const start = getMonday(new Date(windowStart + "T00:00:00"));
  const end = new Date(windowEnd + "T00:00:00");
  const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  const weeks = Math.ceil(diffDays / 7);
  return Math.max(weeks, minWeeks);
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MIN_WEEKS_VISIBLE = 3;
const LANE_HEADER_WIDTH = 160; // px — narrower for iPad
const DAY_COL_WIDTH = 72; // px — slightly narrower for iPad
const LANE_HEIGHT = 96; // px — split into AM (top 48) + PM (bottom 48), meets 44px touch target
const HALF_HEIGHT = LANE_HEIGHT / 2;
const WEEK_HEADER_HEIGHT = 24;
const DAY_HEADER_HEIGHT = 32;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function GanttChart({
  pieces,
  robots,
  projectMap,
  planningWindow,
}: GanttChartProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLDivElement>(null);
  const windowStartColRef = useRef<HTMLDivElement>(null);

  // Initial view: Monday on/before the window start. Falls back to today's
  // Monday when no window exists.
  const [viewStart, setViewStart] = useState<Date>(() => {
    if (planningWindow) {
      return getMonday(new Date(planningWindow.start_date + "T00:00:00"));
    }
    return getMonday(new Date());
  });

  // If the active window changes (after a save), snap the view back to it.
  useEffect(() => {
    if (planningWindow) {
      setViewStart(getMonday(new Date(planningWindow.start_date + "T00:00:00")));
    }
  }, [planningWindow?.start_date, planningWindow?.id]);

  // Number of weeks derives from the active window so the full horizon fits.
  const weeksVisible = useMemo(() => {
    if (planningWindow) {
      return weeksForWindow(
        planningWindow.start_date,
        planningWindow.end_date,
        MIN_WEEKS_VISIBLE
      );
    }
    return MIN_WEEKS_VISIBLE;
  }, [planningWindow?.start_date, planningWindow?.end_date]);

  const days = useMemo(
    () =>
      buildDays(
        viewStart,
        weeksVisible,
        planningWindow?.start_date ?? null,
        planningWindow?.end_date ?? null
      ),
    [viewStart, weeksVisible, planningWindow?.start_date, planningWindow?.end_date]
  );

  // Map date string -> column index (for positioning blocks)
  const dateIndex = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((d, i) => map.set(d.date, i));
    return map;
  }, [days]);

  // Filter pieces that are allocated or in_production
  const scheduledPieces = useMemo(
    () =>
      pieces.filter(
        (p) =>
          (p.status === "allocated" || p.status === "in_production") &&
          p.robot_id !== null &&
          p.scheduled_date !== null
      ),
    [pieces]
  );

  // Group by robot
  const piecesByRobot = useMemo(() => {
    const map = new Map<number, Piece[]>();
    for (const r of robots) map.set(r.id, []);
    for (const p of scheduledPieces) {
      const list = map.get(p.robot_id!);
      if (list) list.push(p);
    }
    return map;
  }, [scheduledPieces, robots]);

  // Pieces with both planned_start_date + planned_end_date defined and
  // assigned to a robot render as a read-only span block under the AM/PM
  // slotted blocks. No robot_id -> no lane to render on, so skip.
  const plannedRangePieces = useMemo(
    () =>
      pieces.filter(
        (p) =>
          p.robot_id !== null &&
          p.planned_start_date !== null &&
          p.planned_end_date !== null
      ),
    [pieces]
  );

  const rangePiecesByRobot = useMemo(() => {
    const map = new Map<number, Piece[]>();
    for (const r of robots) map.set(r.id, []);
    for (const p of plannedRangePieces) {
      const list = map.get(p.robot_id!);
      if (list) list.push(p);
    }
    return map;
  }, [plannedRangePieces, robots]);

  // Navigation
  const shiftWeeks = useCallback(
    (n: number) => {
      setViewStart((prev) => addDays(prev, n * 7));
    },
    []
  );

  const goToday = useCallback(() => {
    setViewStart(getMonday(new Date()));
  }, []);

  const goWindowStart = useCallback(() => {
    if (planningWindow) {
      setViewStart(
        getMonday(new Date(planningWindow.start_date + "T00:00:00"))
      );
    }
  }, [planningWindow?.start_date]);

  // Scroll behaviour: prefer "today" if it's visible in the rendered range;
  // otherwise scroll to the start of the window.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const target = todayColRef.current ?? windowStartColRef.current;
    if (!target) return;
    const scrollLeft =
      target.offsetLeft - container.clientWidth / 2 + DAY_COL_WIDTH / 2;
    container.scrollLeft = Math.max(0, scrollLeft);
  }, [viewStart, weeksVisible]);

  const totalGridWidth = days.length * DAY_COL_WIDTH;

  // Collect week labels for the week header row
  const weekHeaders = useMemo(() => {
    const headers: { label: string; startIdx: number; span: number }[] = [];
    let current: { label: string; startIdx: number; span: number } | null =
      null;
    for (let i = 0; i < days.length; i++) {
      if (days[i].weekLabel) {
        if (current) headers.push(current);
        current = { label: days[i].weekLabel!, startIdx: i, span: 1 };
      } else if (current) {
        current.span++;
      }
    }
    if (current) headers.push(current);
    return headers;
  }, [days]);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-4 flex-shrink-0">
        <button
          onClick={() => shiftWeeks(-1)}
          className="px-3.5 py-2 text-sm font-medium bg-[var(--color-surface-card)] border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-150 min-h-[44px] min-w-[44px] shadow-[var(--shadow-xs)]"
        >
          ← Anterior
        </button>
        <button
          onClick={goToday}
          className="px-5 py-2 text-sm font-semibold bg-[var(--color-brand-600)] text-white rounded-xl hover:bg-[var(--color-brand-700)] transition-all duration-150 min-h-[44px] shadow-[var(--shadow-sm)]"
        >
          Hoje
        </button>
        {planningWindow && (
          <button
            onClick={goWindowStart}
            className="px-4 py-2 text-sm font-medium bg-white border border-[var(--color-brand-300)] text-[var(--color-brand-700)] rounded-xl hover:bg-[var(--color-brand-50)] transition-all duration-150 min-h-[44px]"
          >
            Ir para janela
          </button>
        )}
        <button
          onClick={() => shiftWeeks(1)}
          className="px-3.5 py-2 text-sm font-medium bg-[var(--color-surface-card)] border border-zinc-200 rounded-xl hover:bg-zinc-50 hover:border-zinc-300 transition-all duration-150 min-h-[44px] min-w-[44px] shadow-[var(--shadow-xs)]"
        >
          Seguinte →
        </button>
        <span className="text-sm text-zinc-500 ml-2 font-medium">
          {days[0]?.date.slice(5)} — {days[days.length - 1]?.date.slice(5)}
        </span>
      </div>

      {/* Gantt grid */}
      <div className="flex flex-1 min-h-0 border border-zinc-200 rounded-xl overflow-hidden bg-[var(--color-surface-card)] shadow-[var(--shadow-sm)]">
        {/* Fixed robot lane headers */}
        <div
          className="flex-shrink-0 border-r border-zinc-200 bg-[var(--color-surface-bg)]"
          style={{ width: LANE_HEADER_WIDTH }}
        >
          {/* Empty corner for week + day header rows */}
          <div
            className="border-b border-zinc-200 flex items-end px-3 pb-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider"
            style={{ height: WEEK_HEADER_HEIGHT + DAY_HEADER_HEIGHT }}
          >
            Robot
          </div>
          {robots.map((robot) => (
            <div
              key={robot.id}
              className="border-b border-zinc-100 px-3 flex flex-col justify-center hover:bg-white transition-colors duration-150"
              style={{ height: LANE_HEIGHT }}
            >
              <span className="text-xs font-semibold text-zinc-900 truncate block">
                {robot.name.split("—")[0].trim()}
              </span>
              <span className="text-[10px] text-zinc-500 truncate block">
                {robot.name.split("—")[1]?.trim() ?? ""}
              </span>
              <span className="inline-flex items-center text-[10px] text-zinc-400 bg-zinc-100 rounded-full px-1.5 py-0.5 mt-1 w-fit font-medium">
                {(robot.capacity_kg / 1000).toFixed(0)}t
              </span>
            </div>
          ))}
        </div>

        {/* Scrollable timeline */}
        <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden">
          <div style={{ width: totalGridWidth, minWidth: "100%" }}>
            {/* Week header row */}
            <div
              className="flex border-b border-zinc-200"
              style={{ height: WEEK_HEADER_HEIGHT }}
            >
              {weekHeaders.map((wh) => (
                <div
                  key={wh.startIdx}
                  className="text-[11px] font-semibold text-zinc-500 flex items-center justify-center border-r border-zinc-100"
                  style={{ width: wh.span * DAY_COL_WIDTH }}
                >
                  {wh.label}
                </div>
              ))}
            </div>

            {/* Day header row */}
            <div
              className="flex border-b border-zinc-300"
              style={{ height: DAY_HEADER_HEIGHT }}
            >
              {days.map((day) => {
                const isWindowStart =
                  planningWindow !== null &&
                  day.date === planningWindow.start_date;
                return (
                  <div
                    key={day.date}
                    ref={
                      day.isToday
                        ? todayColRef
                        : isWindowStart
                          ? windowStartColRef
                          : undefined
                    }
                    className={`flex items-center justify-center text-xs font-medium border-r border-zinc-100 ${
                      day.isToday
                        ? "bg-[var(--color-brand-50)] text-[var(--color-brand-700)] font-bold"
                        : !day.isInWindow
                          ? "bg-zinc-100 text-zinc-400"
                          : day.isWeekend
                            ? "bg-zinc-50 text-zinc-400"
                            : "text-zinc-600"
                    }`}
                    style={{ width: DAY_COL_WIDTH }}
                    title={!day.isInWindow ? "Fora da janela de planeamento" : undefined}
                  >
                    {day.label}
                  </div>
                );
              })}
            </div>

            {/* Robot lanes */}
            {robots.map((robot) => {
              const robotPieces = piecesByRobot.get(robot.id) ?? [];
              const rangePieces = rangePiecesByRobot.get(robot.id) ?? [];
              return (
                <div
                  key={robot.id}
                  className="relative border-b border-zinc-100"
                  style={{ height: LANE_HEIGHT }}
                >
                  {/* Day column backgrounds */}
                  <div className="absolute inset-0 flex">
                    {days.map((day) => (
                      <div
                        key={day.date}
                        className={`border-r border-zinc-50 ${
                          day.isToday
                            ? "bg-blue-50/40"
                            : !day.isInWindow
                              ? "bg-zinc-100/70"
                              : day.isWeekend
                                ? "bg-zinc-50/60"
                                : ""
                        }`}
                        style={{ width: DAY_COL_WIDTH }}
                      />
                    ))}
                  </div>

                  {/* Planned-range span blocks (read-only, non-interactive).
                      Rendered under the AM/PM slot blocks. Uses full lane
                      height and low opacity so the slot blocks remain
                      visually prominent. */}
                  {rangePieces.map((piece) => {
                    const startIdx = dateIndex.get(piece.planned_start_date!);
                    const endIdx = dateIndex.get(piece.planned_end_date!);
                    if (startIdx === undefined && endIdx === undefined) return null;
                    const clampedStart = startIdx ?? 0;
                    const clampedEnd = endIdx ?? days.length - 1;
                    if (clampedEnd < 0 || clampedStart > days.length - 1) return null;
                    const firstVisible = Math.max(0, clampedStart);
                    const lastVisible = Math.min(days.length - 1, clampedEnd);
                    if (lastVisible < firstVisible) return null;

                    const project = projectMap[piece.project_id];
                    const color = project?.color ?? "#6B7280";
                    const left = firstVisible * DAY_COL_WIDTH + 2;
                    const width =
                      (lastVisible - firstVisible + 1) * DAY_COL_WIDTH - 4;
                    const outsideWindow =
                      planningWindow !== null &&
                      (piece.planned_start_date! < planningWindow.start_date ||
                        piece.planned_end_date! > planningWindow.end_date);

                    return (
                      <div
                        key={`range-${piece.id}`}
                        className={
                          "absolute rounded-md pointer-events-none select-none border border-white/20" +
                          (outsideWindow
                            ? " ring-2 ring-amber-500 ring-offset-1 ring-offset-zinc-100"
                            : "")
                        }
                        style={{
                          left,
                          top: 2,
                          width,
                          height: LANE_HEIGHT - 4,
                          backgroundColor: color,
                          opacity: 0.25,
                          zIndex: 0,
                        }}
                        title={`${piece.reference} — ${project?.name ?? ""}\nPlaneado: ${piece.planned_start_date} → ${piece.planned_end_date}`}
                      />
                    );
                  })}

                  {/* AM/PM separator line */}
                  <div
                    className="absolute left-0 right-0 border-b border-dashed border-zinc-100"
                    style={{ top: HALF_HEIGHT }}
                  />

                  {/* Piece blocks */}
                  {robotPieces.map((piece) => {
                    const colIdx = dateIndex.get(piece.scheduled_date!);
                    if (colIdx === undefined) return null;

                    const project = projectMap[piece.project_id];
                    const color = project?.color ?? "#6B7280";
                    const isAM = piece.scheduled_period === "AM";
                    const isInProduction = piece.status === "in_production";
                    const dayMeta = days[colIdx];
                    const outsideWindow =
                      planningWindow !== null && !dayMeta.isInWindow;

                    const left = colIdx * DAY_COL_WIDTH + 2;
                    const top = isAM ? 2 : HALF_HEIGHT + 2;
                    const blockWidth = DAY_COL_WIDTH - 4;
                    const blockHeight = HALF_HEIGHT - 4;

                    const outsideClass = outsideWindow
                      ? " ring-2 ring-amber-500 ring-offset-1 ring-offset-zinc-100"
                      : "";

                    return (
                      <button
                        key={piece.id}
                        onClick={() =>
                          router.push(`/projects/${piece.project_id}`)
                        }
                        className={
                          "absolute rounded-lg text-left cursor-pointer transition-all duration-150 hover:shadow-[var(--shadow-md)] hover:brightness-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-400)] focus:ring-offset-1" +
                          outsideClass
                        }
                        style={{
                          left,
                          top,
                          width: blockWidth,
                          height: blockHeight,
                          backgroundColor: color,
                          opacity: isInProduction ? 1 : 0.85,
                        }}
                        title={
                          `${piece.reference} — ${project?.name ?? "?"}\n${piece.description ?? ""}\n${piece.scheduled_period}` +
                          (outsideWindow ? "\n⚠ Fora da janela de planeamento activa" : "")
                        }
                      >
                        <div className="px-1.5 py-0.5 h-full flex flex-col justify-center overflow-hidden">
                          <span className="text-[11px] font-semibold text-white truncate leading-tight">
                            {piece.reference}
                          </span>
                          <span className="text-[9px] text-white/80 truncate leading-tight">
                            {project?.name ?? ""}
                          </span>
                        </div>
                        {isInProduction && (
                          <div className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        )}
                        {outsideWindow && (
                          <div className="absolute bottom-0.5 right-1 text-[9px] font-bold text-amber-100 bg-amber-700/80 rounded px-1 leading-tight pointer-events-none">
                            fora
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
