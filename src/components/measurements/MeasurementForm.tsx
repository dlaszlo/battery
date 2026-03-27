"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import ComboBox from "@/components/ui/ComboBox";
import { useToast } from "@/components/ui/Toast";
import { useBatteryStore } from "@/lib/store";
import { TEST_DEVICES } from "@/lib/constants";
import { todayISO } from "@/lib/utils";

interface MeasurementFormProps {
  cellId: string;
  onDone: () => void;
}

export default function MeasurementForm({ cellId, onDone }: MeasurementFormProps) {
  const addMeasurement = useBatteryStore((s) => s.addMeasurement);
  const settings = useBatteryStore((s) => s.settings);
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
      errs.measuredCapacity = "Mért kapacitás kötelező";
    }
    if (!form.dischargeCurrent || Number(form.dischargeCurrent) <= 0) {
      errs.dischargeCurrent = "Merítési áram kötelező";
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

    toast("Mérés rögzítve");
    onDone();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label="Mérés dátuma"
          type="date"
          value={form.date}
          onChange={(e) => set("date", e.target.value)}
        />
        <Input
          label="Mért kapacitás (mAh)"
          type="number"
          placeholder="pl. 2850"
          value={form.measuredCapacity}
          onChange={(e) => set("measuredCapacity", e.target.value)}
          error={errors.measuredCapacity}
        />
        <Input
          label="Merítési áram (mA)"
          type="number"
          placeholder="pl. 500"
          value={form.dischargeCurrent}
          onChange={(e) => set("dischargeCurrent", e.target.value)}
          error={errors.dischargeCurrent}
        />
        <Input
          label="Belső ellenállás (mΩ)"
          type="number"
          step="0.1"
          placeholder="pl. 45"
          value={form.internalResistance}
          onChange={(e) => set("internalResistance", e.target.value)}
        />
        <ComboBox
          label="Tesztelő eszköz"
          options={TEST_DEVICES}
          value={form.testDevice}
          onChange={(v) => set("testDevice", v)}
          placeholder="pl. LiitoKala Lii-700"
        />
        <Input
          label="Megjegyzés"
          placeholder="Egyéb info..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onDone}>
          Mégse
        </Button>
        <Button type="submit">Mérés mentése</Button>
      </div>
    </form>
  );
}
