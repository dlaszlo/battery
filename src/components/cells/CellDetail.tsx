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

  const lastMeasurement =
    cell.measurements.length > 0
      ? cell.measurements.reduce((a, b) => (a.date > b.date ? a : b))
      : null;

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
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setDuplicating(true)}>
            {t("cell.duplicate", lang)}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
            {t("cell.edit", lang)}
          </Button>
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
