import type { AppSettings, SharedSettings, ClientSettings, CellStatus, Chemistry, FormFactor } from "./types";

export const FORM_FACTORS: FormFactor[] = [
  "18650",
  "21700",
  "26650",
  "14500",
  "AA",
  "AAA",
  "C",
  "D",
  "other",
];

export const CHEMISTRIES: Chemistry[] = [
  "Li-ion",
  "LiFePO4",
  "NiMH",
  "NiCd",
  "LiPo",
];

export const CELL_STATUSES: CellStatus[] = [
  "new",
  "used",
  "recovered",
  "scrapped",
];

export const CATHODE_TYPES = [
  "INR",
  "ICR",
  "IMR",
  "IFR",
  "INR/IMR",
  "other",
];

export const CONTACT_TYPES = [
  "flat_top",
  "button_top",
  "tabbed",
  "protected",
  "other",
];

export const PLATFORMS = [
  "AliExpress",
  "eBay",
  "Nkon.nl",
  "Amazon",
  "local_store",
  "other",
];

export const DEFAULT_DEVICES: import("./types").Device[] = [
  { id: "storage", name: "Raktáron" },
  { id: "ebike1", name: "E-bike #1" },
  { id: "powerwall", name: "Powerwall" },
  { id: "lt1", name: "LT1" },
  { id: "lamp", name: "Lámpa" },
  { id: "testing", name: "Tesztelés alatt" },
];

export const DEFAULT_TEST_DEVICES: import("./types").TestDevice[] = [
  { id: "liitokala-lii-700", name: "LiitoKala Lii-700" },
  { id: "liitokala-lii-500", name: "LiitoKala Lii-500" },
  { id: "liitokala-lii-m4s", name: "LiitoKala Lii-M4S" },
  { id: "xtar-vc4sl", name: "XTAR VC4SL" },
  { id: "opus-bt-c3100", name: "Opus BT-C3100" },
];

export const DEFAULT_SHARED_SETTINGS: SharedSettings = {
  scrapThresholdPercent: 60,
  devices: [...DEFAULT_DEVICES],
  testDevices: [...DEFAULT_TEST_DEVICES],
};

export const DEFAULT_CLIENT_SETTINGS: ClientSettings = {
  defaultTestDevice: "LiitoKala Lii-700",
  defaultDischargeCurrent: 500,
  defaultChargeCurrent: 1000,
  theme: "system",
  language: "hu",
};

export const DEFAULT_SETTINGS: AppSettings = {
  ...DEFAULT_SHARED_SETTINGS,
  ...DEFAULT_CLIENT_SETTINGS,
};

export const DEFAULT_GITHUB_REPO = "battery-cell-data";
export const DEFAULT_GITHUB_FILE_PATH = "data.json";

// Multi-file paths
export const CELLS_FILE_PATH = "cells.json";
export const SETTINGS_FILE_PATH = "settings.json";
export const TEMPLATES_FILE_PATH = "templates.json";

export function clientSettingsFilePath(clientId: string): string {
  return `settings_${clientId}.json`;
}

export const DATA_VERSION = 1;

// Image upload
export const IMAGES_FOLDER = "images";
export const IMAGE_MAX_DIMENSION = 800;
export const IMAGE_MAX_BYTES = 200 * 1024; // 200KB

export const STATUS_COLORS: Record<CellStatus, string> = {
  new: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
  used: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
  recovered: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300",
  scrapped: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300",
};
