import type { BatteryData, GitHubConfig, CellsFile, SettingsFile, ClientSettingsFile, TemplatesFile, CellTemplate, Cell, AppSettings, SharedSettings, ClientSettings } from "./types";
import { fetchFile, saveFile, fetchData, deleteFile } from "./github";
import { DEFAULT_SETTINGS, DEFAULT_SHARED_SETTINGS, DEFAULT_CLIENT_SETTINGS, DATA_VERSION, CELLS_FILE_PATH, SETTINGS_FILE_PATH, TEMPLATES_FILE_PATH, clientSettingsFilePath } from "./constants";
import { encryptToken, decryptToken } from "./crypto";
import { threeWayMergeCells, threeWayMergeSharedSettings, threeWayMergeTemplates } from "./merge";
import type { EncryptedData } from "./crypto";

const STORAGE_KEY = "battery-data";
const GITHUB_CONFIG_KEY = "battery-github-config";
const SHA_KEY = "battery-github-sha";
const PIN_ATTEMPTS_KEY = "battery-pin-attempts";

// SHA keys for multi-file sync
const SHA_CELLS_KEY = "battery-sha-cells";
const SHA_SETTINGS_KEY = "battery-sha-settings";
const SHA_TEMPLATES_KEY = "battery-sha-templates";
const SHA_CLIENT_SETTINGS_KEY = "battery-sha-client-settings";
const MIGRATED_KEY = "battery-migrated-v2";
const CLIENT_ID_KEY = "battery-client-id";

// Base snapshot keys for three-way merge
const BASE_CELLS_KEY = "battery-sync-base-cells";
const BASE_SETTINGS_KEY = "battery-sync-base-settings";
const BASE_TEMPLATES_KEY = "battery-sync-base-templates";

// --- Client ID ---

export function getClientId(): string {
  if (typeof window === "undefined") return "000000";
  let id = localStorage.getItem(CLIENT_ID_KEY);
  if (!id) {
    id = Math.random().toString(16).slice(2, 8).padStart(6, "0");
    localStorage.setItem(CLIENT_ID_KEY, id);
  }
  return id;
}

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
  token?: string;
  encrypted?: EncryptedData;
}

export interface DirtyFlags {
  cellsDirty: boolean;
  settingsDirty: boolean;
  clientSettingsDirty: boolean;
  templatesDirty: boolean;
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

// --- Soft delete cleanup (migration) ---

function cleanupSoftDeletes(cells: Cell[]): Cell[] {
  return cells.filter((c) => !(c as Cell & { deletedAt?: string }).deletedAt);
}

// --- localStorage ---

export function loadFromLocalStorage(): AppData {
  if (typeof window === "undefined") return emptyData();

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

  let templates: CellTemplate[] = [];
  const templatesRaw = localStorage.getItem("battery-templates");
  if (templatesRaw) {
    try {
      templates = JSON.parse(templatesRaw);
    } catch { /* ignore */ }
  }

  return {
    cells: cleanupSoftDeletes(ensureCellInternalIds(cells)),
    settings,
    templates: ensureTemplateInternalIds(templates),
  };
}

export function saveToLocalStorage(data: AppData): void {
  const batteryData: BatteryData = {
    version: DATA_VERSION,
    settings: data.settings,
    cells: data.cells,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(batteryData));
  localStorage.setItem("battery-templates", JSON.stringify(data.templates));
}

// --- Base snapshot management ---

function saveBaseSnapshot(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // localStorage full — non-critical, merge falls back to no-base
  }
}

function loadBaseSnapshot<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveAllBaseSnapshots(cells: Cell[], sharedSettings: SharedSettings, templates: CellTemplate[]): void {
  saveBaseSnapshot(BASE_CELLS_KEY, cells);
  saveBaseSnapshot(BASE_SETTINGS_KEY, sharedSettings);
  saveBaseSnapshot(BASE_TEMPLATES_KEY, templates);
}

export function extractSharedSettings(settings: AppSettings): SharedSettings {
  return {
    scrapThresholdPercent: settings.scrapThresholdPercent,
    devices: settings.devices,
    testDevices: settings.testDevices,
  };
}

export function extractClientSettings(settings: AppSettings): ClientSettings {
  return {
    defaultTestDevice: settings.defaultTestDevice,
    defaultDischargeCurrent: settings.defaultDischargeCurrent,
    defaultChargeCurrent: settings.defaultChargeCurrent,
    theme: settings.theme,
    language: settings.language,
  };
}

export function combineSettings(shared: SharedSettings, client: ClientSettings): AppSettings {
  return { ...shared, ...client } as AppSettings;
}

function clearBaseSnapshots(): void {
  localStorage.removeItem(BASE_CELLS_KEY);
  localStorage.removeItem(BASE_SETTINGS_KEY);
  localStorage.removeItem(BASE_TEMPLATES_KEY);
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
    return null;
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
  localStorage.removeItem(SHA_CLIENT_SETTINGS_KEY);
  localStorage.removeItem(SHA_TEMPLATES_KEY);
  clearBaseSnapshots();
}

// --- SHA tracking ---

function loadShaFor(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(key);
}

function saveShaFor(key: string, sha: string): void {
  localStorage.setItem(key, sha);
}

export function loadSha(): string | null {
  return loadShaFor(SHA_KEY);
}

export function saveSha(sha: string): void {
  saveShaFor(SHA_KEY, sha);
}

export function getLocalShas(): Record<string, string | null> {
  return {
    [CELLS_FILE_PATH]: loadShaFor(SHA_CELLS_KEY),
    [SETTINGS_FILE_PATH]: loadShaFor(SHA_SETTINGS_KEY),
    [clientSettingsFilePath(getClientId())]: loadShaFor(SHA_CLIENT_SETTINGS_KEY),
    [TEMPLATES_FILE_PATH]: loadShaFor(SHA_TEMPLATES_KEY),
  };
}

// --- Migration: data.json → multi-file ---

async function migrateToMultiFile(config: GitHubConfig): Promise<AppData> {
  if (typeof window !== "undefined" && localStorage.getItem(MIGRATED_KEY)) {
    return pullMultiFile(config);
  }

  const oldResult = await fetchData(config);

  if (oldResult) {
    const { data: oldData, sha: oldSha } = oldResult;
    const appData: AppData = {
      cells: cleanupSoftDeletes(oldData.cells || []),
      settings: oldData.settings || { ...DEFAULT_SETTINGS },
      templates: oldData.templates || [],
    };

    const sharedSettings = extractSharedSettings(appData.settings);
    const clientSettings = extractClientSettings(appData.settings);
    const clientId = getClientId();
    const clientPath = clientSettingsFilePath(clientId);

    const cellsFile: CellsFile = { version: DATA_VERSION, cells: appData.cells };
    const settingsFile: SettingsFile = { version: DATA_VERSION, settings: sharedSettings };
    const clientFile: ClientSettingsFile = { version: DATA_VERSION, settings: clientSettings };
    const templatesFile: TemplatesFile = { version: DATA_VERSION, templates: appData.templates };

    const [cellsSha, settingsSha, clientSettingsSha, templatesSha] = await Promise.all([
      saveFile(config, CELLS_FILE_PATH, cellsFile, null, "Migrate: create cells.json"),
      saveFile(config, SETTINGS_FILE_PATH, settingsFile, null, "Migrate: create settings.json"),
      saveFile(config, clientPath, clientFile, null, `Migrate: create ${clientPath}`),
      saveFile(config, TEMPLATES_FILE_PATH, templatesFile, null, "Migrate: create templates.json"),
    ]);

    saveShaFor(SHA_CELLS_KEY, cellsSha);
    saveShaFor(SHA_SETTINGS_KEY, settingsSha);
    saveShaFor(SHA_CLIENT_SETTINGS_KEY, clientSettingsSha);
    saveShaFor(SHA_TEMPLATES_KEY, templatesSha);

    try {
      await deleteFile(config, config.filePath, oldSha, "Migrate: remove old data.json");
    } catch {
      // Non-critical
    }

    if (typeof window !== "undefined") localStorage.setItem(MIGRATED_KEY, "1");
    saveToLocalStorage(appData);
    saveAllBaseSnapshots(appData.cells, sharedSettings, appData.templates);
    return appData;
  }

  return pullMultiFile(config);
}

// --- Multi-file pull ---

async function pullMultiFile(config: GitHubConfig): Promise<AppData> {
  const clientId = getClientId();
  const clientPath = clientSettingsFilePath(clientId);

  const [cellsResult, settingsResult, clientSettingsResult, templatesResult] = await Promise.all([
    fetchFile<CellsFile>(config, CELLS_FILE_PATH),
    fetchFile<SettingsFile>(config, SETTINGS_FILE_PATH),
    fetchFile<ClientSettingsFile>(config, clientPath),
    fetchFile<TemplatesFile>(config, TEMPLATES_FILE_PATH),
  ]);

  const sharedSettings = settingsResult?.data.settings || { ...DEFAULT_SHARED_SETTINGS };
  const clientSettings = clientSettingsResult?.data.settings || { ...DEFAULT_CLIENT_SETTINGS };

  const appData: AppData = {
    cells: cleanupSoftDeletes(ensureCellInternalIds(cellsResult?.data.cells || [])),
    settings: combineSettings(sharedSettings, clientSettings),
    templates: ensureTemplateInternalIds(templatesResult?.data.templates || []),
  };

  if (!cellsResult) {
    const cellsFile: CellsFile = { version: DATA_VERSION, cells: [] };
    const sha = await saveFile(config, CELLS_FILE_PATH, cellsFile, null, "Initialize cells.json");
    saveShaFor(SHA_CELLS_KEY, sha);
  } else {
    saveShaFor(SHA_CELLS_KEY, cellsResult.sha);
  }

  if (!settingsResult) {
    const settingsFile: SettingsFile = { version: DATA_VERSION, settings: sharedSettings };
    const sha = await saveFile(config, SETTINGS_FILE_PATH, settingsFile, null, "Initialize settings.json");
    saveShaFor(SHA_SETTINGS_KEY, sha);
  } else {
    saveShaFor(SHA_SETTINGS_KEY, settingsResult.sha);
  }

  if (!clientSettingsResult) {
    const clientFile: ClientSettingsFile = { version: DATA_VERSION, settings: clientSettings };
    const sha = await saveFile(config, clientPath, clientFile, null, `Initialize ${clientPath}`);
    saveShaFor(SHA_CLIENT_SETTINGS_KEY, sha);
  } else {
    saveShaFor(SHA_CLIENT_SETTINGS_KEY, clientSettingsResult.sha);
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
  // After pull, local == remote == base (only shared settings need base)
  saveAllBaseSnapshots(appData.cells, sharedSettings, appData.templates);
  return appData;
}

// --- internalId migration ---

function ensureCellInternalIds(cells: Cell[]): Cell[] {
  let changed = false;
  const result = cells.map((c) => {
    if (c.internalId) return c;
    changed = true;
    return { ...c, internalId: crypto.randomUUID() };
  });
  return changed ? result : cells;
}

function ensureTemplateInternalIds(templates: CellTemplate[]): CellTemplate[] {
  let changed = false;
  const result = templates.map((t) => {
    if (t.internalId) return t;
    changed = true;
    return { ...t, internalId: crypto.randomUUID() };
  });
  return changed ? result : templates;
}

// --- Retry helpers ---

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const MAX_FILE_RETRIES = 5;
const NON_RETRYABLE_ERRORS = ["TOKEN_EXPIRED", "REPO_NOT_FOUND", "VALIDATION_ERROR"];

async function pushFileWithRetry<T>(
  config: GitHubConfig,
  filePath: string,
  data: T,
  shaKey: string,
  message?: string,
): Promise<void> {
  let sha = loadShaFor(shaKey);
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_FILE_RETRIES; attempt++) {
    try {
      const newSha = await saveFile(config, filePath, data, sha, message);
      saveShaFor(shaKey, newSha);
      return;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (NON_RETRYABLE_ERRORS.includes(lastError.message)) {
        throw lastError;
      }

      if (lastError.message === "CONFLICT") {
        // Re-fetch to get latest SHA
        const current = await fetchFile<T>(config, filePath);
        sha = current?.sha ?? null;
        if (sha) saveShaFor(shaKey, sha);
        // Data stays the same (already merged), just retry with new SHA
      } else {
        await delay(1000 * Math.pow(2, attempt));
      }
    }
  }

  throw lastError || new Error("MAX_RETRIES");
}

// --- GitHub sync (public API) ---

export async function pullFromGitHub(config: GitHubConfig): Promise<AppData> {
  return migrateToMultiFile(config);
}

export async function fullSync(config: GitHubConfig, localData: AppData, dirtyFlags: DirtyFlags): Promise<AppData> {
  const clientId = getClientId();
  const clientPath = clientSettingsFilePath(clientId);

  // 1. Pull remote data
  const [cellsResult, settingsResult, clientSettingsResult, templatesResult] = await Promise.all([
    fetchFile<CellsFile>(config, CELLS_FILE_PATH),
    fetchFile<SettingsFile>(config, SETTINGS_FILE_PATH),
    fetchFile<ClientSettingsFile>(config, clientPath),
    fetchFile<TemplatesFile>(config, TEMPLATES_FILE_PATH),
  ]);

  const remoteCells = cleanupSoftDeletes(ensureCellInternalIds(cellsResult?.data.cells || []));
  const remoteSharedSettings = settingsResult?.data.settings || { ...DEFAULT_SHARED_SETTINGS };
  const remoteTemplates = ensureTemplateInternalIds(templatesResult?.data.templates || []);

  // Update SHAs from pull
  if (cellsResult) saveShaFor(SHA_CELLS_KEY, cellsResult.sha);
  if (settingsResult) saveShaFor(SHA_SETTINGS_KEY, settingsResult.sha);
  if (clientSettingsResult) saveShaFor(SHA_CLIENT_SETTINGS_KEY, clientSettingsResult.sha);
  if (templatesResult) saveShaFor(SHA_TEMPLATES_KEY, templatesResult.sha);

  // 2. Load base snapshots (only for shared settings)
  const baseCells = loadBaseSnapshot<Cell[]>(BASE_CELLS_KEY) || [];
  const baseSharedSettings = loadBaseSnapshot<SharedSettings>(BASE_SETTINGS_KEY) || { ...DEFAULT_SHARED_SETTINGS };
  const baseTemplates = loadBaseSnapshot<CellTemplate[]>(BASE_TEMPLATES_KEY) || [];

  // 3. Three-way merge (shared settings only; client settings: local wins)
  const mergedCells = threeWayMergeCells(baseCells, remoteCells, localData.cells);
  const localSharedSettings = extractSharedSettings(localData.settings);
  const mergedSharedSettings = threeWayMergeSharedSettings(baseSharedSettings, remoteSharedSettings, localSharedSettings);
  const mergedTemplates = threeWayMergeTemplates(baseTemplates, remoteTemplates, localData.templates);

  // Client settings: local always wins (no merge)
  const localClientSettings = extractClientSettings(localData.settings);
  const mergedSettings = combineSettings(mergedSharedSettings, localClientSettings);

  // 4. Push only dirty files
  const cellsChanged = dirtyFlags.cellsDirty || JSON.stringify(mergedCells) !== JSON.stringify(remoteCells);
  const sharedSettingsChanged = dirtyFlags.settingsDirty || JSON.stringify(mergedSharedSettings) !== JSON.stringify(remoteSharedSettings);
  const clientSettingsChanged = dirtyFlags.clientSettingsDirty;
  const templatesChanged = dirtyFlags.templatesDirty || JSON.stringify(mergedTemplates) !== JSON.stringify(remoteTemplates);

  if (cellsChanged) {
    const cellsFile: CellsFile = { version: DATA_VERSION, cells: mergedCells };
    await pushFileWithRetry(config, CELLS_FILE_PATH, cellsFile, SHA_CELLS_KEY);
  }
  if (sharedSettingsChanged) {
    const settingsFile: SettingsFile = { version: DATA_VERSION, settings: mergedSharedSettings };
    await pushFileWithRetry(config, SETTINGS_FILE_PATH, settingsFile, SHA_SETTINGS_KEY);
  }
  if (clientSettingsChanged) {
    const clientFile: ClientSettingsFile = { version: DATA_VERSION, settings: localClientSettings };
    await pushFileWithRetry(config, clientPath, clientFile, SHA_CLIENT_SETTINGS_KEY);
  }
  if (templatesChanged) {
    const templatesFile: TemplatesFile = { version: DATA_VERSION, templates: mergedTemplates };
    await pushFileWithRetry(config, TEMPLATES_FILE_PATH, templatesFile, SHA_TEMPLATES_KEY);
  }

  // 5. Save merged data as new base snapshots (only shared settings)
  saveAllBaseSnapshots(mergedCells, mergedSharedSettings, mergedTemplates);

  return {
    cells: mergedCells,
    settings: mergedSettings,
    templates: mergedTemplates,
  };
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
