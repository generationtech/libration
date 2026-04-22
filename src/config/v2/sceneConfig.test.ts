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
import { createLayerRegistryFromConfig } from "../../app/bootstrap";
import { DEFAULT_APP_CONFIG, type AppConfig, type LayerEnableFlags } from "../appConfig";
import type { LibrationConfigV2 } from "./librationConfig";
import {
  appConfigToV2,
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
  v2ToAppConfig,
} from "./librationConfig";
import {
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
  resolveEquirectBaseMapImageSrc,
  sortSceneLayersForRender,
} from "./sceneConfig";

const DEFAULT_LAYERS: LayerEnableFlags = {
  baseMap: true,
  solarShading: true,
  grid: true,
  cityPins: true,
  subsolarMarker: true,
  sublunarMarker: true,
};

function appConfigWithLayerMask(layers: LayerEnableFlags): AppConfig {
  return { ...DEFAULT_APP_CONFIG, layers, scene: buildDefaultSceneConfigFromLayerFlags(layers) };
}

describe("SceneConfig (Phase 1)", () => {
  it("cold start with no scene in a partial v2 object injects defaults and projection/view", () => {
    const full = defaultLibrationConfigV2();
    const { scene: _drop, ...rest } = full;
    const v2 = normalizeLibrationConfig({ ...rest, scene: undefined } as LibrationConfigV2);
    expect(v2.scene).toBeDefined();
    expect(v2.scene?.projectionId).toBe("equirectangular");
    expect(v2.scene?.viewMode).toBe("fullWorldFixed");
    expect(v2.scene?.orderingMode).toBe("user");
    expect(v2.scene?.baseMap.id).toBeDefined();
  });

  it("partial scene fills missing base map, ordering mode, and stack rows", () => {
    const full = defaultLibrationConfigV2();
    const v2 = normalizeLibrationConfig({
      ...full,
      scene: {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        baseMap: { id: "x-test-unknown", visible: true },
        layers: [],
      } as unknown as LibrationConfigV2["scene"],
    } as LibrationConfigV2);
    expect(v2.scene?.orderingMode).toBe("user");
    expect(v2.scene?.baseMap.opacity).toBe(1);
    expect(v2.scene?.layers).toHaveLength(5);
  });

  it("base map id drives resolved raster path (single legacy asset for unknown ids)", () => {
    expect(resolveEquirectBaseMapImageSrc("equirect-world-legacy-v1")).toBe(
      "/maps/world-equirectangular.jpg",
    );
    expect(resolveEquirectBaseMapImageSrc("unknown-map")).toBe("/maps/world-equirectangular.jpg");
  });

  it("disabling a scene layer drops it from the layer registry", () => {
    const layers: LayerEnableFlags = { ...DEFAULT_LAYERS, grid: false };
    const r = createLayerRegistryFromConfig(appConfigWithLayerMask(layers));
    expect(r.getLayers().some((l) => l.id === "layer.grid.latLon")).toBe(false);
  });

  it("stack ordering is deterministic by order then id", () => {
    const scene = buildDefaultSceneConfigFromLayerFlags(DEFAULT_LAYERS);
    const g = scene.layers.find((l) => l.id === "grid")!;
    const s = scene.layers.find((l) => l.id === "solarShading")!;
    const a = [
      { ...g, order: 0 },
      { ...s, order: 0 },
    ];
    const sorted = sortSceneLayersForRender(a);
    expect(sorted[0]!.id).toBe("grid");
    expect(sorted[1]!.id).toBe("solarShading");
  });

  it("v2 round-trip: layers are derived from scene, not a separate source of truth", () => {
    const app = v2ToAppConfig(appConfigToV2(DEFAULT_APP_CONFIG));
    expect(app.layers).toEqual(deriveLayerEnableFlagsFromScene(app.scene));
  });
});
