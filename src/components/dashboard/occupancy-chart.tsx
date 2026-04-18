"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface OccupancyData {
  robotName: string;
  occupiedSlots: number;
  availableSlots: number;
  totalSlots: number;
}

interface OccupancyChartProps {
  weekData: OccupancyData[];
  monthData: OccupancyData[];
}

export function OccupancyChart({ weekData, monthData }: OccupancyChartProps) {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const data = period === "week" ? weekData : monthData;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
          Ocupacao dos Robots
        </h2>
        <div className="inline-flex rounded-[10px] bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-[8px] min-h-[32px] transition-all ${
              period === "week"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-[8px] min-h-[32px] transition-all ${
              period === "month"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Mes
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis
            dataKey="robotName"
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 10,
              border: "1px solid #e2e8f0",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.07)",
            }}
            formatter={(value, name) => [
              `${value} meios-dias`,
              name === "occupiedSlots" ? "Ocupado" : "Disponivel",
            ]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend
            formatter={(value) =>
              value === "occupiedSlots" ? "Ocupado" : "Disponivel"
            }
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar
            dataKey="occupiedSlots"
            stackId="a"
            fill="#6366f1"
            radius={[0, 0, 0, 0]}
            name="occupiedSlots"
          />
          <Bar
            dataKey="availableSlots"
            stackId="a"
            fill="#e2e8f0"
            radius={[6, 6, 0, 0]}
            name="availableSlots"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
