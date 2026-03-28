import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import type {
  Cell,
  CellEvent,
  CellEventType,
  Measurement,
  AppSettings,
  BatteryData,
  GitHubConfig,
  SyncState,
} from "./types";
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
  pushToGitHub,
  forcePushToGitHub,
  recordFailedPinAttempt,
  resetPinAttempts,
  getPinLockoutDelay,
} from "./sync";
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
  githubConfig: GitHubConfig | null;
  syncState: SyncState;
  initialized: boolean;
  configState: ConfigState;

  // Init
  initialize: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<boolean | "wiped">;
  lockSession: () => void;

  // Cell CRUD
  addCell: (cell: Omit<Cell, "measurements" | "events" | "createdAt" | "updatedAt">) => void;
  updateCell: (id: string, updates: Partial<Cell>) => void;
  deleteCell: (id: string) => void;
  getCell: (id: string) => Cell | undefined;

  // Measurement CRUD
  addMeasurement: (cellId: string, measurement: Omit<Measurement, "id">) => void;
  deleteMeasurement: (cellId: string, measurementId: string) => void;

  // Settings
  updateSettings: (settings: Partial<AppSettings>) => void;

  // GitHub config
  setGitHubConfig: (config: GitHubConfig, pin: string) => Promise<void>;
  removeGitHubConfig: () => void;

  // Sync
  syncWithGitHub: () => Promise<void>;
  forceSyncToGitHub: () => Promise<void>;

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
  const data: BatteryData = {
    version: DATA_VERSION,
    settings: store.settings,
    cells: store.cells,
  };
  saveToLocalStorage(data);
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
const SYNC_DEBOUNCE_MS = 3000;

function debouncedSync(syncFn: () => Promise<void>) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    syncFn();
  }, SYNC_DEBOUNCE_MS);
}

export const useBatteryStore = create<BatteryStore>((set, get) => ({
  cells: [],
  settings: { ...DEFAULT_SETTINGS },
  githubConfig: null,
  syncState: { status: "idle", lastSynced: null, error: null },
  initialized: false,
  configState: null,

  initialize: async () => {
    const local = loadFromLocalStorage();
    const cfgState = getConfigState();

    // Detect browser language on first launch (no saved settings)
    const hasStoredData = typeof window !== "undefined" && localStorage.getItem("battery-data");
    if (!hasStoredData && typeof navigator !== "undefined") {
      const browserLang = navigator.language?.toLowerCase() ?? "";
      local.settings.language = browserLang.startsWith("hu") ? "hu" : "en";
    }

    set({
      cells: local.cells,
      settings: local.settings,
      configState: cfgState,
      initialized: true,
    });

    // If no config, no need for PIN
    // If plaintext or encrypted, AppShell will show PinDialog
  },

  unlockWithPin: async (pin: string) => {
    // Check lockout delay
    const delay = getPinLockoutDelay();
    if (delay > 0) {
      await new Promise((r) => setTimeout(r, delay));
    }

    try {
      const config = await loadGitHubConfigWithPin(pin);
      if (!config) {
        // Wrong PIN — record failed attempt
        const result = recordFailedPinAttempt();
        if (result.wiped) {
          // Config wiped — force re-onboarding
          set({ configState: null, githubConfig: null });
          return "wiped";
        }
        return false;
      }

      // Success — reset attempts
      resetPinAttempts();

      set({
        githubConfig: config,
        configState: "unlocked",
      });

      // Sync with GitHub
      try {
        set({ syncState: { status: "syncing", lastSynced: null, error: null } });
        const remote = await pullFromGitHub(config);
        set({
          cells: remote.cells,
          settings: remote.settings,
          syncState: { status: "idle", lastSynced: nowISO(), error: null },
        });
      } catch (error) {
        const code = error instanceof Error ? error.message : "";
        set({
          syncState: {
            status: "error",
            lastSynced: null,
            error: friendlyError(code),
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
      syncState: { status: "idle", lastSynced: null, error: null },
    });
  },

  addCell: (cellData) => {
    const now = nowISO();
    const cell: Cell = {
      ...cellData,
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

    const store = get();
    if (store.githubConfig) {
      debouncedSync(() => store.syncWithGitHub());
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

    const store = get();
    if (store.githubConfig) {
      debouncedSync(() => store.syncWithGitHub());
    }
  },

  deleteCell: (id) => {
    set((state) => {
      const newState = { cells: state.cells.filter((c) => c.id !== id) };
      persist({ ...get(), ...newState });
      return newState;
    });

    const store = get();
    if (store.githubConfig) {
      debouncedSync(() => store.syncWithGitHub());
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

        // Auto-scrap detection
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

    const store = get();
    if (store.githubConfig) {
      debouncedSync(() => store.syncWithGitHub());
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

    const store = get();
    if (store.githubConfig) {
      debouncedSync(() => store.syncWithGitHub());
    }
  },

  updateSettings: (updates) => {
    set((state) => {
      const newSettings = { ...state.settings, ...updates };
      const newState = { settings: newSettings };
      persist({ ...get(), ...newState });
      return newState;
    });

    const store = get();
    if (store.githubConfig) {
      debouncedSync(() => store.syncWithGitHub());
    }
  },

  setGitHubConfig: async (config, pin) => {
    await saveGitHubConfig(config, pin);
    set({ githubConfig: config, configState: "unlocked" });
  },

  removeGitHubConfig: () => {
    clearGitHubConfig();
    set({
      githubConfig: null,
      syncState: { status: "idle", lastSynced: null, error: null },
    });
  },

  syncWithGitHub: async () => {
    const { githubConfig } = get();
    if (!githubConfig) return;

    set({ syncState: { status: "syncing", lastSynced: get().syncState.lastSynced, error: null } });

    try {
      const data = get().exportData();
      await pushToGitHub(githubConfig, data);
      set({ syncState: { status: "idle", lastSynced: nowISO(), error: null } });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      set({
        syncState: {
          status: code === "CONFLICT" ? "conflict" : "error",
          lastSynced: get().syncState.lastSynced,
          error: friendlyError(code),
        },
      });
    }
  },

  forceSyncToGitHub: async () => {
    const { githubConfig } = get();
    if (!githubConfig) return;

    set({ syncState: { status: "syncing", lastSynced: get().syncState.lastSynced, error: null } });

    try {
      const data = get().exportData();
      await forcePushToGitHub(githubConfig, data);
      set({ syncState: { status: "idle", lastSynced: nowISO(), error: null } });
    } catch (error) {
      const code = error instanceof Error ? error.message : "";
      set({
        syncState: {
          status: "error",
          lastSynced: get().syncState.lastSynced,
          error: friendlyError(code),
        },
      });
    }
  },

  importData: (data) => {
    set({
      cells: data.cells,
      settings: data.settings,
    });
    saveToLocalStorage(data);

    const store = get();
    if (store.githubConfig) {
      debouncedSync(() => store.syncWithGitHub());
    }
  },

  exportData: () => ({
    version: DATA_VERSION,
    settings: get().settings,
    cells: get().cells,
  }),
}));
