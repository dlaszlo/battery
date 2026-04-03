"use client";

import Link from "next/link";
import { useCellStats } from "@/hooks/useCells";
import type { AlertCell } from "@/hooks/useCells";
import { useBatteryStore } from "@/lib/store";
import { formatDate, formatCapacity } from "@/lib/utils";
import { STATUS_COLORS } from "@/lib/constants";
import type { CellStatus, Language } from "@/lib/types";
import { t, enumLabel } from "@/lib/i18n";
import StatCard from "./StatCard";

export default function DashboardGrid() {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const stats = useCellStats(lang);

  return (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label={t("dashboard.totalCells", lang)}
          value={stats.total}
          color="blue"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 10.5h.375c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125H21M4.5 10.5h6.75V15H4.5v-4.5zM3.75 18h15A2.25 2.25 0 0021 15.75v-6a2.25 2.25 0 00-2.25-2.25h-15A2.25 2.25 0 001.5 9.75v6A2.25 2.25 0 003.75 18z" />
            </svg>
          }
        />
        <StatCard
          label={t("dashboard.activeCells", lang)}
          value={stats.active}
          color="green"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label={t("dashboard.scrappedCells", lang)}
          value={stats.scrapped}
          color="red"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          }
        />
        <StatCard
          label={t("dashboard.measurements", lang)}
          value={stats.totalMeasurements}
          color="amber"
          icon={
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          }
        />
      </div>

      {/* Alerts */}
      {stats.total > 0 && <AlertsSection alerts={stats.alerts} lang={lang} />}

      {/* Recent cells + Recent measurements */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent cells */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b px-6 py-4 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.recentCells", lang)}</h2>
            <Link href="/cells" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300">
              {t("dashboard.allArrow", lang)} &rarr;
            </Link>
          </div>
          {stats.recentCells.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
              {t("dashboard.noCells", lang)} <Link href="/add" className="text-blue-600 hover:underline dark:text-blue-400">{t("dashboard.addFirst", lang)}</Link>
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {stats.recentCells.map((cell) => (
                <Link
                  key={cell.internalId}
                  href={`/cells?id=${cell.internalId}`}
                  className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">#{cell.id}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{cell.brand}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {enumLabel("formFactor", cell.formFactor, lang)} &middot; {cell.chemistry} &middot; {cell.nominalCapacity} mAh
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[cell.status as CellStatus]}`}>
                      {enumLabel("status", cell.status, lang)}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(cell.updatedAt)}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent measurements */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b px-6 py-4 dark:border-gray-700">
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.recentMeasurements", lang)}</h2>
          </div>
          {stats.recentMeasurements.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-gray-400 dark:text-gray-500">
              {t("dashboard.noCells", lang)}
            </div>
          ) : (
            <div className="divide-y dark:divide-gray-700">
              {stats.recentMeasurements.map((rm, i) => {
                const pctColor = rm.pct >= 80 ? "text-green-600" : rm.pct >= 60 ? "text-amber-600" : "text-red-600";
                return (
                  <Link
                    key={`${rm.cell.internalId}-${rm.date}-${i}`}
                    href={`/cells?id=${rm.cell.internalId}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-gray-50 transition-colors dark:hover:bg-gray-700"
                  >
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-sm font-bold text-gray-900 dark:text-gray-100">#{rm.cell.id}</span>
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {formatCapacity(rm.capacity)}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {rm.cell.brand}{rm.cell.model ? ` ${rm.cell.model}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm font-semibold ${pctColor}`}>{rm.pct}%</span>
                      <span className="text-xs text-gray-400 dark:text-gray-500">{formatDate(rm.date)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Device breakdown + Chemistry/FormFactor */}
      {stats.total > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.byDevice", lang)}</h3>
            <div className="space-y-2">
              {Object.entries(stats.byDevice).map(([device, count]) => (
                <div key={device} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300 truncate mr-2">
                    {device === "__none__" ? t("dashboard.noDevice", lang) : device}
                  </span>
                  <span className="font-medium text-gray-900 dark:text-gray-100 flex-shrink-0">{count} {t("dashboard.pcs", lang)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.byChemistry", lang)}</h3>
            <div className="space-y-2">
              {Object.entries(stats.byChemistry).map(([chem, count]) => (
                <div key={chem} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{chem}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{count} {t("dashboard.pcs", lang)}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.byFormFactor", lang)}</h3>
            <div className="space-y-2">
              {Object.entries(stats.byFormFactor).map(([ff, count]) => (
                <div key={ff} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">{enumLabel("formFactor", ff, lang)}</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">{count} {t("dashboard.pcs", lang)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const ALERT_CONFIG: Record<string, { icon: string; color: string; bgColor: string; borderColor: string }> = {
  notMeasured: { icon: "clock", color: "text-amber-600 dark:text-amber-400", bgColor: "bg-amber-50 dark:bg-amber-900/20", borderColor: "border-amber-200 dark:border-amber-800" },
  weakening: { icon: "trending-down", color: "text-orange-600 dark:text-orange-400", bgColor: "bg-orange-50 dark:bg-orange-900/20", borderColor: "border-orange-200 dark:border-orange-800" },
  poorSoH: { icon: "heart", color: "text-red-600 dark:text-red-400", bgColor: "bg-red-50 dark:bg-red-900/20", borderColor: "border-red-200 dark:border-red-800" },
  longStorage: { icon: "box", color: "text-blue-600 dark:text-blue-400", bgColor: "bg-blue-50 dark:bg-blue-900/20", borderColor: "border-blue-200 dark:border-blue-800" },
};

function AlertIcon({ type }: { type: string }) {
  const cls = "h-4 w-4 flex-shrink-0";
  switch (type) {
    case "notMeasured":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "weakening":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898M2.25 6l3 1.5M2.25 6v3m20-1.04l-2.69.702a11.942 11.942 0 00-2.554-3.846" />
        </svg>
      );
    case "poorSoH":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      );
    case "longStorage":
      return (
        <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
        </svg>
      );
    default:
      return null;
  }
}

function AlertsSection({ alerts, lang }: { alerts: AlertCell[]; lang: Language }) {
  // Group by reason
  const grouped = new Map<string, AlertCell[]>();
  for (const a of alerts) {
    const arr = grouped.get(a.reason) || [];
    arr.push(a);
    grouped.set(a.reason, arr);
  }

  // Deduplicate: one cell can appear multiple times, show each cell only once per reason
  const reasonOrder = ["poorSoH", "weakening", "notMeasured", "longStorage"];

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b px-6 py-4 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <svg className="h-5 w-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <h2 className="font-semibold text-gray-900 dark:text-gray-100">{t("dashboard.alerts", lang)}</h2>
          {alerts.length > 0 && (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
              {alerts.length}
            </span>
          )}
        </div>
      </div>
      <div className="px-6 py-4">
        {alerts.length === 0 ? (
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t("dashboard.alertsEmpty", lang)}
          </div>
        ) : (
          <div className="space-y-4">
            {reasonOrder.map((reason) => {
              const items = grouped.get(reason);
              if (!items || items.length === 0) return null;
              const config = ALERT_CONFIG[reason];
              const reasonKey = `dashboard.${reason}` as import("@/lib/i18n").TranslationKey;
              return (
                <div key={reason} className={`rounded-lg border ${config.borderColor} ${config.bgColor} p-4`}>
                  <div className={`flex items-center gap-2 mb-2 text-sm font-medium ${config.color}`}>
                    <AlertIcon type={reason} />
                    {t(reasonKey, lang)} ({items.length})
                  </div>
                  <div className="space-y-1.5">
                    {items.map((a) => (
                      <Link
                        key={`${reason}-${a.cell.internalId}`}
                        href={`/cells?id=${a.cell.internalId}`}
                        className="flex items-center justify-between rounded px-2 py-1 text-sm hover:bg-white/50 dark:hover:bg-gray-800/50 transition-colors"
                      >
                        <span className="text-gray-700 dark:text-gray-300">
                          <span className="font-mono font-bold">#{a.cell.id}</span>
                          {" "}{a.cell.brand}{a.cell.model ? ` ${a.cell.model}` : ""}
                        </span>
                        <span className={`text-xs font-medium ${config.color}`}>{a.detail}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
