export type CellStatus = "Új" | "Használt" | "Bontott" | "Selejt";

export type Chemistry = "Li-ion" | "LiFePO4" | "NiMH" | "NiCd" | "LiPo";

export type FormFactor =
  | "18650"
  | "21700"
  | "26650"
  | "14500"
  | "AA"
  | "AAA"
  | "C"
  | "D"
  | "Egyéb";

export interface Measurement {
  id: string;
  date: string;
  measuredCapacity: number;
  dischargeCurrent: number;
  chargeCurrent?: number;
  internalResistance?: number;
  testDevice: string;
  notes?: string;
}

export type CellEventType =
  | "created"
  | "edited"
  | "status_changed"
  | "device_changed"
  | "measurement_added"
  | "measurement_deleted"
  | "auto_scrapped"
  | "deleted";

export interface CellEvent {
  id: string;
  date: string;
  type: CellEventType;
  description: string;
}

export interface CellTemplate {
  internalId?: string;
  id: string;
  name: string;
  brand: string;
  model?: string;
  formFactor: FormFactor;
  chemistry: Chemistry;
  cathodeType?: string;
  contactType?: string;
  nominalCapacity: number;
  continuousDischargeCurrent?: number;
  peakDischargeCurrent?: number;
  weight?: number;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Cell {
  internalId: string;
  id: string;
  templateId?: string;
  brand: string;
  model?: string;
  formFactor: FormFactor;
  chemistry: Chemistry;
  cathodeType?: string;
  contactType?: string;
  platform: string;
  seller: string;
  purchaseDate: string;
  purchaseUrl?: string;
  pricePerUnit: number;
  nominalCapacity: number;
  continuousDischargeCurrent?: number;
  peakDischargeCurrent?: number;
  weight?: number;
  storageVoltage?: number;
  batchNumber?: string;
  status: CellStatus;
  currentDevice?: string;
  group?: string;
  notes?: string;
  measurements: Measurement[];
  events: CellEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface GitHubConfig {
  token: string;
  owner: string;
  repo: string;
  filePath: string;
}

export type Theme = "light" | "dark" | "system";
export type Language = "hu" | "en";

export interface AppSettings {
  scrapThresholdPercent: number;
  defaultTestDevice: string;
  defaultDischargeCurrent: number;
  defaultChargeCurrent: number;
  devices: string[];
  testDevices: string[];
  theme: Theme;
  language: Language;
}

export interface BatteryData {
  version: number;
  settings: AppSettings;
  cells: Cell[];
  templates?: CellTemplate[];
}

export interface CellsFile {
  version: number;
  cells: Cell[];
}

export interface SettingsFile {
  version: number;
  settings: AppSettings;
}

export interface TemplatesFile {
  version: number;
  templates: CellTemplate[];
}

export interface SyncState {
  status: "idle" | "syncing" | "error" | "conflict";
  lastSynced: string | null;
  error: string | null;
  pendingChanges: boolean;
  retryCount: number;
}
