import type { Cell, Language } from "./types";
import { t } from "./i18n";

export interface SoHResult {
  /** Overall SoH percentage (0–100) */
  score: number;
  /** Visual grade: excellent / good / fair / poor / critical */
  grade: "excellent" | "good" | "fair" | "poor" | "critical";
  /** Breakdown of contributing factors */
  factors: SoHFactor[];
}

export interface SoHFactor {
  label: string;
  value: string;
  impact: "positive" | "neutral" | "negative";
}

/**
 * Estimate State of Health for a battery cell.
 *
 * Factors considered (weighted):
 * - Capacity retention: best measured / nominal (weight: 50%)
 * - Internal resistance trend (weight: 20%)
 * - Cell age from purchase date (weight: 15%)
 * - Capacity trend over time (weight: 15%)
 */
export function estimateSoH(cell: Cell, lang: Language): SoHResult | null {
  if (cell.measurements.length === 0) return null;

  const factors: SoHFactor[] = [];
  let totalWeight = 0;
  let weightedScore = 0;

  // --- 1. Capacity retention (50%) ---
  const bestCapacity = Math.max(...cell.measurements.map((m) => m.measuredCapacity));
  const capacityPct = Math.min(100, Math.round((bestCapacity / cell.nominalCapacity) * 100));
  const capScore = Math.min(100, capacityPct);

  factors.push({
    label: t("soh.capacityRetention", lang),
    value: `${capacityPct}%`,
    impact: capScore >= 80 ? "positive" : capScore >= 60 ? "neutral" : "negative",
  });
  weightedScore += capScore * 50;
  totalWeight += 50;

  // --- 2. Internal resistance (20%) ---
  const resistanceMeasurements = cell.measurements
    .filter((m) => m.internalResistance != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (resistanceMeasurements.length >= 1) {
    const avgIR = resistanceMeasurements.reduce((s, m) => s + m.internalResistance!, 0) / resistanceMeasurements.length;

    // Typical healthy 18650: 20–60 mΩ, degraded: 80–150+ mΩ
    // Scale: <40mΩ = 100, 40–80mΩ = linear 100→60, 80–150mΩ = linear 60→0, >150 = 0
    let irScore: number;
    if (avgIR <= 40) irScore = 100;
    else if (avgIR <= 80) irScore = 100 - ((avgIR - 40) / 40) * 40;
    else if (avgIR <= 150) irScore = 60 - ((avgIR - 80) / 70) * 60;
    else irScore = 0;
    irScore = Math.round(Math.max(0, Math.min(100, irScore)));

    factors.push({
      label: t("soh.internalResistance", lang),
      value: `${Math.round(avgIR)} mΩ`,
      impact: irScore >= 70 ? "positive" : irScore >= 40 ? "neutral" : "negative",
    });
    weightedScore += irScore * 20;
    totalWeight += 20;
  }

  // --- 3. Cell age (15%) ---
  if (cell.purchaseDate) {
    const ageMs = Date.now() - new Date(cell.purchaseDate).getTime();
    const ageYears = ageMs / (1000 * 60 * 60 * 24 * 365.25);

    // Li-ion typical lifespan 3–5 years
    // <1 year = 100, 1–3 = linear 100→70, 3–6 = linear 70→30, >6 = 20
    let ageScore: number;
    if (ageYears <= 1) ageScore = 100;
    else if (ageYears <= 3) ageScore = 100 - ((ageYears - 1) / 2) * 30;
    else if (ageYears <= 6) ageScore = 70 - ((ageYears - 3) / 3) * 40;
    else ageScore = 20;
    ageScore = Math.round(Math.max(0, Math.min(100, ageScore)));

    const ageText = ageYears < 1
      ? `${Math.round(ageYears * 12)} ${t("soh.months", lang)}`
      : `${Math.round(ageYears * 10) / 10} ${t("soh.years", lang)}`;

    factors.push({
      label: t("soh.cellAge", lang),
      value: ageText,
      impact: ageScore >= 70 ? "positive" : ageScore >= 40 ? "neutral" : "negative",
    });
    weightedScore += ageScore * 15;
    totalWeight += 15;
  }

  // --- 4. Capacity trend (15%) ---
  const sorted = [...cell.measurements].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length >= 2) {
    const first = sorted[0].measuredCapacity;
    const last = sorted[sorted.length - 1].measuredCapacity;
    const trendPct = Math.round(((last - first) / first) * 100);

    // Positive or stable trend = 100, mild decline = proportional, heavy decline = low
    let trendScore: number;
    if (trendPct >= 0) trendScore = 100;
    else if (trendPct >= -10) trendScore = 100 + trendPct * 3; // -10% → 70
    else if (trendPct >= -30) trendScore = 70 + (trendPct + 10) * 2.5; // -30% → 20
    else trendScore = 10;
    trendScore = Math.round(Math.max(0, Math.min(100, trendScore)));

    const trendText = trendPct >= 0 ? `+${trendPct}%` : `${trendPct}%`;

    factors.push({
      label: t("soh.capacityTrend", lang),
      value: trendText,
      impact: trendScore >= 70 ? "positive" : trendScore >= 40 ? "neutral" : "negative",
    });
    weightedScore += trendScore * 15;
    totalWeight += 15;
  }

  // --- Final score ---
  const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : capScore;
  const grade = scoreToGrade(score);

  return { score, grade, factors };
}

function scoreToGrade(score: number): SoHResult["grade"] {
  if (score >= 85) return "excellent";
  if (score >= 70) return "good";
  if (score >= 50) return "fair";
  if (score >= 30) return "poor";
  return "critical";
}

export function gradeColor(grade: SoHResult["grade"]): string {
  switch (grade) {
    case "excellent": return "text-green-600 dark:text-green-400";
    case "good": return "text-blue-600 dark:text-blue-400";
    case "fair": return "text-amber-600 dark:text-amber-400";
    case "poor": return "text-orange-600 dark:text-orange-400";
    case "critical": return "text-red-600 dark:text-red-400";
  }
}

export function gradeBgColor(grade: SoHResult["grade"]): string {
  switch (grade) {
    case "excellent": return "bg-green-50 dark:bg-green-900/30";
    case "good": return "bg-blue-50 dark:bg-blue-900/30";
    case "fair": return "bg-amber-50 dark:bg-amber-900/30";
    case "poor": return "bg-orange-50 dark:bg-orange-900/30";
    case "critical": return "bg-red-50 dark:bg-red-900/30";
  }
}

export function gradeBarColor(grade: SoHResult["grade"]): string {
  switch (grade) {
    case "excellent": return "bg-green-500";
    case "good": return "bg-blue-500";
    case "fair": return "bg-amber-500";
    case "poor": return "bg-orange-500";
    case "critical": return "bg-red-500";
  }
}
