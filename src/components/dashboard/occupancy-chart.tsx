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
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Ocupação dos Robots
        </h2>
        <div className="flex rounded-lg border border-zinc-200 overflow-hidden">
          <button
            type="button"
            onClick={() => setPeriod("week")}
            className={`px-3 py-1.5 text-xs font-medium min-h-[36px] transition-colors ${
              period === "week"
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Semana
          </button>
          <button
            type="button"
            onClick={() => setPeriod("month")}
            className={`px-3 py-1.5 text-xs font-medium min-h-[36px] transition-colors ${
              period === "month"
                ? "bg-zinc-900 text-white"
                : "bg-white text-zinc-600 hover:bg-zinc-50"
            }`}
          >
            Mês
          </button>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart
          data={data}
          margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
          <XAxis
            dataKey="robotName"
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={{ stroke: "#e4e4e7" }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#71717a" }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e4e4e7",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            }}
            formatter={(value, name) => [
              `${value} meios-dias`,
              name === "occupiedSlots" ? "Ocupado" : "Disponível",
            ]}
            labelFormatter={(label) => `${label}`}
          />
          <Legend
            formatter={(value) =>
              value === "occupiedSlots" ? "Ocupado" : "Disponível"
            }
            wrapperStyle={{ fontSize: 11 }}
          />
          <Bar
            dataKey="occupiedSlots"
            stackId="a"
            fill="#3B82F6"
            radius={[0, 0, 0, 0]}
            name="occupiedSlots"
          />
          <Bar
            dataKey="availableSlots"
            stackId="a"
            fill="#E4E4E7"
            radius={[4, 4, 0, 0]}
            name="availableSlots"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
