"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import type { Piece, PieceStatus, Robot } from "@/lib/types";
import {
  movePieceAction,
  deallocatePieceAction,
} from "@/app/actions/piece-actions";
import { KanbanColumn } from "./kanban-column";
import { PieceCard } from "./piece-card";
import { KanbanFilters } from "./kanban-filters";
import { AllocationModal } from "./allocation-modal";

const COLUMNS: { id: PieceStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "planned", label: "Planeados" },
  { id: "programmed", label: "Programada" },
  { id: "completed", label: "Finalizados" },
];

interface KanbanBoardProps {
  initialPieces: Piece[];
  projectMap: Record<string, { name: string; color: string }>;
  robotMap: Record<number, string>;
  robots: Robot[];
}

export function KanbanBoard({
  initialPieces,
  projectMap,
  robotMap,
  robots,
}: KanbanBoardProps) {
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Allocation modal state
  const [pendingAllocation, setPendingAllocation] = useState<Piece | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterRobot, setFilterRobot] = useState<string>("");
  const [filterUrgent, setFilterUrgent] = useState(false);

  // Sensors: mouse + touch + keyboard for iPad support
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 8 },
  });
  const keyboardSensor = useSensor(KeyboardSensor);
  const sensors = useSensors(mouseSensor, touchSensor, keyboardSensor);

  // Unique projects and robots for filter dropdowns
  const projectOptions = useMemo(() => {
    const seen = new Set<string>();
    return pieces
      .map((p) => p.project_id)
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((id) => ({ id, name: projectMap[id]?.name ?? id }));
  }, [pieces, projectMap]);

  const robotOptions = useMemo(() => {
    const seen = new Set<number>();
    return pieces
      .filter((p) => p.robot_id !== null)
      .map((p) => p.robot_id!)
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((id) => ({ id, name: robotMap[id] ?? `Robot ${id}` }));
  }, [pieces, robotMap]);

  // Filter pieces
  const filteredPieces = useMemo(() => {
    return pieces.filter((p) => {
      if (filterProject && p.project_id !== filterProject) return false;
      if (filterRobot && p.robot_id !== Number(filterRobot)) return false;
      if (filterUrgent && !p.urgent) return false;
      return true;
    });
  }, [pieces, filterProject, filterRobot, filterUrgent]);

  // Sort: urgent first, then deadline ascending (null last)
  const sortedPieces = useMemo(() => {
    return [...filteredPieces].sort((a, b) => {
      // Urgent pins to top
      if (a.urgent && !b.urgent) return -1;
      if (!a.urgent && b.urgent) return 1;

      // Get project deadlines
      const deadlineA = a.scheduled_date;
      const deadlineB = b.scheduled_date;
      if (deadlineA && !deadlineB) return -1;
      if (!deadlineA && deadlineB) return 1;
      if (deadlineA && deadlineB) return deadlineA.localeCompare(deadlineB);

      return 0;
    });
  }, [filteredPieces]);

  // Group by status
  const columnPieces = useMemo(() => {
    const map: Record<PieceStatus, Piece[]> = {
      backlog: [],
      planned: [],
      programmed: [],
      allocated: [],
      in_production: [],
      completed: [],
    };
    for (const piece of sortedPieces) {
      map[piece.status].push(piece);
    }
    return map;
  }, [sortedPieces]);

  const activePiece = useMemo(
    () => pieces.find((p) => p.id === activeId) ?? null,
    [pieces, activeId]
  );

  // Compute robot loads for the allocation modal date
  const robotLoads = useMemo(() => {
    const loads: Record<number, number> = {};
    for (const robot of robots) {
      loads[robot.id] = pieces.filter(
        (p) => p.robot_id === robot.id
      ).length;
    }
    return loads;
  }, [pieces, robots]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  }, []);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setActiveId(null);
      setOverId(null);

      const { active, over } = event;
      if (!over) return;

      const pieceId = active.id as string;
      const targetStatus = over.id as PieceStatus;

      // Only proceed if dropped on a valid column
      if (!COLUMNS.some((c) => c.id === targetStatus)) return;

      const piece = pieces.find((p) => p.id === pieceId);
      if (!piece || piece.status === targetStatus) return;

      // If dropping on "allocated", open the allocation modal
      if (targetStatus === "allocated") {
        setPendingAllocation(piece);
        return;
      }

      // If moving OUT of "allocated", deallocate (targetStatus !== "allocated" is guaranteed above)
      if (piece.status === "allocated") {
        const previousPieces = [...pieces];
        setPieces((prev) =>
          prev.map((p) =>
            p.id === pieceId
              ? {
                  ...p,
                  status: targetStatus,
                  robot_id: null,
                  scheduled_date: null,
                  scheduled_period: null,
                }
              : p
          )
        );

        // Deallocate first, then move to new status
        const fd = new FormData();
        fd.set("pieceId", pieceId);
        const deallocResult = await deallocatePieceAction(fd);
        if (!deallocResult.success) {
          setPieces(previousPieces);
          console.error("Failed to deallocate piece:", deallocResult.error);
          return;
        }

        // If target is not backlog (deallocate sets backlog), move to actual target
        if (targetStatus !== "backlog") {
          const moveResult = await movePieceAction(pieceId, targetStatus);
          if (!moveResult.success) {
            setPieces(previousPieces);
            console.error("Failed to move piece:", moveResult.error);
          }
        }
        return;
      }

      // Standard move (non-allocation columns).
      // Special case: dropping into "completed" clears calendar + robot to mirror
      // the server action (atomic UPDATE). This keeps the optimistic UI honest.
      const previousPieces = [...pieces];
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id !== pieceId) return p;
          if (targetStatus === "completed") {
            return {
              ...p,
              status: targetStatus,
              robot_id: null,
              scheduled_date: null,
              scheduled_period: null,
              planned_start_date: null,
              planned_end_date: null,
              planned_start_period: null,
              planned_end_period: null,
            };
          }
          return { ...p, status: targetStatus };
        })
      );

      const result = await movePieceAction(pieceId, targetStatus);
      if (!result.success) {
        setPieces(previousPieces);
        console.error("Failed to move piece:", result.error);
      }
    },
    [pieces]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverId(null);
  }, []);

  const handleAllocationConfirm = useCallback(
    (robotId: number, date: string, period: "AM" | "PM") => {
      if (!pendingAllocation) return;
      setPieces((prev) =>
        prev.map((p) =>
          p.id === pendingAllocation.id
            ? {
                ...p,
                status: "allocated" as PieceStatus,
                robot_id: robotId,
                scheduled_date: date,
                scheduled_period: period,
              }
            : p
        )
      );
      setPendingAllocation(null);
    },
    [pendingAllocation]
  );

  const handleAllocationCancel = useCallback(() => {
    setPendingAllocation(null);
  }, []);

  const hasFilters = !!(filterProject || filterRobot || filterUrgent);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <KanbanFilters
        projectOptions={projectOptions}
        robotOptions={robotOptions}
        filterProject={filterProject}
        filterRobot={filterRobot}
        filterUrgent={filterUrgent}
        onProjectChange={setFilterProject}
        onRobotChange={setFilterRobot}
        onUrgentChange={setFilterUrgent}
        onClear={() => {
          setFilterProject("");
          setFilterRobot("");
          setFilterUrgent(false);
        }}
        hasFilters={hasFilters}
      />

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex-1 flex gap-5 overflow-x-auto pb-4 min-h-0 scroll-smooth px-1">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              count={columnPieces[col.id].length}
              isOver={overId === col.id}
            >
              {columnPieces[col.id].map((piece) => (
                <PieceCard
                  key={piece.id}
                  piece={piece}
                  projectName={projectMap[piece.project_id]?.name ?? "—"}
                  projectColor={projectMap[piece.project_id]?.color ?? "#6B7280"}
                  robotName={
                    piece.robot_id ? robotMap[piece.robot_id] ?? null : null
                  }
                  isDragging={activeId === piece.id}
                />
              ))}
            </KanbanColumn>
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activePiece ? (
            <PieceCard
              piece={activePiece}
              projectName={
                projectMap[activePiece.project_id]?.name ?? "—"
              }
              projectColor={
                projectMap[activePiece.project_id]?.color ?? "#6B7280"
              }
              robotName={
                activePiece.robot_id
                  ? robotMap[activePiece.robot_id] ?? null
                  : null
              }
              isOverlay
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Allocation modal */}
      {pendingAllocation && (
        <AllocationModal
          piece={pendingAllocation}
          robots={robots}
          robotLoads={robotLoads}
          onConfirm={handleAllocationConfirm}
          onCancel={handleAllocationCancel}
        />
      )}
    </div>
  );
}
