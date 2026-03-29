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
import { t, enumLabel } from "@/lib/i18n";
import ImagePicker from "@/components/ui/ImagePicker";
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
  const templates = useBatteryStore((s) => s.templates);
  const settings = useBatteryStore((s) => s.settings);
  const pushToGitHub = useBatteryStore((s) => s.pushToGitHub);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

  const { toast } = useToast();
  const isEdit = !!cell;
  const src = cell ?? defaults;
  const activeTemplates = templates.filter((t) => !t.archived);

  const [selectedTemplateId, setSelectedTemplateId] = useState(src?.templateId ?? "");

  const applyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    if (!templateId) return;
    const tmpl = templates.find((t) => t.id === templateId);
    if (!tmpl) return;
    setForm((prev) => ({
      ...prev,
      brand: tmpl.brand,
      model: tmpl.model ?? "",
      formFactor: tmpl.formFactor,
      chemistry: tmpl.chemistry,
      cathodeType: tmpl.cathodeType ?? "",
      contactType: tmpl.contactType ?? "",
      nominalCapacity: tmpl.nominalCapacity.toString(),
      continuousDischargeCurrent: tmpl.continuousDischargeCurrent?.toString() ?? "",
      peakDischargeCurrent: tmpl.peakDischargeCurrent?.toString() ?? "",
      weight: tmpl.weight?.toString() ?? "",
    }));
    if (tmpl.imageFileName) setImageFileName(tmpl.imageFileName);
  };

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
    purchaseUrl: src?.purchaseUrl ?? "",
    pricePerUnit: src?.pricePerUnit?.toString() ?? "",
    nominalCapacity: src?.nominalCapacity?.toString() ?? "",
    continuousDischargeCurrent: src?.continuousDischargeCurrent?.toString() ?? "",
    peakDischargeCurrent: src?.peakDischargeCurrent?.toString() ?? "",
    weight: src?.weight?.toString() ?? "",
    storageVoltage: src?.storageVoltage?.toString() ?? "",
    batchNumber: src?.batchNumber ?? "",
    status: src?.status ?? "new",
    currentDevice: src?.currentDevice ?? "",
    group: src?.group ?? "",
    notes: src?.notes ?? "",
  });

  const [imageFileName, setImageFileName] = useState<string | undefined>(src?.imageFileName);
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
    else if (!/^[a-zA-Z0-9_-]+$/.test(form.id.trim())) {
      errs.id = t("validation.idInvalid", lang);
    } else if (cells.some((c) => c.id === form.id.trim() && (!isEdit || c.internalId !== cell!.internalId))) {
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
      templateId: selectedTemplateId || undefined,
      brand: form.brand.trim(),
      model: form.model.trim() || undefined,
      formFactor: form.formFactor as Cell["formFactor"],
      chemistry: form.chemistry as Cell["chemistry"],
      cathodeType: form.cathodeType || undefined,
      contactType: form.contactType || undefined,
      platform: form.platform,
      seller: form.seller.trim(),
      purchaseDate: form.purchaseDate,
      purchaseUrl: form.purchaseUrl.trim() || undefined,
      pricePerUnit: Number(form.pricePerUnit) || 0,
      nominalCapacity: Number(form.nominalCapacity),
      continuousDischargeCurrent: form.continuousDischargeCurrent ? Number(form.continuousDischargeCurrent) : undefined,
      peakDischargeCurrent: form.peakDischargeCurrent ? Number(form.peakDischargeCurrent) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      storageVoltage: form.storageVoltage ? Number(form.storageVoltage) : undefined,
      batchNumber: form.batchNumber.trim() || undefined,
      status: form.status as Cell["status"],
      currentDevice: form.currentDevice || undefined,
      group: form.group.trim() || undefined,
      notes: form.notes.trim() || undefined,
      imageFileName,
    };

    if (isEdit) {
      updateCell(cell.internalId, cellData);
      toast(t("cell.modified", lang));
      onSave?.();
    } else {
      addCell(cellData);
      toast(t("cell.added", lang));
      router.push(`/cells?id=${cellData.id}`);
    }
    pushToGitHub();
  };

  const formFactorOptions = FORM_FACTORS.map((f) => ({ value: f, label: enumLabel("formFactor", f, lang) }));
  const chemistryOptions = CHEMISTRIES.map((c) => ({ value: c, label: c }));
  const statusOptions = CELL_STATUSES.map((s) => ({ value: s, label: enumLabel("status", s, lang) }));

  const templateOptions = [
    { value: "", label: t("templates.noTemplate", lang) },
    ...activeTemplates.map((tmpl) => ({
      value: tmpl.id,
      label: `${tmpl.name} (${tmpl.brand} ${tmpl.formFactor})`,
    })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Sablon választó — csak új cella hozzáadásnál */}
      {!isEdit && activeTemplates.length > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
          <Select
            label={t("templates.selectTemplate", lang)}
            options={templateOptions}
            value={selectedTemplateId}
            onChange={(e) => applyTemplate(e.target.value)}
          />
        </div>
      )}

      {/* Alap adatok */}
      <fieldset>
        <legend className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">{t("form.basics", lang)}</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label={t("form.id", lang)}
            tooltip={t("tooltip.id", lang)}
            isRequired
            placeholder={t("form.idPlaceholder", lang)}
            value={form.id}
            onChange={(e) => set("id", e.target.value)}
            error={errors.id}
          />
          <Input
            label={t("form.brand", lang)}
            tooltip={t("tooltip.brand", lang)}
            isRequired
            placeholder={t("form.brandPlaceholder", lang)}
            value={form.brand}
            onChange={(e) => set("brand", e.target.value)}
            error={errors.brand}
          />
          <Input
            label={t("form.model", lang)}
            tooltip={t("tooltip.model", lang)}
            placeholder={t("form.modelPlaceholder", lang)}
            value={form.model}
            onChange={(e) => set("model", e.target.value)}
          />
          <Select
            label={t("form.formFactor", lang)}
            tooltip={t("tooltip.formFactor", lang)}
            isRequired
            options={formFactorOptions}
            value={form.formFactor}
            onChange={(e) => set("formFactor", e.target.value)}
          />
          <Select
            label={t("form.chemistry", lang)}
            tooltip={t("tooltip.chemistry", lang)}
            isRequired
            options={chemistryOptions}
            value={form.chemistry}
            onChange={(e) => set("chemistry", e.target.value)}
          />
          <ComboBox
            label={t("form.cathodeType", lang)}
            tooltip={t("tooltip.cathodeType", lang)}
            options={CATHODE_TYPES.map((c) => ({ value: c, label: enumLabel("cathodeType", c, lang) }))}
            value={form.cathodeType}
            onChange={(v) => set("cathodeType", v)}
            placeholder={t("form.cathodeTypePlaceholder", lang)}
          />
          <ComboBox
            label={t("form.contactType", lang)}
            tooltip={t("tooltip.contactType", lang)}
            options={CONTACT_TYPES.map((c) => ({ value: c, label: enumLabel("contactType", c, lang) }))}
            value={form.contactType}
            onChange={(v) => set("contactType", v)}
            placeholder={t("form.contactTypePlaceholder", lang)}
          />
          <Input
            label={t("form.nominalCapacity", lang)}
            tooltip={t("tooltip.nominalCapacity", lang)}
            isRequired
            type="number"
            placeholder={t("form.nominalCapacityPlaceholder", lang)}
            value={form.nominalCapacity}
            onChange={(e) => set("nominalCapacity", e.target.value)}
            error={errors.nominalCapacity}
          />
          <Input
            label={t("form.continuousDischargeCurrent", lang)}
            tooltip={t("tooltip.continuousDischargeCurrent", lang)}
            type="number"
            step="0.1"
            placeholder={t("form.continuousDischargeCurrentPlaceholder", lang)}
            value={form.continuousDischargeCurrent}
            onChange={(e) => set("continuousDischargeCurrent", e.target.value)}
          />
          <Input
            label={t("form.peakDischargeCurrent", lang)}
            tooltip={t("tooltip.peakDischargeCurrent", lang)}
            type="number"
            step="0.1"
            placeholder={t("form.peakDischargeCurrentPlaceholder", lang)}
            value={form.peakDischargeCurrent}
            onChange={(e) => set("peakDischargeCurrent", e.target.value)}
          />
          <Select
            label={t("form.status", lang)}
            tooltip={t("tooltip.status", lang)}
            isRequired
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
            tooltip={t("tooltip.platform", lang)}
            options={PLATFORMS.map((p) => ({ value: p, label: enumLabel("platform", p, lang) }))}
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
            label={t("form.purchaseUrl", lang)}
            type="url"
            placeholder={t("form.purchaseUrlPlaceholder", lang)}
            value={form.purchaseUrl}
            onChange={(e) => set("purchaseUrl", e.target.value)}
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
            tooltip={t("tooltip.weight", lang)}
            type="number"
            step="0.1"
            placeholder={t("form.weightPlaceholder", lang)}
            value={form.weight}
            onChange={(e) => set("weight", e.target.value)}
            error={errors.weight}
          />
          <Input
            label={t("form.storageVoltage", lang)}
            tooltip={t("tooltip.storageVoltage", lang)}
            type="number"
            step="0.01"
            placeholder={t("form.storageVoltagePlaceholder", lang)}
            value={form.storageVoltage}
            onChange={(e) => set("storageVoltage", e.target.value)}
          />
          <Input
            label={t("form.batchNumber", lang)}
            tooltip={t("tooltip.batchNumber", lang)}
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
          <div>
            <ComboBox
              label={t("form.currentDevice", lang)}
              tooltip={t("tooltip.currentDevice", lang)}
              options={settings.devices || []}
              value={form.currentDevice}
              onChange={(v) => set("currentDevice", v)}
              placeholder={t("form.currentDevicePlaceholder", lang)}
            />
            {form.currentDevice === "Raktáron" && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400">
                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
                {t("warning.storageVoltage", lang)}
              </p>
            )}
          </div>
          <Input
            label={t("form.group", lang)}
            tooltip={t("tooltip.group", lang)}
            placeholder={t("form.groupPlaceholder", lang)}
            value={form.group}
            onChange={(e) => set("group", e.target.value)}
          />
        </div>
      </fieldset>

      {/* Kép */}
      <ImagePicker
        currentFileName={imageFileName}
        onImageChange={setImageFileName}
        lang={lang}
      />

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
