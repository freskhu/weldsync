/**
 * Printable calendar view (A4 landscape).
 *
 * Server-rendered page with zero client JS beyond the auto-print helper.
 * Renders a compact Gantt (robots x days, AM/PM slots), a detail table, and a
 * project legend. Designed for `window.print()` from the browser — the user
 * saves as PDF via the native print dialog.
 *
 * URL params:
 *   ?start=YYYY-MM-DD&end=YYYY-MM-DD   explicit range
 *   (none)                              use active planning window, or today+7
 *   ?auto=1                             auto-trigger window.print() on load
 */

import { getAllPieces, getProjects } from "@/lib/data/store";
import { getRobots } from "@/lib/data/programs";
import { getActivePlanningWindow } from "@/lib/data/planning-window";
import { PrintGantt } from "@/components/calendar/print/print-gantt";
import { PrintTable } from "@/components/calendar/print/print-table";
import { PrintLegend } from "@/components/calendar/print/print-legend";
import { AutoPrint } from "@/components/calendar/print/auto-print";
import type { Piece, Project, Robot } from "@/lib/types";

export const dynamic = "force-dynamic";

// --- date helpers ---------------------------------------------------------

function parseISO(s: string | undefined): Date | null {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
}

function toISO(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysUTC(d: Date, n: number): Date {
  const copy = new Date(d);
  copy.setUTCDate(copy.getUTCDate() + n);
  return copy;
}

function formatPtShort(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}`;
}

function formatPtFull(d: Date): string {
  const day = String(d.getUTCDate()).padStart(2, "0");
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const year = d.getUTCFullYear();
  return `${day}/${month}/${year}`;
}

function formatTimestamp(d: Date): string {
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${formatPtFull(d)} ${hh}:${mm}`;
}

// --- page -----------------------------------------------------------------

interface SearchParams {
  start?: string;
  end?: string;
  auto?: string;
}

export default async function CalendarPrintPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;

  const [pieces, projects, robots, planningWindow] = await Promise.all([
    getAllPieces(),
    getProjects(),
    getRobots(),
    getActivePlanningWindow(),
  ]);

  // Resolve range: explicit params > active window > today+7
  let startDate = parseISO(sp.start);
  let endDate = parseISO(sp.end);

  if (!startDate || !endDate) {
    if (planningWindow) {
      startDate = parseISO(planningWindow.start_date);
      endDate = parseISO(planningWindow.end_date);
    }
  }
  if (!startDate || !endDate) {
    const today = new Date();
    const todayUTC = new Date(
      Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
    );
    startDate = todayUTC;
    endDate = addDaysUTC(todayUTC, 6);
  }
  if (endDate < startDate) {
    endDate = addDaysUTC(startDate, 6);
  }

  const startISO = toISO(startDate);
  const endISO = toISO(endDate);

  // Build day list
  const days: { date: string; display: string; dayOfWeek: number }[] = [];
  {
    let cursor = new Date(startDate);
    while (cursor <= endDate) {
      const iso = toISO(cursor);
      const dow = cursor.getUTCDay();
      days.push({ date: iso, display: formatPtShort(cursor), dayOfWeek: dow });
      cursor = addDaysUTC(cursor, 1);
    }
  }

  // Filter pieces that intersect the range
  // - Gantt uses scheduled_date (hard allocation, M/T == AM/PM)
  // - Table prefers planned_* range; falls back to scheduled if not set
  const scheduledInRange: Piece[] = pieces.filter((p) => {
    if (!p.robot_id || !p.scheduled_date) return false;
    return p.scheduled_date >= startISO && p.scheduled_date <= endISO;
  });

  // For the table: union of scheduled + planned within range
  const tableRows: Piece[] = pieces.filter((p) => {
    if (!p.robot_id) return false;
    const hasPlanned = !!p.planned_start_date && !!p.planned_end_date;
    if (hasPlanned) {
      // Range overlap check
      return !(
        p.planned_end_date! < startISO || p.planned_start_date! > endISO
      );
    }
    if (p.scheduled_date) {
      return p.scheduled_date >= startISO && p.scheduled_date <= endISO;
    }
    return false;
  });

  // Project lookup
  const projectMap: Record<string, Project> = {};
  for (const p of projects) projectMap[p.id] = p;

  // Projects present in the range (for legend)
  const projectIdsInRange = new Set<string>();
  for (const p of tableRows) projectIdsInRange.add(p.project_id);
  const projectsInRange = projects.filter((p) => projectIdsInRange.has(p.id));

  // Count pieces per project (for legend)
  const pieceCountByProject = new Map<string, number>();
  for (const p of tableRows) {
    pieceCountByProject.set(
      p.project_id,
      (pieceCountByProject.get(p.project_id) ?? 0) + 1,
    );
  }

  const printedAt = formatTimestamp(new Date());
  const autoPrint = sp.auto === "1";

  return (
    <div className="print-page">
      {autoPrint ? <AutoPrint /> : null}

      {/* Header */}
      <header className="print-header">
        <div>
          <h1 className="print-title">Curval Metalworks — Planeamento de Robots</h1>
          <p className="print-subtitle">
            Janela de planeamento: {formatPtFull(startDate)} a {formatPtFull(endDate)}
            {planningWindow?.label ? ` · ${planningWindow.label}` : ""}
          </p>
        </div>
        <div className="print-printed-at">
          <span className="print-label">Impresso em</span>
          <span>{printedAt}</span>
        </div>
      </header>

      {/* Gantt */}
      <section className="print-gantt-section">
        <h2 className="print-section-title">Gantt — Ocupação por Robot</h2>
        <PrintGantt
          robots={robots}
          days={days}
          pieces={scheduledInRange}
          projectMap={projectMap}
        />
      </section>

      {/* Legend */}
      <section className="print-legend-section">
        <h2 className="print-section-title">Legenda</h2>
        <PrintLegend
          projects={projectsInRange}
          counts={pieceCountByProject}
        />
      </section>

      {/* Detail table */}
      <section className="print-table-section">
        <h2 className="print-section-title">Detalhe de Peças Planeadas</h2>
        <PrintTable
          pieces={tableRows}
          robots={robots}
          projectMap={projectMap}
        />
      </section>

      {/* Footer (printed on last page) */}
      <footer className="print-footer">
        <span>Curval Metalworks · WeldSync</span>
        <span>{tableRows.length} peça(s) no intervalo</span>
      </footer>
    </div>
  );
}
