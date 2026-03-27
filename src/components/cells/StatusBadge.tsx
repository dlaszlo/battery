"use client";

import { STATUS_COLORS } from "@/lib/constants";
import type { CellStatus } from "@/lib/types";

interface StatusBadgeProps {
  status: CellStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}
