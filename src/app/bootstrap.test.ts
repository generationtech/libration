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
import {
  DEFAULT_APP_CONFIG,
  resolveCitiesForPins,
  type AppConfig,
} from "../config/appConfig";
import {
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
} from "../config/v2/sceneConfig";
import { createTimeContext } from "../core/time";
import { CITY_PINS_KIND } from "../layers/cityPinsPayload";
import { createLayerRegistryFromConfig } from "./bootstrap";

const GRID_ID = "layer.grid.latLon";

describe("createLayerRegistryFromConfig", () => {
  it("when called with no args, matches an explicit DEFAULT_APP_CONFIG registry (active preset is full)", () => {
    const implicit = createLayerRegistryFromConfig();
    const explicit = createLayerRegistryFromConfig(DEFAULT_APP_CONFIG);
    expect(implicit.getLayers().map((l) => l.id).sort()).toEqual(
      explicit.getLayers().map((l) => l.id).sort(),
    );
  });

  it("registers all default layers with the same ids as the full scene", () => {
    const registry = createLayerRegistryFromConfig(DEFAULT_APP_CONFIG);
    const ids = registry.getLayers().map((l) => l.id).sort();
    expect(ids).toEqual(
      [
        "layer.baseMap.world",
        "layer.grid.latLon",
        "layer.points.referenceCities",
        "layer.points.sublunar",
        "layer.points.subsolar",
        "layer.solarShading.dayNight",
      ].sort(),
    );
  });

  it("omits the grid layer when grid is disabled in config", () => {
    const layers = { ...DEFAULT_APP_CONFIG.layers, grid: false };
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      layers,
      scene: buildDefaultSceneConfigFromLayerFlags(layers),
    };
    const registry = createLayerRegistryFromConfig(config);
    expect(registry.getLayers().some((l) => l.id === GRID_ID)).toBe(false);
  });

  it("omits solar shading when solarShading is disabled in config", () => {
    const layers = { ...DEFAULT_APP_CONFIG.layers, solarShading: false };
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      layers,
      scene: buildDefaultSceneConfigFromLayerFlags(layers),
    };
    const registry = createLayerRegistryFromConfig(config);
    expect(registry.getLayers().some((l) => l.id === "layer.solarShading.dayNight")).toBe(
      false,
    );
  });

  it("passes a reduced city set into the city pins layer from visibleCityIds", () => {
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      visibleCityIds: ["city.london", "city.tokyo", "city.sydney"],
    };
    expect(resolveCitiesForPins(config)).toHaveLength(3);

    const registry = createLayerRegistryFromConfig(config);
    const pins = registry.getLayers().find((l) => l.id === "layer.points.referenceCities");
    expect(pins).toBeDefined();
    const time = createTimeContext(Date.now(), 0, false);
    const state = pins!.getState(time);
    const data = state.data as {
      kind: string;
      cities: { id: string }[];
      showLabels: boolean;
      labelMode: string;
      scale: string;
    };
    expect(data.kind).toBe(CITY_PINS_KIND);
    expect(data.showLabels).toBe(true);
    expect(data.labelMode).toBe("cityAndTime");
    expect(data.scale).toBe("medium");
    expect(data.cities.map((c) => c.id).sort()).toEqual(
      ["city.london", "city.sydney", "city.tokyo"].sort(),
    );
  });

  it("merges enabled custom pins into the city pins layer after reference cities", () => {
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      visibleCityIds: ["city.london"],
      customPins: [
        {
          id: "custom.a",
          label: "Alpha",
          latitude: 12.5,
          longitude: -45,
          enabled: true,
        },
        {
          id: "custom.b",
          label: "Hidden",
          latitude: 1,
          longitude: 2,
          enabled: false,
        },
      ],
    };
    const registry = createLayerRegistryFromConfig(config);
    const pins = registry.getLayers().find((l) => l.id === "layer.points.referenceCities");
    expect(pins).toBeDefined();
    const time = createTimeContext(Date.now(), 0, false);
    const state = pins!.getState(time);
    const data = state.data as { kind: string; cities: { id: string; name: string }[] };
    expect(data.kind).toBe(CITY_PINS_KIND);
    expect(data.cities.map((c) => c.id)).toEqual(["city.london", "custom.a"]);
    const custom = data.cities.find((c) => c.id === "custom.a");
    expect(custom?.name).toBe("Alpha");
  });

  it("applies scene per-layer opacity on layer state (renderer composition path)", () => {
    const base = buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers);
    const scene = {
      ...base,
      layers: base.layers.map((L) =>
        L.id === "grid" ? { ...L, opacity: 0.35 } : L,
      ),
    };
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      scene,
      layers: deriveLayerEnableFlagsFromScene(scene),
    };
    const registry = createLayerRegistryFromConfig(config);
    const grid = registry.getLayers().find((l) => l.id === GRID_ID);
    const time = createTimeContext(Date.now(), 0, false);
    expect(grid?.getState(time).opacity).toBeCloseTo(0.35, 5);
  });

  it("registry z-order matches plan when `order` is swapped (solar draws above grid)", () => {
    const base = buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers);
    const scene = {
      ...base,
      layers: base.layers.map((L) => {
        if (L.id === "grid") {
          return { ...L, order: 0 };
        }
        if (L.id === "solarShading") {
          return { ...L, order: 1 };
        }
        return L;
      }),
    };
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      scene,
      layers: deriveLayerEnableFlagsFromScene(scene),
    };
    const r = createLayerRegistryFromConfig(config);
    const z = (id: string) => r.getLayers().find((l) => l.id === id)!.zIndex;
    expect(z("layer.grid.latLon")).toBeLessThan(z("layer.solarShading.dayNight"));
  });
});
