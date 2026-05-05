import {
  getAllPieces,
  getProjects,
  getUserDisplayNames,
} from "@/lib/data/store";
import { getRobots } from "@/lib/data/programs";
import { getActivePlanningWindow } from "@/lib/data/planning-window";
import { KanbanBoard } from "@/components/planning/kanban-board";
import { PlanningWindowBar } from "@/components/planning/planning-window-bar";
import {
  PlanningTabs,
  type PlanningView,
} from "@/components/planning/planning-tabs";
import { ManualWeldList } from "@/components/planning/manual-weld-list";

interface PlanningPageProps {
  // Next 16 App Router: searchParams is async — must be awaited before use.
  searchParams?: Promise<{ view?: string }>;
}

function resolveView(raw: string | undefined): PlanningView {
  return raw === "manual" ? "manual" : "kanban";
}

export default async function PlanningPage({
  searchParams,
}: PlanningPageProps) {
  const params = (await searchParams) ?? {};
  const activeView = resolveView(params.view);

  let pieces, projects, robots, planningWindow;
  try {
    pieces = await getAllPieces();
  } catch (e) {
    console.error("[planning/page] getAllPieces failed:", e);
    throw new Error(
      `getAllPieces: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  try {
    projects = await getProjects();
  } catch (e) {
    console.error("[planning/page] getProjects failed:", e);
    throw new Error(
      `getProjects: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  try {
    robots = await getRobots();
  } catch (e) {
    console.error("[planning/page] getRobots failed:", e);
    throw new Error(
      `getRobots: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  try {
    planningWindow = await getActivePlanningWindow();
  } catch (e) {
    console.error("[planning/page] getActivePlanningWindow failed:", e);
    throw new Error(
      `getActivePlanningWindow: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  // Build lookup maps for the client component
  const projectMap: Record<
    string,
    { name: string; color: string; client_ref: string }
  > = {};
  for (const p of projects) {
    projectMap[p.id] = {
      name: p.name,
      color: p.color,
      client_ref: p.client_ref,
    };
  }

  const robotMap: Record<number, string> = {};
  for (const r of robots) {
    robotMap[r.id] = r.name;
  }

  // Resolve display names for the audit footer ("X mudou em DD/MM/YYYY").
  // Fail-soft: empty map on RPC error -> footer just hides.
  const userIds = pieces
    .map((p) => p.last_status_change_by)
    .filter((id): id is string => !!id);
  let userMap: Record<string, string> = {};
  try {
    userMap = await getUserDisplayNames(userIds);
  } catch (e) {
    console.error("[planning/page] getUserDisplayNames failed:", e);
    // fail-soft — empty map -> footer hides
  }

  // Pre-compute tab badges on the server so the client tab strip stays
  // dumb (no data fetching). `manual` count = pieces with status manual_weld.
  const manualWeldCount = pieces.filter(
    (p) => p.status === "manual_weld"
  ).length;

  return (
    <div className="p-4 md:p-6 h-[100dvh] flex flex-col">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Programação</h1>
      <PlanningTabs
        active={activeView}
        badges={{ manual: manualWeldCount > 0 ? manualWeldCount : undefined }}
      />
      {activeView === "kanban" ? (
        // KanbanBoard now owns the responsive layout for the toolbar:
        // - md+: renders the window bar inline above the filter strip
        // - <md: tucks both behind a "Filtros" drawer toggle so the
        //   4-column kanban gets all the vertical space.
        <KanbanBoard
          initialPieces={pieces}
          projectMap={projectMap}
          robotMap={robotMap}
          robots={robots}
          userMap={userMap}
          windowBar={<PlanningWindowBar window={planningWindow} />}
        />
      ) : (
        <ManualWeldList
          pieces={pieces}
          projectMap={projectMap}
          robots={robots}
        />
      )}
    </div>
  );
}
