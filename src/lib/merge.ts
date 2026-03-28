import type { Cell, CellEvent, CellTemplate, Measurement, AppSettings } from "./types";
import { nowISO } from "./utils";

// --- Deep equality ---

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return a == b;
  return JSON.stringify(a) === JSON.stringify(b);
}

// --- Field-level merge ---

function mergeFieldValue<T>(base: T | undefined, remote: T | undefined, local: T | undefined): T | undefined {
  const localChanged = !deepEqual(base, local);
  const remoteChanged = !deepEqual(base, remote);

  if (!localChanged && !remoteChanged) return base;   // No change
  if (!localChanged && remoteChanged) return remote;   // Only remote changed → accept
  // localChanged (regardless of remote) → local wins
  return local;
}

// --- Entity field merge ---

const CELL_EXCLUDE_KEYS = new Set(["internalId", "createdAt", "updatedAt", "events", "measurements", "deletedAt"]);
const TEMPLATE_EXCLUDE_KEYS = new Set(["internalId", "createdAt", "updatedAt"]);
function mergeEntityFields<T>(
  base: T,
  remote: T,
  local: T,
  excludeKeys: Set<string>,
): T {
  const baseObj = base as Record<string, unknown>;
  const remoteObj = remote as Record<string, unknown>;
  const localObj = local as Record<string, unknown>;

  const allKeys = new Set([
    ...Object.keys(baseObj),
    ...Object.keys(remoteObj),
    ...Object.keys(localObj),
  ]);

  const result = { ...localObj };
  let changed = false;

  for (const key of allKeys) {
    if (excludeKeys.has(key)) continue;
    const merged = mergeFieldValue(baseObj[key], remoteObj[key], localObj[key]);
    if (!deepEqual(result[key], merged)) {
      result[key] = merged;
      changed = true;
    }
  }

  if (changed || !deepEqual(baseObj, result)) {
    result.updatedAt = nowISO();
  }

  return result as T;
}

function isEntityModified<T>(
  base: T,
  local: T,
  excludeKeys: Set<string>,
): boolean {
  const baseObj = base as Record<string, unknown>;
  const localObj = local as Record<string, unknown>;
  const allKeys = new Set([...Object.keys(baseObj), ...Object.keys(localObj)]);
  for (const key of allKeys) {
    if (excludeKeys.has(key)) continue;
    if (!deepEqual(baseObj[key], localObj[key])) return true;
  }
  return false;
}

// --- Measurement merge ---

export function mergeMeasurements(
  base: Measurement[],
  remote: Measurement[],
  local: Measurement[],
): Measurement[] {
  const baseMap = new Map(base.map((m) => [m.id, m]));
  const remoteMap = new Map(remote.map((m) => [m.id, m]));
  const localMap = new Map(local.map((m) => [m.id, m]));

  const allIds = new Set([
    ...baseMap.keys(),
    ...remoteMap.keys(),
    ...localMap.keys(),
  ]);

  const result: Measurement[] = [];

  for (const id of allIds) {
    const b = baseMap.get(id);
    const r = remoteMap.get(id);
    const l = localMap.get(id);

    if (!b) {
      // Not in base
      if (l && r) {
        // E3: both created → merge fields (use local as base for field merge since both are "new")
        result.push(mergeEntityFields(l, r, l, new Set(["id"])));
      } else if (l) {
        // E1: local creation
        result.push(l);
      } else if (r) {
        // E2: remote creation
        result.push(r);
      }
    } else {
      // In base
      if (l && r) {
        // E4: in all three → field-level merge
        result.push(mergeEntityFields(b, r, l, new Set(["id"])));
      } else if (!l && r) {
        // E5: locally deleted
        // (measurement was in base, not in local anymore → local deleted it)
        // Skip (delete)
      } else if (l && !r) {
        // Remote deleted. Check if local modified.
        const localModified = isEntityModified(b, l, new Set(["id"]));
        if (localModified) {
          result.push(l); // E6: keep local (modified)
        }
        // else E7: accept remote deletion
      }
      // E8: both deleted → skip
    }
  }

  return result;
}

// --- Event merge ---

export function mergeEvents(
  base: CellEvent[],
  remote: CellEvent[],
  local: CellEvent[],
): CellEvent[] {
  const seen = new Set<string>();
  const result: CellEvent[] = [];

  // Union of all events, deduplicate by id
  for (const events of [base, remote, local]) {
    for (const event of events) {
      if (!seen.has(event.id)) {
        seen.add(event.id);
        result.push(event);
      }
    }
  }

  // Sort by date ascending
  result.sort((a, b) => a.date.localeCompare(b.date));
  return result;
}

// --- Array-as-set merge ---

export function mergeArrayAsSet(
  base: string[],
  remote: string[],
  local: string[],
): string[] {
  const baseSet = new Set(base);
  const remoteSet = new Set(remote);
  const localSet = new Set(local);

  const result = new Set<string>();

  // Start with base items, then apply changes
  for (const item of baseSet) {
    const inRemote = remoteSet.has(item);
    const inLocal = localSet.has(item);

    if (inLocal && inRemote) {
      result.add(item); // Still in both → keep
    } else if (!inLocal && inRemote) {
      // Locally removed → remove
    } else if (inLocal && !inRemote) {
      // Remotely removed → remove (unless locally added, but it was in base so it wasn't locally added)
    } else {
      // Both removed → remove
    }
  }

  // Add items that are new in remote (not in base)
  for (const item of remoteSet) {
    if (!baseSet.has(item)) {
      result.add(item);
    }
  }

  // Add items that are new in local (not in base)
  for (const item of localSet) {
    if (!baseSet.has(item)) {
      result.add(item);
    }
  }

  return Array.from(result);
}

// --- Cell merge ---

export function threeWayMergeCells(
  base: Cell[],
  remote: Cell[],
  local: Cell[],
): Cell[] {
  const baseMap = new Map(base.map((c) => [c.internalId, c]));
  const remoteMap = new Map(remote.map((c) => [c.internalId, c]));
  const localMap = new Map(local.map((c) => [c.internalId, c]));

  const allIds = new Set([
    ...baseMap.keys(),
    ...remoteMap.keys(),
    ...localMap.keys(),
  ]);

  const result: Cell[] = [];

  for (const internalId of allIds) {
    const b = baseMap.get(internalId);
    const r = remoteMap.get(internalId);
    const l = localMap.get(internalId);

    if (!b) {
      // Not in base
      if (l && r) {
        // E3: both created independently → merge
        const merged = mergeEntityFields(
          l,
          r,
          l,
          CELL_EXCLUDE_KEYS,
        );
        merged.internalId = internalId;
        merged.createdAt = l.createdAt < r.createdAt ? l.createdAt : r.createdAt;
        merged.measurements = mergeMeasurements([], r.measurements || [], l.measurements || []);
        merged.events = mergeEvents([], r.events || [], l.events || []);
        result.push(merged);
      } else if (l) {
        // E1: local creation
        result.push(l);
      } else if (r) {
        // E2: remote creation
        result.push(r);
      }
    } else {
      // In base
      if (l && r) {
        // E4: in all three → field-level merge
        const merged = mergeEntityFields(
          b,
          r,
          l,
          CELL_EXCLUDE_KEYS,
        );
        merged.internalId = internalId;
        merged.createdAt = b.createdAt;
        merged.measurements = mergeMeasurements(b.measurements || [], r.measurements || [], l.measurements || []);
        merged.events = mergeEvents(b.events || [], r.events || [], l.events || []);
        result.push(merged);
      } else if (!l && r) {
        // E5: locally deleted → delete
        // Skip
      } else if (l && !r) {
        // Remote deleted
        const localModified = isEntityModified(
          b,
          l,
          CELL_EXCLUDE_KEYS,
        );
        if (localModified) {
          // E6: keep local (we modified it)
          result.push(l);
        }
        // else E7: accept remote deletion
      }
      // E8: both deleted → skip
    }
  }

  // Resolve display-id collisions
  resolveIdCollisions(result);

  return result;
}

function resolveIdCollisions(cells: Cell[]): void {
  const byId = new Map<string, Cell[]>();
  for (const cell of cells) {
    const list = byId.get(cell.id) || [];
    list.push(cell);
    byId.set(cell.id, list);
  }
  for (const [, duplicates] of byId) {
    if (duplicates.length <= 1) continue;
    // Newest keeps original id
    duplicates.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    for (let i = 1; i < duplicates.length; i++) {
      duplicates[i].id = `${duplicates[i].id}-${i + 1}`;
    }
  }
}

// --- Template merge ---

export function threeWayMergeTemplates(
  base: CellTemplate[],
  remote: CellTemplate[],
  local: CellTemplate[],
): CellTemplate[] {
  const getKey = (t: CellTemplate) => t.internalId || t.id;
  const baseMap = new Map(base.map((t) => [getKey(t), t]));
  const remoteMap = new Map(remote.map((t) => [getKey(t), t]));
  const localMap = new Map(local.map((t) => [getKey(t), t]));

  const allKeys = new Set([
    ...baseMap.keys(),
    ...remoteMap.keys(),
    ...localMap.keys(),
  ]);

  const result: CellTemplate[] = [];

  for (const key of allKeys) {
    const b = baseMap.get(key);
    const r = remoteMap.get(key);
    const l = localMap.get(key);

    if (!b) {
      if (l && r) {
        // E3: both created → merge
        const merged = mergeEntityFields(
          l,
          r,
          l,
          TEMPLATE_EXCLUDE_KEYS,
        );
        merged.internalId = l.internalId || r.internalId;
        merged.createdAt = l.createdAt < r.createdAt ? l.createdAt : r.createdAt;
        result.push(merged);
      } else if (l) {
        result.push(l);
      } else if (r) {
        result.push(r);
      }
    } else {
      if (l && r) {
        // E4: field-level merge
        const merged = mergeEntityFields(
          b,
          r,
          l,
          TEMPLATE_EXCLUDE_KEYS,
        );
        merged.internalId = b.internalId;
        merged.createdAt = b.createdAt;
        result.push(merged);
      } else if (!l && r) {
        // E5: locally deleted → delete
      } else if (l && !r) {
        const localModified = isEntityModified(
          b,
          l,
          TEMPLATE_EXCLUDE_KEYS,
        );
        if (localModified) {
          result.push(l); // E6
        }
        // else E7: accept remote deletion
      }
      // E8: both deleted
    }
  }

  return result;
}

// --- Settings merge ---

export function threeWayMergeSettings(
  base: AppSettings,
  remote: AppSettings,
  local: AppSettings,
): AppSettings {
  const result = { ...local };

  // Merge scalar fields
  const scalarKeys: (keyof AppSettings)[] = [
    "scrapThresholdPercent",
    "defaultTestDevice",
    "defaultDischargeCurrent",
    "defaultChargeCurrent",
    "theme",
    "language",
  ];

  for (const key of scalarKeys) {
    (result as Record<string, unknown>)[key] = mergeFieldValue(
      base[key],
      remote[key],
      local[key],
    );
  }

  // Merge array fields as sets
  result.devices = mergeArrayAsSet(
    base.devices || [],
    remote.devices || [],
    local.devices || [],
  );
  result.testDevices = mergeArrayAsSet(
    base.testDevices || [],
    remote.testDevices || [],
    local.testDevices || [],
  );

  return result;
}
