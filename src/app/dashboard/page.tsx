import {
  getRobotOccupancyAsync,
  getPipelineCounts,
  getDeadlineAlerts,
  getThroughput,
} from "@/lib/data/dashboard";
import { OccupancyChart } from "@/components/dashboard/occupancy-chart";
import { PipelineCards } from "@/components/dashboard/pipeline-cards";
import { DeadlineAlerts } from "@/components/dashboard/deadline-alerts";
import { ThroughputChart } from "@/components/dashboard/throughput-chart";

export default async function DashboardPage() {
  const [weekOccupancy, monthOccupancy, pipeline, alerts, throughput] =
    await Promise.all([
      getRobotOccupancyAsync("week"),
      getRobotOccupancyAsync("month"),
      getPipelineCounts(),
      getDeadlineAlerts(7),
      getThroughput(8),
    ]);

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-zinc-900 mb-6">Dashboard</h1>

      {/* Pipeline counters — full width row */}
      <div className="mb-6">
        <PipelineCards counts={pipeline} />
      </div>

      {/* 2x2 grid: charts + alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <OccupancyChart weekData={weekOccupancy} monthData={monthOccupancy} />
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5">
          <DeadlineAlerts alerts={alerts} />
        </div>
        <div className="bg-white rounded-xl border border-zinc-200 shadow-sm p-5 lg:col-span-2">
          <ThroughputChart data={throughput} />
        </div>
      </div>
    </div>
  );
}
