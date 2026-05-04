"use client";

import { useMemo, useState, useCallback } from "react";
import type { Piece, Robot } from "@/lib/types";

// Mobile-friendly week overview: vertical list grouped by day.
// Replaces the 7-column WeekView table on small viewports where the
// horizontal scroll makes the table unreadable.

interface WeekOverviewProps {
  pieces: Piece[];
  robots: Robot[];
  projectMap: Record<string, { name: string; color: string }>;
}

const DAY_NAMES_PT = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
];

function formatDateISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

// ---------------------------------------------------------------------------
// Range helpers (parity with Gantt / WeekView / DayView)
// ---------------------------------------------------------------------------
// Mobile is lenient: a programmed piece is shown on EVERY day its planned
// range covers (no AM/PM split). The operator on iPhone needs to see what
// is happening this week — period granularity is noise on a small screen.

function dateUTC(dateStr: string): number {
  return Date.UTC(
    parseInt(dateStr.slice(0, 4), 10),
    parseInt(dateStr.slice(5, 7), 10) - 1,
    parseInt(dateStr.slice(8, 10), 10),
  );
}

function dayInPlannedRange(piece: Piece, dateStr: string): boolean {
  if (!piece.planned_start_date || !piece.planned_end_date) return false;
  const target = dateUTC(dateStr);
  const start = dateUTC(piece.planned_start_date);
  const end = dateUTC(piece.planned_end_date);
  return target >= start && target <= end;
}

export function WeekOverview({
  pieces,
  robots,
  projectMap,
}: WeekOverviewProps) {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  const robotMap = useMemo(() => {
    const map: Record<number, string> = {};
    for (const r of robots) map[r.id] = r.name.split("—")[0].trim();
    return map;
  }, [robots]);

  const weekDays = useMemo(() => {
    const todayStr = formatDateISO(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const dateStr = formatDateISO(d);
      return {
        date: dateStr,
        label: DAY_NAMES_PT[d.getDay()],
        dayNum: d.getDate(),
        month: d.getMonth() + 1,
        isToday: dateStr === todayStr,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }, [weekStart]);

  const piecesByDate = useMemo(() => {
    const map = new Map<string, Piece[]>();
    for (const p of pieces) {
      if (
        (p.status !== "allocated" && p.status !== "in_production") ||
        p.robot_id == null ||
        !p.scheduled_date
      )
        continue;
      const list = map.get(p.scheduled_date) ?? [];
      list.push(p);
      map.set(p.scheduled_date, list);
    }
    return map;
  }, [pieces]);

  // Programmed pieces (range-planned, not yet slot-allocated) by visible day.
  // Any piece whose [planned_start_date, planned_end_date] inclusive interval
  // contains the day is shown — mobile is lenient on purpose so the operator
  // sees the full week's scope.
  const programmedByDate = useMemo(() => {
    const map = new Map<string, Piece[]>();
    const visibleDates = new Set<string>();
    let cursor = weekStart;
    for (let i = 0; i < 7; i++) {
      visibleDates.add(formatDateISO(cursor));
      cursor = addDays(cursor, 1);
    }
    const ranged = pieces.filter(
      (p) =>
        p.robot_id != null &&
        p.planned_start_date != null &&
        p.planned_end_date != null,
    );
    for (const p of ranged) {
      for (const date of visibleDates) {
        if (dayInPlannedRange(p, date)) {
          const list = map.get(date) ?? [];
          list.push(p);
          map.set(date, list);
        }
      }
    }
    return map;
  }, [pieces, weekStart]);

  const prevWeek = useCallback(
    () => setWeekStart((prev) => addDays(prev, -7)),
    []
  );
  const nextWeek = useCallback(
    () => setWeekStart((prev) => addDays(prev, 7)),
    []
  );
  const goThisWeek = useCallback(
    () => setWeekStart(getMonday(new Date())),
    []
  );

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 mb-3 flex-shrink-0">
        <button
          onClick={prevWeek}
          className="px-3 py-1.5 text-sm font-medium bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px] min-w-[44px]"
        >
          &larr;
        </button>
        <button
          onClick={goThisWeek}
          className="px-4 py-1.5 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors min-h-[44px]"
        >
          Esta semana
        </button>
        <button
          onClick={nextWeek}
          className="px-3 py-1.5 text-sm font-medium bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px] min-w-[44px]"
        >
          &rarr;
        </button>
        <span className="text-sm text-zinc-500 ml-1">
          {weekDays[0]?.date.slice(5)} — {weekDays[6]?.date.slice(5)}
        </span>
      </div>

      {/* Day list */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pb-4">
        {weekDays.map((day) => {
          const dayPieces = piecesByDate.get(day.date) ?? [];
          const am = dayPieces.filter((p) => p.scheduled_period === "AM");
          const pm = dayPieces.filter((p) => p.scheduled_period === "PM");
          const programmed = programmedByDate.get(day.date) ?? [];
          const totalCount = dayPieces.length + programmed.length;

          return (
            <div
              key={day.date}
              className={`rounded-lg border ${
                day.isToday
                  ? "border-blue-300 bg-blue-50/40"
                  : day.isWeekend
                    ? "border-zinc-200 bg-zinc-50/60"
                    : "border-zinc-200 bg-white"
              }`}
            >
              <div className="flex items-baseline justify-between px-3 py-2 border-b border-zinc-100">
                <div>
                  <span
                    className={`text-sm font-semibold ${
                      day.isToday ? "text-blue-700" : "text-zinc-900"
                    }`}
                  >
                    {day.label}
                  </span>
                  <span className="text-xs text-zinc-500 ml-2">
                    {day.dayNum}/{day.month}
                  </span>
                  {day.isToday && (
                    <span className="ml-2 text-[11px] font-semibold uppercase text-blue-700">
                      Hoje
                    </span>
                  )}
                </div>
                <span className="text-xs text-zinc-500">
                  {totalCount} {totalCount === 1 ? "peça" : "peças"}
                </span>
              </div>

              {totalCount === 0 ? (
                <div className="px-3 py-4 text-sm text-zinc-400 italic">
                  Sem peças agendadas
                </div>
              ) : (
                <div className="px-3 py-2 space-y-2">
                  {am.length > 0 && (
                    <PeriodGroup
                      label="Manhã"
                      pieces={am}
                      projectMap={projectMap}
                      robotMap={robotMap}
                    />
                  )}
                  {pm.length > 0 && (
                    <PeriodGroup
                      label="Tarde"
                      pieces={pm}
                      projectMap={projectMap}
                      robotMap={robotMap}
                    />
                  )}
                  {programmed.length > 0 && (
                    <ProgrammedGroup
                      pieces={programmed}
                      projectMap={projectMap}
                      robotMap={robotMap}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProgrammedGroup({
  pieces,
  projectMap,
  robotMap,
}: {
  pieces: Piece[];
  projectMap: Record<string, { name: string; color: string }>;
  robotMap: Record<number, string>;
}) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase text-zinc-500 tracking-wide">
        Programadas
      </span>
      <div className="mt-1 space-y-1">
        {pieces.map((p) => {
          const project = projectMap[p.project_id];
          const color = project?.color ?? "#6B7280";
          const robot = p.robot_id != null ? robotMap[p.robot_id] : null;
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 min-h-[44px] border border-dashed border-white/70"
              style={{
                backgroundImage: `repeating-linear-gradient(45deg, ${color} 0 8px, ${color}99 8px 16px)`,
                opacity: 0.7,
              }}
              title={`Programada (${p.planned_start_date} → ${p.planned_end_date})`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-white truncate">
                    {p.reference}
                  </span>
                  <span className="text-[9px] uppercase font-semibold text-white/90 bg-black/25 rounded px-1.5 py-0.5 flex-shrink-0">
                    Programada
                  </span>
                  {p.urgent && (
                    <span className="w-2 h-2 rounded-full bg-white/90 flex-shrink-0" />
                  )}
                </div>
                <div className="text-[12px] text-white/85 truncate">
                  {project?.name ?? ""}
                </div>
              </div>
              {robot && (
                <span className="text-[11px] font-semibold text-white/90 bg-black/25 rounded px-2 py-0.5 flex-shrink-0">
                  {robot}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PeriodGroup({
  label,
  pieces,
  projectMap,
  robotMap,
}: {
  label: string;
  pieces: Piece[];
  projectMap: Record<string, { name: string; color: string }>;
  robotMap: Record<number, string>;
}) {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase text-zinc-500 tracking-wide">
        {label}
      </span>
      <div className="mt-1 space-y-1">
        {pieces.map((p) => {
          const project = projectMap[p.project_id];
          const robot = p.robot_id != null ? robotMap[p.robot_id] : null;
          return (
            <div
              key={p.id}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 min-h-[44px]"
              style={{ backgroundColor: project?.color ?? "#6B7280" }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-white truncate">
                    {p.reference}
                  </span>
                  {p.urgent && (
                    <span className="w-2 h-2 rounded-full bg-white/90 flex-shrink-0" />
                  )}
                </div>
                <div className="text-[12px] text-white/80 truncate">
                  {project?.name ?? ""}
                </div>
              </div>
              {robot && (
                <span className="text-[11px] font-semibold text-white/90 bg-black/20 rounded px-2 py-0.5 flex-shrink-0">
                  {robot}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
