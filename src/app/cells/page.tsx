"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import CellTable from "@/components/cells/CellTable";
import CellDetail from "@/components/cells/CellDetail";
import { useBatteryStore } from "@/lib/store";

function CellsContent() {
  const searchParams = useSearchParams();
  const cellId = searchParams.get("id");
  const getCell = useBatteryStore((s) => s.getCell);

  if (cellId) {
    const cell = getCell(cellId);
    if (!cell) {
      return (
        <div className="py-12 text-center">
          <p className="text-gray-500">A #{cellId} cella nem található.</p>
        </div>
      );
    }
    return <CellDetail cell={cell} />;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Cellák</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Az összes nyilvántartott akkumulátor cella</p>
      </div>
      <CellTable />
    </>
  );
}

export default function CellsPage() {
  return (
    <AppShell>
      <Suspense fallback={<div className="py-12 text-center text-gray-400">Betöltés...</div>}>
        <CellsContent />
      </Suspense>
    </AppShell>
  );
}
