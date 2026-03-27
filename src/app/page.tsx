"use client";

import AppShell from "@/components/layout/AppShell";
import DashboardGrid from "@/components/dashboard/DashboardGrid";

export default function Home() {
  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Főoldal</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Áttekintés az akkumulátor celláidról</p>
      </div>
      <DashboardGrid />
    </AppShell>
  );
}
