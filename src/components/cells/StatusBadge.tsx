"use client";

import { STATUS_COLORS } from "@/lib/constants";
import { enumLabel } from "@/lib/i18n";
import { useBatteryStore } from "@/lib/store";
import type { CellStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: CellStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const lang = useBatteryStore((s) => s.settings.language) ?? "hu";
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {enumLabel("status", status, lang)}
    </span>
  );
}
