// ─── Schema Migration & Versioning ───────────────────────────────────────────
// Provides forward-compatible data migrations for MMKV stores.

import { mmkvStorage } from '../store/mmkv';

export const SCHEMA_VERSIONS: Record<string, number> = {
  gym: 1,
  habits: 1,
  nutrition: 1,
  notes: 1,
  weight: 1,
  measurements: 1,
  steps: 1,
  user: 1,
};

const SCHEMA_KEY = '__ironlog_schema_versions';

export function getStoredSchemaVersions(): Record<string, number> {
  const raw = mmkvStorage.getString(SCHEMA_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function setStoredSchemaVersions(versions: Record<string, number>) {
  mmkvStorage.set(SCHEMA_KEY, JSON.stringify(versions));
}

export function runMigrations() {
  const stored = getStoredSchemaVersions();
  const updated = { ...stored };

  for (const [storeKey, targetVersion] of Object.entries(SCHEMA_VERSIONS)) {
    const current = stored[storeKey] ?? 0;
    if (current < targetVersion) {
      // Placeholder for future migrations
      // Example: if (storeKey === 'gym' && current < 1) { migrateGymV0ToV1(); }
      updated[storeKey] = targetVersion;
    }
  }

  setStoredSchemaVersions(updated);
}

export function clearSchemaVersions() {
  mmkvStorage.delete(SCHEMA_KEY);
}
