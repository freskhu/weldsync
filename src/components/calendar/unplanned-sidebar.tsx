"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDndMonitor, useDraggable } from "@dnd-kit/core";
import type { Piece } from "@/lib/types";
import { textOn, mutedTextOn } from "@/lib/color-utils";
import {
  deletePieceAction,
  markPieceAsManualWeldAction,
} from "@/app/actions/piece-actions";
import { useConfirm } from "@/components/ui/confirm-dialog";

// ---------------------------------------------------------------------------
// Unplanned Sidebar — left rail on the Gantt view listing pieces that have
// no planned range yet (planned_start_date or planned_end_date is null).
// Pieces are grouped by project. Each card is draggable with id prefix
// `sidebar-{pieceId}` so the Gantt drop handler can discriminate the source.
// ---------------------------------------------------------------------------

const SIDEBAR_DRAG_PREFIX = "sidebar-";

export function sidebarDragIdFor(pieceId: string): string {
  return `${SIDEBAR_DRAG_PREFIX}${pieceId}`;
}

export function parseSidebarDragId(id: string): string | null {
  if (!id.startsWith(SIDEBAR_DRAG_PREFIX)) return null;
  return id.slice(SIDEBAR_DRAG_PREFIX.length);
}

interface UnplannedSidebarProps {
  pieces: Piece[];
  projectMap: Record<
    string,
    { name: string; color: string; client_ref: string }
  >;
  /** Robot id -> name lookup. Used to surface the assigned robot on cards
   *  that already have a robot_id (e.g. piece programmed but not yet
   *  scheduled in the calendar). */
  robotMap?: Record<number, string>;
}

interface UnplannedCardProps {
  piece: Piece;
  color: string;
  clientRef: string;
  robotName: string | null;
}

function UnplannedCard({
  piece,
  color,
  clientRef,
  robotName,
}: UnplannedCardProps) {
  const router = useRouter();
  const [isDeleting, startDeleteTransition] = useTransition();
  const confirm = useConfirm();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: sidebarDragIdFor(piece.id),
      data: { piece, kind: "sidebar" },
    });

  const style: React.CSSProperties = {
    ...(transform
      ? {
          transform: `translate(${transform.x}px, ${transform.y}px)`,
          zIndex: 50,
        }
      : {}),
    opacity: isDragging ? 0.3 : 1,
    backgroundColor: color,
  };

  const ink = textOn(color);
  const inkMuted = mutedTextOn(color);

  const metric =
    piece.weight_kg != null
      ? `${piece.weight_kg} kg`
      : piece.estimated_hours != null
        ? `${piece.estimated_hours}h`
        : null;

  function handleDelete(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    e.preventDefault();
    // Accessible confirm dialog. Action runs inside onConfirm so the dialog
    // owns the loading + inline error state. The wrapping useTransition keeps
    // the card's delete-button spinner alive while the server action runs.
    //
    // Manual-weld escape hatch — same gate as PieceCard: only offered when
    // a planner has already committed the piece (planned/programmed).
    const offerManualWeld =
      piece.status === "planned" || piece.status === "programmed";

    startDeleteTransition(async () => {
      await confirm({
        title: "Eliminar peça",
        description: `Eliminar peça "${piece.reference}" definitivamente? Esta acção não pode ser revertida.`,
        confirmLabel: "Eliminar",
        cancelLabel: "Cancelar",
        tone: "destructive",
        onConfirm: async () => {
          const fd = new FormData();
          fd.set("id", piece.id);
          fd.set("project_id", piece.project_id);
          const result = await deletePieceAction(fd);
          if (!result.success) {
            throw new Error(result.error ?? "Erro desconhecido.");
          }
          router.refresh();
        },
        alternate: offerManualWeld
          ? {
              label: "Soldar à mão",
              tone: "default",
              onAction: async () => {
                const result = await markPieceAsManualWeldAction(piece.id);
                if (!result.success) {
                  throw new Error(result.error ?? "Erro desconhecido.");
                }
                router.refresh();
              },
            }
          : undefined,
      });
    });
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="group relative rounded-lg px-2.5 py-2 cursor-grab active:cursor-grabbing touch-manipulation select-none hover:shadow-md hover:-translate-y-px transition-all min-h-[44px] shadow-sm"
      title={`${clientRef ? clientRef + " · " : ""}${piece.reference}${piece.description ? ` — ${piece.description}` : ""}\nArrasta para a grelha para agendar`}
    >
      {/* Drag handle wrapper so the delete button sits above it */}
      <div
        {...listeners}
        {...attributes}
        className="absolute inset-0 rounded-lg"
      />

      <div className="relative flex items-center justify-between gap-2 pointer-events-none">
        <div className="flex items-baseline gap-1.5 min-w-0">
          <span
            className="text-[14px] md:text-[11.5px] font-bold font-mono truncate"
            style={{ color: ink }}
          >
            {piece.reference}
          </span>
          {clientRef && (
            <span
              className="text-[12px] md:text-[10px] font-mono truncate"
              style={{ color: inkMuted }}
            >
              {clientRef}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {piece.urgent && (
            <svg
              className="w-3.5 h-3.5 shrink-0"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-label="Urgente"
              style={{ color: ink }}
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>
      </div>
      {piece.description && (
        <p
          className="relative text-[13px] md:text-[11px] truncate mt-0.5 pointer-events-none"
          style={{ color: inkMuted }}
        >
          {piece.description}
        </p>
      )}
      {metric && (
        <p
          className="relative text-[12px] md:text-[10px] mt-0.5 pointer-events-none"
          style={{ color: inkMuted }}
        >
          {metric}
        </p>
      )}
      {robotName && (
        <div className="relative mt-1 pointer-events-none">
          <span
            className="inline-flex items-center text-[12px] md:text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-black/15 max-w-full truncate"
            style={{ color: ink }}
            title={`Robot: ${robotName}`}
          >
            {robotName}
          </span>
        </div>
      )}

      {/* Delete button — visible on hover / focus, touch-friendly at 44x44 hit */}
      <button
        type="button"
        onClick={handleDelete}
        disabled={isDeleting}
        className="absolute top-0.5 right-0.5 w-11 h-11 md:w-8 md:h-8 flex items-center justify-center rounded-md opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 hover:bg-black/20 disabled:opacity-50 transition-opacity"
        style={{ color: ink }}
        title="Eliminar peça definitivamente"
        aria-label={`Eliminar peça ${piece.reference}`}
      >
        {isDeleting ? (
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="3"
              opacity="0.3"
            />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        )}
      </button>
    </div>
  );
}

export function UnplannedSidebar({
  pieces,
  projectMap,
  robotMap,
}: UnplannedSidebarProps) {
  // Drawer state for <lg viewports. On lg+, the sidebar is always rendered
  // as a persistent left rail; the drawer plumbing is dormant.
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close the drawer if the viewport crosses up to lg+ (sidebar becomes
  // persistent and the toggle button disappears).
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) setDrawerOpen(false);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // While a drag is in progress, do NOT auto-close the drawer. The user is
  // mid-action; closing the source rail would cancel the drag. We listen to
  // the parent DndContext via useDndMonitor — this hook is safe because the
  // sidebar always lives inside <DndContext> in gantt-dnd-chart.tsx.
  const [dragging, setDragging] = useState(false);
  useDndMonitor({
    onDragStart: () => setDragging(true),
    onDragEnd: () => setDragging(false),
    onDragCancel: () => setDragging(false),
  });

  // Lock body scroll while drawer is open on mobile, similar to the main
  // app sidebar pattern. Restored on cleanup.
  useEffect(() => {
    if (!drawerOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [drawerOpen]);

  const unplanned = useMemo(
    () =>
      pieces.filter(
        (p) =>
          p.status !== "completed" &&
          (p.planned_start_date === null || p.planned_end_date === null)
      ),
    [pieces]
  );

  const grouped = useMemo(() => {
    const map = new Map<string, Piece[]>();
    for (const p of unplanned) {
      const arr = map.get(p.project_id) ?? [];
      arr.push(p);
      map.set(p.project_id, arr);
    }
    // Sort each group by reference for stable display.
    for (const arr of map.values()) {
      arr.sort((a, b) => a.reference.localeCompare(b.reference));
    }
    // Convert to a sorted array by project name.
    return Array.from(map.entries()).sort((a, b) => {
      const nameA = projectMap[a[0]]?.name ?? "";
      const nameB = projectMap[b[0]]?.name ?? "";
      return nameA.localeCompare(nameB);
    });
  }, [unplanned, projectMap]);

  // Body of the sidebar — rendered identically in both layouts (drawer +
  // persistent). Extracted so we don't duplicate the markup.
  const Body = (
    <div className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-3">
      {grouped.length === 0 ? (
        <div className="text-center text-xs text-zinc-400 py-8 px-2">
          Todas as peças activas já têm intervalo planeado.
        </div>
      ) : (
        grouped.map(([projectId, projectPieces]) => {
          const project = projectMap[projectId];
          const name = project?.name ?? "Projecto desconhecido";
          const color = project?.color ?? "#6B7280";
          const clientRef = project?.client_ref ?? "";
          return (
            <section key={projectId} className="space-y-1.5">
              <header className="flex items-center gap-2 px-1">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
                <h3 className="text-[13px] md:text-[11px] font-semibold text-zinc-700 truncate">
                  {name}
                </h3>
                {clientRef && (
                  <span className="text-[12px] md:text-[10px] font-mono text-zinc-500 truncate">
                    {clientRef}
                  </span>
                )}
                <span className="text-[12px] md:text-[10px] text-zinc-400 ml-auto">
                  {projectPieces.length}
                </span>
              </header>
              <div className="space-y-1.5">
                {projectPieces.map((piece) => (
                  <UnplannedCard
                    key={piece.id}
                    piece={piece}
                    color={color}
                    clientRef={clientRef}
                    robotName={
                      piece.robot_id != null
                        ? robotMap?.[piece.robot_id] ?? null
                        : null
                    }
                  />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );

  const Header = (
    <header className="px-3 py-2 border-b border-zinc-200 bg-white flex-shrink-0 flex items-center justify-between gap-2">
      <div>
        <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
          Por planear
        </h2>
        <p className="text-[13px] md:text-[11px] text-zinc-500 mt-0.5">
          {unplanned.length}{" "}
          {unplanned.length === 1 ? "peça" : "peças"} — arrasta para a grelha
        </p>
      </div>
      {/* Close button — only useful in drawer mode. Hidden on lg+. */}
      <button
        type="button"
        onClick={() => setDrawerOpen(false)}
        className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 touch-manipulation"
        aria-label="Fechar painel"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </header>
  );

  return (
    <>
      {/* ---- <lg drawer toggle (FAB-style button) ---- */}
      {/* Only visible when drawer is closed; opens the slide-in panel.
          Sits in normal flow as a flex-shrink-0 button so it doesn't disturb
          the gantt layout next to it. */}
      {!drawerOpen && (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="lg:hidden flex-shrink-0 self-start flex items-center gap-2 px-3 min-h-[44px] bg-white border border-zinc-300 rounded-lg shadow-sm text-[13px] font-medium text-zinc-700 hover:bg-zinc-50 active:bg-zinc-100 touch-manipulation"
          aria-label={`Abrir peças por planear (${unplanned.length})`}
          aria-expanded={false}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <span>Por planear</span>
          <span
            className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-zinc-900 text-white text-[11px] font-bold"
            aria-hidden="true"
          >
            {unplanned.length}
          </span>
        </button>
      )}

      {/* ---- <lg backdrop ---- */}
      {/* Tappable to dismiss, but only when no drag is in progress. */}
      {drawerOpen && (
        <div
          className="lg:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          onClick={() => {
            if (!dragging) setDrawerOpen(false);
          }}
          aria-hidden="true"
        />
      )}

      {/* ---- <lg slide-in drawer ---- */}
      <aside
        className={`lg:hidden fixed top-0 left-0 z-40 w-[280px] max-w-[85vw] h-[100dvh] bg-zinc-50 border-r border-zinc-200 flex flex-col shadow-xl transform transition-transform duration-200 ease-out ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        aria-label="Peças por planear"
        aria-hidden={!drawerOpen}
      >
        {Header}
        {Body}
      </aside>

      {/* ---- lg+ persistent left rail ---- */}
      <aside
        className="hidden lg:flex flex-shrink-0 w-64 border border-zinc-200 rounded-lg bg-zinc-50 flex-col overflow-hidden"
        aria-label="Peças por planear"
      >
        {Header}
        {Body}
      </aside>
    </>
  );
}
