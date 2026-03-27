import type { AppSettings, CellStatus, Chemistry, FormFactor } from "./types";

export const FORM_FACTORS: FormFactor[] = [
  "18650",
  "21700",
  "26650",
  "14500",
  "AA",
  "AAA",
  "C",
  "D",
  "Egyéb",
];

export const CHEMISTRIES: Chemistry[] = [
  "Li-ion",
  "LiFePO4",
  "NiMH",
  "NiCd",
  "LiPo",
];

export const CELL_STATUSES: CellStatus[] = [
  "Új",
  "Használt",
  "Bontott",
  "Selejt",
];

export const CATHODE_TYPES = [
  "INR",
  "ICR",
  "IMR",
  "IFR",
  "INR/IMR",
  "Egyéb",
];

export const CONTACT_TYPES = [
  "Flat top",
  "Button top",
  "Forrfüles",
  "Védett (protected)",
  "Egyéb",
];

export const PLATFORMS = [
  "AliExpress",
  "eBay",
  "Nkon.nl",
  "Amazon",
  "Hazai bolt",
  "Egyéb",
];

export const DEFAULT_DEVICES = [
  "Raktáron",
  "E-bike #1",
  "Powerwall",
  "LT1",
  "Lámpa",
  "Tesztelés alatt",
];

export const TEST_DEVICES = [
  "LiitoKala Lii-700",
  "LiitoKala Lii-500",
  "LiitoKala Lii-M4S",
  "XTAR VC4SL",
  "Opus BT-C3100",
  "Egyéb",
];

export const DEFAULT_SETTINGS: AppSettings = {
  scrapThresholdPercent: 60,
  defaultTestDevice: "LiitoKala Lii-700",
  defaultDischargeCurrent: 500,
  devices: [...DEFAULT_DEVICES],
  theme: "system",
  language: "hu",
};

export const DEFAULT_GITHUB_REPO = "battery-cell-data";
export const DEFAULT_GITHUB_FILE_PATH = "data.json";

export const DATA_VERSION = 1;

export const STATUS_COLORS: Record<CellStatus, string> = {
  "Új": "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  "Használt": "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  "Bontott": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  "Selejt": "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};
