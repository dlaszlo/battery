"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatCapacity, formatDate, capacityPercent, formatResistance } from "@/lib/utils";
import type { Cell, Language } from "@/lib/types";

const MAX_COMPARE = 5;

export default function ComparePage() {
  const allCells = useBatteryStore((s) => s.cells);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");

  const selectedCells = useMemo(
    () => selectedIds.map((id) => allCells.find((c) => c.id === id)).filter(Boolean) as Cell[],
    [selectedIds, allCells]
  );

  const availableCells = useMemo(() => {
    const q = search.toLowerCase();
    return allCells.filter((c) =>
      !q ||
      c.id.toLowerCase().includes(q) ||
      c.brand.toLowerCase().includes(q) ||
      (c.model || "").toLowerCase().includes(q) ||
      (c.group || "").toLowerCase().includes(q)
    );
  }, [allCells, search]);

  const toggleCell = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_COMPARE) return prev;
      return [...prev, id];
    });
  };

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("compare.title", lang)}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("compare.subtitle", lang)}</p>
      </div>

      <div className="space-y-6">
        {/* Cell selector */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b px-6 py-4 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">
              {t("compare.select", lang)}
              <span className="ml-2 text-xs font-normal text-gray-500">
                ({selectedIds.length}/{MAX_COMPARE})
              </span>
            </h3>
          </div>
          <div className="px-6 py-4">
            <input
              type="text"
              placeholder={t("compare.selectPlaceholder", lang)}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="mb-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100"
            />
            <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
              {availableCells.map((c) => {
                const isSelected = selectedIds.includes(c.id);
                const isDisabled = !isSelected && selectedIds.length >= MAX_COMPARE;
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCell(c.id)}
                    disabled={isDisabled}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white"
                        : isDisabled
                        ? "bg-gray-50 text-gray-300 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    }`}
                  >
                    #{c.id} {c.brand}{c.model ? ` ${c.model}` : ""} ({formatCapacity(c.nominalCapacity)})
                  </button>
                );
              })}
              {availableCells.length === 0 && (
                <p className="text-sm text-gray-400">{t("cells.noResults", lang)}</p>
              )}
            </div>
          </div>
        </div>

        {selectedCells.length < 2 ? (
          <p className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">{t("compare.noSelection", lang)}</p>
        ) : (
          <>
            <ProductCompareTable
              cells={selectedCells}
              lang={lang}
              onRemove={(id) => setSelectedIds((prev) => prev.filter((x) => x !== id))}
            />
            <BestPairs cells={selectedCells} lang={lang} />
          </>
        )}
      </div>
    </AppShell>
  );
}

// --- Product-style comparison table ---

interface CellStats {
  cell: Cell;
  bestCapacity: number | null;
  latestCapacity: number | null;
  retention: number | null;
  avgResistance: number | null;
  minResistance: number | null;
  avgWeight: number | null;
  measurementCount: number;
  lastDate: string | null;
}

function computeStats(cell: Cell): CellStats {
  const ms = cell.measurements;
  const bestCapacity = ms.length > 0 ? Math.max(...ms.map((m) => m.measuredCapacity)) : null;
  const latest = ms.length > 0 ? ms.reduce((a, b) => (a.date > b.date ? a : b)) : null;
  const resistances = ms.filter((m) => m.internalResistance != null);
  const avgResistance = resistances.length > 0
    ? Math.round(resistances.reduce((s, m) => s + m.internalResistance!, 0) / resistances.length * 10) / 10
    : null;
  const minResistance = resistances.length > 0
    ? Math.min(...resistances.map((m) => m.internalResistance!))
    : null;
  const weights = ms.filter((m) => m.weight != null);
  const avgWeight = weights.length > 0
    ? Math.round(weights.reduce((s, m) => s + m.weight!, 0) / weights.length * 10) / 10
    : null;

  return {
    cell,
    bestCapacity,
    latestCapacity: latest?.measuredCapacity ?? null,
    retention: bestCapacity != null ? capacityPercent(bestCapacity, cell.nominalCapacity) : null,
    avgResistance,
    minResistance,
    avgWeight,
    measurementCount: ms.length,
    lastDate: latest?.date ?? null,
  };
}

type CompareRow = {
  labelKey: string;
  getValue: (stats: CellStats, lang: Language) => string;
  highlight?: "highest" | "lowest";
  getNumeric?: (stats: CellStats) => number | null;
};

const COMPARE_ROWS: CompareRow[] = [
  { labelKey: "compare.row.brand", getValue: (s) => s.cell.brand },
  { labelKey: "compare.row.model", getValue: (s) => s.cell.model || "—" },
  { labelKey: "compare.row.formFactor", getValue: (s) => s.cell.formFactor },
  { labelKey: "compare.row.chemistry", getValue: (s) => s.cell.chemistry },
  { labelKey: "compare.row.status", getValue: (s) => s.cell.status },
  {
    labelKey: "compare.row.nominalCapacity",
    getValue: (s) => formatCapacity(s.cell.nominalCapacity),
  },
  {
    labelKey: "compare.row.bestCapacity",
    getValue: (s) => s.bestCapacity != null ? formatCapacity(s.bestCapacity) : "—",
    highlight: "highest",
    getNumeric: (s) => s.bestCapacity,
  },
  {
    labelKey: "compare.row.latestCapacity",
    getValue: (s) => s.latestCapacity != null ? formatCapacity(s.latestCapacity) : "—",
  },
  {
    labelKey: "compare.row.retention",
    getValue: (s) => s.retention != null ? `${s.retention}%` : "—",
    highlight: "highest",
    getNumeric: (s) => s.retention,
  },
  {
    labelKey: "compare.row.avgResistance",
    getValue: (s) => s.avgResistance != null ? formatResistance(s.avgResistance) : "—",
    highlight: "lowest",
    getNumeric: (s) => s.avgResistance,
  },
  {
    labelKey: "compare.row.minResistance",
    getValue: (s) => s.minResistance != null ? formatResistance(s.minResistance) : "—",
    highlight: "lowest",
    getNumeric: (s) => s.minResistance,
  },
  {
    labelKey: "compare.row.weight",
    getValue: (s) => s.avgWeight != null ? `${s.avgWeight} g` : "—",
  },
  {
    labelKey: "compare.row.measurements",
    getValue: (s) => s.measurementCount.toString(),
  },
  {
    labelKey: "compare.row.lastMeasured",
    getValue: (s) => s.lastDate ? formatDate(s.lastDate) : "—",
  },
];

function ProductCompareTable({
  cells,
  lang,
  onRemove,
}: {
  cells: Cell[];
  lang: Language;
  onRemove: (id: string) => void;
}) {
  const allStats = useMemo(() => cells.map(computeStats), [cells]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto dark:border-gray-700 dark:bg-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-900">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400 min-w-[140px] sticky left-0 bg-gray-50 dark:bg-gray-900 z-10">
              {t("compare.property", lang)}
            </th>
            {cells.map((cell) => (
              <th key={cell.id} className="px-4 py-3 text-center min-w-[130px]">
                <div className="flex flex-col items-center gap-1">
                  <Link href={`/cells?id=${cell.id}`} className="text-sm font-semibold text-blue-600 hover:underline dark:text-blue-400">
                    #{cell.id}
                  </Link>
                  <button
                    onClick={() => onRemove(cell.id)}
                    className="rounded p-0.5 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    title={t("compare.remove", lang)}
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          {COMPARE_ROWS.map((row) => {
            const bestIdx = getBestIndex(allStats, row);

            return (
              <tr key={row.labelKey} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-4 py-2.5 text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-400 sticky left-0 bg-white dark:bg-gray-800 z-10">
                  {t(row.labelKey as Parameters<typeof t>[0], lang)}
                </td>
                {allStats.map((stats, i) => (
                  <td
                    key={stats.cell.id}
                    className={`px-4 py-2.5 text-center text-gray-900 dark:text-gray-100 ${
                      bestIdx === i ? "font-semibold text-green-600 dark:text-green-400" : ""
                    }`}
                  >
                    {row.getValue(stats, lang)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function getBestIndex(allStats: CellStats[], row: CompareRow): number | null {
  if (!row.highlight || !row.getNumeric) return null;
  let bestIdx: number | null = null;
  let bestVal: number | null = null;

  allStats.forEach((stats, i) => {
    const val = row.getNumeric!(stats);
    if (val == null) return;
    if (bestVal == null) {
      bestVal = val;
      bestIdx = i;
      return;
    }
    if (row.highlight === "highest" && val > bestVal) {
      bestVal = val;
      bestIdx = i;
    } else if (row.highlight === "lowest" && val < bestVal) {
      bestVal = val;
      bestIdx = i;
    }
  });

  return bestIdx;
}

// --- Best pairs ---

function BestPairs({ cells, lang }: { cells: Cell[]; lang: Language }) {
  const pairs = useMemo(() => {
    const cellBests = new Map<string, Map<number, number>>();
    cells.forEach((cell) => {
      const byCurrent = new Map<number, number>();
      cell.measurements.forEach((m) => {
        const prev = byCurrent.get(m.dischargeCurrent) ?? 0;
        if (m.measuredCapacity > prev) byCurrent.set(m.dischargeCurrent, m.measuredCapacity);
      });
      cellBests.set(cell.id, byCurrent);
    });

    const results: { cellA: Cell; cellB: Cell; current: number; capA: number; capB: number; diff: number }[] = [];
    const currents = new Set<number>();
    cellBests.forEach((byCurrent) => byCurrent.forEach((_, c) => currents.add(c)));

    currents.forEach((current) => {
      const cellsAtCurrent: { cell: Cell; cap: number }[] = [];
      cells.forEach((cell) => {
        const cap = cellBests.get(cell.id)?.get(current);
        if (cap != null) cellsAtCurrent.push({ cell, cap });
      });

      for (let i = 0; i < cellsAtCurrent.length; i++) {
        for (let j = i + 1; j < cellsAtCurrent.length; j++) {
          const a = cellsAtCurrent[i];
          const b = cellsAtCurrent[j];
          results.push({
            cellA: a.cell, cellB: b.cell, current,
            capA: a.cap, capB: b.cap, diff: Math.abs(a.cap - b.cap),
          });
        }
      }
    });

    results.sort((a, b) => a.diff - b.diff);
    return results.slice(0, 10);
  }, [cells]);

  if (pairs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 p-6">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">{t("compare.bestPairs", lang)}</h3>
        <p className="text-sm text-gray-400">{t("compare.noPairs", lang)}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b px-6 py-4 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("compare.bestPairs", lang)}</h3>
        <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{t("compare.bestPairsDesc", lang)}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              <th className="px-4 py-2.5">#1</th>
              <th className="px-4 py-2.5">#2</th>
              <th className="px-4 py-2.5">{t("compare.atCurrent", lang)}</th>
              <th className="px-4 py-2.5">{t("compare.difference", lang)}</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">{t("compare.matchScore", lang)}</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {pairs.map((p, i) => {
              const avgCap = (p.capA + p.capB) / 2;
              const matchPct = avgCap > 0 ? Math.round((1 - p.diff / avgCap) * 100) : 0;
              return (
                <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2.5">
                    <Link href={`/cells?id=${p.cellA.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      #{p.cellA.id}
                    </Link>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({formatCapacity(p.capA)})</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <Link href={`/cells?id=${p.cellB.id}`} className="text-blue-600 hover:underline dark:text-blue-400">
                      #{p.cellB.id}
                    </Link>
                    <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">({formatCapacity(p.capB)})</span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{p.current} mA</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">{formatCapacity(p.diff)}</td>
                  <td className="px-4 py-2.5 hidden sm:table-cell">
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      matchPct >= 98
                        ? "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
                        : matchPct >= 95
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                        : matchPct >= 90
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300"
                        : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                    }`}>
                      {matchPct}%
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
