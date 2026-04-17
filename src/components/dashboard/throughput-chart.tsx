"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface ThroughputWeek {
  weekLabel: string;
  count: number;
}

interface ThroughputChartProps {
  data: ThroughputWeek[];
}

export function ThroughputChart({ data }: ThroughputChartProps) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-zinc-900 mb-4">
        Throughput Semanal
      </h2>
      {data.every((d) => d.count === 0) ? (
        <div className="flex items-center justify-center h-[220px] text-sm text-zinc-400">
          Sem dados de produção
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart
            data={data}
            margin={{ top: 0, right: 8, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
            <XAxis
              dataKey="weekLabel"
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
              formatter={(value) => [
                `${value} peça${value !== 1 ? "s" : ""}`,
                "Concluídas",
              ]}
              labelFormatter={(label) => `Semana de ${label}`}
            />
            <Line
              type="monotone"
              dataKey="count"
              stroke="#3B82F6"
              strokeWidth={2}
              dot={{ fill: "#3B82F6", r: 3 }}
              activeDot={{ r: 5, fill: "#3B82F6" }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
