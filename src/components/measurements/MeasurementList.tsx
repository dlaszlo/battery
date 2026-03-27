"use client";

import { useState } from "react";
import { useBatteryStore } from "@/lib/store";
import { formatDate, formatCapacity, formatResistance, capacityPercent } from "@/lib/utils";
import type { Measurement } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface MeasurementListProps {
  cellId: string;
  measurements: Measurement[];
  nominalCapacity: number;
}

export default function MeasurementList({ cellId, measurements, nominalCapacity }: MeasurementListProps) {
  const deleteMeasurement = useBatteryStore((s) => s.deleteMeasurement);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">Még nincs mérés ehhez a cellához.</p>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              <th className="px-4 py-2.5">Dátum</th>
              <th className="px-4 py-2.5">Kapacitás</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">%</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">Áram</th>
              <th className="px-4 py-2.5 hidden md:table-cell">IR</th>
              <th className="px-4 py-2.5 hidden lg:table-cell">Eszköz</th>
              <th className="px-4 py-2.5 hidden lg:table-cell">Megjegyzés</th>
              <th className="px-4 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {sorted.map((m) => {
              const pct = capacityPercent(m.measuredCapacity, nominalCapacity);
              const pctColor = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600";

              return (
                <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2.5 text-gray-900 dark:text-gray-100">{formatDate(m.date)}</td>
                  <td className="px-4 py-2.5 font-medium text-gray-900 dark:text-gray-100">
                    {formatCapacity(m.measuredCapacity)}
                  </td>
                  <td className={`px-4 py-2.5 hidden sm:table-cell font-medium ${pctColor}`}>
                    {pct}%
                  </td>
                  <td className="px-4 py-2.5 hidden sm:table-cell text-gray-600 dark:text-gray-300">
                    {m.dischargeCurrent} mA
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-600 dark:text-gray-300">
                    {m.internalResistance ? formatResistance(m.internalResistance) : "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-gray-500 text-xs dark:text-gray-400">
                    {m.testDevice}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-gray-500 text-xs truncate max-w-[150px] dark:text-gray-400">
                    {m.notes || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => setDeleteId(m.id)}
                      className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:text-gray-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => {
          if (deleteId) deleteMeasurement(cellId, deleteId);
          setDeleteId(null);
        }}
        title="Mérés törlése"
        message="Biztosan törlöd ezt a mérést? Ez a művelet nem vonható vissza."
        confirmLabel="Törlés"
      />
    </>
  );
}
