import type { Cell, AppSettings } from "./types";

export function shouldMarkAsScrap(
  cell: Cell,
  settings: AppSettings
): boolean {
  if (cell.measurements.length === 0) return false;
  if (cell.nominalCapacity <= 0) return false;

  const latest = cell.measurements.reduce((a, b) =>
    a.date > b.date ? a : b
  );

  const threshold =
    cell.nominalCapacity * (settings.scrapThresholdPercent / 100);

  return latest.measuredCapacity < threshold;
}

export function getScrapNote(date: string, lang: "hu" | "en" = "hu"): string {
  return lang === "hu"
    ? `Automatikusan selejtnek jelölve: ${date}`
    : `Automatically marked as scrapped: ${date}`;
}
