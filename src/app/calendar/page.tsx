import { getAllPieces, getProjects } from "@/lib/data/store";
import { getRobots } from "@/lib/data/programs";
import { getActivePlanningWindow } from "@/lib/data/planning-window";
import { CalendarViews } from "@/components/calendar/calendar-views";
import { PlanningWindowBar } from "@/components/planning/planning-window-bar";

export default async function CalendarPage() {
  const [pieces, projects, robots, planningWindow] = await Promise.all([
    getAllPieces(),
    getProjects(),
    getRobots(),
    getActivePlanningWindow(),
  ]);

  // Build project lookup map for the client component
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

  return (
    <div className="p-4 md:p-6 h-screen flex flex-col">
      <h1 className="text-2xl font-bold text-zinc-900 mb-4">Calendário</h1>
      <div className="mb-4 flex-shrink-0">
        <PlanningWindowBar window={planningWindow} />
      </div>
      <CalendarViews
        pieces={pieces}
        robots={robots}
        projectMap={projectMap}
        planningWindow={planningWindow}
      />
    </div>
  );
}
