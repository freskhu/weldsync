"use client";

import { useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Piece } from "@/lib/types";

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
  projectMap: Record<string, { name: string; color: string }>;
}

interface UnplannedCardProps {
  piece: Piece;
  color: string;
}

function UnplannedCard({ piece, color }: UnplannedCardProps) {
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
  };

  const metric =
    piece.weight_kg != null
      ? `${piece.weight_kg} kg`
      : piece.estimated_hours != null
        ? `${piece.estimated_hours}h`
        : null;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={style}
      className="relative bg-white rounded-lg border border-zinc-200 px-2.5 py-2 cursor-grab active:cursor-grabbing touch-manipulation select-none hover:shadow-sm hover:-translate-y-px transition-all min-h-[44px]"
      title={`${piece.reference}${piece.description ? ` — ${piece.description}` : ""}\nArrasta para a grelha para agendar`}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-lg"
        style={{ backgroundColor: color }}
      />
      <div className="pl-2 flex items-center justify-between gap-2">
        <span
          className="text-[11.5px] font-bold font-mono truncate"
          style={{ color: "var(--color-ink)" }}
        >
          {piece.reference}
        </span>
        {piece.urgent && (
          <svg
            className="w-3.5 h-3.5 text-[var(--color-danger)] shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-label="Urgente"
          >
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        )}
      </div>
      {piece.description && (
        <p
          className="pl-2 text-[11px] truncate mt-0.5"
          style={{ color: "var(--color-ink-soft)" }}
        >
          {piece.description}
        </p>
      )}
      {metric && (
        <p
          className="pl-2 text-[10px] mt-0.5"
          style={{ color: "var(--color-ink-mute)" }}
        >
          {metric}
        </p>
      )}
    </div>
  );
}

export function UnplannedSidebar({
  pieces,
  projectMap,
}: UnplannedSidebarProps) {
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

  return (
    <aside
      className="flex-shrink-0 w-64 border border-zinc-200 rounded-lg bg-zinc-50 flex flex-col overflow-hidden"
      aria-label="Peças por planear"
    >
      <header className="px-3 py-2 border-b border-zinc-200 bg-white flex-shrink-0">
        <h2 className="text-xs font-semibold text-zinc-700 uppercase tracking-wider">
          Por planear
        </h2>
        <p className="text-[11px] text-zinc-500 mt-0.5">
          {unplanned.length}{" "}
          {unplanned.length === 1 ? "peça" : "peças"} — arrasta para a grelha
        </p>
      </header>
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
            return (
              <section key={projectId} className="space-y-1.5">
                <header className="flex items-center gap-2 px-1">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="text-[11px] font-semibold text-zinc-700 truncate">
                    {name}
                  </h3>
                  <span className="text-[10px] text-zinc-400 ml-auto">
                    {projectPieces.length}
                  </span>
                </header>
                <div className="space-y-1.5">
                  {projectPieces.map((piece) => (
                    <UnplannedCard
                      key={piece.id}
                      piece={piece}
                      color={color}
                    />
                  ))}
                </div>
              </section>
            );
          })
        )}
      </div>
    </aside>
  );
}
