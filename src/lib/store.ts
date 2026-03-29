import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  Cell,
  CellEvent,
  CellEventType,
  CellTemplate,
  Measurement,
  AppSettings,
  BatteryData,
  GitHubConfig,
  SyncState,
} from "./types";
import { SHARED_SETTINGS_KEYS, CLIENT_SETTINGS_KEYS } from "./types";
import { DEFAULT_SETTINGS, DATA_VERSION } from "./constants";
import { shouldMarkAsScrap, getScrapNote } from "./scrap-detection";
import {
  loadFromLocalStorage,
  saveToLocalStorage,
  getConfigState,
  loadGitHubConfigWithPin,
  saveGitHubConfig,
  clearGitHubConfig,
  pullFromGitHub,
  fullSync,
  recordFailedPinAttempt,
  resetPinAttempts,
  getPinLockoutDelay,
  getLocalShas,
} from "./sync";
import { fetchTreeShas } from "./github";
import type { DirtyFlags } from "./sync";
import { nowISO, todayISO } from "./utils";

type ConfigState = null | "plaintext" | "encrypted" | "unlocked";

function friendlyError(code: string): string {
  switch (code) {
    case "TOKEN_EXPIRED":
      return "A GitHub token lejárt vagy visszavonták. Frissítsd a Beállítások oldalon.";
    case "CONFLICT":
      return "Ütközés: az adatok megváltoztak a GitHub-on. Frissítsd az oldalt.";
    case "REPO_NOT_FOUND":
      return "A GitHub repó nem található. Ellenőrizd a beállításokat.";
    case "RATE_LIMITED":
      return "Túl sok kérés a GitHub felé. Várj néhány percet.";
    case "VALIDATION_ERROR":
      return "Érvénytelen adatformátum.";
    case "CRYPTO_UNAVAILABLE":
      return "A böngésző nem támogatja a titkosítást (Web Crypto API). Használj modern böngészőt HTTPS-en.";
    default:
      return "Szinkronizációs hiba. Próbáld újra később.";
  }
}

interface BatteryStore {
  // State
  cells: Cell[];
  settings: AppSettings;
  templates: CellTemplate[];
  githubConfig: GitHubConfig | null;
  syncState: SyncState;
  initialized: boolean;
  configState: ConfigState;
  dirtyFlags: DirtyFlags;

  // Init
  initialize: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean | "wiped">;
  lockSession: () => void;

  // Cell CRUD
  addCell: (cell: Omit<Cell, "internalId" | "measurements" | "events" | "createdAt" | "updatedAt">) => void;
  updateCell: (id: string, updates: Partial<Cell>) => void;
  deleteCell: (id: string) => void;
  getCell: (id: string) => Cell | undefined;

  // Measurement CRUD
  addMeasurement: (cellId: string, measurement: Omit<Measurement, "id">) => void;
  deleteMeasurement: (cellId: string, measurementId: string) => void;

  // Template CRUD
  addTemplate: (template: Omit<CellTemplate, "internalId" | "id" | "createdAt" | "updatedAt">) => void;
  updateTemplate: (id: string, updates: Partial<CellTemplate>) => void;
  archiveTemplate: (id: string) => void;
  getTemplate: (id: string) => CellTemplate | undefined;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;

  // GitHub config
  setGitHubConfig: (config: GitHubConfig, pin: string) => Promise<void>;
  removeGitHubConfig: () => void;

  // Sync
  syncWithGitHub: () => Promise<void>;
  checkForRemoteChanges: () => Promise<void>;

  // Import/Export
  importData: (data: BatteryData) => void;
  exportData: () => BatteryData;
}

function createEvent(type: CellEventType, description: string): CellEvent {
  return {
    id: uuidv4(),
    date: nowISO(),
    type,
    description,
  };
}

function persist(store: BatteryStore) {
  saveToLocalStorage({
    settings: store.settings,
    cells: store.cells,
    templates: store.templates,
  });
}

function markDirty(
  set: (fn: (state: BatteryStore) => Partial<BatteryStore>) => void,
  file: "cells" | "settings" | "clientSettings" | "templates",
) {
  changeCounter++;
  set((state) => ({
    syncState: { ...state.syncState, pendingChanges: true },
    dirtyFlags: {
      ...state.dirtyFlags,
      [`${file}Dirty`]: true,
    },
  }));
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 3000;

let changeCounter = 0;
let syncInProgress = false;
let shaCheckInProgress = false;
let resyncRequested = false;

function debouncedSync(syncFn: () => Promise<void>) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncFn();
  }, SYNC_DEBOUNCE_MS);
}

const DEFAULT_DIRTY_FLAGS: DirtyFlags = {
  cellsDirty: false,
  settingsDirty: false,
  clientSettingsDirty: false,
  templatesDirty: false,
};

export const useBatteryStore = create<BatteryStore>((set, get) => ({
  cells: [],
  settings: { ...DEFAULT_SETTINGS },
  templates: [],
  githubConfig: null,
  syncState: { status: "idle", lastSynced: null, error: null, pendingChanges: false, retryCount: 0, remoteChanged: false },
  initialized: false,
  configState: null,
  dirtyFlags: { ...DEFAULT_DIRTY_FLAGS },

  initialize: async () => {
    const local = loadFromLocalStorage();
    const currentState = get();

    const hasStoredData = typeof window !== "undefined" && localStorage.getItem("battery-data");
    if (!hasStoredData && typeof navigator !== "undefined") {
      const browserLang = navigator.language?.toLowerCase() ?? "";
      local.settings.language = browserLang.startsWith("hu") ? "hu" : "en";
    }

    if (currentState.configState === "unlocked" && currentState.githubConfig) {
      set({
        cells: local.cells,
        settings: local.settings,
        templates: local.templates,
        initialized: true,
      });
    } else {
      const cfgState = getConfigState();
      set({
        cells: local.cells,
        settings: local.settings,
        templates: local.templates,
        configState: cfgState,
        initialized: true,
      });
    }
  },

  unlockWithPin: async (pin: string) => {
    const lockoutDelay = getPinLockoutDelay();
    if (lockoutDelay > 0) {
      await new Promise((r) => setTimeout(r, lockoutDelay));
    }

    try {
      const config = await loadGitHubConfigWithPin(pin);
      if (!config) {
        const result = recordFailedPinAttempt();
        if (result.wiped) {
          set({ configState: null, githubConfig: null });
          return "wiped";
        }
        return false;
      }

      resetPinAttempts();

      set({
        githubConfig: config,
        configState: "unlocked",
      });

      try {
        set({ syncState: { status: "syncing", lastSynced: null, error: null, pendingChanges: false, retryCount: 0, remoteChanged: false } });
        const remote = await pullFromGitHub(config);
        set({
          cells: remote.cells,
          settings: remote.settings,
          templates: remote.templates,
          syncState: { status: "idle", lastSynced: nowISO(), error: null, pendingChanges: false, retryCount: 0, remoteChanged: false },
          dirtyFlags: { ...DEFAULT_DIRTY_FLAGS },
        });
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        set({
          syncState: {
            status: "error",
            lastSynced: null,
            error: friendlyError(code),
            pendingChanges: false,
            retryCount: 0,
            remoteChanged: false,
          },
        });
      }

      return true;
    } catch {
      const result = recordFailedPinAttempt();
      if (result.wiped) {
        set({ configState: null, githubConfig: null });
        return "wiped";
      }
      return false;
    }
  },

  lockSession: () => {
    set({
      githubConfig: null,
      configState: getConfigState(),
      syncState: { status: "idle", lastSynced: null, error: null, pendingChanges: false, retryCount: 0, remoteChanged: false },
      dirtyFlags: { ...DEFAULT_DIRTY_FLAGS },
    });
  },

  addCell: (cellData) => {
    const now = nowISO();
    const cell: Cell = {
      ...cellData,
      internalId: uuidv4(),
      measurements: [],
      events: [createEvent("created", "Cella létrehozva")],
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const newState = { cells: [...state.cells, cell] };
      persist({ ...get(), ...newState });
      return newState;
    });

    if (get().githubConfig) {
      markDirty(set, "cells");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  updateCell: (id, updates) => {
    set((state) => {
      const newCells = state.cells.map((c) => {
        if (c.id !== id) return c;

        const events: CellEvent[] = [];

        if (updates.status && updates.status !== c.status) {
          events.push(createEvent("status_changed", `Állapot: ${c.status} → ${updates.status}`));
        }
        if (updates.currentDevice !== undefined && updates.currentDevice !== c.currentDevice) {
          const from = c.currentDevice || "—";
          const to = updates.currentDevice || "—";
          events.push(createEvent("device_changed", `Eszköz: ${from} → ${to}`));
        }
        if (events.length === 0) {
          events.push(createEvent("edited", "Cella szerkesztve"));
        }

        return {
          ...c,
          ...updates,
          events: [...(c.events || []), ...events],
          updatedAt: nowISO(),
        };
      });
      const newState = { cells: newCells };
      persist({ ...get(), ...newState });
      return newState;
    });

    if (get().githubConfig) {
      markDirty(set, "cells");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  deleteCell: (id) => {
    set((state) => {
      const newCells = state.cells.filter((c) => c.id !== id);
      const newState = { cells: newCells };
      persist({ ...get(), ...newState });
      return newState;
    });

    if (get().githubConfig) {
      markDirty(set, "cells");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  getCell: (id) => {
    return get().cells.find((c) => c.id === id);
  },

  addMeasurement: (cellId, measurementData) => {
    const measurement: Measurement = {
      ...measurementData,
      id: uuidv4(),
    };

    set((state) => {
      const newCells = state.cells.map((cell) => {
        if (cell.id !== cellId) return cell;

        const currentInfo = measurement.chargeCurrent
          ? `${measurement.dischargeCurrent}/${measurement.chargeCurrent} mA`
          : `${measurement.dischargeCurrent} mA`;
        const newEvents: CellEvent[] = [
          createEvent("measurement_added", `Mérés: ${measurement.measuredCapacity} mAh (${currentInfo})`),
        ];

        const updated: Cell = {
          ...cell,
          measurements: [...cell.measurements, measurement],
          updatedAt: nowISO(),
        };

        if (
          updated.status !== "Selejt" &&
          shouldMarkAsScrap(updated, state.settings)
        ) {
          updated.status = "Selejt";
          const existingNotes = updated.notes ? updated.notes + "\n" : "";
          updated.notes = existingNotes + getScrapNote(todayISO());
          newEvents.push(createEvent("auto_scrapped", `Automatikusan selejtnek jelölve (${measurement.measuredCapacity} mAh < ${Math.round(cell.nominalCapacity * state.settings.scrapThresholdPercent / 100)} mAh)`));
        }

        updated.events = [...(cell.events || []), ...newEvents];

        return updated;
      });

      const newState = { cells: newCells };
      persist({ ...get(), ...newState });
      return newState;
    });

    if (get().githubConfig) {
      markDirty(set, "cells");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  deleteMeasurement: (cellId, measurementId) => {
    set((state) => {
      const newCells = state.cells.map((cell) => {
        if (cell.id !== cellId) return cell;
        const deleted = cell.measurements.find((m) => m.id === measurementId);
        const desc = deleted
          ? `Mérés törölve: ${deleted.measuredCapacity} mAh`
          : "Mérés törölve";
        return {
          ...cell,
          measurements: cell.measurements.filter((m) => m.id !== measurementId),
          events: [...(cell.events || []), createEvent("measurement_deleted", desc)],
          updatedAt: nowISO(),
        };
      });
      const newState = { cells: newCells };
      persist({ ...get(), ...newState });
      return newState;
    });

    if (get().githubConfig) {
      markDirty(set, "cells");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  // Template CRUD

  addTemplate: (templateData) => {
    const now = nowISO();
    const template: CellTemplate = {
      ...templateData,
      internalId: uuidv4(),
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };

    set((state) => {
      const newState = { templates: [...state.templates, template] };
      persist({ ...get(), ...newState });
      return newState;
    });

    if (get().githubConfig) {
      markDirty(set, "templates");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  updateTemplate: (id, updates) => {
    set((state) => {
      const newTemplates = state.templates.map((t) =>
        t.id === id ? { ...t, ...updates, updatedAt: nowISO() } : t
      );
      const newState = { templates: newTemplates };
      persist({ ...get(), ...newState });
      return newState;
    });

    if (get().githubConfig) {
      markDirty(set, "templates");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  archiveTemplate: (id) => {
    set((state) => {
      const newTemplates = state.templates.map((t) =>
        t.id === id ? { ...t, archived: true, updatedAt: nowISO() } : t
      );
      const newState = { templates: newTemplates };
      persist({ ...get(), ...newState });
      return newState;
    });

    if (get().githubConfig) {
      markDirty(set, "templates");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  getTemplate: (id) => {
    return get().templates.find((t) => t.id === id);
  },

  updateSettings: (updates) => {
    set((state) => {
      const newSettings = { ...state.settings, ...updates };
      const newState = { settings: newSettings };
      persist({ ...get(), ...newState });
      return newState;
    });

    if (get().githubConfig) {
      const keys = Object.keys(updates) as (keyof AppSettings)[];
      const hasShared = keys.some((k) => (SHARED_SETTINGS_KEYS as readonly string[]).includes(k));
      const hasClient = keys.some((k) => (CLIENT_SETTINGS_KEYS as readonly string[]).includes(k));
      if (hasShared) markDirty(set, "settings");
      if (hasClient) markDirty(set, "clientSettings");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  setGitHubConfig: async (config, pin) => {
    await saveGitHubConfig(config, pin);
    set({ githubConfig: config, configState: "unlocked" });

    try {
      set({ syncState: { status: "syncing", lastSynced: null, error: null, pendingChanges: false, retryCount: 0, remoteChanged: false } });
      const remote = await pullFromGitHub(config);
      set({
        cells: remote.cells,
        settings: remote.settings,
        templates: remote.templates,
        syncState: { status: "idle", lastSynced: nowISO(), error: null, pendingChanges: false, retryCount: 0, remoteChanged: false },
        dirtyFlags: { ...DEFAULT_DIRTY_FLAGS },
      });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      set({
        syncState: {
          status: "error",
          lastSynced: null,
          error: friendlyError(code),
          pendingChanges: false,
          retryCount: 0,
          remoteChanged: false,
        },
      });
    }
  },

  removeGitHubConfig: () => {
    clearGitHubConfig();
    set({
      githubConfig: null,
      syncState: { status: "idle", lastSynced: null, error: null, pendingChanges: false, retryCount: 0, remoteChanged: false },
      dirtyFlags: { ...DEFAULT_DIRTY_FLAGS },
    });
  },

  syncWithGitHub: async () => {
    const { githubConfig } = get();
    if (!githubConfig) return;

    if (syncInProgress) {
      resyncRequested = true;
      return;
    }

    syncInProgress = true;
    resyncRequested = false;
    const counterAtStart = changeCounter;

    const prevSyncState = get().syncState;
    set({ syncState: { ...prevSyncState, status: "syncing", error: null } });

    try {
      const localData = {
        cells: get().cells,
        settings: get().settings,
        templates: get().templates,
      };
      const currentDirtyFlags = { ...get().dirtyFlags };
      const merged = await fullSync(githubConfig, localData, currentDirtyFlags);

      const stillPending = changeCounter !== counterAtStart;
      set({
        cells: stillPending ? get().cells : merged.cells,
        settings: stillPending ? get().settings : merged.settings,
        templates: stillPending ? get().templates : merged.templates,
        syncState: { status: "idle", lastSynced: nowISO(), error: null, pendingChanges: stillPending, retryCount: 0, remoteChanged: false },
        dirtyFlags: stillPending ? get().dirtyFlags : { ...DEFAULT_DIRTY_FLAGS },
      });
      if (!stillPending) {
        saveToLocalStorage({ cells: merged.cells, settings: merged.settings, templates: merged.templates });
      }

      syncInProgress = false;

      if (stillPending || resyncRequested) {
        resyncRequested = false;
        debouncedSync(() => get().syncWithGitHub());
      }
    } catch (error) {
      syncInProgress = false;
      const code = error instanceof Error ? error.message : "";
      const currentRetry = get().syncState.retryCount;
      const isRetryable = !["TOKEN_EXPIRED", "REPO_NOT_FOUND", "VALIDATION_ERROR"].includes(code);

      if (isRetryable && currentRetry < 5) {
        set({
          syncState: {
            status: "error",
            lastSynced: prevSyncState.lastSynced,
            error: friendlyError(code),
            pendingChanges: true,
            retryCount: currentRetry + 1,
            remoteChanged: false,
          },
        });
        setTimeout(() => get().syncWithGitHub(), 2000 * Math.pow(2, currentRetry));
      } else {
        set({
          syncState: {
            status: code === "CONFLICT" ? "conflict" : "error",
            lastSynced: prevSyncState.lastSynced,
            error: friendlyError(code),
            pendingChanges: true,
            retryCount: 0,
            remoteChanged: false,
          },
        });
      }
    }
  },

  checkForRemoteChanges: async () => {
    const { githubConfig, configState } = get();
    if (!githubConfig || configState !== "unlocked") return;
    if (syncInProgress || shaCheckInProgress) return;

    shaCheckInProgress = true;
    try {
      const remoteShas = await fetchTreeShas(githubConfig);
      if (Object.keys(remoteShas).length === 0) return;

      const localShas = getLocalShas();
      const hasChanges = Object.entries(localShas).some(
        ([path, localSha]) => localSha && remoteShas[path] && remoteShas[path] !== localSha
      );

      const current = get().syncState;
      if (current.remoteChanged !== hasChanges) {
        set({ syncState: { ...current, remoteChanged: hasChanges } });
      }
    } catch {
      // Silently ignore polling errors
    } finally {
      shaCheckInProgress = false;
    }
  },

  importData: (data) => {
    set({
      cells: data.cells,
      settings: data.settings,
      templates: data.templates || [],
    });
    saveToLocalStorage({
      cells: data.cells,
      settings: data.settings,
      templates: data.templates || [],
    });

    if (get().githubConfig) {
      markDirty(set, "cells");
      markDirty(set, "settings");
      markDirty(set, "templates");
      debouncedSync(() => get().syncWithGitHub());
    }
  },

  exportData: () => ({
    version: DATA_VERSION,
    settings: get().settings,
    cells: get().cells,
    templates: get().templates,
  }),
}));
