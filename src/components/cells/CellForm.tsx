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
import { t } from "@/lib/i18n";
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
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

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

    if (!form.id.trim()) errs.id = t("validation.idRequired", lang);
    else if (!isEdit && cells.some((c) => c.id === form.id.trim())) {
      errs.id = t("validation.idExists", lang);
    }

    if (!form.brand.trim()) errs.brand = t("validation.brandRequired", lang);
    if (!form.nominalCapacity.trim()) errs.nominalCapacity = t("validation.capacityRequired", lang);
    else if (Number(form.nominalCapacity) <= 0) errs.nominalCapacity = t("validation.invalidCapacity", lang);

    if (form.pricePerUnit && Number(form.pricePerUnit) < 0) errs.pricePerUnit = t("validation.invalidPrice", lang);
    if (form.weight && Number(form.weight) <= 0) errs.weight = t("validation.invalidWeight", lang);

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
      toast(t("cell.modified", lang));
      onSave?.();
    } else {
      addCell(cellData);
      toast(t("cell.added", lang));
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
        <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("form.basics", lang)}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("form.id", lang)}
            placeholder={t("form.idPlaceholder", lang)}
            value={form.id}
            onChange={(e) => set("id", e.target.value)}
            error={errors.id}
            disabled={isEdit}
          />
          <Input
            label={t("form.brand", lang)}
            placeholder={t("form.brandPlaceholder", lang)}
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            error={errors.brand}
          />
          <Input
            label={t("form.model", lang)}
            placeholder={t("form.modelPlaceholder", lang)}
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
          />
          <Select
            label={t("form.formFactor", lang)}
            options={formFactorOptions}
            value={form.formFactor}
            onChange={(e) => set("formFactor", e.target.value)}
          />
          <Select
            label={t("form.chemistry", lang)}
            options={chemistryOptions}
            value={form.chemistry}
            onChange={(e) => set("chemistry", e.target.value)}
          />
          <ComboBox
            label={t("form.cathodeType", lang)}
            options={CATHODE_TYPES}
            value={form.cathodeType}
            onChange={(v) => set("cathodeType", v)}
            placeholder={t("form.cathodeTypePlaceholder", lang)}
          />
          <ComboBox
            label={t("form.contactType", lang)}
            options={CONTACT_TYPES}
            value={form.contactType}
            onChange={(v) => set("contactType", v)}
            placeholder={t("form.contactTypePlaceholder", lang)}
          />
          <Input
            label={t("form.nominalCapacity", lang)}
            type="number"
            placeholder={t("form.nominalCapacityPlaceholder", lang)}
            value={form.nominalCapacity}
            onChange={(e) => set("nominalCapacity", e.target.value)}
            error={errors.nominalCapacity}
          />
          <Input
            label={t("form.maxDischargeCurrent", lang)}
            type="number"
            step="0.1"
            placeholder={t("form.maxDischargeCurrentPlaceholder", lang)}
            value={form.maxDischargeCurrent}
            onChange={(e) => set("maxDischargeCurrent", e.target.value)}
          />
          <Select
            label={t("form.status", lang)}
            options={statusOptions}
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Beszerzés */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("form.purchase", lang)}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <ComboBox
            label={t("form.platform", lang)}
            options={PLATFORMS}
            value={form.platform}
            onChange={(v) => set("platform", v)}
            placeholder={t("form.platformPlaceholder", lang)}
          />
          <Input
            label={t("form.seller", lang)}
            placeholder={t("form.sellerPlaceholder", lang)}
            value={form.seller}
            onChange={(e) => set("seller", e.target.value)}
          />
          <Input
            label={t("form.purchaseDate", lang)}
            type="date"
            value={form.purchaseDate}
            onChange={(e) => set("purchaseDate", e.target.value)}
          />
          <Input
            label={t("form.pricePerUnit", lang)}
            type="number"
            placeholder={t("form.pricePerUnitPlaceholder", lang)}
            value={form.pricePerUnit}
            onChange={(e) => set("pricePerUnit", e.target.value)}
            error={errors.pricePerUnit}
          />
        </div>
      </fieldset>

      {/* Fizikai adatok */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("form.physical", lang)}</legend>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Input
            label={t("form.weight", lang)}
            type="number"
            step="0.1"
            placeholder={t("form.weightPlaceholder", lang)}
            value={form.weight}
            onChange={(e) => set("weight", e.target.value)}
            error={errors.weight}
          />
          <Input
            label={t("form.storageVoltage", lang)}
            type="number"
            step="0.01"
            placeholder={t("form.storageVoltagePlaceholder", lang)}
            value={form.storageVoltage}
            onChange={(e) => set("storageVoltage", e.target.value)}
          />
          <Input
            label={t("form.batchNumber", lang)}
            placeholder={t("form.batchNumberPlaceholder", lang)}
            value={form.batchNumber}
            onChange={(e) => set("batchNumber", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Felhasználás */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("form.placement", lang)}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <ComboBox
            label={t("form.currentDevice", lang)}
            options={settings.devices || []}
            value={form.currentDevice}
            onChange={(v) => set("currentDevice", v)}
            placeholder={t("form.currentDevicePlaceholder", lang)}
          />
          <Input
            label={t("form.group", lang)}
            placeholder={t("form.groupPlaceholder", lang)}
            value={form.group}
            onChange={(e) => set("group", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Megjegyzés */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">{t("form.notes", lang)}</label>
        <textarea
          rows={3}
          placeholder={t("form.notesPlaceholder", lang)}
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
              {t("form.cancel", lang)}
            </Button>
            <Button type="submit">{t("form.save", lang)}</Button>
          </>
        ) : (
          <>
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              {t("form.cancel", lang)}
            </Button>
            <Button type="submit">{t("form.addCell", lang)}</Button>
          </>
        )}
      </div>
    </form>
  );
}
