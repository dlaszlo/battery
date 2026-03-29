"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ComboBox from "@/components/ui/ComboBox";
import { useToast } from "@/components/ui/Toast";
import { useBatteryStore } from "@/lib/store";
import { todayISO } from "@/lib/utils";
import { t } from "@/lib/i18n";

function hmmToMinutes(hmm: string): number | undefined {
  const match = hmm.match(/^(\d+):(\d{1,2})$/);
  if (!match) return undefined;
  return parseInt(match[1]) * 60 + parseInt(match[2]);
}

function minutesToHmm(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}:${m.toString().padStart(2, "0")}`;
}

interface MeasurementFormProps {
  cellId: string;
  onDone: () => void;
  lastDischargeCurrent?: number;
  editMeasurement?: import("@/lib/types").Measurement;
}

export default function MeasurementForm({ cellId, onDone, lastDischargeCurrent, editMeasurement }: MeasurementFormProps) {
  const addMeasurement = useBatteryStore((s) => s.addMeasurement);
  const updateMeasurement = useBatteryStore((s) => s.updateMeasurement);
  const settings = useBatteryStore((s) => s.settings);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const { toast } = useToast();

  const isEdit = !!editMeasurement;

  const [form, setForm] = useState({
    date: editMeasurement?.date ?? todayISO(),
    measuredCapacity: editMeasurement?.measuredCapacity?.toString() ?? "",
    dischargeCurrent: editMeasurement?.dischargeCurrent?.toString() ?? settings.defaultDischargeCurrent.toString(),
    chargeCurrent: editMeasurement?.chargeCurrent?.toString() ?? (settings.defaultChargeCurrent ?? "").toString(),
    internalResistance: editMeasurement?.internalResistance?.toString() ?? "",
    weight: editMeasurement?.weight?.toString() ?? "",
    chargeTemperature: editMeasurement?.chargeTemperature?.toString() ?? "",
    dischargeTemperature: editMeasurement?.dischargeTemperature?.toString() ?? "",
    ambientTemperature: editMeasurement?.ambientTemperature?.toString() ?? "",
    chargeTime: editMeasurement?.chargeTime != null ? minutesToHmm(editMeasurement.chargeTime) : "",
    dischargeTime: editMeasurement?.dischargeTime != null ? minutesToHmm(editMeasurement.dischargeTime) : "",
    testDevice: editMeasurement?.testDevice ?? settings.defaultTestDevice,
    notes: editMeasurement?.notes ?? "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const errs: Record<string, string> = {};
    if (!form.measuredCapacity || Number(form.measuredCapacity) <= 0) {
      errs.measuredCapacity = t("measurement.capacityRequired", lang);
    }
    if (!form.dischargeCurrent || Number(form.dischargeCurrent) <= 0) {
      errs.dischargeCurrent = t("measurement.currentRequired", lang);
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const data = {
      date: form.date,
      measuredCapacity: Number(form.measuredCapacity),
      dischargeCurrent: Number(form.dischargeCurrent),
      chargeCurrent: form.chargeCurrent ? Number(form.chargeCurrent) : undefined,
      internalResistance: form.internalResistance ? Number(form.internalResistance) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      chargeTemperature: form.chargeTemperature ? Number(form.chargeTemperature) : undefined,
      dischargeTemperature: form.dischargeTemperature ? Number(form.dischargeTemperature) : undefined,
      ambientTemperature: form.ambientTemperature ? Number(form.ambientTemperature) : undefined,
      chargeTime: form.chargeTime ? hmmToMinutes(form.chargeTime) : undefined,
      dischargeTime: form.dischargeTime ? hmmToMinutes(form.dischargeTime) : undefined,
      testDevice: form.testDevice,
      notes: form.notes.trim() || undefined,
    };

    if (isEdit) {
      updateMeasurement(cellId, editMeasurement!.id, data);
      toast(t("measurement.updated", lang));
    } else {
      addMeasurement(cellId, data);
      toast(t("measurement.saved", lang));
    }
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("measurement.dateLabel", lang)}
          type="date"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
        />
        <Input
          label={t("measurement.capacity", lang)}
          tooltip={t("tooltip.measuredCapacity", lang)}
          isRequired
          type="number"
          placeholder={t("measurement.capacityPlaceholder", lang)}
          value={form.measuredCapacity}
          onChange={(e) => set("measuredCapacity", e.target.value)}
          error={errors.measuredCapacity}
        />
        <Input
          label={t("measurement.dischargeCurrent", lang)}
          tooltip={t("tooltip.dischargeCurrent", lang)}
          isRequired
          type="number"
          placeholder="pl. 500"
          value={form.dischargeCurrent}
          onChange={(e) => set("dischargeCurrent", e.target.value)}
          error={errors.dischargeCurrent}
        />
        {lastDischargeCurrent != null && form.dischargeCurrent && Number(form.dischargeCurrent) !== lastDischargeCurrent && (
          <div className="sm:col-span-2 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 p-3">
            <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {t("measurement.currentWarning", lang, { prev: lastDischargeCurrent.toString() })}
            </p>
          </div>
        )}
        <Input
          label={t("measurement.chargeCurrent", lang)}
          tooltip={t("tooltip.chargeCurrent", lang)}
          type="number"
          placeholder="pl. 1000"
          value={form.chargeCurrent}
          onChange={(e) => set("chargeCurrent", e.target.value)}
        />
        <Input
          label={t("measurement.internalResistance", lang)}
          tooltip={t("tooltip.internalResistance", lang)}
          type="number"
          step="0.1"
          placeholder={t("measurement.internalResistancePlaceholder", lang)}
          value={form.internalResistance}
          onChange={(e) => set("internalResistance", e.target.value)}
        />
        <Input
          label={t("measurement.weight", lang)}
          tooltip={t("tooltip.weight", lang)}
          type="number"
          step="0.1"
          placeholder={t("measurement.weightPlaceholder", lang)}
          value={form.weight}
          onChange={(e) => set("weight", e.target.value)}
        />
        <Input
          label={t("measurement.chargeTemperature", lang)}
          type="number"
          step="0.1"
          placeholder={t("measurement.temperaturePlaceholder", lang)}
          value={form.chargeTemperature}
          onChange={(e) => set("chargeTemperature", e.target.value)}
        />
        <Input
          label={t("measurement.dischargeTemperature", lang)}
          type="number"
          step="0.1"
          placeholder={t("measurement.temperaturePlaceholder", lang)}
          value={form.dischargeTemperature}
          onChange={(e) => set("dischargeTemperature", e.target.value)}
        />
        <Input
          label={t("measurement.ambientTemperature", lang)}
          type="number"
          step="0.1"
          placeholder={t("measurement.temperaturePlaceholder", lang)}
          value={form.ambientTemperature}
          onChange={(e) => set("ambientTemperature", e.target.value)}
        />
        <Input
          label={t("measurement.chargeTime", lang)}
          placeholder="H:MM"
          value={form.chargeTime}
          onChange={(e) => set("chargeTime", e.target.value)}
        />
        <Input
          label={t("measurement.dischargeTime", lang)}
          placeholder="H:MM"
          value={form.dischargeTime}
          onChange={(e) => set("dischargeTime", e.target.value)}
        />
        <ComboBox
          label={t("measurement.testDevice", lang)}
          tooltip={t("tooltip.testDevice", lang)}
          options={settings.testDevices || []}
          value={form.testDevice}
          onChange={(v) => set("testDevice", v)}
          placeholder={t("measurement.testDevicePlaceholder", lang)}
        />
        <Input
          label={t("measurement.notes", lang)}
          placeholder={t("measurement.notesPlaceholder", lang)}
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>
          {t("measurement.cancel", lang)}
        </Button>
        <Button type="submit">{isEdit ? t("measurement.update", lang) : t("measurement.save", lang)}</Button>
      </div>
    </form>
  );
}
