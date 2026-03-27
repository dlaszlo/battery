"use client";

import { t } from "@/lib/i18n";
import { useBatteryStore } from "@/lib/store";

export default function Footer() {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

  return (
    <footer className="border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="mx-auto max-w-6xl px-4 py-4">
        <p className="text-center text-xs text-gray-400 dark:text-gray-500">
          {t("footer.text", lang)}
        </p>
      </div>
    </footer>
  );
}
