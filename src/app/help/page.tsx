"use client";

import AppShell from "@/components/layout/AppShell";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";

export default function HelpPage() {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("help.title", lang)}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("help.subtitle", lang)}</p>
      </div>

      <div className="space-y-6">
        {/* Mi ez az app? */}
        <HelpSection title={t("help.whatIsTitle", lang)}>
          <p>{t("help.whatIsDesc", lang)}</p>
        </HelpSection>

        {/* Cella nyilvántartás */}
        <HelpSection title={t("help.cellInventoryTitle", lang)}>
          <p>{t("help.cellInventoryDesc", lang)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>{t("help.cellField1", lang)}</li>
            <li>{t("help.cellField2", lang)}</li>
            <li>{t("help.cellField3", lang)}</li>
            <li>{t("help.cellField4", lang)}</li>
            <li>{t("help.cellField5", lang)}</li>
            <li>{t("help.cellField6", lang)}</li>
          </ul>
        </HelpSection>

        {/* Mérések */}
        <HelpSection title={t("help.measurementsTitle", lang)}>
          <p>{t("help.measurementsDesc", lang)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>{t("help.measureField1", lang)}</li>
            <li>{t("help.measureField2", lang)}</li>
            <li>{t("help.measureField3", lang)}</li>
            <li>{t("help.measureField4", lang)}</li>
          </ul>
        </HelpSection>

        {/* Auto selejt */}
        <HelpSection title={t("help.scrapTitle", lang)}>
          <p>{t("help.scrapDesc", lang)}</p>
        </HelpSection>

        {/* Tárolási tippek */}
        <HelpSection title={t("help.storageTitle", lang)}>
          <p>{t("help.storageDesc", lang)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>{t("help.storageTip1", lang)}</li>
            <li>{t("help.storageTip2", lang)}</li>
            <li>{t("help.storageTip3", lang)}</li>
          </ul>
        </HelpSection>

        {/* Adattárolás */}
        <HelpSection title={t("help.dataTitle", lang)}>
          <p>{t("help.dataDesc", lang)}</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            <li>{t("help.dataPerk1", lang)}</li>
            <li>{t("help.dataPerk2", lang)}</li>
            <li>{t("help.dataPerk3", lang)}</li>
            <li>{t("help.dataPerk4", lang)}</li>
          </ul>
        </HelpSection>

        {/* Beállítás */}
        <HelpSection title={t("help.setupTitle", lang)}>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>
              {t("help.setupStep1", lang)}{" "}
              <a
                href="https://github.com/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                github.com/new
              </a>
            </li>
            <li>
              {t("help.setupStep2", lang)}{" "}
              <a
                href="https://github.com/settings/personal-access-tokens/new"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Fine-grained token
              </a>
            </li>
            <li>{t("help.setupStep3", lang)}</li>
          </ol>
          <div className="mt-3 rounded-lg bg-amber-50 dark:bg-amber-900/30 p-3 text-xs text-amber-800 dark:text-amber-200">
            <p className="font-medium">{t("help.setupTokenTip", lang)}</p>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              <li>Token name: <strong>Battery Tracker</strong></li>
              <li>Repository access: <strong>Only select repositories</strong> &rarr; <code className="rounded bg-amber-100 dark:bg-amber-800 px-1">battery-cell-data</code></li>
              <li>Permissions &rarr; Contents: <strong>Read and write</strong></li>
            </ul>
          </div>
        </HelpSection>

        {/* Mobil használat + QR kód */}
        <HelpSection title={t("help.mobileTitle", lang)}>
          <p>{t("help.mobileDesc", lang)}</p>

          <div className="mt-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("help.installTitle", lang)}</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              <li>{t("help.installIos", lang)}</li>
              <li>{t("help.installAndroid", lang)}</li>
            </ul>
          </div>

          <div className="mt-4">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{t("help.qrTitle", lang)}</p>
            <p className="mt-1 text-sm">{t("help.qrDesc", lang)}</p>
            <div className="mt-2 space-y-2">
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Linux / Mac:</p>
                <code className="mt-1 block rounded bg-gray-100 dark:bg-gray-700 px-3 py-2 font-mono text-xs text-gray-800 dark:text-gray-200">
                  sudo apt install qrencode<br />
                  echo -n &quot;github_pat_...&quot; | qrencode -t UTF8
                </code>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Windows (PowerShell):</p>
                <code className="mt-1 block rounded bg-gray-100 dark:bg-gray-700 px-3 py-2 font-mono text-xs text-gray-800 dark:text-gray-200">
                  Install-Module -Name QRCodeGenerator<br />
                  New-QRCodeURI -URI &quot;github_pat_...&quot;
                </code>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">Mac (Homebrew):</p>
                <code className="mt-1 block rounded bg-gray-100 dark:bg-gray-700 px-3 py-2 font-mono text-xs text-gray-800 dark:text-gray-200">
                  brew install qrencode<br />
                  echo -n &quot;github_pat_...&quot; | qrencode -t UTF8
                </code>
              </div>
            </div>
            <div className="mt-2 flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-900/30 p-3">
              <svg className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
              <p className="text-xs text-red-700 dark:text-red-300">{t("help.qrWarning", lang)}</p>
            </div>
          </div>
        </HelpSection>

        {/* Export / Import */}
        <HelpSection title={t("help.exportTitle", lang)}>
          <p>{t("help.exportDesc", lang)}</p>
        </HelpSection>
      </div>
    </AppShell>
  );
}

function HelpSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-6 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
      <div className="text-sm text-gray-600 dark:text-gray-300 space-y-2">{children}</div>
    </div>
  );
}
