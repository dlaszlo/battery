import { useMemo } from "react";
import { useBatteryStore } from "@/lib/store";
import type { CellStatus, Chemistry, FormFactor } from "@/lib/types";

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

export function useCellStats() {
  const cells = useBatteryStore((s) => s.cells);

  return useMemo(() => {
    const activeCells = cells;
    const total = activeCells.length;
    const active = activeCells.filter((c) => c.status !== "Selejt").length;
    const scrapped = activeCells.filter((c) => c.status === "Selejt").length;
    const totalValue = activeCells.reduce((sum, c) => sum + c.pricePerUnit, 0);
    const totalMeasurements = activeCells.reduce((sum, c) => sum + c.measurements.length, 0);

    const byStatus: Record<string, number> = {};
    const byChemistry: Record<string, number> = {};
    const byFormFactor: Record<string, number> = {};

    for (const cell of activeCells) {
      byStatus[cell.status] = (byStatus[cell.status] || 0) + 1;
      byChemistry[cell.chemistry] = (byChemistry[cell.chemistry] || 0) + 1;
      byFormFactor[cell.formFactor] = (byFormFactor[cell.formFactor] || 0) + 1;
    }

    const recentCells = [...activeCells]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);

    return {
      total,
      active,
      scrapped,
      totalValue,
      totalMeasurements,
      byStatus,
      byChemistry,
      byFormFactor,
      recentCells,
    };
  }, [cells]);
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
