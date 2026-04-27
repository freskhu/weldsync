"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useDraggable } from "@dnd-kit/core";
import type { Piece } from "@/lib/types";
import { textOn, mutedTextOn } from "@/lib/color-utils";
import { deletePieceAction } from "@/app/actions/piece-actions";

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
    const ok = window.confirm(
      `Eliminar peça "${piece.reference}" definitivamente? Esta acção não pode ser revertida.`
    );
    if (!ok) return;
    const fd = new FormData();
    fd.set("id", piece.id);
    fd.set("project_id", piece.project_id);
    startDeleteTransition(async () => {
      const result = await deletePieceAction(fd);
      if (!result.success) {
        window.alert(
          `Não foi possível eliminar a peça: ${result.error ?? "erro desconhecido"}`
        );
        return;
      }
      router.refresh();
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
            className="text-[11.5px] font-bold font-mono truncate"
            style={{ color: ink }}
          >
            {piece.reference}
          </span>
          {clientRef && (
            <span
              className="text-[10px] font-mono truncate"
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
          className="relative text-[11px] truncate mt-0.5 pointer-events-none"
          style={{ color: inkMuted }}
        >
          {piece.description}
        </p>
      )}
      {metric && (
        <p
          className="relative text-[10px] mt-0.5 pointer-events-none"
          style={{ color: inkMuted }}
        >
          {metric}
        </p>
      )}
      {robotName && (
        <div className="relative mt-1 pointer-events-none">
          <span
            className="inline-flex items-center text-[10px] font-semibold rounded-full px-1.5 py-0.5 bg-black/15 max-w-full truncate"
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
        className="absolute top-0.5 right-0.5 w-8 h-8 flex items-center justify-center rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-black/20 disabled:opacity-50 transition-opacity"
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
            const clientRef = project?.client_ref ?? "";
            return (
              <section key={projectId} className="space-y-1.5">
                <header className="flex items-center gap-2 px-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="text-[11px] font-semibold text-zinc-700 truncate">
                    {name}
                  </h3>
                  {clientRef && (
                    <span className="text-[10px] font-mono text-zinc-500 truncate">
                      {clientRef}
                    </span>
                  )}
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
    </aside>
  );
}
