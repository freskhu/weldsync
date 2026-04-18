import { getRobots } from "@/lib/data/programs";
import { getPiecesByRobot } from "@/lib/data/store";
import { RobotCards } from "@/components/robots/robot-cards";

export default async function RobotsPage() {
  const robots = await getRobots();

  // Build allocation data for each robot
  const robotAllocations: Record<
    number,
    { reference: string; description: string | null; scheduled_date: string | null; weight_kg: number | null }[]
  > = {};
  for (const robot of robots) {
    const pieces = await getPiecesByRobot(robot.id);
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
