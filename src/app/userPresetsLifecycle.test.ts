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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as displayPresets from "../config/displayPresets";
import { DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG, DEFAULT_GEOGRAPHY_CONFIG } from "../config/appConfig";
import {
  appConfigToV2,
  normalizeLibrationConfig,
  type LibrationConfigV2,
} from "../config/v2/librationConfig";
import {
  createUserPresetEntry,
  loadUserPresets,
  saveUserPresets,
} from "../config/v2/userPresetsPersistence";
import { WORKING_V2_LOCAL_STORAGE_KEY } from "../config/v2/workingV2Persistence";
import { createLayerRegistryFromConfig } from "./bootstrap";
import { deriveAppConfigFromV2 } from "./workingV2Commit";
import {
  deletePreset,
  loadPreset,
  renamePreset,
  saveCurrentAsPreset,
} from "./userPresetsLifecycle";

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

function setupRefs(initial: LibrationConfigV2) {
  const workingV2Ref: { current: LibrationConfigV2 | null } = {
    current: normalizeLibrationConfig(initial),
  };
  const derivedAppConfigRef = {
    current: deriveAppConfigFromV2(workingV2Ref.current!),
  };
  const registryRef = {
    current: createLayerRegistryFromConfig(derivedAppConfigRef.current),
  };
  return { workingV2Ref, derivedAppConfigRef, registryRef };
}

describe("userPresetsLifecycle", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", makeMemoryStorage());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("load preset replaces working config and does not use code display presets as authority", () => {
    const storage = globalThis.localStorage;
    const baseA = normalizeLibrationConfig(appConfigToV2(displayPresets.getActiveAppConfig()));
    const baseB = normalizeLibrationConfig({
      ...baseA,
      layers: { ...baseA.layers, grid: !baseA.layers.grid },
    });
    const entry = createUserPresetEntry("snap", baseB);
    saveUserPresets(storage, [entry]);

    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(baseA);
    const spy = vi.spyOn(displayPresets, "getAppConfigForPreset");

    const ok = loadPreset(
      storage,
      workingV2Ref,
      derivedAppConfigRef,
      registryRef,
      entry.id,
    );

    expect(ok).toBe(true);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();

    expect(workingV2Ref.current!.layers.grid).toBe(baseB.layers.grid);
    expect(derivedAppConfigRef.current.layers.grid).toBe(baseB.layers.grid);

    const rawWorking = storage.getItem(WORKING_V2_LOCAL_STORAGE_KEY);
    expect(rawWorking).not.toBeNull();
  });

  it("delete removes preset", () => {
    const storage = globalThis.localStorage;
    const snap = normalizeLibrationConfig(appConfigToV2(displayPresets.getActiveAppConfig()));
    const entry = createUserPresetEntry("x", snap);
    saveUserPresets(storage, [entry]);

    deletePreset(storage, entry.id);
    expect(loadUserPresets(storage)).toEqual([]);
  });

  it("rename updates metadata only", () => {
    const storage = globalThis.localStorage;
    const snap = normalizeLibrationConfig(appConfigToV2(displayPresets.getActiveAppConfig()));
    const entry = createUserPresetEntry("old", snap);
    saveUserPresets(storage, [entry]);
    const beforeSnap = loadUserPresets(storage)[0]!.snapshot;

    const r = renamePreset(storage, entry.id, "new");
    expect(r).toEqual({ ok: true });

    const list = loadUserPresets(storage);
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe("new");
    expect(list[0]!.snapshot).toEqual(beforeSnap);
  });

  it("preset snapshot round-trip carries geography without special-case authority", () => {
    const storage = globalThis.localStorage;
    const base = normalizeLibrationConfig(appConfigToV2(displayPresets.getActiveAppConfig()));
    const withGeo = normalizeLibrationConfig({
      ...base,
      geography: {
        ...DEFAULT_GEOGRAPHY_CONFIG,
        referenceMode: "fixedCoordinate",
        fixedCoordinate: { latitude: 12, longitude: -45.5, label: "Spot" },
      },
    });
    const entry = createUserPresetEntry("geo", withGeo);
    saveUserPresets(storage, [entry]);

    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const ok = loadPreset(storage, workingV2Ref, derivedAppConfigRef, registryRef, entry.id);
    expect(ok).toBe(true);
    expect(workingV2Ref.current!.geography).toEqual(withGeo.geography);
    expect(derivedAppConfigRef.current.geography).toEqual({
      referenceMode: "fixedCoordinate",
      fixedCoordinate: { latitude: 12, longitude: -45.5, label: "Spot" },
      showFixedCoordinateLabelInTimezoneStrip: false,
    });
  });

  it("preset snapshot round-trip carries custom pins without special-case authority", () => {
    const storage = globalThis.localStorage;
    const base = normalizeLibrationConfig(appConfigToV2(displayPresets.getActiveAppConfig()));
    const withPins = normalizeLibrationConfig({
      ...base,
      pins: {
        ...base.pins,
        custom: [
          { id: "custom.snap", label: "Snap", latitude: -33.8, longitude: 151.2, enabled: true },
        ],
      },
    });
    const entry = createUserPresetEntry("with pins", withPins);
    saveUserPresets(storage, [entry]);

    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const ok = loadPreset(storage, workingV2Ref, derivedAppConfigRef, registryRef, entry.id);
    expect(ok).toBe(true);
    expect(workingV2Ref.current!.pins.custom).toEqual(withPins.pins.custom);
    expect(derivedAppConfigRef.current.customPins).toEqual([
      { id: "custom.snap", label: "Snap", latitude: -33.8, longitude: 151.2, enabled: true },
    ]);
  });

  it("preset snapshot round-trip carries chrome.layout", () => {
    const storage = globalThis.localStorage;
    const base = normalizeLibrationConfig(appConfigToV2(displayPresets.getActiveAppConfig()));
    const withLayout = normalizeLibrationConfig({
      ...base,
      chrome: {
        ...base.chrome,
        layout: {
          ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
          bottomInformationBarVisible: false,
          timezoneLetterRowVisible: true,
        },
      },
    });
    const entry = createUserPresetEntry("chrome layout", withLayout);
    saveUserPresets(storage, [entry]);

    const { workingV2Ref, derivedAppConfigRef, registryRef } = setupRefs(base);
    const ok = loadPreset(storage, workingV2Ref, derivedAppConfigRef, registryRef, entry.id);
    expect(ok).toBe(true);
    expect(workingV2Ref.current!.chrome.layout).toEqual(withLayout.chrome.layout);
    expect(derivedAppConfigRef.current.displayChromeLayout).toEqual({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      bottomInformationBarVisible: false,
      timezoneLetterRowVisible: true,
    });
  });

  it("saveCurrentAsPreset stores normalized working snapshot", () => {
    const storage = globalThis.localStorage;
    const base = normalizeLibrationConfig(appConfigToV2(displayPresets.getActiveAppConfig()));
    const { workingV2Ref } = setupRefs(base);

    const r = saveCurrentAsPreset(storage, workingV2Ref, "  mine  ");
    expect(r).toEqual({ ok: true, id: expect.any(String) });

    const list = loadUserPresets(storage);
    expect(list).toHaveLength(1);
    expect(list[0]!.name).toBe("mine");
    expect(list[0]!.snapshot).toEqual(base);
  });
});
