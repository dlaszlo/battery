"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import AppShell from "@/components/layout/AppShell";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import { formatCapacity, formatDate, capacityPercent, formatResistance } from "@/lib/utils";
import type { Cell, Language } from "@/lib/types";

export default function ComparePage() {
  const cells = useBatteryStore((s) => s.cells);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [filterCurrent, setFilterCurrent] = useState<number | "all">("all");

  const selectedCells = useMemo(
    () => selectedIds.map((id) => cells.find((c) => c.id === id)).filter(Boolean) as Cell[],
    [selectedIds, cells]
  );

  // Cells with at least one measurement, filtered by search
  const availableCells = useMemo(() => {
    const q = search.toLowerCase();
    return cells
      .filter((c) => c.measurements.length > 0)
      .filter((c) =>
        !q ||
        c.id.toLowerCase().includes(q) ||
        c.brand.toLowerCase().includes(q) ||
        (c.model || "").toLowerCase().includes(q) ||
        (c.group || "").toLowerCase().includes(q)
      );
  }, [cells, search]);

  // All discharge currents across selected cells
  const allCurrents = useMemo(() => {
    const currents = new Set<number>();
    selectedCells.forEach((c) => c.measurements.forEach((m) => currents.add(m.dischargeCurrent)));
    return [...currents].sort((a, b) => a - b);
  }, [selectedCells]);

  const toggleCell = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
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
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("compare.select", lang)}</h3>
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
                return (
                  <button
                    key={c.id}
                    onClick={() => toggleCell(c.id)}
                    className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-blue-600 text-white"
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
            {/* Current filter */}
            {allCurrents.length > 1 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t("compare.atCurrent", lang)}:</span>
                <button
                  onClick={() => setFilterCurrent("all")}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    filterCurrent === "all"
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {t("chart.allCurrents", lang)}
                </button>
                {allCurrents.map((c) => (
                  <button
                    key={c}
                    onClick={() => setFilterCurrent(c)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      filterCurrent === c
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-400"
                    }`}
                  >
                    {c} mA
                  </button>
                ))}
              </div>
            )}

            {/* Comparison table */}
            <CompareTable
              cells={selectedCells}
              filterCurrent={filterCurrent}
              lang={lang}
              onRemove={(id) => setSelectedIds((prev) => prev.filter((x) => x !== id))}
            />

            {/* Best pairs */}
            <BestPairs cells={selectedCells} lang={lang} />
          </>
        )}
      </div>
    </AppShell>
  );
}

function CompareTable({
  cells,
  filterCurrent,
  lang,
  onRemove,
}: {
  cells: Cell[];
  filterCurrent: number | "all";
  lang: Language;
  onRemove: (id: string) => void;
}) {
  const rows = useMemo(() => {
    return cells.map((cell) => {
      const ms = filterCurrent === "all"
        ? cell.measurements
        : cell.measurements.filter((m) => m.dischargeCurrent === filterCurrent);

      const bestCapacity = ms.length > 0 ? Math.max(...ms.map((m) => m.measuredCapacity)) : null;
      const latestM = ms.length > 0 ? ms.reduce((a, b) => (a.date > b.date ? a : b)) : null;
      const resistances = ms.filter((m) => m.internalResistance != null);
      const avgResistance = resistances.length > 0
        ? Math.round(resistances.reduce((s, m) => s + m.internalResistance!, 0) / resistances.length * 10) / 10
        : null;

      return {
        cell,
        bestCapacity,
        retention: bestCapacity != null ? capacityPercent(bestCapacity, cell.nominalCapacity) : null,
        avgResistance,
        lastDate: latestM?.date ?? null,
        measurementCount: ms.length,
      };
    });
  }, [cells, filterCurrent]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-x-auto dark:border-gray-700 dark:bg-gray-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
            <th className="px-4 py-3">{t("table.id", lang)}</th>
            <th className="px-4 py-3">{t("table.brand", lang)}</th>
            <th className="px-4 py-3">{t("table.capacity", lang)}</th>
            <th className="px-4 py-3">{t("compare.bestCapacity", lang)}</th>
            <th className="px-4 py-3">{t("compare.retention", lang)}</th>
            <th className="px-4 py-3 hidden sm:table-cell">{t("compare.resistance", lang)}</th>
            <th className="px-4 py-3 hidden md:table-cell">{t("compare.lastMeasured", lang)}</th>
            <th className="px-4 py-3 w-10"></th>
          </tr>
        </thead>
        <tbody className="divide-y dark:divide-gray-700">
          {rows.map(({ cell, bestCapacity, retention, avgResistance, lastDate }) => (
            <tr key={cell.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
              <td className="px-4 py-3">
                <Link href={`/cells?id=${cell.id}`} className="font-medium text-blue-600 hover:underline dark:text-blue-400">
                  #{cell.id}
                </Link>
              </td>
              <td className="px-4 py-3 text-gray-900 dark:text-gray-100">
                {cell.brand}{cell.model ? ` ${cell.model}` : ""}
              </td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatCapacity(cell.nominalCapacity)}</td>
              <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                {bestCapacity != null ? formatCapacity(bestCapacity) : "—"}
              </td>
              <td className="px-4 py-3">
                {retention != null ? (
                  <span className={`font-medium ${retention >= 80 ? "text-green-600" : retention >= 60 ? "text-amber-600" : "text-red-600"}`}>
                    {retention}%
                  </span>
                ) : "—"}
              </td>
              <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-300">
                {avgResistance != null ? formatResistance(avgResistance) : "—"}
              </td>
              <td className="px-4 py-3 hidden md:table-cell text-gray-500 dark:text-gray-400">
                {lastDate ? formatDate(lastDate) : "—"}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => onRemove(cell.id)}
                  className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                  title={t("compare.remove", lang)}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BestPairs({ cells, lang }: { cells: Cell[]; lang: Language }) {
  const pairs = useMemo(() => {
    // Find the best capacity per cell per discharge current
    const cellBests = new Map<string, Map<number, number>>();
    cells.forEach((cell) => {
      const byCurrent = new Map<number, number>();
      cell.measurements.forEach((m) => {
        const prev = byCurrent.get(m.dischargeCurrent) ?? 0;
        if (m.measuredCapacity > prev) byCurrent.set(m.dischargeCurrent, m.measuredCapacity);
      });
      cellBests.set(cell.id, byCurrent);
    });

    // Find all pairs at each current
    const results: { cellA: Cell; cellB: Cell; current: number; capA: number; capB: number; diff: number }[] = [];

    const currents = new Set<number>();
    cellBests.forEach((byCurrent) => byCurrent.forEach((_, c) => currents.add(c)));

    currents.forEach((current) => {
      const cellsAtCurrent: { cell: Cell; cap: number }[] = [];
      cells.forEach((cell) => {
        const cap = cellBests.get(cell.id)?.get(current);
        if (cap != null) cellsAtCurrent.push({ cell, cap });
      });

      // Generate all pairs
      for (let i = 0; i < cellsAtCurrent.length; i++) {
        for (let j = i + 1; j < cellsAtCurrent.length; j++) {
          const a = cellsAtCurrent[i];
          const b = cellsAtCurrent[j];
          results.push({
            cellA: a.cell,
            cellB: b.cell,
            current,
            capA: a.cap,
            capB: b.cap,
            diff: Math.abs(a.cap - b.cap),
          });
        }
      }
    });

    // Sort by smallest difference
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
