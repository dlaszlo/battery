import { useMemo } from "react";
import { useBatteryStore } from "@/lib/store";
import { estimateSoH } from "@/lib/soh";
import { capacityPercent } from "@/lib/utils";
import type { Cell, CellStatus, Chemistry, FormFactor, Language } from "@/lib/types";

interface CellFilters {
  search?: string;
  status?: CellStatus | "";
  chemistry?: Chemistry | "";
  formFactor?: FormFactor | "";
  group?: string;
}

type SortField = "id" | "brand" | "nominalCapacity" | "status" | "updatedAt" | "purchaseDate";
type SortDirection = "asc" | "desc";

export function useCells(
  filters?: CellFilters,
  sortField: SortField = "id",
  sortDirection: SortDirection = "asc"
) {
  const cells = useBatteryStore((s) => s.cells);

  return useMemo(() => {
    let filtered = [...cells];

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.brand.toLowerCase().includes(q) ||
          c.model?.toLowerCase().includes(q) ||
          c.seller.toLowerCase().includes(q) ||
          c.currentDevice?.toLowerCase().includes(q) ||
          c.batchNumber?.toLowerCase().includes(q) ||
          c.group?.toLowerCase().includes(q) ||
          c.notes?.toLowerCase().includes(q)
      );
    }

    if (filters?.status) {
      filtered = filtered.filter((c) => c.status === filters.status);
    }
    if (filters?.chemistry) {
      filtered = filtered.filter((c) => c.chemistry === filters.chemistry);
    }
    if (filters?.formFactor) {
      filtered = filtered.filter((c) => c.formFactor === filters.formFactor);
    }
    if (filters?.group) {
      filtered = filtered.filter((c) => c.group === filters.group);
    }

    filtered.sort((a, b) => {
      const aVal = a[sortField] ?? "";
      const bVal = b[sortField] ?? "";
      const cmp = String(aVal).localeCompare(String(bVal), "hu", { numeric: true });
      return sortDirection === "asc" ? cmp : -cmp;
    });

    return filtered;
  }, [cells, filters, sortField, sortDirection]);
}

export interface AlertCell {
  cell: Cell;
  reason: string;
  detail: string;
}

export interface RecentMeasurement {
  cell: Cell;
  date: string;
  capacity: number;
  pct: number;
}

export function useCellStats(lang: Language = "hu") {
  const cells = useBatteryStore((s) => s.cells);

  return useMemo(() => {
    const total = cells.length;
    const active = cells.filter((c) => c.status !== "scrapped").length;
    const scrapped = cells.filter((c) => c.status === "scrapped").length;
    const totalMeasurements = cells.reduce((sum, c) => sum + c.measurements.length, 0);

    const byStatus: Record<string, number> = {};
    const byChemistry: Record<string, number> = {};
    const byFormFactor: Record<string, number> = {};
    const byDevice: Record<string, number> = {};

    for (const cell of cells) {
      byStatus[cell.status] = (byStatus[cell.status] || 0) + 1;
      byChemistry[cell.chemistry] = (byChemistry[cell.chemistry] || 0) + 1;
      byFormFactor[cell.formFactor] = (byFormFactor[cell.formFactor] || 0) + 1;
      const device = cell.currentDevice || "__none__";
      byDevice[device] = (byDevice[device] || 0) + 1;
    }

    const recentCells = [...cells]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);

    const sortedByCount = (rec: Record<string, number>) =>
      Object.fromEntries(Object.entries(rec).sort(([, a], [, b]) => b - a));

    // --- Alerts ---
    const now = Date.now();
    const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;
    const THREE_MONTHS = 3 * 30 * 24 * 60 * 60 * 1000;
    const alerts: AlertCell[] = [];

    // TODO: TEMPORARY — force all alert types for preview, remove after review
    for (const cell of cells) {
      if (cell.status === "scrapped") continue;
      alerts.push({ cell, reason: "neverMeasured", detail: "" });
      alerts.push({ cell, reason: "notMeasured", detail: "8" });
      alerts.push({ cell, reason: "weakening", detail: "62%" });
      alerts.push({ cell, reason: "poorSoH", detail: "28% (poor)" });
      alerts.push({ cell, reason: "longStorage", detail: "5" });
    }
    /* ORIGINAL LOGIC — restore after review:
    for (const cell of cells) {
      if (cell.status === "scrapped") continue;

      // Never measured
      if (cell.measurements.length === 0) {
        alerts.push({ cell, reason: "neverMeasured", detail: "" });
        continue;
      }

      // Not measured in 6+ months
      const lastDate = cell.measurements.reduce((a, b) => (a.date > b.date ? a : b)).date;
      const elapsed = now - new Date(lastDate).getTime();
      if (elapsed > SIX_MONTHS) {
        const months = Math.floor(elapsed / (30 * 24 * 60 * 60 * 1000));
        alerts.push({ cell, reason: "notMeasured", detail: `${months}` });
      }

      // Weakening: last measurement <70%
      const last = cell.measurements.reduce((a, b) => (a.date > b.date ? a : b));
      const pct = capacityPercent(last.measuredCapacity, cell.nominalCapacity);
      if (pct < 70) {
        alerts.push({ cell, reason: "weakening", detail: `${pct}%` });
      }

      // Poor/critical SoH
      const soh = estimateSoH(cell, lang);
      if (soh && (soh.grade === "poor" || soh.grade === "critical")) {
        alerts.push({ cell, reason: "poorSoH", detail: `${soh.score}% (${soh.grade})` });
      }

      // Long storage (3+ months)
      if (cell.currentDevice === "Raktáron") {
        const deviceEvent = [...(cell.events || [])]
          .reverse()
          .find((e) => e.type === "device_changed" && e.description.includes("Raktáron"));
        const sinceDate = deviceEvent ? deviceEvent.date : cell.updatedAt;
        const elapsed = now - new Date(sinceDate).getTime();
        if (elapsed > THREE_MONTHS) {
          const months = Math.floor(elapsed / (30 * 24 * 60 * 60 * 1000));
          alerts.push({ cell, reason: "longStorage", detail: `${months}` });
        }
      }
    }
    */

    // --- Recent measurements ---
    const recentMeasurements: RecentMeasurement[] = [];
    for (const cell of cells) {
      for (const m of cell.measurements) {
        recentMeasurements.push({
          cell,
          date: m.date,
          capacity: m.measuredCapacity,
          pct: capacityPercent(m.measuredCapacity, cell.nominalCapacity),
        });
      }
    }
    recentMeasurements.sort((a, b) => b.date.localeCompare(a.date));
    const topMeasurements = recentMeasurements.slice(0, 8);

    return {
      total,
      active,
      scrapped,
      totalMeasurements,
      byStatus: sortedByCount(byStatus),
      byChemistry: sortedByCount(byChemistry),
      byFormFactor: sortedByCount(byFormFactor),
      byDevice: sortedByCount(byDevice),
      recentCells,
      alerts,
      recentMeasurements: topMeasurements,
    };
  }, [cells, lang]);
}

export function useGroups(): string[] {
  const cells = useBatteryStore((s) => s.cells);

  return useMemo(() => {
    const groups = new Set<string>();
    for (const cell of cells) {
      if (cell.group) groups.add(cell.group);
    }
    return Array.from(groups).sort((a, b) => a.localeCompare(b, "hu"));
  }, [cells]);
}
