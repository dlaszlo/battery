import type { BatteryData, GitHubConfig } from "./types";
import { fetchData, saveData } from "./github";
import { DEFAULT_SETTINGS, DATA_VERSION } from "./constants";

const STORAGE_KEY = "battery-data";
const GITHUB_CONFIG_KEY = "battery-github-config";
const SHA_KEY = "battery-github-sha";

function emptyData(): BatteryData {
  return {
    version: DATA_VERSION,
    settings: { ...DEFAULT_SETTINGS },
    cells: [],
  };
}

// --- localStorage ---

export function loadFromLocalStorage(): BatteryData {
  if (typeof window === "undefined") return emptyData();
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return emptyData();
  try {
    return JSON.parse(raw);
  } catch {
    return emptyData();
  }
}

export function saveToLocalStorage(data: BatteryData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// --- GitHub config ---

export function loadGitHubConfig(): GitHubConfig | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveGitHubConfig(config: GitHubConfig): void {
  localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
}

export function clearGitHubConfig(): void {
  localStorage.removeItem(GITHUB_CONFIG_KEY);
  localStorage.removeItem(SHA_KEY);
}

// --- SHA tracking ---

export function loadSha(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(SHA_KEY);
}

export function saveSha(sha: string): void {
  localStorage.setItem(SHA_KEY, sha);
}

// --- GitHub sync ---

export async function pullFromGitHub(
  config: GitHubConfig
): Promise<BatteryData> {
  const result = await fetchData(config);

  if (!result) {
    // File doesn't exist yet - create it with empty data
    const data = emptyData();
    const sha = await saveData(config, data, null, "Initialize battery data");
    saveSha(sha);
    saveToLocalStorage(data);
    return data;
  }

  saveSha(result.sha);
  saveToLocalStorage(result.data);
  return result.data;
}

export async function pushToGitHub(
  config: GitHubConfig,
  data: BatteryData
): Promise<void> {
  const sha = loadSha();
  const newSha = await saveData(config, data, sha);
  saveSha(newSha);
  saveToLocalStorage(data);
}

export async function forcePushToGitHub(
  config: GitHubConfig,
  data: BatteryData
): Promise<void> {
  // Fetch current SHA first to avoid conflict
  const result = await fetchData(config);
  const currentSha = result?.sha ?? null;
  const newSha = await saveData(config, data, currentSha, "Force re-sync (fix encoding)");
  saveSha(newSha);
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
