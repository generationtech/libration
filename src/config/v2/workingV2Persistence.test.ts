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
import { DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG, DEFAULT_PIN_PRESENTATION } from "../appConfig";
import {
  appConfigToV2,
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
} from "./librationConfig";
import persistenceSource from "./workingV2Persistence.ts?raw";
import {
  loadPersistedWorkingV2,
  reviveLibrationConfigV2FromUnknown,
  resolveStartupWorkingV2,
  WORKING_V2_LOCAL_STORAGE_KEY,
} from "./workingV2Persistence";

const configUiSources = import.meta.glob<string>("../../components/config/**/*.{ts,tsx}", {
  eager: true,
  query: "?raw",
  import: "default",
});

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

function assertSourceImportsNoRenderer(source: string, label: string): void {
  const fromStatic = /\bfrom\s+["']([^"']+)["']/g;
  let m: RegExpExecArray | null;
  while ((m = fromStatic.exec(source)) !== null) {
    const p = m[1];
    if (p.includes("renderer")) {
      throw new Error(`${label} must not import renderer: ${p}`);
    }
  }
  const importDyn = /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g;
  while ((m = importDyn.exec(source)) !== null) {
    const p = m[1];
    if (p.includes("renderer")) {
      throw new Error(`${label} must not import renderer (dynamic): ${p}`);
    }
  }
}

const ALLOWED_PERSISTED_TOP_KEYS = ["chrome", "data", "geography", "layers", "meta", "pins", "scene"];

describe("workingV2Persistence", () => {
  describe("startup / load", () => {
    it("loads a valid stored v2 document on startup", () => {
      const stored = normalizeLibrationConfig(defaultLibrationConfigV2());
      stored.layers.grid = !stored.layers.grid;
      const mem = makeMemoryStorage();
      mem.setItem(WORKING_V2_LOCAL_STORAGE_KEY, JSON.stringify(stored));

      const got = resolveStartupWorkingV2(mem, () => appConfigToV2(getActiveAppConfig()));
      expect(got.layers.grid).toBe(stored.layers.grid);
    });

    it("falls back safely when storage is absent", () => {
      const got = resolveStartupWorkingV2(null, () => appConfigToV2(getActiveAppConfig()));
      expect(got).toEqual(
        normalizeLibrationConfig(appConfigToV2(getActiveAppConfig())),
      );
    });

    it("falls back safely when stored JSON is malformed", () => {
      const mem = makeMemoryStorage();
      mem.setItem(WORKING_V2_LOCAL_STORAGE_KEY, "{ not json");
      const got = resolveStartupWorkingV2(mem, () => appConfigToV2(getActiveAppConfig()));
      expect(got).toEqual(
        normalizeLibrationConfig(appConfigToV2(getActiveAppConfig())),
      );
    });

    it("falls back safely when stored shape is invalid", () => {
      expect(reviveLibrationConfigV2FromUnknown({ foo: 1 })).toBeNull();
      expect(reviveLibrationConfigV2FromUnknown(null)).toBeNull();
      const mem = makeMemoryStorage();
      mem.setItem(WORKING_V2_LOCAL_STORAGE_KEY, JSON.stringify({ meta: { schemaVersion: 2 } }));
      expect(loadPersistedWorkingV2(mem)).toBeNull();
    });

    it("rejects wrong schema version", () => {
      const base = normalizeLibrationConfig(defaultLibrationConfigV2());
      const bad = { ...base, meta: { ...base.meta, schemaVersion: 3 } };
      expect(reviveLibrationConfigV2FromUnknown(bad)).toBeNull();
    });

    it("revives JSON missing chrome.layout by normalizing layout to defaults", () => {
      const base = normalizeLibrationConfig(defaultLibrationConfigV2());
      const legacy = {
        meta: base.meta,
        layers: base.layers,
        pins: base.pins,
        chrome: { displayTime: base.chrome.displayTime },
        geography: base.geography,
        data: base.data,
      };
      const revived = reviveLibrationConfigV2FromUnknown(legacy);
      expect(revived).not.toBeNull();
      expect(revived!.chrome.layout).toEqual(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    });

    it("revives pre–Phase 6c JSON that has pins.appearance and pins.controls but no presentation", () => {
      const base = normalizeLibrationConfig(defaultLibrationConfigV2());
      const legacy = {
        meta: base.meta,
        layers: base.layers,
        pins: {
          reference: base.pins.reference,
          custom: base.pins.custom,
          appearance: {},
          controls: {},
        },
        chrome: base.chrome,
        geography: base.geography,
        data: base.data,
      };
      const revived = reviveLibrationConfigV2FromUnknown(legacy);
      expect(revived).not.toBeNull();
      expect(revived!.pins.presentation).toEqual(DEFAULT_PIN_PRESENTATION);
    });
  });

  describe("persisted payload shape", () => {
    it("persisted JSON contains only durable v2 top-level domains (no UI session keys)", () => {
      const mem = makeMemoryStorage();
      const doc = normalizeLibrationConfig(defaultLibrationConfigV2());
      mem.setItem(WORKING_V2_LOCAL_STORAGE_KEY, JSON.stringify(doc));
      const raw = mem.getItem(WORKING_V2_LOCAL_STORAGE_KEY);
      expect(raw).not.toBeNull();
      const parsed = JSON.parse(raw!) as Record<string, unknown>;
      const keys = Object.keys(parsed).sort();
      expect(keys).toEqual([...ALLOWED_PERSISTED_TOP_KEYS]);
      expect(parsed).not.toHaveProperty("isConfigOpen");
      expect(parsed).not.toHaveProperty("activeTab");
    });
  });

  describe("import boundaries", () => {
    it("persistence and config UI modules do not import the renderer", () => {
      assertSourceImportsNoRenderer(persistenceSource, "workingV2Persistence.ts");
      for (const [path, source] of Object.entries(configUiSources)) {
        assertSourceImportsNoRenderer(source, path);
      }
    });
  });
});
