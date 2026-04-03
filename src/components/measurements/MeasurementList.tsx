"use client";

import { useState, useEffect, useMemo } from "react";
import { useBatteryStore } from "@/lib/store";
import { formatDate, formatCapacity, formatResistance, formatMinutes, capacityPercent } from "@/lib/utils";
import type { Measurement } from "@/lib/types";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import MeasurementForm from "@/components/measurements/MeasurementForm";
import ImageLightbox from "@/components/ui/ImageLightbox";
import { loadImage } from "@/lib/image-utils";
import { t } from "@/lib/i18n";

interface MeasurementListProps {
  cellId: string;
  measurements: Measurement[];
  nominalCapacity: number;
}

export default function MeasurementList({ cellId, measurements, nominalCapacity }: MeasurementListProps) {
  const deleteMeasurement = useBatteryStore((s) => s.deleteMeasurement);
  const pushToGitHub = useBatteryStore((s) => s.pushToGitHub);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const githubConfig = useBatteryStore((s) => s.githubConfig);
  const testDevices = useBatteryStore((s) => s.settings.testDevices ?? []);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [deviceImageUrls, setDeviceImageUrls] = useState<Record<string, string>>({});

  // Collect unique test device names that have images
  const devicesWithImages = useMemo(() => {
    const names = new Set(measurements.map((m) => m.testDevice));
    return testDevices.filter((d) => names.has(d.name) && d.imageFileName);
  }, [measurements, testDevices]);

  // Load device images
  useEffect(() => {
    if (!githubConfig || devicesWithImages.length === 0) return;
    let cancelled = false;
    const load = async () => {
      const urls: Record<string, string> = {};
      await Promise.all(
        devicesWithImages.map(async (d) => {
          const url = await loadImage(githubConfig, d.imageFileName!);
          if (url) urls[d.name] = url;
        })
      );
      if (!cancelled) setDeviceImageUrls(urls);
    };
    load();
    return () => { cancelled = true; };
  }, [githubConfig, devicesWithImages]);

  const sorted = [...measurements].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gray-400 dark:text-gray-500">{t("measurement.noMeasurementsForCell", lang)}</p>
    );
  }

  return (
    <>
      {lightboxSrc && (
        <ImageLightbox src={lightboxSrc} alt="" onClose={() => setLightboxSrc(null)} />
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400">
              <th className="px-4 py-2.5">{t("measurement.headerDate", lang)}</th>
              <th className="px-4 py-2.5">{t("measurement.headerCapacity", lang)}</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">{t("measurement.headerPercent", lang)}</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">{t("measurement.headerDischargeCurrent", lang)}</th>
              <th className="px-4 py-2.5 hidden sm:table-cell">{t("measurement.headerChargeCurrent", lang)}</th>
              <th className="px-4 py-2.5 hidden md:table-cell">{t("measurement.headerResistance", lang)}</th>
              <th className="px-4 py-2.5 hidden md:table-cell">{t("measurement.headerWeight", lang)}</th>
              <th className="px-4 py-2.5 hidden xl:table-cell">{t("measurement.headerChargeTemp", lang)}</th>
              <th className="px-4 py-2.5 hidden xl:table-cell">{t("measurement.headerDischargeTemp", lang)}</th>
              <th className="px-4 py-2.5 hidden xl:table-cell">{t("measurement.headerChargeTime", lang)}</th>
              <th className="px-4 py-2.5 hidden xl:table-cell">{t("measurement.headerDischargeTime", lang)}</th>
              <th className="px-4 py-2.5 hidden lg:table-cell">{t("measurement.headerDevice", lang)}</th>
              <th className="px-4 py-2.5 hidden lg:table-cell">{t("measurement.headerNotes", lang)}</th>
              <th className="px-4 py-2.5 w-20"></th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-gray-700">
            {sorted.map((m) => {
              const pct = capacityPercent(m.measuredCapacity, nominalCapacity);
              const pctColor = pct >= 80 ? "text-green-600" : pct >= 60 ? "text-amber-600" : "text-red-600";

              return editId === m.id ? (
                <tr key={m.id}>
                  <td colSpan={14} className="px-4 py-4">
                    <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/30">
                      <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("measurement.editTitle", lang)}</h4>
                      <MeasurementForm
                        cellId={cellId}
                        onDone={() => setEditId(null)}
                        editMeasurement={m}
                      />
                    </div>
                  </td>
                </tr>
              ) : (
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
                  <td className="px-4 py-2.5 hidden sm:table-cell text-gray-600 dark:text-gray-300">
                    {m.chargeCurrent ? `${m.chargeCurrent} mA` : "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-600 dark:text-gray-300">
                    {m.internalResistance ? formatResistance(m.internalResistance) : "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden md:table-cell text-gray-600 dark:text-gray-300">
                    {m.weight ? `${m.weight} g` : "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden xl:table-cell text-gray-600 dark:text-gray-300">
                    {m.chargeTemperature != null ? `${m.chargeTemperature} °C` : "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden xl:table-cell text-gray-600 dark:text-gray-300">
                    {m.dischargeTemperature != null ? `${m.dischargeTemperature} °C` : "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden xl:table-cell text-gray-600 dark:text-gray-300">
                    {m.chargeTime != null ? formatMinutes(m.chargeTime) : "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden xl:table-cell text-gray-600 dark:text-gray-300">
                    {m.dischargeTime != null ? formatMinutes(m.dischargeTime) : "—"}
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-gray-500 text-xs dark:text-gray-400">
                    <div className="flex items-center gap-1.5">
                      {deviceImageUrls[m.testDevice] && (
                        <button
                          onClick={() => setLightboxSrc(deviceImageUrls[m.testDevice])}
                          className="cursor-pointer flex-shrink-0"
                          title={m.testDevice}
                        >
                          <img
                            src={deviceImageUrls[m.testDevice]}
                            alt={m.testDevice}
                            className="h-6 w-6 rounded object-cover border border-gray-200 dark:border-gray-600 hover:ring-2 hover:ring-blue-400 transition-all"
                          />
                        </button>
                      )}
                      {m.testDevice}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 hidden lg:table-cell text-gray-500 text-xs truncate max-w-[150px] dark:text-gray-400">
                    {m.notes || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditId(m.id)}
                        className="rounded p-1 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors dark:text-gray-500 dark:hover:bg-blue-900/30 dark:hover:text-blue-400"
                        title={t("measurement.editTitle", lang)}
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteId(m.id)}
                        className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors dark:text-gray-500 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
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
          if (deleteId) { deleteMeasurement(cellId, deleteId); pushToGitHub(); }
          setDeleteId(null);
        }}
        title={t("measurement.deleteTitle", lang)}
        message={t("measurement.deleteConfirm", lang)}
        confirmLabel={t("measurement.deleteBtn", lang)}
      />
    </>
  );
}
