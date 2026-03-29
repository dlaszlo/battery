"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import AppShell from "@/components/layout/AppShell";
import CellTable from "@/components/cells/CellTable";
import CellDetail from "@/components/cells/CellDetail";
import { useBatteryStore } from "@/lib/store";
import { t } from "@/lib/i18n";

function CellsContent() {
  const searchParams = useSearchParams();
  const cellId = searchParams.get("id");
  const cell = useBatteryStore((s) => cellId ? s.cells.find((c) => c.id === cellId) : undefined);
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

  if (cellId) {
    if (!cell) {
      return (
        <div className="py-12 text-center">
          <p className="text-gray-500">#{cellId} {t("cells.notFound", lang)}</p>
        </div>
      );
    }
    return <CellDetail cell={cell} />;
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{t("cells.title", lang)}</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t("cells.subtitle", lang)}</p>
      </div>
      <CellTable />
    </>
  );
}

export default function CellsPage() {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

  return (
    <AppShell>
      <Suspense fallback={<div className="py-12 text-center text-gray-400">{t("loading", lang)}</div>}>
        <CellsContent />
      </Suspense>
    </AppShell>
  );
}
