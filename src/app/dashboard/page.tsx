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
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Vista geral do planeamento</p>
      </div>

      {/* Pipeline counters */}
      <div className="mb-8">
        <PipelineCards counts={pipeline} />
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <OccupancyChart weekData={weekOccupancy} monthData={monthOccupancy} />
        </div>
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-6" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <DeadlineAlerts alerts={alerts} />
        </div>
        <div className="bg-white rounded-[14px] border border-slate-200/80 p-6 lg:col-span-2" style={{ boxShadow: 'var(--shadow-sm)' }}>
          <ThroughputChart data={throughput} />
        </div>
      </div>
    </div>
  );
}
