"use client";

import AppShell from "@/components/layout/AppShell";
import DashboardGrid from "@/components/dashboard/DashboardGrid";
import { t } from "@/lib/i18n";
import { useBatteryStore } from "@/lib/store";

export default function Home() {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("dashboard.title", lang)}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("dashboard.subtitle", lang)}</p>
      </div>
      <DashboardGrid />
    </AppShell>
  );
}
