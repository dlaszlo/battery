"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ComboBox from "@/components/ui/ComboBox";
import { useToast } from "@/components/ui/Toast";
import { useBatteryStore } from "@/lib/store";
import {
  FORM_FACTORS,
  CHEMISTRIES,
  CATHODE_TYPES,
  CONTACT_TYPES,
  CELL_STATUSES,
  PLATFORMS,
} from "@/lib/constants";
import { todayISO } from "@/lib/utils";
import type { Cell } from "@/lib/types";

interface CellFormProps {
  cell?: Cell;
  defaults?: Partial<Cell>;
  onSave?: () => void;
}

export default function CellForm({ cell, defaults, onSave }: CellFormProps) {
  const router = useRouter();
  const addCell = useBatteryStore((s) => s.addCell);
  const updateCell = useBatteryStore((s) => s.updateCell);
  const cells = useBatteryStore((s) => s.cells);
  const settings = useBatteryStore((s) => s.settings);

  const { toast } = useToast();
  const isEdit = !!cell;
  const src = cell ?? defaults;

  const [form, setForm] = useState({
    id: src?.id ?? "",
    brand: src?.brand ?? "",
    model: src?.model ?? "",
    formFactor: src?.formFactor ?? "18650",
    chemistry: src?.chemistry ?? "Li-ion",
    cathodeType: src?.cathodeType ?? "",
    contactType: src?.contactType ?? "",
    platform: src?.platform ?? "",
    seller: src?.seller ?? "",
    purchaseDate: src?.purchaseDate ?? todayISO(),
    pricePerUnit: src?.pricePerUnit?.toString() ?? "",
    nominalCapacity: src?.nominalCapacity?.toString() ?? "",
    maxDischargeCurrent: src?.maxDischargeCurrent?.toString() ?? "",
    weight: src?.weight?.toString() ?? "",
    storageVoltage: src?.storageVoltage?.toString() ?? "",
    batchNumber: src?.batchNumber ?? "",
    status: src?.status ?? "Új",
    currentDevice: src?.currentDevice ?? "",
    group: src?.group ?? "",
    notes: src?.notes ?? "",
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

  const validate = (): boolean => {
    const errs: Record<string, string> = {};

    if (!form.id.trim()) errs.id = "Sorszám kötelező";
    else if (!isEdit && cells.some((c) => c.id === form.id.trim())) {
      errs.id = "Ez a sorszám már létezik";
    }

    if (!form.brand.trim()) errs.brand = "Márka kötelező";
    if (!form.nominalCapacity.trim()) errs.nominalCapacity = "Kapacitás kötelező";
    else if (Number(form.nominalCapacity) <= 0) errs.nominalCapacity = "Érvénytelen kapacitás";

    if (form.pricePerUnit && Number(form.pricePerUnit) < 0) errs.pricePerUnit = "Érvénytelen ár";
    if (form.weight && Number(form.weight) <= 0) errs.weight = "Érvénytelen súly";

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const cellData = {
      id: form.id.trim(),
      brand: form.brand.trim(),
      model: form.model.trim() || undefined,
      formFactor: form.formFactor as Cell["formFactor"],
      chemistry: form.chemistry as Cell["chemistry"],
      cathodeType: form.cathodeType || undefined,
      contactType: form.contactType || undefined,
      platform: form.platform,
      seller: form.seller.trim(),
      purchaseDate: form.purchaseDate,
      pricePerUnit: Number(form.pricePerUnit) || 0,
      nominalCapacity: Number(form.nominalCapacity),
      maxDischargeCurrent: form.maxDischargeCurrent ? Number(form.maxDischargeCurrent) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      storageVoltage: form.storageVoltage ? Number(form.storageVoltage) : undefined,
      batchNumber: form.batchNumber.trim() || undefined,
      status: form.status as Cell["status"],
      currentDevice: form.currentDevice || undefined,
      group: form.group.trim() || undefined,
      notes: form.notes.trim() || undefined,
    };

    if (isEdit) {
      updateCell(cell.id, cellData);
      toast("Cella módosítva");
      onSave?.();
    } else {
      addCell(cellData);
      toast("Cella hozzáadva");
      router.push(`/cells?id=${cellData.id}`);
    }
  };

  const formFactorOptions = FORM_FACTORS.map((f) => ({ value: f, label: f }));
  const chemistryOptions = CHEMISTRIES.map((c) => ({ value: c, label: c }));
  const statusOptions = CELL_STATUSES.map((s) => ({ value: s, label: s }));

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alap adatok */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Alap adatok</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Sorszám (ID)"
            placeholder="pl. 01"
            value={form.id}
            onChange={(e) => set("id", e.target.value)}
            error={errors.id}
            disabled={isEdit}
          />
          <Input
            label="Márka"
            placeholder="pl. LG, Samsung, Sony"
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            error={errors.brand}
          />
          <Input
            label="Modell"
            placeholder="pl. HE4, 30Q, VTC6"
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
          />
          <Select
            label="Form faktor"
            options={formFactorOptions}
            value={form.formFactor}
            onChange={(e) => set("formFactor", e.target.value)}
          />
          <Select
            label="Kémia"
            options={chemistryOptions}
            value={form.chemistry}
            onChange={(e) => set("chemistry", e.target.value)}
          />
          <ComboBox
            label="Katód típus"
            options={CATHODE_TYPES}
            value={form.cathodeType}
            onChange={(v) => set("cathodeType", v)}
            placeholder="pl. INR"
          />
          <ComboBox
            label="Érintkezés típusa"
            options={CONTACT_TYPES}
            value={form.contactType}
            onChange={(v) => set("contactType", v)}
            placeholder="pl. Flat top"
          />
          <Input
            label="Névleges kapacitás (mAh)"
            type="number"
            placeholder="pl. 3000"
            value={form.nominalCapacity}
            onChange={(e) => set("nominalCapacity", e.target.value)}
            error={errors.nominalCapacity}
          />
          <Input
            label="Max merítési áram (A)"
            type="number"
            step="0.1"
            placeholder="pl. 20"
            value={form.maxDischargeCurrent}
            onChange={(e) => set("maxDischargeCurrent", e.target.value)}
          />
          <Select
            label="Állapot"
            options={statusOptions}
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Beszerzés */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Beszerzés</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <ComboBox
            label="Platform"
            options={PLATFORMS}
            value={form.platform}
            onChange={(v) => set("platform", v)}
            placeholder="pl. AliExpress"
          />
          <Input
            label="Eladó / Bolt"
            placeholder="pl. Nkon"
            value={form.seller}
            onChange={(e) => set("seller", e.target.value)}
          />
          <Input
            label="Beszerzés dátuma"
            type="date"
            value={form.purchaseDate}
            onChange={(e) => set("purchaseDate", e.target.value)}
          />
          <Input
            label="Ár / db (Ft)"
            type="number"
            placeholder="pl. 1500"
            value={form.pricePerUnit}
            onChange={(e) => set("pricePerUnit", e.target.value)}
            error={errors.pricePerUnit}
          />
        </div>
      </fieldset>

      {/* Fizikai adatok */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Fizikai adatok és azonosítás</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label="Súly (g)"
            type="number"
            step="0.1"
            placeholder="pl. 48.5"
            value={form.weight}
            onChange={(e) => set("weight", e.target.value)}
            error={errors.weight}
          />
          <Input
            label="Tárolási feszültség (V)"
            type="number"
            step="0.01"
            placeholder="pl. 3.70"
            value={form.storageVoltage}
            onChange={(e) => set("storageVoltage", e.target.value)}
          />
          <Input
            label="Gyártási tétel (batch)"
            placeholder="pl. P298J242A0"
            value={form.batchNumber}
            onChange={(e) => set("batchNumber", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Felhasználás */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">Elhelyezés</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <ComboBox
            label="Jelenlegi eszköz"
            options={settings.devices || []}
            value={form.currentDevice}
            onChange={(v) => set("currentDevice", v)}
            placeholder="pl. Raktáron"
          />
          <Input
            label="Csoport / Pakk"
            placeholder="pl. E-bike 1. pakk"
            value={form.group}
            onChange={(e) => set("group", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Megjegyzés */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Megjegyzés</label>
        <textarea
          rows={3}
          placeholder="Egyéb információk..."
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 dark:placeholder:text-gray-500"
        />
      </div>

      {/* Buttons */}
      <div className="flex justify-end gap-3 border-t pt-4 dark:border-gray-700">
        {isEdit ? (
          <>
            <Button type="button" variant="secondary" onClick={onSave}>
              Mégse
            </Button>
            <Button type="submit">Mentés</Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Mégse
            </Button>
            <Button type="submit">Cella hozzáadása</Button>
          </>
        )}
      </div>
    </form>
  );
}
