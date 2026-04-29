import { getRobots } from "@/lib/data/programs";
import { getPiecesByRobot } from "@/lib/data/store";
import { RobotCards } from "@/components/robots/robot-cards";

export default async function RobotsPage() {
  let robots;
  try { robots = await getRobots(); }
  catch (e) { console.error("[robots] getRobots failed:", e); throw new Error(`robots.getRobots: ${e instanceof Error ? e.message : String(e)}`); }

  // Build allocation data for each robot
  const robotAllocations: Record<
    number,
    { reference: string; description: string | null; scheduled_date: string | null; weight_kg: number | null }[]
  > = {};
  for (const robot of robots) {
    let pieces;
    try { pieces = await getPiecesByRobot(robot.id); }
    catch (e) { console.error(`[robots] getPiecesByRobot(${robot.id}) failed:`, e); throw new Error(`robots.getPiecesByRobot(${robot.id}): ${e instanceof Error ? e.message : String(e)}`); }
    robotAllocations[robot.id] = pieces.map((p) => ({
      reference: p.reference,
      description: p.description,
      scheduled_date: p.scheduled_date,
      weight_kg: p.weight_kg,
    }));
  }

  return (
    <div className="p-4 md:p-6">
      <RobotCards robots={robots} allocations={robotAllocations} />
    </div>
  );
}
