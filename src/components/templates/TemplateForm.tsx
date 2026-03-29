"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import ComboBox from "@/components/ui/ComboBox";
import { useBatteryStore } from "@/lib/store";
import { FORM_FACTORS, CHEMISTRIES, CATHODE_TYPES, CONTACT_TYPES } from "@/lib/constants";
import { t, enumLabel } from "@/lib/i18n";
import ImagePicker from "@/components/ui/ImagePicker";
import type { CellTemplate } from "@/lib/types";

interface TemplateFormProps {
  template?: CellTemplate;
  onSave: () => void;
  onCancel: () => void;
}

export default function TemplateForm({ template, onSave, onCancel }: TemplateFormProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const addTemplate = useBatteryStore((s) => s.addTemplate);
  const updateTemplate = useBatteryStore((s) => s.updateTemplate);
  const pushToGitHub = useBatteryStore((s) => s.pushToGitHub);
  const isEdit = !!template;

  const [form, setForm] = useState({
    name: template?.name ?? "",
    brand: template?.brand ?? "",
    model: template?.model ?? "",
    formFactor: template?.formFactor ?? "18650",
    chemistry: template?.chemistry ?? "Li-ion",
    cathodeType: template?.cathodeType ?? "",
    contactType: template?.contactType ?? "",
    nominalCapacity: template?.nominalCapacity?.toString() ?? "",
    continuousDischargeCurrent: template?.continuousDischargeCurrent?.toString() ?? "",
    peakDischargeCurrent: template?.peakDischargeCurrent?.toString() ?? "",
    weight: template?.weight?.toString() ?? "",
  });

  const [imageFileName, setImageFileName] = useState<string | undefined>(template?.imageFileName);
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
    if (!form.name.trim()) errs.name = lang === "hu" ? "Kötelező mező" : "Required";
    if (!form.brand.trim()) errs.brand = lang === "hu" ? "Kötelező mező" : "Required";
    if (!form.nominalCapacity || Number(form.nominalCapacity) <= 0) {
      errs.nominalCapacity = lang === "hu" ? "Kötelező mező" : "Required";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    const data = {
      name: form.name.trim(),
      brand: form.brand.trim(),
      model: form.model.trim() || undefined,
      formFactor: form.formFactor as CellTemplate["formFactor"],
      chemistry: form.chemistry as CellTemplate["chemistry"],
      cathodeType: form.cathodeType || undefined,
      contactType: form.contactType || undefined,
      nominalCapacity: Number(form.nominalCapacity),
      continuousDischargeCurrent: form.continuousDischargeCurrent ? Number(form.continuousDischargeCurrent) : undefined,
      peakDischargeCurrent: form.peakDischargeCurrent ? Number(form.peakDischargeCurrent) : undefined,
      weight: form.weight ? Number(form.weight) : undefined,
      imageFileName,
    };

    if (isEdit) {
      updateTemplate(template.id, data);
    } else {
      addTemplate(data);
    }
    onSave();
    pushToGitHub();
  };

  const ffOptions = FORM_FACTORS.map((f) => ({ value: f, label: enumLabel("formFactor", f, lang) }));
  const chemOptions = CHEMISTRIES.map((c) => ({ value: c, label: c }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input
          label={t("templates.name", lang)}
          isRequired
          placeholder={t("templates.namePlaceholder", lang)}
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          error={errors.name}
        />
        <Input
          label={t("form.brand", lang)}
          isRequired
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
          options={ffOptions}
          value={form.formFactor}
          onChange={(e) => set("formFactor", e.target.value)}
        />
        <Select
          label={t("form.chemistry", lang)}
          options={chemOptions}
          value={form.chemistry}
          onChange={(e) => set("chemistry", e.target.value)}
        />
        <ComboBox
          label={t("form.cathodeType", lang)}
          options={CATHODE_TYPES.map((c) => ({ value: c, label: enumLabel("cathodeType", c, lang) }))}
          value={form.cathodeType}
          onChange={(v) => set("cathodeType", v)}
          placeholder={t("form.cathodeTypePlaceholder", lang)}
        />
        <ComboBox
          label={t("form.contactType", lang)}
          options={CONTACT_TYPES.map((c) => ({ value: c, label: enumLabel("contactType", c, lang) }))}
          value={form.contactType}
          onChange={(v) => set("contactType", v)}
          placeholder={t("form.contactTypePlaceholder", lang)}
        />
        <Input
          label={t("form.nominalCapacity", lang)}
          isRequired
          type="number"
          placeholder={t("form.nominalCapacityPlaceholder", lang)}
          value={form.nominalCapacity}
          onChange={(e) => set("nominalCapacity", e.target.value)}
          error={errors.nominalCapacity}
        />
        <Input
          label={t("form.continuousDischargeCurrent", lang)}
          type="number"
          step="0.1"
          placeholder={t("form.continuousDischargeCurrentPlaceholder", lang)}
          value={form.continuousDischargeCurrent}
          onChange={(e) => set("continuousDischargeCurrent", e.target.value)}
        />
        <Input
          label={t("form.peakDischargeCurrent", lang)}
          type="number"
          step="0.1"
          placeholder={t("form.peakDischargeCurrentPlaceholder", lang)}
          value={form.peakDischargeCurrent}
          onChange={(e) => set("peakDischargeCurrent", e.target.value)}
        />
        <Input
          label={t("form.weight", lang)}
          type="number"
          step="0.1"
          placeholder={t("form.weightPlaceholder", lang)}
          value={form.weight}
          onChange={(e) => set("weight", e.target.value)}
        />
      </div>

      <ImagePicker
        currentFileName={imageFileName}
        onImageChange={setImageFileName}
        lang={lang}
      />

      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("templates.cancel", lang)}
        </Button>
        <Button type="submit">
          {t("templates.save", lang)}
        </Button>
      </div>
    </form>
  );
}
