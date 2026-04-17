import { getAllPieces, getProjects } from "@/lib/data/store";
import { getRobots } from "@/lib/data/programs";
import { KanbanBoard } from "@/components/planning/kanban-board";

export default async function PlanningPage() {
  const [pieces, projects, robots] = await Promise.all([
    Promise.resolve(getAllPieces()),
    Promise.resolve(getProjects()),
    getRobots(),
  ]);

  // Build lookup maps for the client component
  const projectMap: Record<string, { name: string; color: string }> = {};
  for (const p of projects) {
    projectMap[p.id] = { name: p.name, color: p.color };
  }

  const robotMap: Record<number, string> = {};
  for (const r of robots) {
    robotMap[r.id] = r.name;
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Planeamento</h1>
      <KanbanBoard
        initialPieces={pieces}
        projectMap={projectMap}
        robotMap={robotMap}
        robots={robots}
      />
    </div>
  );
}
