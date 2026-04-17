import { getAllPieces, getProjects } from "@/lib/data/store";
import { getRobots } from "@/lib/data/programs";
import { GanttChart } from "@/components/gantt/gantt-chart";

export default async function CalendarPage() {
  const [pieces, projects, robots] = await Promise.all([
    Promise.resolve(getAllPieces()),
    Promise.resolve(getProjects()),
    getRobots(),
  ]);

  // Build project lookup map for the client component
  const projectMap: Record<string, { name: string; color: string }> = {};
  for (const p of projects) {
    projectMap[p.id] = { name: p.name, color: p.color };
  }

  return (
    <div className="p-6 h-screen flex flex-col">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Calendário</h1>
      <GanttChart pieces={pieces} robots={robots} projectMap={projectMap} />
    </div>
  );
}
