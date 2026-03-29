"use client";

import { useState, useEffect } from "react";
import AppShell from "@/components/layout/AppShell";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";
import Button from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import TemplateForm from "@/components/templates/TemplateForm";
import type { CellTemplate, Language, GitHubConfig } from "@/lib/types";
import { formatCapacity } from "@/lib/utils";
import { loadImage } from "@/lib/image-utils";

export default function TemplatesPage() {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  const templates = useBatteryStore((s) => s.templates);
  const archiveTemplate = useBatteryStore((s) => s.archiveTemplate);
  const updateTemplate = useBatteryStore((s) => s.updateTemplate);
  const githubConfig = useBatteryStore((s) => s.githubConfig);
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CellTemplate | null>(null);
  const [showArchived, setShowArchived] = useState(false);

  const activeTemplates = templates.filter((t) => !t.archived);
  const archivedTemplates = templates.filter((t) => t.archived);

  return (
    <AppShell>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("templates.title", lang)}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("templates.subtitle", lang)}</p>
        </div>
        {!showForm && !editingTemplate && (
          <Button onClick={() => setShowForm(true)}>{t("templates.add", lang)}</Button>
        )}
      </div>

      {(showForm || editingTemplate) && (
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <TemplateForm
            template={editingTemplate ?? undefined}
            onSave={() => {
              setShowForm(false);
              setEditingTemplate(null);
              toast(t("templates.saved", lang));
            }}
            onCancel={() => {
              setShowForm(false);
              setEditingTemplate(null);
            }}
          />
        </div>
      )}

      {activeTemplates.length === 0 && !showForm && (
        <p className="py-12 text-center text-sm text-gray-400 dark:text-gray-500">
          {t("templates.noTemplates", lang)}
        </p>
      )}

      {activeTemplates.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {activeTemplates.map((tmpl) => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              lang={lang}
              githubConfig={githubConfig}
              onEdit={() => setEditingTemplate(tmpl)}
              onArchive={() => {
                archiveTemplate(tmpl.id);
                toast(t("templates.archiveConfirm", lang));
              }}
            />
          ))}
        </div>
      )}

      {archivedTemplates.length > 0 && (
        <div className="mt-8">
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            {showArchived ? t("templates.hideArchived", lang) : t("templates.showArchived", lang)}
            {` (${archivedTemplates.length})`}
          </button>
          {showArchived && (
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {archivedTemplates.map((tmpl) => (
                <TemplateCard
                  key={tmpl.id}
                  template={tmpl}
                  lang={lang}
                  githubConfig={githubConfig}
                  archived
                  onRestore={() => {
                    updateTemplate(tmpl.id, { archived: false });
                    toast(t("templates.restored", lang));
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

function TemplateCard({
  template,
  lang,
  githubConfig,
  archived,
  onEdit,
  onArchive,
  onRestore,
}: {
  template: CellTemplate;
  lang: Language;
  githubConfig: GitHubConfig | null;
  archived?: boolean;
  onEdit?: () => void;
  onArchive?: () => void;
  onRestore?: () => void;
}) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!template.imageFileName || !githubConfig) { setImageUrl(null); return; }
    let cancelled = false;
    loadImage(githubConfig, template.imageFileName).then((url) => {
      if (!cancelled && url) setImageUrl(url);
    });
    return () => { cancelled = true; };
  }, [template.imageFileName, githubConfig]);

  return (
    <div className={`rounded-xl border p-5 shadow-sm ${
      archived
        ? "border-gray-200 bg-gray-50 opacity-70 dark:border-gray-700 dark:bg-gray-800/50"
        : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          {imageUrl && (
            <img
              src={imageUrl}
              alt={template.name}
              className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-600 flex-shrink-0"
            />
          )}
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100">{template.name}</h3>
            <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
              {template.brand}{template.model ? ` ${template.model}` : ""}
            </p>
          </div>
        </div>
        {archived && (
          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-400">
            {t("templates.archived", lang)}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-500 dark:text-gray-400">{t("info.formFactor", lang)}</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{template.formFactor}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">{t("info.chemistry", lang)}</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{template.chemistry}</p>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">{t("info.nominalCapacity", lang)}</span>
          <p className="font-medium text-gray-900 dark:text-gray-100">{formatCapacity(template.nominalCapacity)}</p>
        </div>
        {template.continuousDischargeCurrent && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">{t("info.continuousDischargeCurrent", lang)}</span>
            <p className="font-medium text-gray-900 dark:text-gray-100">{template.continuousDischargeCurrent} A</p>
          </div>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {archived ? (
          <Button variant="secondary" size="sm" onClick={onRestore}>
            {t("templates.restore", lang)}
          </Button>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onEdit}>
              {t("templates.edit", lang)}
            </Button>
            <Button variant="danger" size="sm" onClick={onArchive}>
              {t("templates.archive", lang)}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
