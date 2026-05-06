"use client";

import { useState, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  deallocatePieceAction,
} from "@/app/actions/piece-actions";

type MoveResult = { success: true } | { success: false; error?: string };

async function movePieceREST(
  pieceId: string,
  status: PieceStatus
): Promise<MoveResult> {
  try {
    const res = await fetch(`/api/pieces/${pieceId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error ?? `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function reorderPieceREST(
  pieceId: string,
  direction: "up" | "down"
): Promise<MoveResult> {
  try {
    const res = await fetch(`/api/pieces/${pieceId}/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error ?? `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
import { KanbanColumn } from "./kanban-column";
import { PieceCard } from "./piece-card";
import { KanbanFilters } from "./kanban-filters";
import { AllocationModal } from "./allocation-modal";
import { RobotPickerModal } from "./robot-picker-modal";
// MobilePieceList intentionally not imported — the vertical mobile fallback
// broke drag-and-drop between columns. Kept on disk for now in case we want
// to revive it as an "expanded view" toggle, but it is no longer rendered.

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
  /**
   * The active-planning-window editor. Rendered above the filters on
   * desktop, and inside the mobile drawer on <md so it doesn't eat
   * vertical space the operator needs for the kanban columns.
   */
  windowBar?: ReactNode;
}

export function KanbanBoard({
  initialPieces,
  projectMap,
  robotMap,
  robots,
  userMap,
  windowBar,
}: KanbanBoardProps) {
  const router = useRouter();
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  // Re-sync local state when the server payload changes (router.refresh()
  // after a reorder/program/allocate, navigation, or revalidation). Without
  // this the kanban shows stale priorities even though the database swap
  // succeeded.
  useEffect(() => {
    setPieces(initialPieces);
  }, [initialPieces]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Allocation modal state
  const [pendingAllocation, setPendingAllocation] = useState<Piece | null>(null);
  // Robot picker modal state (for "programmed" drop)
  const [pendingProgram, setPendingProgram] = useState<Piece | null>(null);

  // Debug error modal state — temporary instrumentation while we
  // diagnose the Backlog→Planeados persistence bug.
  const [debugError, setDebugError] = useState<string | null>(null);

  // Filters
  const [filterProject, setFilterProject] = useState<string>("");
  const [filterRobot, setFilterRobot] = useState<string>("");
  const [filterUrgent, setFilterUrgent] = useState(false);

  // Mobile drawer for filters + planning window bar. On <md viewports the
  // kanban needs every vertical pixel for the columns, so the filter strip
  // and the active-window editor are tucked behind a "Filtros" toggle button
  // in the toolbar. On md+ everything renders inline as before and the
  // drawer is dormant.
  const [filtersDrawerOpen, setFiltersDrawerOpen] = useState(false);

  // Auto-close the drawer when crossing into md+ — at that breakpoint the
  // filters are persistent so a stale open drawer would just be confusing.
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 768) setFiltersDrawerOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Lock body scroll while the drawer is open so the underlying kanban
  // doesn't scroll behind the panel.
  useEffect(() => {
    if (!filtersDrawerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [filtersDrawerOpen]);

  // Sensors: mouse + touch + keyboard for iPad support
  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 8 },
  });
  const touchSensor = useSensor(TouchSensor, {
    // 250ms long-press before drag starts. Lower values trigger drag when
    // users intend a tap/scroll on iPad. Tolerance allows ~8px finger drift
    // during the long-press without cancelling.
    activationConstraint: { delay: 250, tolerance: 8 },
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

  // Group by status. The "planned" column is re-sorted by `priority` ASC
  // (NULLS LAST) — overrides the urgent/deadline ordering used everywhere else
  // because this column is explicitly user-ranked via the ▲▼ arrows.
  const columnPieces = useMemo(() => {
    const map: Record<PieceStatus, Piece[]> = {
      backlog: [],
      planned: [],
      programmed: [],
      manual_weld: [],
      allocated: [],
      in_production: [],
      completed: [],
    };
    for (const piece of sortedPieces) {
      map[piece.status].push(piece);
    }
    map.planned.sort((a, b) => {
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

        // Deallocate first, then move to new status. Wrap in try/catch:
        // server actions can throw (e.g. FK violation, RLS rejection) and
        // without this the optimistic state would stick on the screen even
        // though the DB never persisted -> "F5 brings it back" symptom.
        try {
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
            const moveResult = await movePieceREST(pieceId, targetStatus);
            if (!moveResult.success) {
              setPieces(previousPieces);
              console.error("Failed to move piece:", moveResult.error);
            }
          }
        } catch (err) {
          setPieces(previousPieces);
          console.error("Drag move (deallocate path) threw:", err);
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

      // Guard against thrown server action errors (FK violations, RLS, network).
      // Without try/catch the rejection bubbles up and the optimistic state
      // stays on screen — user sees a "successful" move but a refresh reveals
      // it never persisted.
      const result = await movePieceREST(pieceId, targetStatus);
      if (!result.success) {
        setPieces(previousPieces);
        console.error("Failed to move piece:", result.error);
        setDebugError(
          `Não foi possível mover a peça.\n\n${
            result.error ?? "(sem mensagem)"
          }\n\nFrom: ${piece.status}\nTo: ${targetStatus}`
        );
      } else {
        router.refresh();
      }
    },
    [pieces, router]
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
   * Reorder a piece up/down within the "planned" column.
   * Optimistic: swap priority locally, then call the server. Revert on failure.
   * The server is the source of truth for the actual numeric values, but the
   * relative order is what the user cares about — so swapping locally is safe.
   */
  const handleReorder = useCallback(
    async (pieceId: string, direction: "up" | "down") => {
      const target = pieces.find((p) => p.id === pieceId);
      if (!target || target.status !== "planned") return;
      if (target.priority == null) {
        // No local swap possible — just hit the server (it will backfill).
        const result = await reorderPieceREST(pieceId, direction);
        if (!result.success) {
          console.error("Failed to reorder piece:", result.error);
        } else {
          router.refresh();
        }
        return;
      }

      // Find neighbour in the sorted planned column.
      const planned = pieces
        .filter(
          (p) => p.status === "planned" && p.priority != null
        )
        .sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0));
      const idx = planned.findIndex((p) => p.id === pieceId);
      if (idx === -1) return;
      const neighbourIdx = direction === "up" ? idx - 1 : idx + 1;
      if (neighbourIdx < 0 || neighbourIdx >= planned.length) return; // boundary
      const neighbour = planned[neighbourIdx];
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

      const result = await reorderPieceREST(pieceId, direction);
      if (!result.success) {
        setPieces(previousPieces);
        console.error("Failed to reorder piece:", result.error);
      } else {
        router.refresh();
      }
    },
    [pieces, router]
  );

  const hasFilters = !!(filterProject || filterRobot || filterUrgent);
  const activeFilterCount =
    (filterProject ? 1 : 0) + (filterRobot ? 1 : 0) + (filterUrgent ? 1 : 0);

  // Filter UI used both inline (md+) and inside the drawer (<md). Identical
  // markup either way — the parent container changes, not the controls.
  const filtersBlock = (
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
  );

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Mobile toolbar (<md): a single row with the "Filtros" toggle.
          The planning window bar and full filter strip are hidden behind
          the drawer so the 4-column kanban gets all the vertical space. */}
      <div className="md:hidden mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setFiltersDrawerOpen(true)}
          className="flex items-center gap-2 px-3 min-h-[44px] bg-white border border-zinc-300 rounded-lg shadow-sm text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 touch-manipulation"
          aria-label="Abrir filtros e janela de planeamento"
          aria-expanded={filtersDrawerOpen}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L14 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 018 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <span>Filtros</span>
          {activeFilterCount > 0 && (
            <span
              className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[var(--color-brand-500)] text-white text-[11px] font-bold"
              aria-hidden="true"
            >
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Desktop (md+) layout: planning window bar + filter strip inline. */}
      <div className="hidden md:block">
        {windowBar && <div className="mb-4">{windowBar}</div>}
        {filtersBlock}
      </div>

      {/* Mobile drawer — slide-in from the right with backdrop. Mirrors
          the unplanned-sidebar pattern so the operator sees a familiar
          interaction. */}
      {filtersDrawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => setFiltersDrawerOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={`md:hidden fixed top-0 right-0 z-40 w-[320px] max-w-[85vw] h-[100dvh] bg-zinc-50 border-l border-zinc-200 flex flex-col shadow-xl transform transition-transform duration-200 ease-out ${
          filtersDrawerOpen ? "translate-x-0" : "translate-x-full"
        }`}
        aria-hidden={!filtersDrawerOpen}
        aria-label="Filtros e janela de planeamento"
      >
        <header className="px-3 py-2 border-b border-zinc-200 bg-white flex-shrink-0 flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
            Filtros e janela
          </h2>
          <button
            type="button"
            onClick={() => setFiltersDrawerOpen(false)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 touch-manipulation"
            aria-label="Fechar filtros"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {windowBar}
          {filtersBlock}
        </div>
      </aside>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {/* 4-column kanban. Mobile (<lg): 2x2 grid — Backlog/Planeados on
            top row, Programada/Finalizados on bottom. Each quadrant is ~196px
            wide on a 393px viewport, double the 4-up horizontal layout. Each
            column has its own internal scroll, drag works across all four
            quadrants because DndContext wraps the whole grid and the same
            droppable ids are still in the DOM. lg+: switch back to horizontal
            row with fixed-width columns and horizontal scroll. */}
        <div className="grid grid-cols-2 grid-rows-2 gap-1.5 lg:flex lg:flex-row lg:gap-5 lg:overflow-x-auto flex-1 min-h-0 pb-4 scroll-smooth px-0 lg:px-1">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              id={col.id}
              label={col.label}
              count={columnPieces[col.id].length}
              isOver={overId === col.id}
            >
              {columnPieces[col.id].map((piece, idx, arr) => {
                const isPlanned = col.id === "planned";
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
                    showReorderArrows={isPlanned}
                    canMoveUp={isPlanned && idx > 0}
                    canMoveDown={isPlanned && idx < arr.length - 1}
                    onMoveUp={
                      isPlanned
                        ? () => handleReorder(piece.id, "up")
                        : undefined
                    }
                    onMoveDown={
                      isPlanned
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

      {/* DEBUG: error modal with copy button. Temporary while diagnosing. */}
      {debugError && (
        <div
          className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4"
          onClick={() => setDebugError(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold text-red-700 mb-3">
              Erro detectado (debug)
            </h2>
            <textarea
              readOnly
              value={debugError}
              className="w-full h-48 font-mono text-xs bg-zinc-100 border border-zinc-300 rounded p-2 text-zinc-900"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="flex gap-2 mt-3 justify-end">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(debugError);
                  } catch {
                    /* ignore */
                  }
                }}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                Copiar
              </button>
              <button
                onClick={() => setDebugError(null)}
                className="px-3 py-1.5 bg-zinc-200 text-zinc-800 text-sm rounded hover:bg-zinc-300"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
