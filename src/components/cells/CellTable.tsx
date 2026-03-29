"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCells } from "@/hooks/useCells";
import { useBatteryStore } from "@/lib/store";
import { formatCapacity } from "@/lib/utils";
import { t, enumLabel } from "@/lib/i18n";
import { CELL_STATUSES, CHEMISTRIES, FORM_FACTORS } from "@/lib/constants";
import type { CellStatus, Chemistry, FormFactor } from "@/lib/types";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import StatusBadge from "./StatusBadge";
import { loadImage, getCachedImageUrl } from "@/lib/image-utils";

type SortField = "id" | "brand" | "nominalCapacity" | "status" | "updatedAt" | "purchaseDate";

const MAX_COMPARE = 5;

export default function CellTable() {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CellStatus | "">("");
  const [chemistryFilter, setChemistryFilter] = useState<Chemistry | "">("");
  const [formFactorFilter, setFormFactorFilter] = useState<FormFactor | "">("");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const cells = useCells(
    { search, status: statusFilter, chemistry: chemistryFilter, formFactor: formFactorFilter },
    sortField,
    sortDir
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < MAX_COMPARE ? [...prev, id] : prev
    );
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1 dark:text-gray-600">↑↓</span>;
    return <span className="text-blue-600 ml-1 dark:text-blue-400">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const statusOptions = [{ value: "", label: `${t("table.status", lang)}: ${t("cells.all", lang)}` }, ...CELL_STATUSES.map((s) => ({ value: s, label: enumLabel("status", s, lang) }))];
  const chemOptions = [{ value: "", label: `${t("table.chemistry", lang)}: ${t("cells.all", lang)}` }, ...CHEMISTRIES.map((c) => ({ value: c, label: c }))];
  const ffOptions = [{ value: "", label: `${t("table.form", lang)}: ${t("cells.all", lang)}` }, ...FORM_FACTORS.map((f) => ({ value: f, label: enumLabel("formFactor", f, lang) }))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder={t("cells.searchPlaceholder", lang)}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CellStatus | "")}
        />
        <Select
          options={chemOptions}
          value={chemistryFilter}
          onChange={(e) => setChemistryFilter(e.target.value as Chemistry | "")}
        />
        <Select
          options={ffOptions}
          value={formFactorFilter}
          onChange={(e) => setFormFactorFilter(e.target.value as FormFactor | "")}
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {cells.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            {search || statusFilter || chemistryFilter || formFactorFilter
              ? t("cells.noResults", lang)
              : t("cells.noCellsYet", lang)}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                <th className="px-2 py-3 w-8">
                  <span className="sr-only">{t("compare.title", lang)}</span>
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort("id")}>
                  {t("table.id", lang)} <SortIcon field="id" />
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort("brand")}>
                  {t("table.brand", lang)} <SortIcon field="brand" />
                </th>
                <th className="px-4 py-3 hidden sm:table-cell">{t("table.form", lang)}</th>
                <th className="px-4 py-3 hidden md:table-cell">{t("table.chemistry", lang)}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort("nominalCapacity")}>
                  {t("table.capacity", lang)} <SortIcon field="nominalCapacity" />
                </th>
                <th className="px-4 py-3 hidden lg:table-cell">{t("table.lastMeasurement", lang)}</th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort("status")}>
                  {t("table.status", lang)} <SortIcon field="status" />
                </th>
                <th className="px-4 py-3 hidden xl:table-cell">{t("table.device", lang)}</th>
                <th className="px-4 py-3 hidden lg:table-cell">{t("table.group", lang)}</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {cells.map((cell) => {
                const lastMeasurement = cell.measurements.length > 0
                  ? cell.measurements.reduce((a, b) => (a.date > b.date ? a : b))
                  : null;
                const isChecked = compareIds.includes(cell.id);

                return (
                  <tr key={cell.id} className={`hover:bg-gray-50 transition-colors dark:hover:bg-gray-700 ${isChecked ? "bg-blue-50/50 dark:bg-blue-900/20" : ""}`}>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isChecked && compareIds.length >= MAX_COMPARE}
                        onChange={() => toggleCompare(cell.id)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/cells?id=${cell.id}`} className="flex items-center gap-2">
                        <CellThumb fileName={cell.imageFileName} />
                        <span className="font-mono font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                          #{cell.id}
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {cell.brand}{cell.model ? ` ${cell.model}` : ""}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-300">{enumLabel("formFactor", cell.formFactor, lang)}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-gray-600 dark:text-gray-300">{cell.chemistry}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300">{formatCapacity(cell.nominalCapacity)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600 dark:text-gray-300">
                      {lastMeasurement ? formatCapacity(lastMeasurement.measuredCapacity) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={cell.status} />
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-gray-500 dark:text-gray-400">{cell.currentDevice || "—"}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 dark:text-gray-400">{cell.group || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-xs text-gray-400 dark:text-gray-500">{cells.length} {t("cells.cellCount", lang)}</p>

      {/* Floating compare button */}
      {compareIds.length >= 2 && (
        <div className="fixed bottom-6 right-6 z-50">
          <button
            onClick={() => router.push(`/compare?ids=${compareIds.join(",")}`)}
            className="flex items-center gap-2 rounded-full bg-blue-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-blue-700 transition-colors cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
            {t("compare.compareBtn", lang)} ({compareIds.length})
          </button>
        </div>
      )}
    </div>
  );
}

function CellThumb({ fileName }: { fileName?: string }) {
  const githubConfig = useBatteryStore((s) => s.githubConfig);
  const [url, setUrl] = useState<string | null>(() => fileName ? getCachedImageUrl(fileName) ?? null : null);

  useEffect(() => {
    if (!fileName || !githubConfig) { setUrl(null); return; }
    // Already cached
    const cached = getCachedImageUrl(fileName);
    if (cached) { setUrl(cached); return; }
    // Lazy load
    let cancelled = false;
    loadImage(githubConfig, fileName).then((u) => { if (!cancelled && u) setUrl(u); });
    return () => { cancelled = true; };
  }, [fileName, githubConfig]);

  if (url) {
    return <img src={url} alt="" className="h-7 w-7 rounded object-cover flex-shrink-0 border border-gray-200 dark:border-gray-600" />;
  }

  // Placeholder
  return (
    <span className="flex h-7 w-7 items-center justify-center rounded bg-gray-100 dark:bg-gray-700 flex-shrink-0">
      <svg className="h-4 w-4 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v.75c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-.75z" />
      </svg>
    </span>
  );
}
