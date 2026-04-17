"use client";

import {
  useMemo,
  useState,
  useCallback,
  useEffect,
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
import type { Piece, Robot } from "@/lib/types";
import { allocatePieceDirectAction } from "@/app/actions/piece-actions";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface WeekViewProps {
  pieces: Piece[];
  robots: Robot[];
  projectMap: Record<string, { name: string; color: string }>;
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

// ---------------------------------------------------------------------------
// Droppable Cell
// ---------------------------------------------------------------------------

function DroppableCell({
  id,
  children,
  isToday,
}: {
  id: string;
  children?: React.ReactNode;
  isToday?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-[60px] p-1 border-b border-zinc-100 transition-colors ${
        isOver ? "bg-blue-50 ring-1 ring-blue-300" : ""
      } ${isToday && !isOver ? "bg-blue-50/30" : ""}`}
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
  compact,
}: {
  piece: Piece;
  color: string;
  projectName: string;
  compact?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: piece.id, data: { piece } });

  const style: React.CSSProperties = {
    backgroundColor: color,
    opacity: isDragging ? 0.3 : 0.9,
    ...(transform
      ? {
          transform: `translate(${transform.x}px, ${transform.y}px)`,
          zIndex: 50,
        }
      : {}),
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className="rounded px-1.5 py-1 cursor-grab active:cursor-grabbing select-none touch-manipulation min-h-[44px] flex flex-col justify-center mb-1 hover:brightness-95 transition-all"
      style={style}
      title={`${piece.reference} — ${projectName}\n${piece.description ?? ""}`}
    >
      <span className="text-[11px] font-semibold text-white truncate leading-tight">
        {piece.reference}
      </span>
      {!compact && (
        <span className="text-[9px] text-white/80 truncate leading-tight">
          {projectName}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Overlay Block
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
      className="rounded px-1.5 py-1 shadow-xl ring-2 ring-blue-400 rotate-2 min-h-[44px] flex flex-col justify-center"
      style={{ backgroundColor: color, width: 120 }}
    >
      <span className="text-[11px] font-semibold text-white truncate leading-tight">
        {piece.reference}
      </span>
      <span className="text-[9px] text-white/80 truncate leading-tight">
        {projectName}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toast
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

export function WeekView({
  pieces: initialPieces,
  robots,
  projectMap,
}: WeekViewProps) {
  const dndId = useId();
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "warning" | "error";
  } | null>(null);

  useEffect(() => {
    setPieces(initialPieces);
  }, [initialPieces]);

  // 7 days of the week
  const weekDays = useMemo(() => {
    const todayStr = formatDateISO(new Date());
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(weekStart, i);
      const dateStr = formatDateISO(d);
      return {
        date: dateStr,
        label: `${DAY_NAMES_PT[d.getDay()]} ${d.getDate()}`,
        dayOfWeek: d.getDay(),
        isToday: dateStr === todayStr,
        isWeekend: d.getDay() === 0 || d.getDay() === 6,
      };
    });
  }, [weekStart]);

  // Scheduled pieces
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

  // Index: "robotId-date-period" -> pieces
  const cellPieces = useMemo(() => {
    const map = new Map<string, Piece[]>();
    for (const p of scheduledPieces) {
      const key = `${p.robot_id}-${p.scheduled_date}-${p.scheduled_period}`;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return map;
  }, [scheduledPieces]);

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
  const prevWeek = useCallback(
    () => setWeekStart((prev) => addDays(prev, -7)),
    []
  );
  const nextWeek = useCallback(
    () => setWeekStart((prev) => addDays(prev, 7)),
    []
  );
  const goToday = useCallback(() => setWeekStart(getMonday(new Date())), []);

  // Parse drop ID
  function parseDropId(id: string) {
    const parts = id.split("-");
    if (parts[0] !== "wcell" || parts.length < 4) return null;
    const robotId = parseInt(parts[1], 10);
    const date = parts.slice(2, 5).join("-");
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

      if (
        piece.robot_id === target.robotId &&
        piece.scheduled_date === target.date &&
        piece.scheduled_period === target.period
      )
        return;

      // Compatibility warning
      const targetRobot = robots.find((r) => r.id === target.robotId);
      if (targetRobot && piece.weight_kg && piece.weight_kg > targetRobot.capacity_kg) {
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

      const result = await allocatePieceDirectAction(
        pieceId,
        target.robotId,
        target.date,
        target.period
      );

      if (!result.success) {
        setPieces(previousPieces);
        setToast({ message: result.error ?? "Erro ao mover peça.", type: "error" });
      }
    },
    [pieces, robots]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

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
        <div className="flex items-center gap-3 mb-4 flex-shrink-0">
          <button
            onClick={prevWeek}
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
          <button
            onClick={nextWeek}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px] min-w-[44px]"
          >
            Seguinte &rarr;
          </button>
          <span className="text-sm text-zinc-500 ml-2">
            {weekDays[0]?.date.slice(5)} &mdash;{" "}
            {weekDays[6]?.date.slice(5)}
          </span>
        </div>

        {/* Grid: 7 columns (days) x robots rows */}
        <div className="flex-1 min-h-0 overflow-auto border border-zinc-200 rounded-lg bg-white">
          <table className="w-full border-collapse table-fixed">
            <thead className="sticky top-0 z-10 bg-zinc-50">
              {/* Day header */}
              <tr>
                <th className="w-[140px] min-w-[140px] border-b border-r border-zinc-200 px-2 py-2 text-xs font-semibold text-zinc-500 uppercase text-left">
                  Robot
                </th>
                {weekDays.map((day) => (
                  <th
                    key={day.date}
                    className={`border-b border-r border-zinc-200 px-2 py-2 text-xs font-medium text-center ${
                      day.isToday
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : day.isWeekend
                          ? "text-zinc-400"
                          : "text-zinc-600"
                    }`}
                  >
                    {day.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {robots.map((robot) => (
                <tr key={robot.id} className="border-b border-zinc-100">
                  {/* Robot header */}
                  <td className="border-r border-zinc-200 px-2 py-2 align-top bg-zinc-50">
                    <span className="text-sm font-medium text-zinc-900 block truncate">
                      {robot.name.split("—")[0].trim()}
                    </span>
                    <span className="text-[10px] text-zinc-400">
                      {(robot.capacity_kg / 1000).toFixed(0)}t
                    </span>
                  </td>
                  {/* Day cells */}
                  {weekDays.map((day) => {
                    const amKey = `${robot.id}-${day.date}-AM`;
                    const pmKey = `${robot.id}-${day.date}-PM`;
                    const amPieces = cellPieces.get(amKey) ?? [];
                    const pmPieces = cellPieces.get(pmKey) ?? [];
                    return (
                      <td
                        key={day.date}
                        className={`border-r border-zinc-100 p-0 align-top ${
                          day.isToday ? "bg-blue-50/20" : day.isWeekend ? "bg-zinc-50/40" : ""
                        }`}
                      >
                        {/* AM slot */}
                        <div className="border-b border-dashed border-zinc-100">
                          <div className="px-1 pt-0.5">
                            <span className="text-[9px] text-zinc-300 uppercase">AM</span>
                          </div>
                          <DroppableCell
                            id={`wcell-${robot.id}-${day.date}-AM`}
                            isToday={day.isToday}
                          >
                            {amPieces.map((piece) => (
                              <DraggablePieceBlock
                                key={piece.id}
                                piece={piece}
                                color={projectMap[piece.project_id]?.color ?? "#6B7280"}
                                projectName={projectMap[piece.project_id]?.name ?? ""}
                                compact
                              />
                            ))}
                          </DroppableCell>
                        </div>
                        {/* PM slot */}
                        <div>
                          <div className="px-1 pt-0.5">
                            <span className="text-[9px] text-zinc-300 uppercase">PM</span>
                          </div>
                          <DroppableCell
                            id={`wcell-${robot.id}-${day.date}-PM`}
                            isToday={day.isToday}
                          >
                            {pmPieces.map((piece) => (
                              <DraggablePieceBlock
                                key={piece.id}
                                piece={piece}
                                color={projectMap[piece.project_id]?.color ?? "#6B7280"}
                                projectName={projectMap[piece.project_id]?.name ?? ""}
                                compact
                              />
                            ))}
                          </DroppableCell>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePiece ? (
          <OverlayBlock
            piece={activePiece}
            color={projectMap[activePiece.project_id]?.color ?? "#6B7280"}
            projectName={projectMap[activePiece.project_id]?.name ?? ""}
          />
        ) : null}
      </DragOverlay>

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
