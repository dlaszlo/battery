"use client";

import Link from "next/link";
import { useCellStats } from "@/hooks/useCells";
import { formatDate } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import type { CellStatus } from "@/lib/types";
import StatCard from "./StatCard";

export default function DashboardGrid() {
  const stats = useCellStats();

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Összes cella"
          value={stats.total}
          color="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5h6.75V15H4.5v-4.5zM3.75 18h15A2.25 2.25 0 0021 15.75v-6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 9.75v6A2.25 2.25 0 003.75 18z" />
            </svg>
          }
        />
        <StatCard
          label="Aktív"
          value={stats.active}
          color="green"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Selejt"
          value={stats.scrapped}
          color="red"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          }
        />
        <StatCard
          label="Mérések"
          value={stats.totalMeasurements}
          color="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
      </div>

      {/* Recent cells */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b px-6 py-4 dark:border-gray-700">
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">Utoljára módosított cellák</h2>
          <Link href="/cells" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
            Összes &rarr;
          </Link>
        </div>
        {stats.recentCells.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
            Még nincs cella. <Link href="/add" className="text-blue-600 hover:underline dark:text-blue-400">Adj hozzá egyet!</Link>
          </div>
        ) : (
          <div className="divide-y dark:divide-gray-700">
            {stats.recentCells.map((cell) => (
              <Link
                key={cell.id}
                href={`/cells?id=${cell.id}`}
                className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">#{cell.id}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cell.brand}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {cell.formFactor} &middot; {cell.chemistry} &middot; {cell.nominalCapacity} mAh
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[cell.status as CellStatus]}`}>
                    {cell.status}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(cell.updatedAt)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Quick stats breakdown */}
      {stats.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Kémia szerint</h3>
            <div className="space-y-2">
              {Object.entries(stats.byChemistry).map(([chem, count]) => (
                <div key={chem} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{chem}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{count} db</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Form faktor szerint</h3>
            <div className="space-y-2">
              {Object.entries(stats.byFormFactor).map(([ff, count]) => (
                <div key={ff} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{ff}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{count} db</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
