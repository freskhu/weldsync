import {
  getAllPieces,
  getProjects,
  getUserDisplayNames,
} from "@/lib/data/store";
import { getRobots } from "@/lib/data/programs";
import { getActivePlanningWindow } from "@/lib/data/planning-window";
import { KanbanBoard } from "@/components/planning/kanban-board";
import { PlanningWindowBar } from "@/components/planning/planning-window-bar";

export default async function PlanningPage() {
  const [pieces, projects, robots, planningWindow] = await Promise.all([
    getAllPieces(),
    getProjects(),
    getRobots(),
    getActivePlanningWindow(),
  ]);

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
  const userMap = await getUserDisplayNames(userIds);

  return (
    <div className="p-4 md:p-6 h-screen flex flex-col">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Programação</h1>
      <div className="mb-4 flex-shrink-0">
        <PlanningWindowBar window={planningWindow} />
      </div>
      <KanbanBoard
        initialPieces={pieces}
        projectMap={projectMap}
        robotMap={robotMap}
        robots={robots}
        userMap={userMap}
      />
    </div>
  );
}
