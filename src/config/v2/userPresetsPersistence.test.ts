/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

import { describe, expect, it } from "vitest";
import { getActiveAppConfig } from "../displayPresets";
import {
  appConfigToV2,
  normalizeLibrationConfig,
} from "./librationConfig";
import {
  USER_PRESETS_LOCAL_STORAGE_KEY,
  loadUserPresets,
  saveUserPresets,
  createUserPresetEntry,
} from "./userPresetsPersistence";
import { reviveLibrationConfigV2FromUnknown } from "./workingV2Persistence";

function makeMemoryStorage(): Storage {
  const m = new Map<string, string>();
  return {
    get length() {
      return m.size;
    },
    clear: () => {
      m.clear();
    },
    getItem: (k) => m.get(k) ?? null,
    key: (i) => [...m.keys()][i] ?? null,
    removeItem: (k) => {
      m.delete(k);
    },
    setItem: (k, v) => {
      m.set(k, v);
    },
  } as Storage;
}

describe("userPresetsPersistence", () => {
  it("save preset writes normalized snapshot to storage", () => {
    const storage = makeMemoryStorage();
    const snap = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    const entry = createUserPresetEntry("My layout", snap);
    saveUserPresets(storage, [entry]);

    const raw = storage.getItem(USER_PRESETS_LOCAL_STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!) as {
      version: unknown;
      presets: Array<{ snapshot: unknown }>;
    };
    expect(parsed.version).toBe(1);
    const storedSnap = parsed.presets[0]?.snapshot;
    const revived = reviveLibrationConfigV2FromUnknown(storedSnap);
    expect(revived).not.toBeNull();
    expect(normalizeLibrationConfig(revived!)).toEqual(snap);
  });

  it("invalid preset storage is safely ignored", () => {
    const storage = makeMemoryStorage();
    storage.setItem(USER_PRESETS_LOCAL_STORAGE_KEY, "not-json");
    expect(loadUserPresets(storage)).toEqual([]);

    storage.setItem(USER_PRESETS_LOCAL_STORAGE_KEY, JSON.stringify({ version: 2, presets: [] }));
    expect(loadUserPresets(storage)).toEqual([]);

    storage.setItem(
      USER_PRESETS_LOCAL_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        presets: [{ id: "a", name: "x", snapshot: { bogus: true } }],
      }),
    );
    expect(loadUserPresets(storage)).toEqual([]);
  });

  it("loadUserPresets normalizes snapshots after load", () => {
    const storage = makeMemoryStorage();
    const snap = normalizeLibrationConfig(appConfigToV2(getActiveAppConfig()));
    storage.setItem(
      USER_PRESETS_LOCAL_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        presets: [
          {
            id: "id-1",
            name: "one",
            snapshot: snap,
          },
        ],
      }),
    );
    const loaded = loadUserPresets(storage);
    expect(loaded).toHaveLength(1);
    expect(loaded[0]!.snapshot).toEqual(snap);
    expect(loaded[0]!.snapshot.pins.reference.visibleCityIds).not.toBe(
      snap.pins.reference.visibleCityIds,
    );
  });
});
