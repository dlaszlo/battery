"use client";

import AppShell from "@/components/layout/AppShell";
import CellForm from "@/components/cells/CellForm";

export default function AddCellPage() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Új cella hozzáadása</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Töltsd ki a cella adatait</p>
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
        <CellForm />
      </div>
    </AppShell>
  );
}
