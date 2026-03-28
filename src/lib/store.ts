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
  loadGitHubConfig,
  saveGitHubConfig,
  clearGitHubConfig,
  pullFromGitHub,
  pushToGitHub,
  forcePushToGitHub,
} from "./sync";
import { nowISO, todayISO } from "./utils";

interface BatteryStore {
  // State
  cells: Cell[];
  settings: AppSettings;
  githubConfig: GitHubConfig | null;
  syncState: SyncState;
  initialized: boolean;

  // Init
  initialize: () => Promise<void>;

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
  setGitHubConfig: (config: GitHubConfig) => void;
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

  initialize: async () => {
    const config = loadGitHubConfig();
    const local = loadFromLocalStorage();

    set({
      cells: local.cells,
      settings: local.settings,
      githubConfig: config,
      initialized: true,
    });

    if (config) {
      try {
        set({ syncState: { status: "syncing", lastSynced: null, error: null } });
        const remote = await pullFromGitHub(config);
        set({
          cells: remote.cells,
          settings: remote.settings,
          syncState: { status: "idle", lastSynced: nowISO(), error: null },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Szinkronizációs hiba";
        set({
          syncState: {
            status: "error",
            lastSynced: null,
            error: message === "TOKEN_EXPIRED"
              ? "A GitHub token lejárt vagy visszavonták. Frissítsd a Beállítások oldalon."
              : message,
          },
        });
      }
    }
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

  setGitHubConfig: (config) => {
    saveGitHubConfig(config);
    set({ githubConfig: config });
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
      const message = error instanceof Error ? error.message : "Szinkronizációs hiba";
      if (message === "TOKEN_EXPIRED") {
        set({
          syncState: {
            status: "error",
            lastSynced: get().syncState.lastSynced,
            error: "A GitHub token lejárt vagy visszavonták. Frissítsd a Beállítások oldalon.",
          },
        });
      } else {
        set({
          syncState: {
            status: message === "CONFLICT" ? "conflict" : "error",
            lastSynced: get().syncState.lastSynced,
            error: message === "CONFLICT"
              ? "Ütközés: az adatok megváltoztak a GitHub-on. Frissítsd az oldalt."
              : message,
          },
        });
      }
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
      const message = error instanceof Error ? error.message : "Szinkronizációs hiba";
      set({
        syncState: {
          status: "error",
          lastSynced: get().syncState.lastSynced,
          error: message,
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
