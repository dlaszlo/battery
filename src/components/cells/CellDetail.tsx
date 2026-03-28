"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useBatteryStore } from "@/lib/store";
import {
  formatDate,
  formatCurrency,
  formatCapacity,
  capacityPercent,
} from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { Cell } from "@/lib/types";
import Button from "@/components/ui/Button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import StatusBadge from "./StatusBadge";
import CellForm from "./CellForm";
import MeasurementForm from "@/components/measurements/MeasurementForm";
import MeasurementList from "@/components/measurements/MeasurementList";
import CapacityChart from "@/components/measurements/CapacityChart";
import EventLog from "./EventLog";

interface CellDetailProps {
  cell: Cell;
}

export default function CellDetail({ cell }: CellDetailProps) {
  const router = useRouter();
  const deleteCell = useBatteryStore((s) => s.deleteCell);
  const settings = useBatteryStore((s) => s.settings);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [showMeasurementForm, setShowMeasurementForm] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showScrap, setShowScrap] = useState(false);
  const updateCell = useBatteryStore((s) => s.updateCell);

  const lastMeasurement =
    cell.measurements.length > 0
      ? cell.measurements.reduce((a, b) => (a.date > b.date ? a : b))
      : null;

  // Storage warning: check if cell has been in "Raktáron" for a long time
  const storageMonths = (() => {
    if (cell.currentDevice !== "Raktáron") return 0;
    const deviceEvent = [...(cell.events || [])]
      .reverse()
      .find((e) => e.type === "device_changed" && e.description.includes("Raktáron"));
    const sinceDate = deviceEvent ? deviceEvent.date : cell.updatedAt;
    const diffMs = Date.now() - new Date(sinceDate).getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30));
  })();

  if (editing) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">#{cell.id} {t("cell.editTitle", lang)}</h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <CellForm cell={cell} onSave={() => setEditing(false)} />
        </div>
      </div>
    );
  }

  if (duplicating) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{t("cell.newFromTemplate", lang, { id: cell.id })}</h2>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <CellForm defaults={{ ...cell, id: "" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/cells" className="text-gray-400 hover:text-gray-600 transition-colors dark:text-gray-500 dark:hover:text-gray-300">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              #{cell.id} &middot; {cell.brand}{cell.model ? ` ${cell.model}` : ""}
            </h2>
            <StatusBadge status={cell.status} />
          </div>
          <p className="mt-1 ml-8 text-sm text-gray-500 dark:text-gray-400">
            {cell.formFactor} &middot; {cell.chemistry} &middot; {formatCapacity(cell.nominalCapacity)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDuplicating(true)}>
            {t("cell.duplicate", lang)}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {t("cell.edit", lang)}
          </Button>
          {cell.status !== "Selejt" && (
            <Button variant="danger" size="sm" onClick={() => setShowScrap(true)}>
              {t("cell.scrap", lang)}
            </Button>
          )}
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
            {t("cell.delete", lang)}
          </Button>
        </div>
      </div>

      {/* Info grid */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b px-6 py-4 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("cell.details", lang)}</h3>
        </div>
        <div className="grid gap-x-8 gap-y-3 px-6 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <InfoRow label={t("info.id", lang)} value={`#${cell.id}`} />
          <InfoRow label={t("info.brand", lang)} value={cell.brand} />
          <InfoRow label={t("info.model", lang)} value={cell.model || "—"} />
          <InfoRow label={t("info.formFactor", lang)} value={cell.formFactor} />
          <InfoRow label={t("info.chemistry", lang)} value={cell.chemistry} />
          <InfoRow label={t("info.cathodeType", lang)} value={cell.cathodeType || "—"} />
          <InfoRow label={t("info.contactType", lang)} value={cell.contactType || "—"} />
          <InfoRow label={t("info.nominalCapacity", lang)} value={formatCapacity(cell.nominalCapacity)} />
          <InfoRow label={t("info.maxDischargeCurrent", lang)} value={cell.maxDischargeCurrent ? `${cell.maxDischargeCurrent} A` : "—"} />
          <InfoRow label={t("info.status", lang)} value={cell.status} />
          <InfoRow label={t("info.currentDevice", lang)} value={cell.currentDevice || "—"} />
          <InfoRow label={t("info.platform", lang)} value={cell.platform || "—"} />
          <InfoRow label={t("info.seller", lang)} value={cell.seller || "—"} />
          <InfoRow label={t("info.purchaseDate", lang)} value={cell.purchaseDate ? formatDate(cell.purchaseDate) : "—"} />
          <InfoRow label={t("info.pricePerUnit", lang)} value={cell.pricePerUnit ? formatCurrency(cell.pricePerUnit) : "—"} />
          <InfoRow label={t("info.weight", lang)} value={cell.weight ? `${cell.weight} g` : "—"} />
          <InfoRow label={t("info.storageVoltage", lang)} value={cell.storageVoltage ? `${cell.storageVoltage} V` : "—"} />
          <InfoRow label={t("info.batchNumber", lang)} value={cell.batchNumber || "—"} />
          <InfoRow label={t("info.group", lang)} value={cell.group || "—"} />
          {lastMeasurement && (
            <InfoRow
              label={t("cell.lastMeasurement", lang)}
              value={`${formatCapacity(lastMeasurement.measuredCapacity)} (${capacityPercent(lastMeasurement.measuredCapacity, cell.nominalCapacity)}%)`}
            />
          )}
        </div>
        {cell.notes && (
          <div className="border-t px-6 py-4 dark:border-gray-700">
            <p className="text-xs font-medium text-gray-500 mb-1 dark:text-gray-400">{t("info.notes", lang)}</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap dark:text-gray-300">{cell.notes}</p>
          </div>
        )}
      </div>

      {/* Cell profile card */}
      {cell.measurements.length > 0 && (
        <CellProfileCard measurements={cell.measurements} nominalCapacity={cell.nominalCapacity} lang={lang} />
      )}

      {/* Storage warnings */}
      {storageMonths >= 3 && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-5 py-4 dark:border-amber-700 dark:bg-amber-900/30">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {t("warning.storageCheck", lang, { months: storageMonths.toString() })}
            </p>
            <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
              {t("warning.storageVoltage", lang)}
            </p>
          </div>
        </div>
      )}

      {/* Capacity chart */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b px-6 py-4 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("cell.capacityTrend", lang)}</h3>
        </div>
        <div className="px-6 py-4">
          <CapacityChart
            measurements={cell.measurements}
            nominalCapacity={cell.nominalCapacity}
            scrapThreshold={settings.scrapThresholdPercent}
          />
        </div>
      </div>

      {/* Measurements */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b px-6 py-4 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t("cell.measurements", lang)} ({cell.measurements.length})
          </h3>
          {!showMeasurementForm && (
            <Button size="sm" onClick={() => setShowMeasurementForm(true)}>
              {t("cell.addMeasurement", lang)}
            </Button>
          )}
        </div>
        <div className="px-6 py-4">
          {showMeasurementForm && (
            <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("cell.newMeasurement", lang)}</h4>
              <MeasurementForm
                cellId={cell.id}
                onDone={() => setShowMeasurementForm(false)}
                lastDischargeCurrent={lastMeasurement?.dischargeCurrent}
              />
            </div>
          )}
          <MeasurementList
            cellId={cell.id}
            measurements={cell.measurements}
            nominalCapacity={cell.nominalCapacity}
          />
        </div>
      </div>

      {/* Event log */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div className="border-b px-6 py-4 dark:border-gray-700">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">
            {t("cell.events", lang)} ({(cell.events || []).length})
          </h3>
        </div>
        <div className="px-6 py-4">
          <EventLog events={cell.events || []} />
        </div>
      </div>

      {/* Scrap dialog */}
      <ConfirmDialog
        open={showScrap}
        onClose={() => setShowScrap(false)}
        onConfirm={() => {
          updateCell(cell.id, { status: "Selejt" });
          setShowScrap(false);
          toast(t("cell.scrapped", lang));
        }}
        title={t("cell.scrapTitle", lang)}
        message={t("cell.scrapDisclaimer", lang)}
        confirmLabel={t("cell.scrapConfirm", lang)}
      />

      {/* Delete dialog */}
      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={() => {
          deleteCell(cell.id);
          toast(t("cell.deleted", lang));
          router.push("/cells");
        }}
        title={t("cell.deleteTitle", lang)}
        message={t("cell.deleteConfirm", lang, { id: cell.id, brand: cell.brand })}
        confirmLabel={t("cell.delete", lang)}
      />
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between sm:flex-col sm:gap-0.5">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</span>
    </div>
  );
}

function CellProfileCard({
  measurements,
  nominalCapacity,
  lang,
}: {
  measurements: import("@/lib/types").Measurement[];
  nominalCapacity: number;
  lang: import("@/lib/types").Language;
}) {
  // Group by discharge current
  const byCurrent = new Map<number, typeof measurements>();
  measurements.forEach((m) => {
    const arr = byCurrent.get(m.dischargeCurrent) || [];
    arr.push(m);
    byCurrent.set(m.dischargeCurrent, arr);
  });

  // Best capacity per current
  const bestPerCurrent: { current: number; best: number; pct: number }[] = [];
  byCurrent.forEach((ms, current) => {
    const best = Math.max(...ms.map((m) => m.measuredCapacity));
    bestPerCurrent.push({ current, best, pct: Math.round((best / nominalCapacity) * 100) });
  });
  bestPerCurrent.sort((a, b) => a.current - b.current);

  // Overall best
  const overallBest = bestPerCurrent.reduce((a, b) => (a.best > b.best ? a : b));

  // Average internal resistance (if available)
  const resistanceMeasurements = measurements.filter((m) => m.internalResistance != null);
  const avgResistance = resistanceMeasurements.length > 0
    ? Math.round(resistanceMeasurements.reduce((sum, m) => sum + m.internalResistance!, 0) / resistanceMeasurements.length * 10) / 10
    : null;

  // Last measurement date
  const lastDate = measurements.reduce((a, b) => (a.date > b.date ? a : b)).date;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b px-6 py-4 dark:border-gray-700">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100">{t("profile.title", lang)}</h3>
      </div>
      <div className="grid gap-4 px-6 py-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Best capacity */}
        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-4">
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">{t("profile.bestCapacity", lang)}</p>
          <p className="mt-1 text-2xl font-bold text-blue-700 dark:text-blue-300">
            {formatCapacity(overallBest.best)}
          </p>
          <p className="text-xs text-blue-500 dark:text-blue-400">
            {t("profile.atCurrent", lang, { current: overallBest.current.toString() })} — {overallBest.pct}%
          </p>
        </div>

        {/* Avg resistance */}
        <div className="rounded-lg bg-purple-50 dark:bg-purple-900/30 p-4">
          <p className="text-xs font-medium text-purple-600 dark:text-purple-400">{t("profile.avgResistance", lang)}</p>
          <p className="mt-1 text-2xl font-bold text-purple-700 dark:text-purple-300">
            {avgResistance != null ? `${avgResistance} mΩ` : "—"}
          </p>
          <p className="text-xs text-purple-500 dark:text-purple-400">
            {resistanceMeasurements.length} {t("profile.measurementCount", lang).toLowerCase()}
          </p>
        </div>

        {/* Measurement count */}
        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-900/30 p-4">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{t("profile.measurementCount", lang)}</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
            {measurements.length}
          </p>
          <p className="text-xs text-emerald-500 dark:text-emerald-400">
            {byCurrent.size} {lang === "hu" ? "áramerősség" : "current(s)"}
          </p>
        </div>

        {/* Last measured */}
        <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-4">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{t("profile.lastMeasured", lang)}</p>
          <p className="mt-1 text-2xl font-bold text-amber-700 dark:text-amber-300">
            {formatDate(lastDate)}
          </p>
        </div>
      </div>

      {/* Capacity retention per current */}
      {bestPerCurrent.length > 1 && (
        <div className="border-t px-6 py-4 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">{t("profile.capacityRetention", lang)}</p>
          <div className="space-y-2">
            {bestPerCurrent.map(({ current, best, pct }) => (
              <div key={current} className="flex items-center gap-3">
                <span className="w-20 text-xs text-gray-600 dark:text-gray-300 font-medium">{current} mA</span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500"}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="w-20 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                  {formatCapacity(best)} ({pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
