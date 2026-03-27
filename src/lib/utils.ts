export function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString("hu-HU", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: "HUF",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCapacity(mAh: number): string {
  return `${mAh.toLocaleString("hu-HU")} mAh`;
}

export function formatResistance(mOhm: number): string {
  return `${mOhm} mΩ`;
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

export function nowISO(): string {
  return new Date().toISOString();
}

export function capacityPercent(
  measured: number,
  nominal: number
): number {
  if (nominal <= 0) return 0;
  return Math.round((measured / nominal) * 100);
}
