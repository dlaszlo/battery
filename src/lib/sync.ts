import type { BatteryData, GitHubConfig, CellsFile, SettingsFile, TemplatesFile, CellTemplate } from "./types";
import { fetchFile, saveFile, fetchData, deleteFile } from "./github";
import { DEFAULT_SETTINGS, DATA_VERSION, CELLS_FILE_PATH, SETTINGS_FILE_PATH, TEMPLATES_FILE_PATH } from "./constants";
import { encryptToken, decryptToken } from "./crypto";
import type { EncryptedData } from "./crypto";

const STORAGE_KEY = "battery-data";
const GITHUB_CONFIG_KEY = "battery-github-config";
const SHA_KEY = "battery-github-sha";
const PIN_ATTEMPTS_KEY = "battery-pin-attempts";

// SHA keys for multi-file sync
const SHA_CELLS_KEY = "battery-sha-cells";
const SHA_SETTINGS_KEY = "battery-sha-settings";
const SHA_TEMPLATES_KEY = "battery-sha-templates";
const MIGRATED_KEY = "battery-migrated-v2";

const MAX_PIN_ATTEMPTS = 10;
const LOCKOUT_DELAYS_MS = [0, 0, 0, 2000, 5000, 10000, 15000, 30000, 60000, 60000];

interface PinAttemptState {
  count: number;
  lastAttempt: number;
}

function getPinAttempts(): PinAttemptState {
  if (typeof window === "undefined") return { count: 0, lastAttempt: 0 };
  try {
    const raw = localStorage.getItem(PIN_ATTEMPTS_KEY);
    if (!raw) return { count: 0, lastAttempt: 0 };
    return JSON.parse(raw);
  } catch {
    return { count: 0, lastAttempt: 0 };
  }
}

function savePinAttempts(state: PinAttemptState): void {
  localStorage.setItem(PIN_ATTEMPTS_KEY, JSON.stringify(state));
}

export function resetPinAttempts(): void {
  localStorage.removeItem(PIN_ATTEMPTS_KEY);
}

export function recordFailedPinAttempt(): { wiped: boolean; remaining: number; delayMs: number } {
  const state = getPinAttempts();
  state.count++;
  state.lastAttempt = Date.now();
  savePinAttempts(state);

  if (state.count >= MAX_PIN_ATTEMPTS) {
    // Wipe config — too many failed attempts
    clearGitHubConfig();
    resetPinAttempts();
    return { wiped: true, remaining: 0, delayMs: 0 };
  }

  const remaining = MAX_PIN_ATTEMPTS - state.count;
  const delayMs = LOCKOUT_DELAYS_MS[Math.min(state.count, LOCKOUT_DELAYS_MS.length - 1)];
  return { wiped: false, remaining, delayMs };
}

export function getPinLockoutDelay(): number {
  const state = getPinAttempts();
  if (state.count === 0) return 0;
  const delayMs = LOCKOUT_DELAYS_MS[Math.min(state.count, LOCKOUT_DELAYS_MS.length - 1)];
  const elapsed = Date.now() - state.lastAttempt;
  return Math.max(0, delayMs - elapsed);
}

interface StoredConfig {
  owner: string;
  repo: string;
  filePath: string;
  // Old format (plaintext)
  token?: string;
  // New format (encrypted)
  encrypted?: EncryptedData;
}

interface AppData {
  cells: BatteryData["cells"];
  settings: BatteryData["settings"];
  templates: CellTemplate[];
}

function emptyData(): AppData {
  return {
    cells: [],
    settings: { ...DEFAULT_SETTINGS },
    templates: [],
  };
}

// --- localStorage ---

export function loadFromLocalStorage(): AppData {
  if (typeof window === "undefined") return emptyData();

  // Load cells + settings from battery-data (legacy or current)
  const raw = localStorage.getItem(STORAGE_KEY);
  let cells: AppData["cells"] = [];
  let settings: AppData["settings"] = { ...DEFAULT_SETTINGS };
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      cells = parsed.cells || [];
      settings = parsed.settings || { ...DEFAULT_SETTINGS };
    } catch { /* ignore */ }
  }

  // Load templates
  let templates: CellTemplate[] = [];
  const templatesRaw = localStorage.getItem("battery-templates");
  if (templatesRaw) {
    try {
      templates = JSON.parse(templatesRaw);
    } catch { /* ignore */ }
  }

  return { cells, settings, templates };
}

export function saveToLocalStorage(data: AppData): void {
  // Save cells + settings (legacy format for backward compat with persist logic)
  const batteryData: BatteryData = {
    version: DATA_VERSION,
    settings: data.settings,
    cells: data.cells,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batteryData));

  // Save templates separately
  localStorage.setItem("battery-templates", JSON.stringify(data.templates));
}

// --- GitHub config ---

export function getConfigState(): null | "plaintext" | "encrypted" {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
  if (!raw) return null;
  try {
    const stored: StoredConfig = JSON.parse(raw);
    if (stored.encrypted) return "encrypted";
    if (stored.token) return "plaintext";
    return null;
  } catch {
    return null;
  }
}

export function loadConfigMeta(): { owner: string; repo: string; filePath: string } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
  if (!raw) return null;
  try {
    const stored: StoredConfig = JSON.parse(raw);
    if (stored.owner && stored.repo) {
      return { owner: stored.owner, repo: stored.repo, filePath: stored.filePath };
    }
    return null;
  } catch {
    return null;
  }
}

export async function loadGitHubConfigWithPin(pin: string): Promise<GitHubConfig | null> {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
  if (!raw) return null;
  try {
    const stored: StoredConfig = JSON.parse(raw);

    // Old plaintext format — migrate to encrypted
    if (stored.token && !stored.encrypted) {
      const config: GitHubConfig = {
        token: stored.token,
        owner: stored.owner,
        repo: stored.repo,
        filePath: stored.filePath,
      };
      await saveGitHubConfig(config, pin);
      return config;
    }

    // Encrypted format
    if (stored.encrypted) {
      const token = await decryptToken(stored.encrypted, pin);
      return {
        token,
        owner: stored.owner,
        repo: stored.repo,
        filePath: stored.filePath,
      };
    }

    return null;
  } catch {
    return null; // Wrong PIN or corrupted data
  }
}

export async function saveGitHubConfig(config: GitHubConfig, pin: string): Promise<void> {
  const encrypted = await encryptToken(config.token, pin);
  const stored: StoredConfig = {
    owner: config.owner,
    repo: config.repo,
    filePath: config.filePath,
    encrypted,
  };
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(stored));
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
  localStorage.removeItem(SHA_KEY);
  localStorage.removeItem(SHA_CELLS_KEY);
  localStorage.removeItem(SHA_SETTINGS_KEY);
  localStorage.removeItem(SHA_TEMPLATES_KEY);
}

// --- SHA tracking (multi-file) ---

function loadShaFor(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function saveShaFor(key: string, sha: string): void {
  localStorage.setItem(key, sha);
}

// Legacy single-file SHA
export function loadSha(): string | null {
  return loadShaFor(SHA_KEY);
}

export function saveSha(sha: string): void {
  saveShaFor(SHA_KEY, sha);
}

// --- Migration: data.json → cells.json + settings.json + templates.json ---

async function migrateToMultiFile(config: GitHubConfig): Promise<AppData> {
  // Check if already migrated
  if (typeof window !== "undefined" && localStorage.getItem(MIGRATED_KEY)) {
    // Already migrated, just pull individual files
    return pullMultiFile(config);
  }

  // Try to fetch old data.json
  const oldResult = await fetchData(config);

  if (oldResult) {
    const { data: oldData, sha: oldSha } = oldResult;
    const appData: AppData = {
      cells: oldData.cells || [],
      settings: oldData.settings || { ...DEFAULT_SETTINGS },
      templates: oldData.templates || [],
    };

    // Write the 3 new files
    const cellsFile: CellsFile = { version: DATA_VERSION, cells: appData.cells };
    const settingsFile: SettingsFile = { version: DATA_VERSION, settings: appData.settings };
    const templatesFile: TemplatesFile = { version: DATA_VERSION, templates: appData.templates };

    const [cellsSha, settingsSha, templatesSha] = await Promise.all([
      saveFile(config, CELLS_FILE_PATH, cellsFile, null, "Migrate: create cells.json"),
      saveFile(config, SETTINGS_FILE_PATH, settingsFile, null, "Migrate: create settings.json"),
      saveFile(config, TEMPLATES_FILE_PATH, templatesFile, null, "Migrate: create templates.json"),
    ]);

    saveShaFor(SHA_CELLS_KEY, cellsSha);
    saveShaFor(SHA_SETTINGS_KEY, settingsSha);
    saveShaFor(SHA_TEMPLATES_KEY, templatesSha);

    // Delete old data.json
    try {
      await deleteFile(config, config.filePath, oldSha, "Migrate: remove old data.json");
    } catch {
      // Non-critical if delete fails
    }

    if (typeof window !== "undefined") localStorage.setItem(MIGRATED_KEY, "1");
    saveToLocalStorage(appData);
    return appData;
  }

  // No old data.json — try to pull multi-file, or create fresh
  return pullMultiFile(config);
}

// --- Multi-file pull ---

async function pullMultiFile(config: GitHubConfig): Promise<AppData> {
  const [cellsResult, settingsResult, templatesResult] = await Promise.all([
    fetchFile<CellsFile>(config, CELLS_FILE_PATH),
    fetchFile<SettingsFile>(config, SETTINGS_FILE_PATH),
    fetchFile<TemplatesFile>(config, TEMPLATES_FILE_PATH),
  ]);

  const appData: AppData = {
    cells: cellsResult?.data.cells || [],
    settings: settingsResult?.data.settings || { ...DEFAULT_SETTINGS },
    templates: templatesResult?.data.templates || [],
  };

  // If files don't exist, create them
  if (!cellsResult) {
    const cellsFile: CellsFile = { version: DATA_VERSION, cells: [] };
    const sha = await saveFile(config, CELLS_FILE_PATH, cellsFile, null, "Initialize cells.json");
    saveShaFor(SHA_CELLS_KEY, sha);
  } else {
    saveShaFor(SHA_CELLS_KEY, cellsResult.sha);
  }

  if (!settingsResult) {
    const settingsFile: SettingsFile = { version: DATA_VERSION, settings: appData.settings };
    const sha = await saveFile(config, SETTINGS_FILE_PATH, settingsFile, null, "Initialize settings.json");
    saveShaFor(SHA_SETTINGS_KEY, sha);
  } else {
    saveShaFor(SHA_SETTINGS_KEY, settingsResult.sha);
  }

  if (!templatesResult) {
    const templatesFile: TemplatesFile = { version: DATA_VERSION, templates: [] };
    const sha = await saveFile(config, TEMPLATES_FILE_PATH, templatesFile, null, "Initialize templates.json");
    saveShaFor(SHA_TEMPLATES_KEY, sha);
  } else {
    saveShaFor(SHA_TEMPLATES_KEY, templatesResult.sha);
  }

  if (typeof window !== "undefined") localStorage.setItem(MIGRATED_KEY, "1");
  saveToLocalStorage(appData);
  return appData;
}

// --- GitHub sync (public API) ---

export async function pullFromGitHub(config: GitHubConfig): Promise<AppData> {
  return migrateToMultiFile(config);
}

export async function pushToGitHub(config: GitHubConfig, data: AppData): Promise<void> {
  const cellsFile: CellsFile = { version: DATA_VERSION, cells: data.cells };
  const settingsFile: SettingsFile = { version: DATA_VERSION, settings: data.settings };
  const templatesFile: TemplatesFile = { version: DATA_VERSION, templates: data.templates };

  const cellsSha = loadShaFor(SHA_CELLS_KEY);
  const settingsSha = loadShaFor(SHA_SETTINGS_KEY);
  const templatesSha = loadShaFor(SHA_TEMPLATES_KEY);

  const [newCellsSha, newSettingsSha, newTemplatesSha] = await Promise.all([
    saveFile(config, CELLS_FILE_PATH, cellsFile, cellsSha),
    saveFile(config, SETTINGS_FILE_PATH, settingsFile, settingsSha),
    saveFile(config, TEMPLATES_FILE_PATH, templatesFile, templatesSha),
  ]);

  saveShaFor(SHA_CELLS_KEY, newCellsSha);
  saveShaFor(SHA_SETTINGS_KEY, newSettingsSha);
  saveShaFor(SHA_TEMPLATES_KEY, newTemplatesSha);
  saveToLocalStorage(data);
}

export async function forcePushToGitHub(config: GitHubConfig, data: AppData): Promise<void> {
  // Fetch current SHAs to avoid conflicts
  const [cellsResult, settingsResult, templatesResult] = await Promise.all([
    fetchFile<CellsFile>(config, CELLS_FILE_PATH),
    fetchFile<SettingsFile>(config, SETTINGS_FILE_PATH),
    fetchFile<TemplatesFile>(config, TEMPLATES_FILE_PATH),
  ]);

  const cellsFile: CellsFile = { version: DATA_VERSION, cells: data.cells };
  const settingsFile: SettingsFile = { version: DATA_VERSION, settings: data.settings };
  const templatesFile: TemplatesFile = { version: DATA_VERSION, templates: data.templates };

  const [newCellsSha, newSettingsSha, newTemplatesSha] = await Promise.all([
    saveFile(config, CELLS_FILE_PATH, cellsFile, cellsResult?.sha ?? null, "Force re-sync cells"),
    saveFile(config, SETTINGS_FILE_PATH, settingsFile, settingsResult?.sha ?? null, "Force re-sync settings"),
    saveFile(config, TEMPLATES_FILE_PATH, templatesFile, templatesResult?.sha ?? null, "Force re-sync templates"),
  ]);

  saveShaFor(SHA_CELLS_KEY, newCellsSha);
  saveShaFor(SHA_SETTINGS_KEY, newSettingsSha);
  saveShaFor(SHA_TEMPLATES_KEY, newTemplatesSha);
  saveToLocalStorage(data);
}

// --- JSON file export/import ---

export function exportToFile(data: BatteryData): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `battery-data-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importFromFile(file: File): Promise<BatteryData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data: BatteryData = JSON.parse(reader.result as string);
        if (!data.version || !data.cells || !data.settings) {
          reject(new Error("Érvénytelen fájlformátum"));
          return;
        }
        resolve(data);
      } catch {
        reject(new Error("Hibás JSON fájl"));
      }
    };
    reader.onerror = () => reject(new Error("Fájl olvasási hiba"));
    reader.readAsText(file);
  });
}
