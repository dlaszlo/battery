"use client";

import { useBatteryStore } from "@/lib/store";
import type { CellEvent, CellEventType } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { t } from "@/lib/i18n";

const EVENT_ICONS: Record<CellEventType, { icon: string; color: string }> = {
  created: { icon: "+", color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300" },
  edited: { icon: "✎", color: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300" },
  status_changed: { icon: "⟳", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" },
  device_changed: { icon: "→", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300" },
  measurement_added: { icon: "▤", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300" },
  measurement_deleted: { icon: "−", color: "bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300" },
  auto_scrapped: { icon: "!", color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300" },
};

interface EventLogProps {
  events: CellEvent[];
}

export default function EventLog({ events }: EventLogProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";

  if (events.length === 0) {
    return (
      <p className="text-sm text-gray-400 py-2 dark:text-gray-500">{t("cell.noEvents", lang)}</p>
    );
  }

  const sorted = [...events].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-2">
      {sorted.map((event) => {
        const style = EVENT_ICONS[event.type] || EVENT_ICONS.edited;
        return (
          <div key={event.id} className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${style.color}`}
            >
              {style.icon}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-900 dark:text-gray-100">{event.description}</p>
              <p className="text-xs text-gray-400 dark:text-gray-500">{formatDate(event.date)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
