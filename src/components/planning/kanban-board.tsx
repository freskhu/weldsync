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
  movePieceUpAction,
  movePieceDownAction,
} from "@/app/actions/piece-actions";
import { KanbanColumn } from "./kanban-column";
import { PieceCard } from "./piece-card";
import { KanbanFilters } from "./kanban-filters";
import { AllocationModal } from "./allocation-modal";
import { RobotPickerModal } from "./robot-picker-modal";

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
  /** auth.users.id -> display name. Used by piece-card audit footer. */
  userMap: Record<string, string>;
}

export function KanbanBoard({
  initialPieces,
  projectMap,
  robotMap,
  robots,
  userMap,
}: KanbanBoardProps) {
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Allocation modal state
  const [pendingAllocation, setPendingAllocation] = useState<Piece | null>(null);
  // Robot picker modal state (for "programmed" drop)
  const [pendingProgram, setPendingProgram] = useState<Piece | null>(null);

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

  // Group by status. The "programmed" column is re-sorted by `priority` ASC
  // (NULLS LAST) — overrides the urgent/deadline ordering used everywhere else
  // because this column is explicitly user-ranked via the ▲▼ arrows.
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
    map.programmed.sort((a, b) => {
      const pa = a.priority;
      const pb = b.priority;
      if (pa == null && pb == null) return 0;
      if (pa == null) return 1; // NULLS LAST
      if (pb == null) return -1;
      return pa - pb;
    });
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

      // If dropping on "programmed", open robot picker modal.
      // No optimistic update — piece stays in its current column until the
      // user confirms a robot. Cancel = no-op, no revert needed.
      if (targetStatus === "programmed") {
        setPendingProgram(piece);
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

  const handleProgramConfirm = useCallback(
    (robotId: number) => {
      if (!pendingProgram) return;
      // Server already persisted (action ran before this callback fired).
      // Just sync local state.
      setPieces((prev) =>
        prev.map((p) =>
          p.id === pendingProgram.id
            ? { ...p, status: "programmed" as PieceStatus, robot_id: robotId }
            : p
        )
      );
      setPendingProgram(null);
    },
    [pendingProgram]
  );

  const handleProgramCancel = useCallback(() => {
    setPendingProgram(null);
  }, []);

  const handleDeletePiece = useCallback((pieceId: string) => {
    setPieces((prev) => prev.filter((p) => p.id !== pieceId));
  }, []);

  /**
   * Reorder a piece up/down within the "programmed" column.
   * Optimistic: swap priority locally, then call the server. Revert on failure.
   * The server is the source of truth for the actual numeric values, but the
   * relative order is what the user cares about — so swapping locally is safe.
   */
  const handleReorder = useCallback(
    async (pieceId: string, direction: "up" | "down") => {
      const target = pieces.find((p) => p.id === pieceId);
      if (!target || target.status !== "programmed") return;
      if (target.priority == null) {
        // No local swap possible — just hit the server (it will backfill).
        const result =
          direction === "up"
            ? await movePieceUpAction(pieceId)
            : await movePieceDownAction(pieceId);
        if (!result.success) {
          console.error("Failed to reorder piece:", result.error);
        }
        return;
      }

      // Find neighbour in the sorted programmed column.
      const programmed = pieces
        .filter(
          (p) => p.status === "programmed" && p.priority != null
        )
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      const idx = programmed.findIndex((p) => p.id === pieceId);
      if (idx === -1) return;
      const neighbourIdx = direction === "up" ? idx - 1 : idx + 1;
      if (neighbourIdx < 0 || neighbourIdx >= programmed.length) return; // boundary
      const neighbour = programmed[neighbourIdx];
      if (neighbour.priority == null) return;

      const previousPieces = [...pieces];
      const targetPriority = target.priority;
      const neighbourPriority = neighbour.priority;
      setPieces((prev) =>
        prev.map((p) => {
          if (p.id === target.id) return { ...p, priority: neighbourPriority };
          if (p.id === neighbour.id) return { ...p, priority: targetPriority };
          return p;
        })
      );

      const result =
        direction === "up"
          ? await movePieceUpAction(pieceId)
          : await movePieceDownAction(pieceId);
      if (!result.success) {
        setPieces(previousPieces);
        console.error("Failed to reorder piece:", result.error);
      }
    },
    [pieces]
  );

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
              {columnPieces[col.id].map((piece, idx, arr) => {
                const isProgrammed = col.id === "programmed";
                const changedByName = piece.last_status_change_by
                  ? userMap[piece.last_status_change_by] ?? null
                  : null;
                return (
                  <PieceCard
                    key={piece.id}
                    piece={piece}
                    projectName={projectMap[piece.project_id]?.name ?? "—"}
                    projectColor={
                      projectMap[piece.project_id]?.color ?? "#6B7280"
                    }
                    robotName={
                      piece.robot_id ? robotMap[piece.robot_id] ?? null : null
                    }
                    isDragging={activeId === piece.id}
                    onDeleted={handleDeletePiece}
                    showReorderArrows={isProgrammed}
                    canMoveUp={isProgrammed && idx > 0}
                    canMoveDown={isProgrammed && idx < arr.length - 1}
                    onMoveUp={
                      isProgrammed
                        ? () => handleReorder(piece.id, "up")
                        : undefined
                    }
                    onMoveDown={
                      isProgrammed
                        ? () => handleReorder(piece.id, "down")
                        : undefined
                    }
                    changedByName={changedByName}
                  />
                );
              })}
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

      {/* Robot picker modal (for Programada drop) */}
      {pendingProgram && (
        <RobotPickerModal
          piece={pendingProgram}
          robots={robots}
          initialRobotId={pendingProgram.robot_id}
          onConfirm={handleProgramConfirm}
          onCancel={handleProgramCancel}
        />
      )}
    </div>
  );
}
