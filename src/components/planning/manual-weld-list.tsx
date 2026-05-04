import type { Piece, Robot } from "@/lib/types";
import { ManualWeldRowActions } from "@/components/planning/manual-weld-row-actions";

/**
 * Manual-weld list view (Step 5).
 *
 * Renders pieces with `status === "manual_weld"` grouped by project. The shop
 * floor uses this to keep an audit trail of material that was welded by hand
 * (i.e. not by a robot) — useful for invoicing, capacity reviews, and to
 * justify why a piece never went through the kanban.
 *
 * Each row exposes two revert paths via the inline ManualWeldRowActions
 * client component:
 *   - "→ Planeados": send the piece back to the planning column.
 *   - "→ Programada": pick a robot and send back to programmed.
 *
 * Server Component on purpose — needs zero interactivity at this level.
 * Interactivity is pushed to the smallest leaf (row actions). Receives
 * `pieces` and `robots` already loaded by the page; we just filter, group,
 * and render.
 */

interface ManualWeldListProps {
  /** Full piece list from the page. We filter inside. */
  pieces: Piece[];
  projectMap: Record<string, { name: string; color: string }>;
  /** Robot catalog needed by the per-row "→ Programada" picker. */
  robots: Robot[];
}

interface ProjectGroup {
  projectId: string;
  name: string;
  color: string;
  pieces: Piece[];
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatWeight(kg: number | null): string {
  if (kg == null) return "—";
  // Match the rest of the app: 1 decimal, comma as separator (pt-PT).
  return `${kg.toLocaleString("pt-PT", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} kg`;
}

export function ManualWeldList({
  pieces,
  projectMap,
  robots,
}: ManualWeldListProps) {
  // Filter first, then group. Sorted within each group by most recent status
  // change (descending) so the latest manual welds bubble to the top.
  const manual = pieces.filter((p) => p.status === "manual_weld");

  if (manual.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500 text-sm">
        Sem peças soldadas à mão.
      </div>
    );
  }

  // Group by project_id. Order projects by their name for stable rendering;
  // pieces inside each group ordered by last_status_change_at desc.
  const groupsMap: Record<string, ProjectGroup> = {};
  for (const piece of manual) {
    const proj = projectMap[piece.project_id];
    const name = proj?.name ?? "(projecto desconhecido)";
    const color = proj?.color ?? "#6B7280";
    if (!groupsMap[piece.project_id]) {
      groupsMap[piece.project_id] = {
        projectId: piece.project_id,
        name,
        color,
        pieces: [],
      };
    }
    groupsMap[piece.project_id].pieces.push(piece);
  }

  const groups = Object.values(groupsMap).sort((a, b) =>
    a.name.localeCompare(b.name, "pt-PT")
  );
  for (const g of groups) {
    g.pieces.sort((a, b) => {
      const ta = a.last_status_change_at
        ? new Date(a.last_status_change_at).getTime()
        : 0;
      const tb = b.last_status_change_at
        ? new Date(b.last_status_change_at).getTime()
        : 0;
      return tb - ta;
    });
  }

  // Totals for the footer. Nulls are ignored (treated as 0 for the sum but
  // shown as "—" in the rows themselves).
  const totalCount = manual.length;
  const totalWeight = manual.reduce(
    (sum, p) => sum + (p.weight_kg ?? 0),
    0
  );

  return (
    <div className="flex-1 overflow-y-auto pb-4 space-y-4">
      {groups.map((g) => (
        <section
          key={g.projectId}
          className="rounded-xl border border-zinc-200 bg-white overflow-hidden"
        >
          <header
            className="flex items-center gap-3 px-4 py-2.5 text-white font-semibold text-[14px]"
            style={{ background: g.color }}
          >
            <span className="truncate">{g.name}</span>
            <span className="ml-auto bg-white/20 text-[12px] font-bold px-2 py-0.5 rounded-full">
              {g.pieces.length}
            </span>
          </header>

          <ul className="divide-y divide-zinc-100">
            {g.pieces.map((piece) => (
              <li
                key={piece.id}
                className="px-4 py-3 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 text-[13px]"
              >
                <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                  <span className="font-mono font-bold text-zinc-900 min-w-[120px] truncate">
                    {piece.reference}
                  </span>
                  <span className="flex-1 text-zinc-600 truncate min-w-0">
                    {piece.description ?? "—"}
                  </span>
                  <span className="text-zinc-700 tabular-nums whitespace-nowrap">
                    {formatWeight(piece.weight_kg)}
                  </span>
                  <span className="text-zinc-500 tabular-nums whitespace-nowrap md:min-w-[140px] md:text-right">
                    {formatDateTime(piece.last_status_change_at)}
                  </span>
                </div>
                <ManualWeldRowActions piece={piece} robots={robots} />
              </li>
            ))}
          </ul>
        </section>
      ))}

      <footer className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-[13px] font-semibold text-zinc-700 flex justify-between">
        <span>Total</span>
        <span className="tabular-nums">
          {totalCount} {totalCount === 1 ? "peça" : "peças"},{" "}
          {totalWeight.toLocaleString("pt-PT", {
            minimumFractionDigits: 1,
            maximumFractionDigits: 1,
          })}{" "}
          kg
        </span>
      </footer>
    </div>
  );
}
