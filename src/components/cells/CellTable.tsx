"use client";

import { useState } from "react";
import Link from "next/link";
import { useCells } from "@/hooks/useCells";
import { formatCapacity } from "@/lib/utils";
import { CELL_STATUSES, CHEMISTRIES, FORM_FACTORS } from "@/lib/constants";
import type { CellStatus, Chemistry, FormFactor } from "@/lib/types";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import StatusBadge from "./StatusBadge";

type SortField = "id" | "brand" | "nominalCapacity" | "status" | "updatedAt" | "purchaseDate";

export default function CellTable() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CellStatus | "">("");
  const [chemistryFilter, setChemistryFilter] = useState<Chemistry | "">("");
  const [formFactorFilter, setFormFactorFilter] = useState<FormFactor | "">("");
  const [sortField, setSortField] = useState<SortField>("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="text-gray-300 ml-1 dark:text-gray-600">↑↓</span>;
    return <span className="text-blue-600 ml-1 dark:text-blue-400">{sortDir === "asc" ? "↑" : "↓"}</span>;
  };

  const statusOptions = [{ value: "", label: "Mind" }, ...CELL_STATUSES.map((s) => ({ value: s, label: s }))];
  const chemOptions = [{ value: "", label: "Mind" }, ...CHEMISTRIES.map((c) => ({ value: c, label: c }))];
  const ffOptions = [{ value: "", label: "Mind" }, ...FORM_FACTORS.map((f) => ({ value: f, label: f }))];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Input
          placeholder="Keresés (ID, márka, eladó...)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          options={statusOptions}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as CellStatus | "")}
          placeholder="Állapot"
        />
        <Select
          options={chemOptions}
          value={chemistryFilter}
          onChange={(e) => setChemistryFilter(e.target.value as Chemistry | "")}
          placeholder="Kémia"
        />
        <Select
          options={ffOptions}
          value={formFactorFilter}
          onChange={(e) => setFormFactorFilter(e.target.value as FormFactor | "")}
          placeholder="Form faktor"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {cells.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            {search || statusFilter || chemistryFilter || formFactorFilter
              ? "Nincs találat a szűrőkkel."
              : "Még nincs cella. Adj hozzá egyet!"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort("id")}>
                  ID <SortIcon field="id" />
                </th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort("brand")}>
                  Márka <SortIcon field="brand" />
                </th>
                <th className="px-4 py-3 hidden sm:table-cell">Form</th>
                <th className="px-4 py-3 hidden md:table-cell">Kémia</th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort("nominalCapacity")}>
                  Kapacitás <SortIcon field="nominalCapacity" />
                </th>
                <th className="px-4 py-3 hidden lg:table-cell">Utolsó mérés</th>
                <th className="px-4 py-3 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300" onClick={() => toggleSort("status")}>
                  Állapot <SortIcon field="status" />
                </th>
                <th className="px-4 py-3 hidden xl:table-cell">Eszköz</th>
                <th className="px-4 py-3 hidden lg:table-cell">Csoport</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-700">
              {cells.map((cell) => {
                const lastMeasurement = cell.measurements.length > 0
                  ? cell.measurements.reduce((a, b) => (a.date > b.date ? a : b))
                  : null;

                return (
                  <tr key={cell.id} className="hover:bg-gray-50 transition-colors dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <Link href={`/cells?id=${cell.id}`} className="font-mono font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
                        #{cell.id}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {cell.brand}{cell.model ? ` ${cell.model}` : ""}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600 dark:text-gray-300">{cell.formFactor}</td>
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

      <p className="text-xs text-gray-400 dark:text-gray-500">{cells.length} cella</p>
    </div>
  );
}
