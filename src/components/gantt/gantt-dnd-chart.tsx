"use client";

import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { Piece, PlanningWindow, Robot } from "@/lib/types";
import { allocatePieceDirectAction } from "@/app/actions/piece-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GanttDndChartProps {
  pieces: Piece[];
  robots: Robot[];
  projectMap: Record<string, { name: string; color: string }>;
  planningWindow: PlanningWindow | null;
}

interface DayColumn {
  date: string;
  label: string;
  dayOfWeek: number;
  isToday: boolean;
  isWeekend: boolean;
  isInWindow: boolean;
  weekLabel: string | null;
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
 * (or equal to) `windowStart`. Always returns at least `minWeeks` so the view
 * is usable even for very short windows.
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
const LANE_HEADER_WIDTH = 160;
const DAY_COL_WIDTH = 72;
const LANE_HEIGHT = 96;
const HALF_HEIGHT = LANE_HEIGHT / 2;
const WEEK_HEADER_HEIGHT = 24;
const DAY_HEADER_HEIGHT = 32;

// ---------------------------------------------------------------------------
// Droppable Cell — each robot × date × period combo
// ---------------------------------------------------------------------------

function DroppableCell({
  id,
  children,
}: {
  id: string;
  children?: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`absolute ${isOver ? "bg-[var(--color-brand-100)]/40 ring-1 ring-[var(--color-brand-300)] rounded-lg" : ""}`}
      style={{ inset: 0 }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable Piece Block
// ---------------------------------------------------------------------------

function DraggablePieceBlock({
  piece,
  color,
  projectName,
  left,
  top,
  width,
  height,
  isInProduction,
  outsideWindow,
}: {
  piece: Piece;
  color: string;
  projectName: string;
  left: number;
  top: number;
  width: number;
  height: number;
  isInProduction: boolean;
  outsideWindow: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: piece.id,
      data: { piece },
    });

  const style: React.CSSProperties = {
    left,
    top,
    width,
    height,
    backgroundColor: color,
    opacity: isDragging ? 0.3 : isInProduction ? 1 : 0.85,
    ...(transform
      ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 50 }
      : {}),
  };

  const baseClass =
    "absolute rounded-md cursor-grab active:cursor-grabbing transition-shadow hover:shadow-md hover:brightness-95 select-none touch-manipulation";
  const outsideClass = outsideWindow
    ? " ring-2 ring-amber-500 ring-offset-1 ring-offset-zinc-100"
    : "";

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={baseClass + outsideClass}
      style={style}
      title={
        `${piece.reference} — ${projectName}\n${piece.description ?? ""}\n${piece.scheduled_period}` +
        (outsideWindow ? "\n⚠ Fora da janela de planeamento activa" : "")
      }
    >
      <div className="px-1.5 py-0.5 h-full flex flex-col justify-center overflow-hidden">
        <span className="text-[11px] font-semibold text-white truncate leading-tight">
          {piece.reference}
        </span>
        <span className="text-[9px] text-white/80 truncate leading-tight">
          {projectName}
        </span>
      </div>
      {isInProduction && (
        <div className="absolute top-0.5 right-1 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      )}
      {outsideWindow && (
        <div className="absolute bottom-0.5 right-1 text-[9px] font-bold text-amber-100 bg-amber-700/80 rounded px-1 leading-tight">
          fora
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overlay Block (follows cursor during drag)
// ---------------------------------------------------------------------------

function OverlayBlock({
  piece,
  color,
  projectName,
}: {
  piece: Piece;
  color: string;
  projectName: string;
}) {
  return (
    <div
      className="rounded-md shadow-xl ring-2 ring-blue-400 rotate-2"
      style={{
        width: DAY_COL_WIDTH - 4,
        height: HALF_HEIGHT - 4,
        minHeight: 44,
        backgroundColor: color,
      }}
    >
      <div className="px-1.5 py-0.5 h-full flex flex-col justify-center overflow-hidden">
        <span className="text-[11px] font-semibold text-white truncate leading-tight">
          {piece.reference}
        </span>
        <span className="text-[9px] text-white/80 truncate leading-tight">
          {projectName}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast component
// ---------------------------------------------------------------------------

function Toast({
  message,
  type,
  onDismiss,
}: {
  message: string;
  type: "warning" | "error";
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      className={`fixed bottom-6 right-6 z-[100] px-4 py-3 rounded-lg shadow-lg text-sm font-medium flex items-center gap-3 ${
        type === "warning"
          ? "bg-yellow-50 text-yellow-800 border border-yellow-200"
          : "bg-red-50 text-red-800 border border-red-200"
      }`}
    >
      <span>{message}</span>
      <button
        onClick={onDismiss}
        className="text-current opacity-60 hover:opacity-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
      >
        ✕
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export function GanttDndChart({
  pieces: initialPieces,
  robots,
  projectMap,
  planningWindow,
}: GanttDndChartProps) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLDivElement>(null);
  const windowStartColRef = useRef<HTMLDivElement>(null);
  const dndId = useId();

  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  // Initial view: Monday on/before the window start. Falls back to today's
  // Monday when no window exists.
  const [viewStart, setViewStart] = useState<Date>(() => {
    if (planningWindow) {
      return getMonday(new Date(planningWindow.start_date + "T00:00:00"));
    }
    return getMonday(new Date());
  });
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "warning" | "error";
  } | null>(null);

  // If the active window changes (after a save), snap the view back to it.
  useEffect(() => {
    if (planningWindow) {
      setViewStart(getMonday(new Date(planningWindow.start_date + "T00:00:00")));
    }
  }, [planningWindow?.start_date, planningWindow?.id]);

  // Sync with server data when props change
  useEffect(() => {
    setPieces(initialPieces);
  }, [initialPieces]);

  // Number of weeks shown derives from the active window so the full horizon
  // is visible. Without a window, fall back to the minimum.
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

  const dateIndex = useMemo(() => {
    const map = new Map<string, number>();
    days.forEach((d, i) => map.set(d.date, i));
    return map;
  }, [days]);

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

  const piecesByRobot = useMemo(() => {
    const map = new Map<number, Piece[]>();
    for (const r of robots) map.set(r.id, []);
    for (const p of scheduledPieces) {
      const list = map.get(p.robot_id!);
      if (list) list.push(p);
    }
    return map;
  }, [scheduledPieces, robots]);

  // Sensors
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  // Navigation
  const shiftWeeks = useCallback((n: number) => {
    setViewStart((prev) => addDays(prev, n * 7));
  }, []);

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

  // Scroll behaviour: prefer "today" if it's visible inside the rendered
  // range; otherwise scroll to the start of the window.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const target = todayColRef.current ?? windowStartColRef.current;
    if (!target) return;
    const scrollLeft =
      target.offsetLeft - container.clientWidth / 2 + DAY_COL_WIDTH / 2;
    container.scrollLeft = Math.max(0, scrollLeft);
  }, [viewStart, weeksVisible]);

  // Parse droppable ID: "cell-{robotId}-{date}-{period}"
  function parseDropId(id: string): {
    robotId: number;
    date: string;
    period: "AM" | "PM";
  } | null {
    const parts = id.split("-");
    if (parts[0] !== "cell" || parts.length < 4) return null;
    const robotId = parseInt(parts[1], 10);
    const date = parts.slice(2, 5).join("-"); // YYYY-MM-DD
    const period = parts[5] as "AM" | "PM";
    if (isNaN(robotId) || !["AM", "PM"].includes(period)) return null;
    return { robotId, date, period };
  }

  const activePiece = useMemo(
    () => pieces.find((p) => p.id === activeId) ?? null,
    [pieces, activeId]
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over } = event;
      if (!over) return;

      const pieceId = active.id as string;
      const target = parseDropId(over.id as string);
      if (!target) return;

      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece) return;

      // If same position, skip
      if (
        piece.robot_id === target.robotId &&
        piece.scheduled_date === target.date &&
        piece.scheduled_period === target.period
      ) {
        return;
      }

      // Check compatibility (weight > capacity)
      const targetRobot = robots.find((r) => r.id === target.robotId);
      if (
        targetRobot &&
        piece.weight_kg &&
        piece.weight_kg > targetRobot.capacity_kg
      ) {
        setToast({
          message: `Aviso: ${piece.reference} (${piece.weight_kg}kg) excede capacidade do ${targetRobot.name.split("—")[0].trim()} (${targetRobot.capacity_kg}kg)`,
          type: "warning",
        });
      }

      // Optimistic update
      const previousPieces = [...pieces];
      setPieces((prev) =>
        prev.map((p) =>
          p.id === pieceId
            ? {
                ...p,
                robot_id: target.robotId,
                scheduled_date: target.date,
                scheduled_period: target.period,
                status: "allocated" as const,
              }
            : p
        )
      );

      // Persist
      const result = await allocatePieceDirectAction(
        pieceId,
        target.robotId,
        target.date,
        target.period
      );

      if (!result.success) {
        setPieces(previousPieces);
        setToast({
          message: result.error ?? "Erro ao mover peça.",
          type: "error",
        });
      }
    },
    [pieces, robots]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  const totalGridWidth = days.length * DAY_COL_WIDTH;

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
    <DndContext
      id={dndId}
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-3 mb-4 flex-shrink-0">
          <button
            onClick={() => shiftWeeks(-1)}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px] min-w-[44px]"
          >
            &larr; Anterior
          </button>
          <button
            onClick={goToday}
            className="px-4 py-1.5 text-sm font-medium bg-zinc-900 text-white rounded-lg hover:bg-zinc-800 transition-colors min-h-[44px]"
          >
            Hoje
          </button>
          {planningWindow && (
            <button
              onClick={goWindowStart}
              className="px-4 py-1.5 text-sm font-medium bg-white border border-[var(--color-brand-300)] text-[var(--color-brand-700)] rounded-lg hover:bg-[var(--color-brand-50)] transition-colors min-h-[44px]"
            >
              Ir para janela
            </button>
          )}
          <button
            onClick={() => shiftWeeks(1)}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px] min-w-[44px]"
          >
            Seguinte &rarr;
          </button>
          <span className="text-sm text-zinc-500 ml-2">
            {days[0]?.date.slice(5)} &mdash; {days[days.length - 1]?.date.slice(5)}
          </span>
        </div>

        {/* Gantt grid */}
        <div className="flex flex-1 min-h-0 border border-zinc-200 rounded-lg overflow-hidden bg-white">
          {/* Fixed robot lane headers */}
          <div
            className="flex-shrink-0 border-r border-zinc-200 bg-zinc-50"
            style={{ width: LANE_HEADER_WIDTH }}
          >
            <div
              className="border-b border-zinc-200 flex items-end px-3 pb-1 text-xs font-semibold text-zinc-500 uppercase tracking-wider"
              style={{ height: WEEK_HEADER_HEIGHT + DAY_HEADER_HEIGHT }}
            >
              Robot
            </div>
            {robots.map((robot) => (
              <div
                key={robot.id}
                className="border-b border-zinc-100 px-3 flex flex-col justify-center"
                style={{ height: LANE_HEIGHT }}
              >
                <span className="text-xs font-medium text-zinc-900 truncate block">
                  {robot.name.split("—")[0].trim()}
                </span>
                <span className="text-[10px] text-zinc-500 truncate block">
                  {robot.name.split("—")[1]?.trim() ?? ""}
                </span>
                <span className="text-[10px] text-zinc-400 mt-0.5">
                  {(robot.capacity_kg / 1000).toFixed(0)}t
                </span>
              </div>
            ))}
          </div>

          {/* Scrollable timeline */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto overflow-y-hidden"
          >
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
                          ? "bg-blue-50 text-blue-700 font-semibold"
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
                return (
                  <div
                    key={robot.id}
                    className="relative border-b border-zinc-100"
                    style={{ height: LANE_HEIGHT }}
                  >
                    {/* Day column backgrounds + droppable cells */}
                    <div className="absolute inset-0 flex">
                      {days.map((day) => (
                        <div
                          key={day.date}
                          className={`relative border-r border-zinc-50 ${
                            day.isToday
                              ? "bg-blue-50/40"
                              : !day.isInWindow
                                ? "bg-zinc-100/70"
                                : day.isWeekend
                                  ? "bg-zinc-50/60"
                                  : ""
                          }`}
                          style={{ width: DAY_COL_WIDTH }}
                        >
                          {/* AM drop zone */}
                          <div
                            className="absolute left-0 right-0"
                            style={{ top: 0, height: HALF_HEIGHT }}
                          >
                            <DroppableCell
                              id={`cell-${robot.id}-${day.date}-AM`}
                            />
                          </div>
                          {/* PM drop zone */}
                          <div
                            className="absolute left-0 right-0"
                            style={{ top: HALF_HEIGHT, height: HALF_HEIGHT }}
                          >
                            <DroppableCell
                              id={`cell-${robot.id}-${day.date}-PM`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AM/PM separator line */}
                    <div
                      className="absolute left-0 right-0 border-b border-dashed border-zinc-100 pointer-events-none"
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

                      return (
                        <DraggablePieceBlock
                          key={piece.id}
                          piece={piece}
                          color={color}
                          projectName={project?.name ?? ""}
                          left={left}
                          top={top}
                          width={blockWidth}
                          height={blockHeight}
                          isInProduction={isInProduction}
                          outsideWindow={outsideWindow}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay dropAnimation={null}>
        {activePiece ? (
          <OverlayBlock
            piece={activePiece}
            color={
              projectMap[activePiece.project_id]?.color ?? "#6B7280"
            }
            projectName={
              projectMap[activePiece.project_id]?.name ?? ""
            }
          />
        ) : null}
      </DragOverlay>

      {/* Toast notifications */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </DndContext>
  );
}
