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

interface DayViewProps {
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

const DAY_NAMES_PT_FULL = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

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
  label,
}: {
  id: string;
  children?: React.ReactNode;
  label: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-h-[120px] p-2 rounded-lg border transition-colors touch-manipulation ${
        isOver
          ? "bg-blue-50 border-blue-300 ring-1 ring-blue-300"
          : "bg-white border-zinc-200"
      }`}
    >
      <div className="text-[10px] font-semibold text-zinc-400 uppercase mb-2">
        {label}
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Draggable Piece Block (detailed)
// ---------------------------------------------------------------------------

function DraggablePieceBlock({
  piece,
  color,
  projectName,
}: {
  piece: Piece;
  color: string;
  projectName: string;
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
      className="rounded-lg px-3 py-2 cursor-grab active:cursor-grabbing select-none touch-manipulation min-h-[44px] hover:brightness-95 transition-all"
      style={style}
      title={`${piece.reference} — ${projectName}\n${piece.description ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-white truncate">
          {piece.reference}
        </span>
        <div className="flex items-center gap-1">
          {piece.urgent && (
            <span className="w-2 h-2 rounded-full bg-white/80" />
          )}
          {piece.status === "in_production" && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          )}
        </div>
      </div>
      <span className="text-xs text-white/80 truncate block">
        {projectName}
      </span>
      <div className="flex gap-2 mt-1 text-[10px] text-white/70">
        {piece.description && (
          <span className="truncate max-w-[150px]">{piece.description}</span>
        )}
      </div>
      <div className="flex gap-2 mt-1 text-[10px] text-white/60">
        {piece.weight_kg != null && <span>{piece.weight_kg}kg</span>}
        {piece.estimated_hours != null && <span>{piece.estimated_hours}h</span>}
        {piece.quantity > 1 && <span>x{piece.quantity}</span>}
        {piece.material && <span>{piece.material}</span>}
      </div>
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
      className="rounded-lg px-3 py-2 shadow-xl ring-2 ring-blue-400 rotate-2 min-h-[44px]"
      style={{ backgroundColor: color, width: 180 }}
    >
      <span className="text-sm font-bold text-white truncate block">
        {piece.reference}
      </span>
      <span className="text-xs text-white/80 truncate block">
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

export function DayView({
  pieces: initialPieces,
  robots,
  projectMap,
}: DayViewProps) {
  const dndId = useId();
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [activeId, setActiveId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "warning" | "error";
  } | null>(null);

  useEffect(() => {
    setPieces(initialPieces);
  }, [initialPieces]);

  const dateStr = useMemo(() => formatDateISO(currentDate), [currentDate]);
  const isToday = dateStr === formatDateISO(new Date());

  // Scheduled pieces for this day
  const dayPieces = useMemo(
    () =>
      pieces.filter(
        (p) =>
          (p.status === "allocated" || p.status === "in_production") &&
          p.robot_id !== null &&
          p.scheduled_date === dateStr
      ),
    [pieces, dateStr]
  );

  // Index: "robotId-period" -> pieces
  const cellPieces = useMemo(() => {
    const map = new Map<string, Piece[]>();
    for (const p of dayPieces) {
      const key = `${p.robot_id}-${p.scheduled_period}`;
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    return map;
  }, [dayPieces]);

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
  const prevDay = useCallback(
    () => setCurrentDate((prev) => addDays(prev, -1)),
    []
  );
  const nextDay = useCallback(
    () => setCurrentDate((prev) => addDays(prev, 1)),
    []
  );
  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  // Parse drop ID: "dcell-{robotId}-{period}"
  function parseDropId(id: string) {
    const parts = id.split("-");
    if (parts[0] !== "dcell" || parts.length < 3) return null;
    const robotId = parseInt(parts[1], 10);
    const period = parts[2] as "AM" | "PM";
    if (isNaN(robotId) || !["AM", "PM"].includes(period)) return null;
    return { robotId, period };
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
        piece.scheduled_date === dateStr &&
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
                scheduled_date: dateStr,
                scheduled_period: target.period,
                status: "allocated" as const,
              }
            : p
        )
      );

      const result = await allocatePieceDirectAction(
        pieceId,
        target.robotId,
        dateStr,
        target.period
      );

      if (!result.success) {
        setPieces(previousPieces);
        setToast({ message: result.error ?? "Erro ao mover peça.", type: "error" });
      }
    },
    [pieces, robots, dateStr]
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
        <div className="flex flex-wrap items-center gap-3 mb-4 flex-shrink-0">
          <button
            onClick={prevDay}
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
            onClick={nextDay}
            className="px-3 py-1.5 text-sm font-medium bg-white border border-zinc-300 rounded-lg hover:bg-zinc-50 transition-colors min-h-[44px] min-w-[44px]"
          >
            Seguinte &rarr;
          </button>
          <span className="text-sm text-zinc-500 ml-2">
            <span className={isToday ? "font-semibold text-blue-700" : ""}>
              {DAY_NAMES_PT_FULL[currentDate.getDay()]}
            </span>
            {" "}
            {currentDate.getDate()}/{currentDate.getMonth() + 1}/{currentDate.getFullYear()}
          </span>
        </div>

        {/* Grid: 5 columns (robots) x 2 rows (AM/PM) */}
        <div className="flex-1 min-h-0 overflow-auto">
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${robots.length}, minmax(160px, 1fr))` }}>
            {/* Robot headers */}
            {robots.map((robot) => (
              <div
                key={robot.id}
                className="bg-zinc-50 rounded-lg px-3 py-2 border border-zinc-200"
              >
                <span className="text-sm font-semibold text-zinc-900 block truncate">
                  {robot.name.split("—")[0].trim()}
                </span>
                <span className="text-xs text-zinc-500 truncate block">
                  {robot.name.split("—")[1]?.trim() ?? ""}
                </span>
                <span className="text-[10px] text-zinc-400">
                  {(robot.capacity_kg / 1000).toFixed(0)}t
                </span>
              </div>
            ))}

            {/* AM row */}
            {robots.map((robot) => {
              const key = `${robot.id}-AM`;
              const pcs = cellPieces.get(key) ?? [];
              return (
                <DroppableCell
                  key={`am-${robot.id}`}
                  id={`dcell-${robot.id}-AM`}
                  label="Manhã (AM)"
                >
                  {pcs.map((piece) => (
                    <DraggablePieceBlock
                      key={piece.id}
                      piece={piece}
                      color={projectMap[piece.project_id]?.color ?? "#6B7280"}
                      projectName={projectMap[piece.project_id]?.name ?? ""}
                    />
                  ))}
                </DroppableCell>
              );
            })}

            {/* PM row */}
            {robots.map((robot) => {
              const key = `${robot.id}-PM`;
              const pcs = cellPieces.get(key) ?? [];
              return (
                <DroppableCell
                  key={`pm-${robot.id}`}
                  id={`dcell-${robot.id}-PM`}
                  label="Tarde (PM)"
                >
                  {pcs.map((piece) => (
                    <DraggablePieceBlock
                      key={piece.id}
                      piece={piece}
                      color={projectMap[piece.project_id]?.color ?? "#6B7280"}
                      projectName={projectMap[piece.project_id]?.name ?? ""}
                    />
                  ))}
                </DroppableCell>
              );
            })}
          </div>
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
