"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ComboBox from "@/components/ui/ComboBox";
import { useToast } from "@/components/ui/Toast";
import { useBatteryStore } from "@/lib/store";
import { TEST_DEVICES } from "@/lib/constants";
import { todayISO } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface MeasurementFormProps {
  cellId: string;
  onDone: () => void;
}

export default function MeasurementForm({ cellId, onDone }: MeasurementFormProps) {
  const addMeasurement = useBatteryStore((s) => s.addMeasurement);
  const settings = useBatteryStore((s) => s.settings);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const { toast } = useToast();

  const [form, setForm] = useState({
    date: todayISO(),
    measuredCapacity: "",
    dischargeCurrent: settings.defaultDischargeCurrent.toString(),
    internalResistance: "",
    testDevice: settings.defaultTestDevice,
    notes: "",
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

    addMeasurement(cellId, {
      date: form.date,
      measuredCapacity: Number(form.measuredCapacity),
      dischargeCurrent: Number(form.dischargeCurrent),
      internalResistance: form.internalResistance ? Number(form.internalResistance) : undefined,
      testDevice: form.testDevice,
      notes: form.notes.trim() || undefined,
    });

    toast(t("measurement.saved", lang));
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
          type="number"
          placeholder={t("measurement.capacityPlaceholder", lang)}
          value={form.measuredCapacity}
          onChange={(e) => set("measuredCapacity", e.target.value)}
          error={errors.measuredCapacity}
        />
        <Input
          label={t("measurement.dischargeCurrent", lang)}
          type="number"
          placeholder="pl. 500"
          value={form.dischargeCurrent}
          onChange={(e) => set("dischargeCurrent", e.target.value)}
          error={errors.dischargeCurrent}
        />
        <Input
          label={t("measurement.internalResistance", lang)}
          type="number"
          step="0.1"
          placeholder={t("measurement.internalResistancePlaceholder", lang)}
          value={form.internalResistance}
          onChange={(e) => set("internalResistance", e.target.value)}
        />
        <ComboBox
          label={t("measurement.testDevice", lang)}
          options={TEST_DEVICES}
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
        <Button type="submit">{t("measurement.save", lang)}</Button>
      </div>
    </form>
  );
}
