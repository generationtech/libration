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
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID,
  DEFAULT_EQUIRECT_BASE_MAP_ID,
  EQUIRECT_BASE_MAP_OPTIONS,
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
  getEquirectBaseMapOptionForId,
  normalizeSceneConfig,
  resolveEquirectBaseMapAsset,
  resolveEquirectBaseMapImageSrc,
  sortSceneLayersForRender,
  SUPPORTED_EQUIRECT_BASE_MAP_IDS,
} from "./sceneConfig";

const DEFAULT_LAYERS: LayerEnableFlags = {
  baseMap: true,
  solarShading: true,
  grid: true,
  staticEquirectOverlay: true,
  cityPins: true,
  subsolarMarker: true,
  sublunarMarker: true,
  solarAnalemma: true,
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
    expect(v2.scene?.illumination.moonlight.mode).toBe("enhanced");
    expect(v2.scene?.illumination.emissiveNightLights.mode).toBe("off");
    expect(v2.scene?.illumination.emissiveNightLights.assetId).toBe(
      DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID,
    );
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
    expect(v2.scene?.layers).toHaveLength(7);
    expect(v2.scene?.illumination.moonlight.mode).toBe("illustrative");
    expect(v2.scene?.illumination.emissiveNightLights.mode).toBe("off");
    expect(v2.scene?.illumination.emissiveNightLights.assetId).toBe(
      DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID,
    );
  });

  it("greenfield scene defaults moonlight to enhanced", () => {
    const s = buildDefaultSceneConfigFromLayerFlags(DEFAULT_LAYERS);
    expect(s.illumination.moonlight.mode).toBe("enhanced");
    expect(s.illumination.emissiveNightLights.mode).toBe("off");
    expect(s.illumination.emissiveNightLights.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
  });

  it("normalizes explicit moonlight mode and rejects unknown to illustrative", () => {
    const ok = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        illumination: { moonlight: { mode: "natural" } },
      },
      DEFAULT_LAYERS,
    );
    expect(ok.illumination.moonlight.mode).toBe("natural");
    expect(ok.illumination.emissiveNightLights.mode).toBe("off");
    expect(ok.illumination.emissiveNightLights.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
    const bad = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        illumination: { moonlight: { mode: "bogus" } },
      } as unknown as Parameters<typeof normalizeSceneConfig>[0],
      DEFAULT_LAYERS,
    );
    expect(bad.illumination.moonlight.mode).toBe("illustrative");
    expect(bad.illumination.emissiveNightLights.mode).toBe("off");
  });

  it("normalizes emissive night lights mode and rejects unknown to off", () => {
    const ok = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        illumination: {
          moonlight: { mode: "natural" },
          emissiveNightLights: { mode: "natural", assetId: "equirect-world-night-lights-viirs-v1" },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(ok.illumination.emissiveNightLights.mode).toBe("natural");
    expect(ok.illumination.emissiveNightLights.assetId).toBe("equirect-world-night-lights-viirs-v1");
    const bad = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        illumination: {
          moonlight: { mode: "natural" },
          emissiveNightLights: { mode: "bogus", assetId: "  " },
        },
      } as unknown as Parameters<typeof normalizeSceneConfig>[0],
      DEFAULT_LAYERS,
    );
    expect(bad.illumination.emissiveNightLights.mode).toBe("off");
    expect(bad.illumination.emissiveNightLights.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
  });

  it("base map registry exposes multiple supported ids", () => {
    expect(SUPPORTED_EQUIRECT_BASE_MAP_IDS).toEqual([
      "equirect-world-legacy-v1",
      "equirect-world-political-v1",
      "equirect-world-geology-v1",
      "equirect-world-blue-marble-bm-v1",
      "equirect-world-blue-marble-t-v1",
      "equirect-world-blue-marble-tb-v1",
    ]);
  });

  it("base map id drives resolved raster path via explicit registry entries", () => {
    expect(resolveEquirectBaseMapImageSrc(DEFAULT_EQUIRECT_BASE_MAP_ID)).toBe(
      "/maps/world-equirectangular.jpg",
    );
    expect(resolveEquirectBaseMapImageSrc("equirect-world-political-v1")).toBe(
      "/maps/world-equirectangular-political.jpg",
    );
    const fixedWall = Date.UTC(2019, 3, 1);
    expect(resolveEquirectBaseMapImageSrc("equirect-world-blue-marble-t-v1", { productInstantMs: fixedWall })).toBe(
      "/maps/variants/equirect-world-blue-marble-t-v1/04.jpg",
    );
    expect(resolveEquirectBaseMapImageSrc("equirect-world-geology-v1")).toBe(
      "/maps/world-equirectangular-geology.jpg",
    );
    const july = Date.UTC(2019, 6, 15);
    expect(
      resolveEquirectBaseMapImageSrc("equirect-world-blue-marble-bm-v1", { productInstantMs: july }),
    ).toBe("/maps/variants/equirect-world-blue-marble-bm-v1/07.jpg");
  });

  it("unknown base map ids safely fall back to the default registry entry", () => {
    const fallback = resolveEquirectBaseMapAsset("unknown-map");
    expect(fallback.id).toBe(DEFAULT_EQUIRECT_BASE_MAP_ID);
    expect(fallback.src).toBe("/maps/world-equirectangular.jpg");
  });

  it("legacy alias ids map to explicit canonical registry ids", () => {
    expect(resolveEquirectBaseMapAsset("equirect-world-topo-v1").id).toBe(
      "equirect-world-blue-marble-t-v1",
    );
  });

  it("exposes BaseMapOption metadata in lockstep with the asset registry", () => {
    expect(EQUIRECT_BASE_MAP_OPTIONS).toHaveLength(SUPPORTED_EQUIRECT_BASE_MAP_IDS.length);
    expect(EQUIRECT_BASE_MAP_OPTIONS.map((o) => o.id)).toEqual(SUPPORTED_EQUIRECT_BASE_MAP_IDS);
    for (const o of EQUIRECT_BASE_MAP_OPTIONS) {
      expect(getEquirectBaseMapOptionForId(o.id).label).toBe(o.label);
    }
  });

  it("getEquirectBaseMapOptionForId uses canonical ids for labels (legacy storage)", () => {
    const o = getEquirectBaseMapOptionForId("equirect-world-topo-v1");
    expect(o.id).toBe("equirect-world-blue-marble-t-v1");
    expect(o.label).toBe("Blue Marble - T");
  });

  it("Blue Marble topography family uses month-aware runtime assets and is not transitional", () => {
    const asset = resolveEquirectBaseMapAsset("equirect-world-blue-marble-t-v1");
    expect(asset.src).toBe("/maps/variants/equirect-world-blue-marble-t-v1/base.jpg");
    expect(asset.variantMode).toBe("monthOfYear");
    expect(asset.transitionalPlaceholder).toBeUndefined();
    const o = getEquirectBaseMapOptionForId("equirect-world-blue-marble-t-v1");
    expect(o.previewThumbnailSrc).toBe("/maps/previews/equirect-world-blue-marble-t-v1-thumb.jpg");
    expect(o.transitionalPlaceholder).toBeUndefined();
  });

  it("non-topography placeholder base maps remain marked transitional in registry and options", () => {
    for (const id of ["equirect-world-political-v1", "equirect-world-geology-v1"] as const) {
      expect(resolveEquirectBaseMapAsset(id).transitionalPlaceholder).toBe(true);
      expect(getEquirectBaseMapOptionForId(id).transitionalPlaceholder).toBe(true);
    }
  });

  it("disabling a scene layer drops it from the layer registry", () => {
    const layers: LayerEnableFlags = { ...DEFAULT_LAYERS, grid: false };
    const r = createLayerRegistryFromConfig(appConfigWithLayerMask(layers));
    expect(r.getLayers().some((l) => l.id === "layer.grid.latLon")).toBe(false);
  });

  it("equal `order` keeps SceneConfig.layers array order (stable, not id order)", () => {
    const scene = buildDefaultSceneConfigFromLayerFlags(DEFAULT_LAYERS);
    const g = scene.layers.find((l) => l.id === "grid")!;
    const s = scene.layers.find((l) => l.id === "solarShading")!;
    const forward = [
      { ...g, order: 0 },
      { ...s, order: 0 },
    ];
    expect(sortSceneLayersForRender(forward).map((l) => l.id)).toEqual(["grid", "solarShading"]);
    const reversed = [
      { ...s, order: 0 },
      { ...g, order: 0 },
    ];
    expect(sortSceneLayersForRender(reversed).map((l) => l.id)).toEqual([
      "solarShading",
      "grid",
    ]);
  });

  it("v2 round-trip: layers are derived from scene, not a separate source of truth", () => {
    const app = v2ToAppConfig(appConfigToV2(DEFAULT_APP_CONFIG));
    expect(app.layers).toEqual(deriveLayerEnableFlagsFromScene(app.scene));
  });

  it("normalization preserves additional non-default scene rows", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: "equirect-world-legacy-v1", visible: true },
        layers: [
          {
            id: "customStaticOverlay",
            family: "environment",
            type: "staticRaster",
            enabled: true,
            order: 999,
            opacity: 0.5,
            source: { kind: "staticRaster", src: "/maps/world-equirectangular.jpg" },
          },
        ],
      },
      DEFAULT_LAYERS,
    );
    expect(scene.layers.some((l) => l.id === "customStaticOverlay")).toBe(true);
    expect(scene.layers.length).toBeGreaterThan(7);
  });

  it("normalizes baseMap.presentation with defaults and clamps out-of-range values", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        baseMap: {
          id: DEFAULT_EQUIRECT_BASE_MAP_ID,
          visible: true,
          presentation: { brightness: 0.1, contrast: 10, gamma: 0, saturation: 99 } as never,
        },
        layers: [],
      },
      DEFAULT_LAYERS,
    );
    expect(scene.baseMap.presentation?.brightness).toBe(0.5);
    expect(scene.baseMap.presentation?.contrast).toBe(2);
    expect(scene.baseMap.presentation?.gamma).toBe(0.5);
    expect(scene.baseMap.presentation?.saturation).toBe(2);
    expect(scene.baseMap.presentationByMapId?.[DEFAULT_EQUIRECT_BASE_MAP_ID]).toEqual({
      brightness: 0.5,
      contrast: 2,
      gamma: 0.5,
      saturation: 2,
    });
  });

  it("migrates legacy baseMap.presentation into presentationByMapId for the active id", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        baseMap: {
          id: "equirect-world-blue-marble-t-v1",
          visible: true,
          presentation: { brightness: 1.3, contrast: 1, gamma: 1.1, saturation: 0.9 },
        },
        layers: [],
      },
      DEFAULT_LAYERS,
    );
    expect(scene.baseMap.presentationByMapId?.["equirect-world-blue-marble-t-v1"]).toEqual({
      brightness: 1.3,
      contrast: 1,
      gamma: 1.1,
      saturation: 0.9,
    });
    expect(scene.baseMap.presentation?.gamma).toBe(1.1);
  });

  it("month-aware family id is persisted; presentation is under baseMap only (no URL fields on baseMap)", () => {
    const v2 = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: {
          id: "equirect-world-blue-marble-t-v1",
          visible: true,
          opacity: 1,
          presentation: { brightness: 1.25, contrast: 1, gamma: 1.1, saturation: 1.05 },
        },
        layers: [],
        illumination: { moonlight: { mode: "illustrative" } },
      } as unknown as LibrationConfigV2["scene"],
    });
    expect(v2.scene?.baseMap.id).toBe("equirect-world-blue-marble-t-v1");
    expect(v2.scene?.baseMap.presentation?.gamma).toBe(1.1);
    expect(v2.scene?.baseMap.presentationByMapId?.["equirect-world-blue-marble-t-v1"]?.gamma).toBe(1.1);
    expect(v2.scene?.baseMap).not.toHaveProperty("src");
  });

  it("defaults only: normalized scene matches buildDefault with respect to base map display", () => {
    const def = buildDefaultSceneConfigFromLayerFlags(DEFAULT_LAYERS);
    const norm = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        baseMap: { id: def.baseMap.id, visible: def.baseMap.visible, opacity: 1 },
        layers: def.layers,
      },
      DEFAULT_LAYERS,
    );
    expect(norm.baseMap.presentation).toEqual(def.baseMap.presentation);
  });
});
