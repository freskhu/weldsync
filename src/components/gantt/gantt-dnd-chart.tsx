"use client";

import {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
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
import {
  allocatePieceDirectAction,
  movePlannedRangeAction,
  clearPlannedRangeAction,
} from "@/app/actions/piece-actions";
import { parseSidebarDragId } from "@/components/calendar/unplanned-sidebar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GanttDndChartProps {
  pieces: Piece[];
  robots: Robot[];
  projectMap: Record<string, { name: string; color: string }>;
  planningWindow: PlanningWindow | null;
  /**
   * Optional left rail rendered INSIDE the DndContext so its draggables share
   * the same sensor/collision pipeline as the grid. Used by the calendar page
   * to show the unplanned-pieces backlog.
   */
  leftSidebar?: React.ReactNode;
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

function addDaysISO(iso: string, n: number): string {
  return formatDateISO(addDays(new Date(iso + "T00:00:00"), n));
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
// Resize Handle — thin draggable strip on the left or right edge of a range
// block. Uses its own useDraggable ID prefixed with `resize-start-` or
// `resize-end-` so handleDragEnd can discriminate from the full-block move.
// ---------------------------------------------------------------------------

function ResizeHandle({
  pieceId,
  edge,
  height,
}: {
  pieceId: string;
  edge: "start" | "end";
  height: number;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `resize-${edge}-${pieceId}`,
      data: { pieceId, kind: "resize", edge },
    });

  // The handle visually translates with the drag so the user sees feedback,
  // but layout/width of the underlying block is only updated on drop. Without
  // this the handle appears "stuck" to the block edge while the pointer moves.
  const style: React.CSSProperties = {
    width: 8,
    height,
    top: 0,
    [edge === "start" ? "left" : "right"]: -4,
    cursor: "ew-resize",
    touchAction: "none",
    zIndex: 45,
    ...(transform ? { transform: `translate(${transform.x}px, 0)` } : {}),
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className={`absolute group/handle flex items-center justify-center ${
        isDragging ? "opacity-100" : "opacity-0 hover:opacity-100"
      }`}
      role="slider"
      aria-label={
        edge === "start"
          ? "Arrastar para alterar data de inicio"
          : "Arrastar para alterar data de fim"
      }
    >
      {/* Visible grip: narrow vertical bar, subtle until hover. */}
      <div className="w-1 h-[60%] rounded-full bg-white/90 shadow" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable Range (Span) Block — planned_start_date → planned_end_date
// ---------------------------------------------------------------------------

function DraggableRangeBlock({
  piece,
  color,
  projectName,
  left,
  top,
  width,
  height,
  outsideWindow,
  onDelete,
}: {
  piece: Piece;
  color: string;
  projectName: string;
  left: number;
  top: number;
  width: number;
  height: number;
  outsideWindow: boolean;
  onDelete: (pieceId: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `range-${piece.id}`,
      data: { piece, kind: "range" },
    });

  const style: React.CSSProperties = {
    left,
    top,
    width,
    height,
    backgroundColor: color,
    opacity: isDragging ? 0.25 : 0.35,
    ...(transform
      ? {
          transform: `translate(${transform.x}px, ${transform.y}px)`,
          zIndex: 40,
          opacity: 0.6,
        }
      : {}),
  };

  const baseClass =
    "absolute rounded-md cursor-grab active:cursor-grabbing select-none touch-manipulation border border-white/30 group hover:brightness-95 hover:opacity-60";
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
      title={`${piece.reference} — ${projectName}\nPlaneado: ${piece.planned_start_date} → ${piece.planned_end_date}\nArrasta o bloco para mover. Arrasta as bordas para ajustar datas. Clica X para remover.`}
    >
      <div className="px-2 py-1 h-full flex flex-col justify-center overflow-hidden pointer-events-none">
        <span className="text-[11px] font-semibold text-white truncate leading-tight drop-shadow">
          {piece.reference}
        </span>
        <span className="text-[9px] text-white/90 truncate leading-tight">
          {projectName}
        </span>
      </div>
      {/* Resize handles on both edges. Siblings of the body span, so they
          receive pointer events even though the body text is pointer-events-none. */}
      <ResizeHandle pieceId={piece.id} edge="start" height={height} />
      <ResizeHandle pieceId={piece.id} edge="end" height={height} />
      {/* Delete button — visible on hover, always tappable on touch.
          Rendered AFTER the handles so it stacks on top in the top-right corner. */}
      <button
        type="button"
        onPointerDown={(e) => {
          // Prevent dnd-kit from starting a drag when the delete button is pressed.
          e.stopPropagation();
        }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onDelete(piece.id);
        }}
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-600/90 hover:bg-red-700 text-white text-xs font-bold flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity z-[46]"
        aria-label={`Remover ${piece.reference} do calendario`}
        title="Remover do calendario"
      >
        ×
      </button>
      {outsideWindow && (
        <div className="absolute bottom-0.5 right-1 text-[9px] font-bold text-amber-100 bg-amber-700/80 rounded px-1 leading-tight pointer-events-none">
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
  leftSidebar,
}: GanttDndChartProps) {
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

  const activePiece = useMemo(() => {
    if (!activeId) return null;
    // Sidebar drags carry a `sidebar-{pieceId}` id; resolve to the piece.
    const sidebarPieceId = parseSidebarDragId(activeId);
    if (sidebarPieceId) {
      return pieces.find((p) => p.id === sidebarPieceId) ?? null;
    }
    return pieces.find((p) => p.id === activeId) ?? null;
  }, [pieces, activeId]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      const { active, over, delta } = event;

      const activeIdStr = active.id as string;

      // ---- Resize handle drag: shift only one endpoint ----
      if (
        activeIdStr.startsWith("resize-start-") ||
        activeIdStr.startsWith("resize-end-")
      ) {
        const edge: "start" | "end" = activeIdStr.startsWith("resize-start-")
          ? "start"
          : "end";
        const pieceId = activeIdStr.slice(
          edge === "start" ? "resize-start-".length : "resize-end-".length
        );
        const piece = pieces.find((p) => p.id === pieceId);
        if (
          !piece ||
          !piece.planned_start_date ||
          !piece.planned_end_date
        ) {
          return;
        }

        const dayDelta = Math.round(delta.x / DAY_COL_WIDTH);
        if (dayDelta === 0) return;

        let newStart = piece.planned_start_date;
        let newEnd = piece.planned_end_date;

        if (edge === "start") {
          const candidate = addDaysISO(piece.planned_start_date, dayDelta);
          // Client-side clamp: start cannot cross end (min 1-day duration).
          newStart = candidate > piece.planned_end_date
            ? piece.planned_end_date
            : candidate;
          if (newStart === piece.planned_start_date) return;
        } else {
          const candidate = addDaysISO(piece.planned_end_date, dayDelta);
          // Client-side clamp: end cannot cross start (min 1-day duration).
          newEnd = candidate < piece.planned_start_date
            ? piece.planned_start_date
            : candidate;
          if (newEnd === piece.planned_end_date) return;
        }

        const previousPieces = [...pieces];
        setPieces((prev) =>
          prev.map((p) =>
            p.id === pieceId
              ? {
                  ...p,
                  planned_start_date: newStart,
                  planned_end_date: newEnd,
                }
              : p
          )
        );

        const result = await movePlannedRangeAction({
          pieceId,
          newStart,
          newEnd,
          // Robot unchanged on resize.
          robotId: piece.robot_id,
        });

        if (!result.success) {
          setPieces(previousPieces);
          setToast({
            message: result.error ?? "Erro ao redimensionar bloco planeado.",
            type: "error",
          });
        }
        return;
      }

      // ---- Range (span) block drag: no droppable required ----
      if (activeIdStr.startsWith("range-")) {
        const pieceId = activeIdStr.slice("range-".length);
        const piece = pieces.find((p) => p.id === pieceId);
        if (
          !piece ||
          !piece.planned_start_date ||
          !piece.planned_end_date
        ) {
          return;
        }

        // Snap to day grid via horizontal delta. Snap to lane (robot) via
        // vertical delta.
        const dayDelta = Math.round(delta.x / DAY_COL_WIDTH);
        const laneDelta = Math.round(delta.y / LANE_HEIGHT);

        // No-op drag: zero movement in both axes.
        if (dayDelta === 0 && laneDelta === 0) return;

        const newStart = addDaysISO(piece.planned_start_date, dayDelta);
        const newEnd = addDaysISO(piece.planned_end_date, dayDelta);

        // Resolve target robot. If lane moved, pick the robot at the new lane.
        let newRobotId: number | null = piece.robot_id;
        if (laneDelta !== 0 && piece.robot_id !== null) {
          const currentIdx = robots.findIndex((r) => r.id === piece.robot_id);
          if (currentIdx !== -1) {
            const newIdx = Math.max(
              0,
              Math.min(robots.length - 1, currentIdx + laneDelta)
            );
            newRobotId = robots[newIdx].id;
          }
        }

        // Optimistic update
        const previousPieces = [...pieces];
        setPieces((prev) =>
          prev.map((p) =>
            p.id === pieceId
              ? {
                  ...p,
                  planned_start_date: newStart,
                  planned_end_date: newEnd,
                  robot_id: newRobotId,
                }
              : p
          )
        );

        const result = await movePlannedRangeAction({
          pieceId,
          newStart,
          newEnd,
          robotId: newRobotId,
        });

        if (!result.success) {
          setPieces(previousPieces);
          setToast({
            message: result.error ?? "Erro ao mover bloco planeado.",
            type: "error",
          });
        }
        return;
      }

      // ---- Sidebar drag (unplanned piece → grid): sets planned range to a
      //      single day on the drop lane, regardless of AM/PM period. ----
      const sidebarPieceId = parseSidebarDragId(activeIdStr);
      if (sidebarPieceId) {
        if (!over) return;
        const target = parseDropId(over.id as string);
        if (!target) return;

        const piece = pieces.find((p) => p.id === sidebarPieceId);
        if (!piece) return;

        const newStart = target.date;
        const newEnd = target.date;
        const newRobotId = target.robotId;

        const previousPieces = [...pieces];
        setPieces((prev) =>
          prev.map((p) =>
            p.id === sidebarPieceId
              ? {
                  ...p,
                  planned_start_date: newStart,
                  planned_end_date: newEnd,
                  robot_id: newRobotId,
                }
              : p
          )
        );

        const result = await movePlannedRangeAction({
          pieceId: sidebarPieceId,
          newStart,
          newEnd,
          robotId: newRobotId,
        });

        if (!result.success) {
          setPieces(previousPieces);
          setToast({
            message: result.error ?? "Erro ao agendar peça.",
            type: "error",
          });
        }
        return;
      }

      // ---- Slot (AM/PM) block drag: requires droppable target ----
      if (!over) return;

      const pieceId = activeIdStr;
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

  const handleDeleteRange = useCallback(
    async (pieceId: string) => {
      const previousPieces = [...pieces];
      // Optimistic: clear planned range locally so the block disappears.
      setPieces((prev) =>
        prev.map((p) =>
          p.id === pieceId
            ? {
                ...p,
                planned_start_date: null,
                planned_end_date: null,
              }
            : p
        )
      );

      const result = await clearPlannedRangeAction(pieceId);
      if (!result.success) {
        setPieces(previousPieces);
        setToast({
          message: result.error ?? "Erro ao remover bloco planeado.",
          type: "error",
        });
      }
      // Server revalidatePath will refresh props; router.refresh not needed.
    },
    [pieces]
  );

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
      <div className="flex h-full gap-3 min-h-0">
        {leftSidebar}
        <div className="flex flex-col h-full flex-1 min-w-0">
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
                const rangePieces = rangePiecesByRobot.get(robot.id) ?? [];
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

                    {/* Planned-range span blocks (read-only, non-interactive).
                        Rendered under the AM/PM slot blocks so drag targets
                        remain unobstructed. Uses full lane height. */}
                    {rangePieces.map((piece) => {
                      const startIdx = dateIndex.get(piece.planned_start_date!);
                      const endIdx = dateIndex.get(piece.planned_end_date!);
                      // If neither endpoint is in the visible range, skip.
                      if (startIdx === undefined && endIdx === undefined) return null;
                      // Clamp to the visible range so partial-visible spans
                      // still render as a bar from the visible edge.
                      const clampedStart =
                        startIdx ?? 0;
                      const clampedEnd =
                        endIdx ?? days.length - 1;
                      if (clampedEnd < 0 || clampedStart > days.length - 1) return null;
                      const firstVisible = Math.max(0, clampedStart);
                      const lastVisible = Math.min(days.length - 1, clampedEnd);
                      if (lastVisible < firstVisible) return null;

                      const project = projectMap[piece.project_id];
                      const color = project?.color ?? "#6B7280";
                      const left = firstVisible * DAY_COL_WIDTH + 2;
                      const width =
                        (lastVisible - firstVisible + 1) * DAY_COL_WIDTH - 4;
                      // Check if any day of the planned range is outside the
                      // active planning window (same treatment as scheduled
                      // blocks: amber ring + "fora" badge).
                      const outsideWindow =
                        planningWindow !== null &&
                        (piece.planned_start_date! < planningWindow.start_date ||
                          piece.planned_end_date! > planningWindow.end_date);

                      return (
                        <DraggableRangeBlock
                          key={`range-${piece.id}`}
                          piece={piece}
                          color={color}
                          projectName={project?.name ?? ""}
                          left={left}
                          top={2}
                          width={width}
                          height={LANE_HEIGHT - 4}
                          outsideWindow={outsideWindow}
                          onDelete={handleDeleteRange}
                        />
                      );
                    })}

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
