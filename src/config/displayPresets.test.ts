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
import { createLayerRegistryFromConfig } from "../app/bootstrap";
import { createTimeContext } from "../core/time";
import { CITY_PINS_KIND } from "../layers/cityPinsPayload";
import { ALL_REFERENCE_CITY_IDS, DEFAULT_APP_CONFIG } from "./appConfig";
import {
  ALL_DISPLAY_PRESET_IDS,
  DISPLAY_PRESET_METADATA,
  DISPLAY_PRESETS,
  FEATURED_REFERENCE_CITY_IDS,
  getAppConfigForPreset,
  isAppConfigCityIdsResolvable,
  type DisplayPresetId,
} from "./displayPresets";

/** Sorted registered layer ids expected for each preset (must match `createLayerRegistryFromConfig`). */
const PRESET_EXPECTED_REGISTERED_LAYER_IDS: Record<
  DisplayPresetId,
  readonly string[]
> = {
  full: [
    "layer.baseMap.world",
    "layer.grid.latLon",
    "layer.points.referenceCities",
    "layer.points.sublunar",
    "layer.points.subsolar",
    "layer.solarShading.dayNight",
  ],
  minimal: ["layer.baseMap.world", "layer.solarShading.dayNight"],
  celestial: [
    "layer.baseMap.world",
    "layer.grid.latLon",
    "layer.points.sublunar",
    "layer.points.subsolar",
    "layer.solarShading.dayNight",
  ],
  featuredCities: ["layer.baseMap.world", "layer.points.referenceCities"],
};

/** Expected visible city id list per preset (order as in config; pins resolve in reference order). */
const PRESET_EXPECTED_VISIBLE_CITY_IDS: Record<
  DisplayPresetId,
  readonly string[]
> = {
  full: ALL_REFERENCE_CITY_IDS,
  minimal: [],
  celestial: [],
  featuredCities: FEATURED_REFERENCE_CITY_IDS,
};

function sortIds(ids: readonly string[]): string[] {
  return [...ids].sort();
}

describe("displayPresets", () => {
  it("metadata lists every preset id in stable order and matches DISPLAY_PRESETS keys", () => {
    const fromRecord = Object.keys(DISPLAY_PRESETS) as DisplayPresetId[];
    expect(ALL_DISPLAY_PRESET_IDS).toEqual(DISPLAY_PRESET_METADATA.map((d) => d.id));
    expect(new Set(ALL_DISPLAY_PRESET_IDS)).toEqual(new Set(fromRecord));
    expect(DISPLAY_PRESET_METADATA.length).toBe(fromRecord.length);
  });

  it("metadata entries include id, label, and description for each preset", () => {
    const expected: Record<
      DisplayPresetId,
      { label: string; description: string }
    > = {
      full: {
        label: "Full",
        description:
          "Complete reference display with all core overlays and cities.",
      },
      minimal: {
        label: "Minimal",
        description: "Reduced display for a cleaner map-first view.",
      },
      celestial: {
        label: "Celestial",
        description: "Emphasizes solar and lunar context.",
      },
      featuredCities: {
        label: "Featured Cities",
        description: "Curated city subset for a simplified multi-city view.",
      },
    };
    for (const d of DISPLAY_PRESET_METADATA) {
      expect(d.label).toBe(expected[d.id].label);
      expect(d.description).toBe(expected[d.id].description);
    }
  });

  it("each preset resolves to a valid config with resolvable city ids", () => {
    for (const id of ALL_DISPLAY_PRESET_IDS) {
      const config = getAppConfigForPreset(id);
      expect(typeof config.layers.baseMap).toBe("boolean");
      expect(Array.isArray(config.visibleCityIds)).toBe(true);
      expect(isAppConfigCityIdsResolvable(config)).toBe(true);
    }
  });

  it("each preset exposes the exact layer enable flags and city list defined in DISPLAY_PRESETS", () => {
    for (const id of ALL_DISPLAY_PRESET_IDS) {
      const config = getAppConfigForPreset(id);
      expect(config.layers).toEqual(DISPLAY_PRESETS[id].layers);
      expect([...config.visibleCityIds].sort()).toEqual(
        sortIds(DISPLAY_PRESETS[id].visibleCityIds),
      );
    }
  });

  it("full matches the default app config composition", () => {
    expect(DISPLAY_PRESETS.full.layers).toEqual(DEFAULT_APP_CONFIG.layers);
    expect(sortIds(DISPLAY_PRESETS.full.visibleCityIds)).toEqual(
      sortIds(DEFAULT_APP_CONFIG.visibleCityIds),
    );
    expect(DISPLAY_PRESETS.full.customPins).toEqual(DEFAULT_APP_CONFIG.customPins);
    expect(DISPLAY_PRESETS.full.pinPresentation).toEqual(DEFAULT_APP_CONFIG.pinPresentation);
    expect(DISPLAY_PRESETS.full.displayTime).toEqual(DEFAULT_APP_CONFIG.displayTime);
    expect(DISPLAY_PRESETS.full.displayChromeLayout).toEqual(
      DEFAULT_APP_CONFIG.displayChromeLayout,
    );
    expect(DISPLAY_PRESETS.full.geography).toEqual(DEFAULT_APP_CONFIG.geography);
    expect(DISPLAY_PRESETS.full.data).toEqual(DEFAULT_APP_CONFIG.data);
  });

  it("each preset produces a registry whose layer id set matches the preset definition", () => {
    for (const id of ALL_DISPLAY_PRESET_IDS) {
      const registry = createLayerRegistryFromConfig(getAppConfigForPreset(id));
      const ids = sortIds(registry.getLayers().map((l) => l.id));
      expect(ids).toEqual(sortIds(PRESET_EXPECTED_REGISTERED_LAYER_IDS[id]));
    }
  });

  it("each preset visibleCityIds matches the documented expectation", () => {
    for (const id of ALL_DISPLAY_PRESET_IDS) {
      const config = getAppConfigForPreset(id);
      expect(sortIds(config.visibleCityIds)).toEqual(
        sortIds(PRESET_EXPECTED_VISIBLE_CITY_IDS[id]),
      );
    }
  });

  it("bootstrap registry for each preset matches getAppConfigForPreset (no drift)", () => {
    for (const id of ALL_DISPLAY_PRESET_IDS) {
      const fromPreset = createLayerRegistryFromConfig(getAppConfigForPreset(id));
      const fromRaw = createLayerRegistryFromConfig(DISPLAY_PRESETS[id]);
      expect(sortIds(fromPreset.getLayers().map((l) => l.id))).toEqual(
        sortIds(fromRaw.getLayers().map((l) => l.id)),
      );
    }
  });

  it("minimal has no grid, pins, or celestial markers", () => {
    const registry = createLayerRegistryFromConfig(getAppConfigForPreset("minimal"));
    const ids = new Set(registry.getLayers().map((l) => l.id));
    expect(ids.has("layer.grid.latLon")).toBe(false);
    expect(ids.has("layer.points.referenceCities")).toBe(false);
    expect(ids.has("layer.points.subsolar")).toBe(false);
    expect(ids.has("layer.points.sublunar")).toBe(false);
  });

  it("celestial includes subsolar and sublunar layers and no city pins", () => {
    const registry = createLayerRegistryFromConfig(getAppConfigForPreset("celestial"));
    const ids = new Set(registry.getLayers().map((l) => l.id));
    expect(ids.has("layer.points.subsolar")).toBe(true);
    expect(ids.has("layer.points.sublunar")).toBe(true);
    expect(ids.has("layer.points.referenceCities")).toBe(false);
  });

  it("featuredCities exposes only FEATURED_REFERENCE_CITY_IDS on the pins layer", () => {
    const config = getAppConfigForPreset("featuredCities");
    expect(sortIds(config.visibleCityIds)).toEqual(sortIds(FEATURED_REFERENCE_CITY_IDS));

    const registry = createLayerRegistryFromConfig(config);
    const pins = registry.getLayers().find((l) => l.id === "layer.points.referenceCities");
    expect(pins).toBeDefined();
    const time = createTimeContext(Date.now(), 0, false);
    const state = pins!.getState(time);
    const data = state.data as { kind: string; cities: { id: string }[] };
    expect(data.kind).toBe(CITY_PINS_KIND);
    expect(sortIds(data.cities.map((c) => c.id))).toEqual(
      sortIds(FEATURED_REFERENCE_CITY_IDS),
    );
  });
});
