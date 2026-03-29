"use client";

import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from "recharts";
import type { Measurement } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import type { Language } from "@/lib/types";

interface CapacityChartProps {
  measurements: Measurement[];
  nominalCapacity: number;
  scrapThreshold: number;
}

const LINE_COLORS = [
  "#3b82f6", // blue
  "#f59e0b", // amber
  "#10b981", // emerald
  "#8b5cf6", // violet
  "#ef4444", // red
  "#06b6d4", // cyan
  "#f97316", // orange
  "#ec4899", // pink
];

export default function CapacityChart({ measurements, nominalCapacity, scrapThreshold }: CapacityChartProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

  // Get unique discharge currents
  const dischargeCurents = useMemo(() => {
    const currents = [...new Set(measurements.map((m) => m.dischargeCurrent))].sort((a, b) => a - b);
    return currents;
  }, [measurements]);

  const hasMultipleCurrents = dischargeCurents.length > 1;
  const [selectedCurrent, setSelectedCurrent] = useState<number | "all">("all");

  // Filter measurements by selected current
  const filtered = useMemo(() => {
    if (selectedCurrent === "all") return measurements;
    return measurements.filter((m) => m.dischargeCurrent === selectedCurrent);
  }, [measurements, selectedCurrent]);

  if (measurements.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
        {t("chart.minDataRequired", lang)}
      </p>
    );
  }

  const thresholdValue = nominalCapacity * (scrapThreshold / 100);

  // If "all" selected and multiple currents, show separate lines per current
  if (selectedCurrent === "all" && hasMultipleCurrents) {
    // Build merged data: each data point has date + a capacity field per current
    const sorted = [...measurements].sort((a, b) => a.date.localeCompare(b.date));
    const dataMap = new Map<string, Record<string, number>>();

    sorted.forEach((m) => {
      const dateKey = m.date;
      if (!dataMap.has(dateKey)) {
        dataMap.set(dateKey, { _ts: new Date(m.date).getTime() });
      }
      const entry = dataMap.get(dateKey)!;
      entry[`c_${m.dischargeCurrent}`] = m.measuredCapacity;
    });

    const data = Array.from(dataMap.entries())
      .sort((a, b) => a[1]._ts - b[1]._ts)
      .map(([date, vals]) => ({
        date: formatDate(date),
        ...vals,
      }));

    return (
      <div>
        <CurrentFilter
          currents={dischargeCurents}
          selected={selectedCurrent}
          onChange={setSelectedCurrent}
          lang={lang}
        />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#f0f0f0"} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "#9ca3af" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9ca3af" }}
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
                  const current = name.replace("c_", "");
                  return [`${value} mAh`, `${current} mA`];
                }}
              />
              <Legend
                formatter={(value: string) => {
                  const current = value.replace("c_", "");
                  return `${current} mA`;
                }}
              />
              <ReferenceLine
                y={nominalCapacity}
                stroke="#3b82f6"
                strokeDasharray="5 5"
                label={{ value: t("chart.nominal", lang), position: "right", fontSize: 10, fill: "#3b82f6" }}
              />
              <ReferenceLine
                y={thresholdValue}
                stroke="#ef4444"
                strokeDasharray="5 5"
                label={{ value: t("chart.scrapBorder", lang), position: "right", fontSize: 10, fill: "#ef4444" }}
              />
              {dischargeCurents.map((current, i) => (
                <Line
                  key={current}
                  type="monotone"
                  dataKey={`c_${current}`}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={{ fill: LINE_COLORS[i % LINE_COLORS.length], r: 4 }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  }

  // Single current view (or only one current exists)
  if (filtered.length === 0) {
    return (
      <div>
        <CurrentFilter
          currents={dischargeCurents}
          selected={selectedCurrent}
          onChange={setSelectedCurrent}
          lang={lang}
        />
        <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
          {t("chart.noDataForCurrent", lang)}
        </p>
      </div>
    );
  }

  const sorted = [...filtered].sort((a, b) => a.date.localeCompare(b.date));
  const data = sorted.map((m) => ({
    date: formatDate(m.date),
    capacity: m.measuredCapacity,
  }));

  const lineColor = hasMultipleCurrents && selectedCurrent !== "all"
    ? LINE_COLORS[dischargeCurents.indexOf(selectedCurrent as number) % LINE_COLORS.length]
    : "#3b82f6";

  return (
    <div>
      {hasMultipleCurrents && (
        <CurrentFilter
          currents={dischargeCurents}
          selected={selectedCurrent}
          onChange={setSelectedCurrent}
          lang={lang}
        />
      )}
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#374151" : "#f0f0f0"} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#9ca3af" }}
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
              formatter={(value: number) => [`${value} mAh`, t("chart.capacity", lang)]}
            />
            <ReferenceLine
              y={nominalCapacity}
              stroke="#3b82f6"
              strokeDasharray="5 5"
              label={{ value: t("chart.nominal", lang), position: "right", fontSize: 10, fill: "#3b82f6" }}
            />
            <ReferenceLine
              y={thresholdValue}
              stroke="#ef4444"
              strokeDasharray="5 5"
              label={{ value: t("chart.scrapBorder", lang), position: "right", fontSize: 10, fill: "#ef4444" }}
            />
            <Line
              type="monotone"
              dataKey="capacity"
              stroke={lineColor}
              strokeWidth={2}
              dot={{ fill: lineColor, r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function CurrentFilter({
  currents,
  selected,
  onChange,
  lang,
}: {
  currents: number[];
  selected: number | "all";
  onChange: (v: number | "all") => void;
  lang: Language;
}) {
  return (
    <div className="mb-3 flex flex-wrap gap-1.5">
      <button
        onClick={() => onChange("all")}
        className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
          selected === "all"
            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
            : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
        }`}
      >
        {t("chart.allCurrents", lang)}
      </button>
      {currents.map((c, i) => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            selected === c
              ? "text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400 dark:hover:bg-gray-600"
          }`}
          style={selected === c ? { backgroundColor: LINE_COLORS[i % LINE_COLORS.length] } : undefined}
        >
          {c} mA
        </button>
      ))}
    </div>
  );
}
