"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { Measurement } from "@/lib/types";
import { formatDate } from "@/lib/utils";

interface CapacityChartProps {
  measurements: Measurement[];
  nominalCapacity: number;
  scrapThreshold: number;
}

export default function CapacityChart({ measurements, nominalCapacity, scrapThreshold }: CapacityChartProps) {
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  if (measurements.length < 2) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        Legalább 2 mérés szükséges a grafikon megjelenítéséhez.
      </p>
    );
  }

  const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
  const data = sorted.map((m) => ({
    date: formatDate(m.date),
    capacity: m.measuredCapacity,
    resistance: m.internalResistance,
  }));

  const thresholdValue = nominalCapacity * (scrapThreshold / 100);

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#f0f0f0"} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: isDark ? "#9ca3af" : "#9ca3af" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: isDark ? "#9ca3af" : "#9ca3af" }}
            tickLine={false}
            axisLine={false}
            domain={[0, "auto"]}
            unit=" mAh"
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: isDark ? "1px solid #374151" : "1px solid #e5e7eb",
              boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              backgroundColor: isDark ? "#1f2937" : "#ffffff",
              color: isDark ? "#f3f4f6" : "#111827",
            }}
            formatter={(value: number, name: string) => {
              if (name === "capacity") return [`${value} mAh`, "Kapacitás"];
              return [value, name];
            }}
          />
          <ReferenceLine
            y={nominalCapacity}
            stroke="#3b82f6"
            strokeDasharray="5 5"
            label={{ value: "Névleges", position: "right", fontSize: 10, fill: "#3b82f6" }}
          />
          <ReferenceLine
            y={thresholdValue}
            stroke="#ef4444"
            strokeDasharray="5 5"
            label={{ value: "Selejt határ", position: "right", fontSize: 10, fill: "#ef4444" }}
          />
          <Line
            type="monotone"
            dataKey="capacity"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
