"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCells } from "@/hooks/useCells";
import { useBatteryStore } from "@/lib/store";
import { formatCapacity, capacityPercent } from "@/lib/utils";
import { estimateSoH } from "@/lib/soh";
import { t, enumLabel } from "@/lib/i18n";
import { CELL_STATUSES, CHEMISTRIES, FORM_FACTORS } from "@/lib/constants";
import type { Cell, CellStatus, Chemistry, FormFactor } from "@/lib/types";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import StatusBadge from "./StatusBadge";

type SortField = "id" | "brand" | "nominalCapacity" | "status" | "updatedAt" | "purchaseDate";

const MAX_COMPARE = 5;
const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;
const THREE_MONTHS = 3 * 30 * 24 * 60 * 60 * 1000;

/** Filter labels for URL-based dashboard filters */
function getFilterLabel(filter: string, lang: "hu" | "en"): string {
  const [type, value] = filter.split(":");
  switch (type) {
    case "status": return enumLabel("status", value, lang);
    case "chemistry": return value;
    case "formFactor": return enumLabel("formFactor", value, lang);
    case "device": return value;
    case "alert": {
      const keys: Record<string, string> = {
        neverMeasured: lang === "hu" ? "Még nem mért" : "Never measured",
        notMeasured: lang === "hu" ? "Régóta nem mért" : "Not measured (6+ mo)",
        weakening: lang === "hu" ? "Gyengülő (<70%)" : "Weakening (<70%)",
        poorSoH: lang === "hu" ? "Rossz állapotú" : "Poor SoH",
        longStorage: lang === "hu" ? "Régóta raktáron" : "Long storage",
        needsDischarge: lang === "hu" ? "Lemerítésre vár" : "Needs discharge",
      };
      return keys[value] || value;
    }
    default: return filter;
  }
}

function applyDashboardFilter(cells: Cell[], filter: string, lang: "hu" | "en"): Cell[] {
  const [type, value] = filter.split(":");
  const now = Date.now();
  switch (type) {
    case "status":
      return cells.filter((c) => c.status === value);
    case "chemistry":
      return cells.filter((c) => c.chemistry === value);
    case "formFactor":
      return cells.filter((c) => c.formFactor === value);
    case "device":
      return value === "__none__"
        ? cells.filter((c) => !c.currentDevice)
        : cells.filter((c) => c.currentDevice === value);
    case "alert":
      switch (value) {
        case "neverMeasured":
          return cells.filter((c) => c.status !== "scrapped" && c.measurements.length === 0);
        case "notMeasured":
          return cells.filter((c) => {
            if (c.status === "scrapped" || c.measurements.length === 0) return false;
            const lastDate = c.measurements.reduce((a, b) => (a.date > b.date ? a : b)).date;
            return (now - new Date(lastDate).getTime()) > SIX_MONTHS;
          });
        case "weakening":
          return cells.filter((c) => {
            if (c.status === "scrapped" || c.measurements.length === 0) return false;
            const last = c.measurements.reduce((a, b) => (a.date > b.date ? a : b));
            return capacityPercent(last.measuredCapacity, c.nominalCapacity) < 70;
          });
        case "poorSoH":
          return cells.filter((c) => {
            if (c.status === "scrapped") return false;
            const soh = estimateSoH(c, lang);
            return soh != null && (soh.grade === "poor" || soh.grade === "critical");
          });
        case "longStorage":
          return cells.filter((c) => {
            if (c.status === "scrapped" || c.currentDevice) return false;
            const deviceEvent = [...(c.events || [])]
              .reverse()
              .find((e) => e.type === "device_changed");
            const sinceDate = deviceEvent ? deviceEvent.date : c.createdAt;
            return (now - new Date(sinceDate).getTime()) > THREE_MONTHS;
          });
        case "needsDischarge":
          return cells.filter((c) => !c.currentDevice && !c.storageReady);
        default:
          return cells;
      }
    default:
      return cells;
  }
}

export default function CellTable() {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const router = useRouter();
  const searchParams = useSearchParams();
  const dashboardFilter = searchParams.get("filter") || "";
  const fromDashboard = searchParams.get("from") === "dashboard";
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CellStatus | "">("");
  const [chemistryFilter, setChemistryFilter] = useState<Chemistry | "">("");
  const [formFactorFilter, setFormFactorFilter] = useState<FormFactor | "">("");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const allFiltered = useCells(
    { search, status: statusFilter, chemistry: chemistryFilter, formFactor: formFactorFilter },
    sortField,
    sortDir
  );

  const cells = useMemo(
    () => dashboardFilter ? applyDashboardFilter(allFiltered, dashboardFilter, lang) : allFiltered,
    [allFiltered, dashboardFilter, lang]
  );

  const clearDashboardFilter = () => {
    router.replace("/cells");
  };

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

      {/* Dashboard back + filter badge */}
      {(fromDashboard || dashboardFilter) && (
        <div className="flex items-center gap-2">
          {fromDashboard && (
            <button
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
              {t("dashboard.backToDashboard", lang)}
            </button>
          )}
          {dashboardFilter && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1.5 text-sm font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
              {getFilterLabel(dashboardFilter, lang)}
              <button
                onClick={clearDashboardFilter}
                className="ml-0.5 rounded-full p-0.5 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors cursor-pointer"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          )}
        </div>
      )}

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
                const isChecked = compareIds.includes(cell.internalId);

                return (
                  <tr key={cell.internalId} className={`hover:bg-gray-50 transition-colors dark:hover:bg-gray-700 ${isChecked ? "bg-blue-50/50 dark:bg-blue-900/20" : ""}`}>
                    <td className="px-2 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isChecked && compareIds.length >= MAX_COMPARE}
                        onChange={() => toggleCompare(cell.internalId)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer dark:border-gray-600 dark:bg-gray-700"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/cells?id=${cell.internalId}${fromDashboard ? "&from=dashboard" : ""}`}>
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
                    <td className="px-4 py-3 hidden xl:table-cell text-gray-500 dark:text-gray-400">{cell.currentDevice || t("info.inStorage", lang)}</td>
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
