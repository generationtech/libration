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
  DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
  DEFAULT_EQUIRECT_BASE_MAP_ID,
  DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
  DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE,
  EQUIRECT_BASE_MAP_OPTIONS,
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
  applyLayerEnableFlagsToScene,
  applyLunarGroundTrackColorToScene,
  applyLunarLocusStrokeToScene,
  applySolarAnalemmaStrokeToScene,
  applyIssOrbitalPresentationToScene,
  issOrbitalPresentationFromScene,
  applyPlanetaryObjectsPresentationToScene,
  planetaryObjectsPresentationFromScene,
  applyMilkyWayPresentationToScene,
  milkyWayPresentationFromScene,
  applyLunarEclipsePresentationToScene,
  applySolarEclipsePresentationToScene,
  applyReferenceCityEclipsePresentationToScene,
  applyEclipseAlignmentPresentationToScene,
  applyEclipseInfoPresentationToScene,
  applySublunarMarkerAppearanceToScene,
  getEquirectBaseMapOptionForId,
  normalizeSceneConfig,
  resolveEquirectBaseMapAsset,
  resolveEquirectBaseMapImageSrc,
  sortSceneLayersForRender,
  SUPPORTED_EQUIRECT_BASE_MAP_IDS,
} from "./sceneConfig";
import { normalizeSolarEclipsePresentation } from "../../core/eclipse/solarEclipseAppearance";
import { DEFAULT_ISS_ORBITAL_PRESENTATION } from "../../core/issOrbitalPresentation";

const DEFAULT_LAYERS: LayerEnableFlags = {
  baseMap: true,
  solarShading: true,
  grid: true,
  staticEquirectOverlay: true,
  globalCloudsIr: false,
  earthquakes: false,
  orbitalTracks: false,
  planetaryObjects: false,
  milkyWay: false,
  cityPins: true,
  subsolarMarker: true,
  sublunarMarker: true,
  lunarGroundTrack: true,
  lunarLocus: true,
  solarEclipse: false,
  lunarEclipse: false,
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
    expect(v2.scene?.illumination.moonlight.mode).toBe(DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE);
    expect(v2.scene?.illumination.emissiveNightLights.mode).toBe(
      DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
    );
    expect(v2.scene?.illumination.emissiveNightLights.assetId).toBe(
      DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID,
    );
    expect(v2.scene?.illumination.emissiveNightLights.presentation).toEqual({
      ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
    });
    expect(v2.scene?.overlayReadability.presentation).toEqual({
      readabilityVeilScale01: 1,
      overlayLiftMultiplier01: 1,
    });
    expect(v2.scene?.overlayReadability.perLayer).toBeUndefined();
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
    expect(v2.scene?.layers).toHaveLength(16);
    expect(v2.scene?.layers.some((l) => l.id === "lunarEclipse")).toBe(true);
    expect(v2.scene?.layers.some((l) => l.id === "planetaryObjects")).toBe(true);
    expect(v2.scene?.layers.some((l) => l.id === "milkyWay")).toBe(true);
    expect(v2.scene?.illumination.moonlight.mode).toBe("illustrative");
    expect(v2.scene?.illumination.emissiveNightLights.mode).toBe(
      DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
    );
    expect(v2.scene?.illumination.emissiveNightLights.assetId).toBe(
      DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID,
    );
    expect(v2.scene?.illumination.emissiveNightLights.presentation).toEqual({
      ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
    });
  });

  it("greenfield scene defaults moonlight and emissive night lights to illustrative", () => {
    const s = buildDefaultSceneConfigFromLayerFlags(DEFAULT_LAYERS);
    expect(s.illumination.moonlight.mode).toBe(DEFAULT_SCENE_MOONLIGHT_PRESENTATION_MODE);
    expect(s.illumination.emissiveNightLights.mode).toBe(
      DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
    );
    expect(s.illumination.emissiveNightLights.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
    expect(s.illumination.emissiveNightLights.presentation).toEqual({
      ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
    });
    expect(s.overlayReadability.presentation).toEqual({
      readabilityVeilScale01: 1,
      overlayLiftMultiplier01: 1,
    });
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
    expect(ok.illumination.emissiveNightLights.mode).toBe(
      DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
    );
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
    expect(bad.illumination.emissiveNightLights.mode).toBe(
      DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
    );
  });

  it("normalizes cloudParticipation Model A subtree (defaults off; clamps; rejects URLs)", () => {
    const green = buildDefaultSceneConfigFromLayerFlags(DEFAULT_LAYERS);
    expect(green.illumination.cloudParticipation.mode).toBe("off");
    expect(green.illumination.cloudParticipation.sourceId).toBe("global-clouds-ir-v1");
    expect(green.illumination.cloudParticipation.presentation.intensity).toBe(1);

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
          cloudParticipation: {
            mode: "enhanced",
            sourceId: "global-clouds-ir-v1",
            presentation: { intensity: 1.5 },
          },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(ok.illumination.cloudParticipation.mode).toBe("enhanced");
    expect(ok.illumination.cloudParticipation.presentation.intensity).toBe(1.5);

    const clamped = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        illumination: {
          cloudParticipation: {
            mode: "natural",
            sourceId: "https://cdn.example/clouds.jpg",
            presentation: { intensity: 99 },
          },
        },
      } as unknown as Parameters<typeof normalizeSceneConfig>[0],
      DEFAULT_LAYERS,
    );
    expect(clamped.illumination.cloudParticipation.sourceId).toBe("global-clouds-ir-v1");
    expect(clamped.illumination.cloudParticipation.presentation.intensity).toBe(2);

    const missing = normalizeSceneConfig(
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
    expect(missing.illumination.cloudParticipation.mode).toBe("off");
  });

  it("normalizes overlay readability presentation and clamps out-of-range values", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        overlayReadability: {
          presentation: { readabilityVeilScale01: 99, overlayLiftMultiplier01: -1 },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(scene.overlayReadability.presentation.readabilityVeilScale01).toBe(1.5);
    expect(scene.overlayReadability.presentation.overlayLiftMultiplier01).toBe(0.65);
  });

  it("normalizes overlay readability per-layer grid pilot and clamps values", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        overlayReadability: {
          presentation: { readabilityVeilScale01: 1, overlayLiftMultiplier01: 1 },
          perLayer: {
            grid: { readabilityVeilScale01: 9, overlayLiftMultiplier01: 0 },
          },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(scene.overlayReadability.perLayer?.grid?.readabilityVeilScale01).toBe(1.5);
    expect(scene.overlayReadability.perLayer?.grid?.overlayLiftMultiplier01).toBe(0.65);
  });

  it("drops identity-only per-layer grid overlay readability after normalize", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        overlayReadability: {
          presentation: { readabilityVeilScale01: 1, overlayLiftMultiplier01: 1 },
          perLayer: { grid: { readabilityVeilScale01: 1, overlayLiftMultiplier01: 1 } },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(scene.overlayReadability.perLayer).toBeUndefined();
  });

  it("normalizes overlay readability per-layer solarAnalemma pilot and clamps values", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        overlayReadability: {
          presentation: { readabilityVeilScale01: 1, overlayLiftMultiplier01: 1 },
          perLayer: {
            solarAnalemma: { readabilityVeilScale01: 9, overlayLiftMultiplier01: 0 },
          },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(scene.overlayReadability.perLayer?.solarAnalemma?.readabilityVeilScale01).toBe(1.5);
    expect(scene.overlayReadability.perLayer?.solarAnalemma?.overlayLiftMultiplier01).toBe(0.65);
  });

  it("retains non-identity grid pilot when solarAnalemma pilot is identity-only", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        overlayReadability: {
          presentation: { readabilityVeilScale01: 1, overlayLiftMultiplier01: 1 },
          perLayer: {
            grid: { readabilityVeilScale01: 0.5, overlayLiftMultiplier01: 1 },
            solarAnalemma: { readabilityVeilScale01: 1, overlayLiftMultiplier01: 1 },
          },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(scene.overlayReadability.perLayer?.grid?.readabilityVeilScale01).toBe(0.5);
    expect(scene.overlayReadability.perLayer?.solarAnalemma).toBeUndefined();
  });

  it("drops identity-only subsolarMarker pilot while retaining non-identity grid pilot", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        overlayReadability: {
          presentation: { readabilityVeilScale01: 1, overlayLiftMultiplier01: 1 },
          perLayer: {
            grid: { readabilityVeilScale01: 0.5, overlayLiftMultiplier01: 1 },
            subsolarMarker: { readabilityVeilScale01: 1, overlayLiftMultiplier01: 1 },
          },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(scene.overlayReadability.perLayer?.grid?.readabilityVeilScale01).toBe(0.5);
    expect(scene.overlayReadability.perLayer?.subsolarMarker).toBeUndefined();
  });

  it("normalizes overlay readability per-layer cityPins pilot and clamps values", () => {
    const scene = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        overlayReadability: {
          presentation: { readabilityVeilScale01: 1, overlayLiftMultiplier01: 1 },
          perLayer: {
            cityPins: { readabilityVeilScale01: -1, overlayLiftMultiplier01: 9 },
          },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(scene.overlayReadability.perLayer?.cityPins?.readabilityVeilScale01).toBe(0);
    expect(scene.overlayReadability.perLayer?.cityPins?.overlayLiftMultiplier01).toBe(1.35);
  });

  it("normalizes emissive night lights mode and rejects unknown to illustrative", () => {
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
    expect(ok.illumination.emissiveNightLights.presentation).toEqual({
      ...DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION,
    });
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
    expect(bad.illumination.emissiveNightLights.mode).toBe(
      DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
    );
    expect(bad.illumination.emissiveNightLights.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
  });

  it("preserves explicit emissive modes off, natural, and enhanced through normalization", () => {
    for (const mode of ["off", "natural", "enhanced"] as const) {
      const s = normalizeSceneConfig(
        {
          version: 1,
          projectionId: "equirectangular",
          viewMode: "fullWorldFixed",
          orderingMode: "user",
          baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
          layers: [],
          illumination: {
            moonlight: { mode: "natural" },
            emissiveNightLights: { mode, assetId: "equirect-world-night-lights-viirs-v1" },
          },
        },
        DEFAULT_LAYERS,
      );
      expect(s.illumination.emissiveNightLights.mode).toBe(mode);
    }
  });

  it("normalizes unknown emissive asset ids to the catalog default", () => {
    const s = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        illumination: {
          moonlight: { mode: "natural" },
          emissiveNightLights: { mode: "natural", assetId: "unknown-emissive-family" },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(s.illumination.emissiveNightLights.assetId).toBe(DEFAULT_EMISSIVE_NIGHT_LIGHTS_ASSET_ID);
  });

  it("normalizes emissive presentation defaults and clamps out-of-range values", () => {
    const clamped = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        illumination: {
          moonlight: { mode: "natural" },
          emissiveNightLights: {
            mode: "natural",
            assetId: "equirect-world-night-lights-viirs-v1",
            presentation: { intensity: 99, driverExponent: 0.05 },
          },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(clamped.illumination.emissiveNightLights.presentation.intensity).toBe(4);
    expect(clamped.illumination.emissiveNightLights.presentation.driverExponent).toBe(0.35);

    const missingFields = normalizeSceneConfig(
      {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        orderingMode: "user",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
        illumination: {
          moonlight: { mode: "natural" },
          emissiveNightLights: {
            mode: "enhanced",
            assetId: "equirect-world-night-lights-viirs-v1",
            presentation: { intensity: 2 },
          },
        },
      },
      DEFAULT_LAYERS,
    );
    expect(missingFields.illumination.emissiveNightLights.presentation.intensity).toBe(2);
    expect(missingFields.illumination.emissiveNightLights.presentation.driverExponent).toBe(
      DEFAULT_EMISSIVE_NIGHT_LIGHTS_PRESENTATION.driverExponent,
    );
  });

  it("base map registry exposes multiple supported ids", () => {
    expect(SUPPORTED_EQUIRECT_BASE_MAP_IDS).toEqual([
      "equirect-world-legacy-v1",
      "equirect-world-political-v1",
      "equirect-world-geology-v1",
      "equirect-world-topography-ne-v1",
      "equirect-world-bathymetry-etopo-v1",
      "equirect-world-landcover-modis-v1",
      "equirect-world-climate-koppen-beck-v1",
      "equirect-world-population-gpw-v1",
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
    expect(resolveEquirectBaseMapImageSrc("equirect-world-topography-ne-v1")).toBe(
      "/maps/world-equirectangular-topography.jpg",
    );
    expect(resolveEquirectBaseMapImageSrc("equirect-world-bathymetry-etopo-v1")).toBe(
      "/maps/world-equirectangular-bathymetry.jpg",
    );
    expect(resolveEquirectBaseMapImageSrc("equirect-world-landcover-modis-v1")).toBe(
      "/maps/world-equirectangular-landcover.jpg",
    );
    expect(resolveEquirectBaseMapImageSrc("equirect-world-climate-koppen-beck-v1")).toBe(
      "/maps/world-equirectangular-climate.jpg",
    );
    expect(resolveEquirectBaseMapImageSrc("equirect-world-population-gpw-v1")).toBe(
      "/maps/world-equirectangular-population.jpg",
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

  it("legacy reference base map exposes bundled preview thumbnail in options", () => {
    const o = getEquirectBaseMapOptionForId("equirect-world-legacy-v1");
    expect(o.previewThumbnailSrc).toBe("/maps/previews/world-equirectangular-thumb.jpg");
  });

  it("political base map is shipped as non-transitional in registry and options", () => {
    const asset = resolveEquirectBaseMapAsset("equirect-world-political-v1");
    expect(asset.transitionalPlaceholder).toBeUndefined();
    const o = getEquirectBaseMapOptionForId("equirect-world-political-v1");
    expect(o.transitionalPlaceholder).toBeUndefined();
    expect(o.previewThumbnailSrc).toBe("/maps/previews/world-equirectangular-political-thumb.jpg");
    expect(o.attribution).toBe("Natural Earth (public domain)");
    expect(o.licenseNote).toMatch(/public domain/i);
    expect(o.sourceLinks?.[0]?.href).toBe("https://www.naturalearthdata.com/");
  });

  it("geology base map is shipped as non-transitional in registry and options", () => {
    const id = "equirect-world-geology-v1" as const;
    const asset = resolveEquirectBaseMapAsset(id);
    expect(asset.transitionalPlaceholder).toBeUndefined();
    const o = getEquirectBaseMapOptionForId(id);
    expect(o.transitionalPlaceholder).toBeUndefined();
    expect(o.previewThumbnailSrc).toBe("/maps/previews/world-equirectangular-geology-thumb.jpg");
  });

  it("Natural Earth static topography family is canonical, not transitional, and not a legacy alias target", () => {
    const asset = resolveEquirectBaseMapAsset("equirect-world-topography-ne-v1");
    expect(asset.id).toBe("equirect-world-topography-ne-v1");
    expect(asset.transitionalPlaceholder).toBeUndefined();
    expect(resolveEquirectBaseMapImageSrc("equirect-world-topography-ne-v1")).toBe(
      "/maps/world-equirectangular-topography.jpg",
    );
    const o = getEquirectBaseMapOptionForId("equirect-world-topography-ne-v1");
    expect(o.label).toBe("World topography (Natural Earth)");
    expect(o.transitionalPlaceholder).toBeUndefined();
    expect(o.previewThumbnailSrc).toBe("/maps/previews/world-equirectangular-topography-thumb.jpg");
  });

  it("ETOPO bathymetry base map is shipped as non-transitional in registry and options", () => {
    const id = "equirect-world-bathymetry-etopo-v1" as const;
    const asset = resolveEquirectBaseMapAsset(id);
    expect(asset.transitionalPlaceholder).toBeUndefined();
    expect(resolveEquirectBaseMapImageSrc(id)).toBe("/maps/world-equirectangular-bathymetry.jpg");
    const o = getEquirectBaseMapOptionForId(id);
    expect(o.transitionalPlaceholder).toBeUndefined();
    expect(o.previewThumbnailSrc).toBe("/maps/previews/world-equirectangular-bathymetry-thumb.jpg");
    expect(o.attribution).toMatch(/NOAA NCEI ETOPO 2022/i);
    expect(o.licenseNote).toMatch(/not for navigation/i);
  });

  it("MODIS IGBP land cover base map is shipped as non-transitional in registry and options", () => {
    const id = "equirect-world-landcover-modis-v1" as const;
    const asset = resolveEquirectBaseMapAsset(id);
    expect(asset.transitionalPlaceholder).toBeUndefined();
    expect(resolveEquirectBaseMapImageSrc(id)).toBe("/maps/world-equirectangular-landcover.jpg");
    const o = getEquirectBaseMapOptionForId(id);
    expect(o.transitionalPlaceholder).toBeUndefined();
    expect(o.previewThumbnailSrc).toBe("/maps/previews/world-equirectangular-landcover-thumb.jpg");
    expect(o.attribution).toMatch(/NASA MODIS/i);
    expect(o.sourceLinks?.[0]?.href).toMatch(/^https:\/\//);
  });

  it("GPW population density base map is shipped as non-transitional in registry and options", () => {
    const id = "equirect-world-population-gpw-v1" as const;
    const asset = resolveEquirectBaseMapAsset(id);
    expect(asset.transitionalPlaceholder).toBeUndefined();
    expect(resolveEquirectBaseMapImageSrc(id)).toBe("/maps/world-equirectangular-population.jpg");
    const o = getEquirectBaseMapOptionForId(id);
    expect(o.transitionalPlaceholder).toBeUndefined();
    expect(o.previewThumbnailSrc).toBe("/maps/previews/world-equirectangular-population-thumb.jpg");
    expect(o.attribution).toMatch(/SEDAC GPWv4/i);
    expect(o.licenseNote).toMatch(/CC BY 4\.0/i);
    expect(o.sourceLinks?.[0]?.href).toMatch(/^https:\/\//);
  });

  it("Köppen–Geiger climate normals base map is shipped as non-transitional in registry and options", () => {
    const id = "equirect-world-climate-koppen-beck-v1" as const;
    const asset = resolveEquirectBaseMapAsset(id);
    expect(asset.transitionalPlaceholder).toBeUndefined();
    expect(resolveEquirectBaseMapImageSrc(id)).toBe("/maps/world-equirectangular-climate.jpg");
    const o = getEquirectBaseMapOptionForId(id);
    expect(o.transitionalPlaceholder).toBeUndefined();
    expect(o.previewThumbnailSrc).toBe("/maps/previews/world-equirectangular-climate-thumb.jpg");
    expect(o.attribution).toMatch(/Beck et al/i);
    expect(o.licenseNote).toMatch(/CC BY 4\.0/i);
    expect(o.sourceLinks?.[0]?.href).toMatch(/^https:\/\//);
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

  it("inserts lunarGroundTrack off with 24 h extents when the stack row is missing", () => {
    const v2 = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: { ...DEFAULT_APP_CONFIG.layers },
      scene: {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
      } as unknown as LibrationConfigV2["scene"],
    } as LibrationConfigV2);
    const row = v2.scene?.layers.find((l) => l.id === "lunarGroundTrack");
    expect(row).toBeDefined();
    expect(row?.enabled).toBe(false);
    expect(row?.source.kind === "derived" && row.source.product).toBe("sublunarGroundTrack");
    expect(row?.source.kind === "derived" ? row.source.parameters?.pastHours : undefined).toBe(24);
    expect(row?.source.kind === "derived" ? row.source.parameters?.futureHours : undefined).toBe(24);
    expect(row?.source.kind === "derived" ? row.source.parameters?.pastColor : undefined).toBe("#aacdf0");
    expect(row?.source.kind === "derived" ? row.source.parameters?.futureColor : undefined).toBe("#aacdf0");
    expect(v2.layers.lunarGroundTrack).toBe(false);
  });

  it("inserts lunarLocus off when the stack row is missing", () => {
    const v2 = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: { ...DEFAULT_APP_CONFIG.layers },
      scene: {
        version: 1,
        projectionId: "equirectangular",
        viewMode: "fullWorldFixed",
        baseMap: { id: DEFAULT_EQUIRECT_BASE_MAP_ID, visible: true },
        layers: [],
      } as unknown as LibrationConfigV2["scene"],
    } as LibrationConfigV2);
    const row = v2.scene?.layers.find((l) => l.id === "lunarLocus");
    expect(row).toBeDefined();
    expect(row?.enabled).toBe(false);
    expect(row?.source.kind === "derived" && row.source.product).toBe("sublunarLocus");
    expect(v2.layers.lunarLocus).toBe(false);
  });

  it("normalizes a missing lunarLocus layer flag to off", () => {
    expect(DEFAULT_APP_CONFIG.layers.lunarLocus).toBe(false);
    const { lunarLocus: _drop, ...legacyLayers } = DEFAULT_APP_CONFIG.layers;
    const v2 = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: legacyLayers,
    } as LibrationConfigV2);
    expect(v2.layers.lunarLocus).toBe(false);
  });

  it("keeps lunarLocus independent of the Moon marker and lunar ground track", () => {
    const enabled = {
      ...DEFAULT_APP_CONFIG.layers,
      sublunarMarker: false,
      lunarGroundTrack: true,
      lunarLocus: true,
      solarEclipse: false,
      lunarEclipse: false,
      solarAnalemma: false,
    };
    const v2 = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: enabled,
      scene: buildDefaultSceneConfigFromLayerFlags(enabled),
    });
    expect(v2.layers.sublunarMarker).toBe(false);
    expect(v2.layers.lunarGroundTrack).toBe(true);
    expect(v2.layers.lunarLocus).toBe(true);
    expect(v2.layers.solarAnalemma).toBe(false);
    const round = normalizeLibrationConfig(v2);
    expect(round.layers.lunarLocus).toBe(true);
    expect(round.layers.sublunarMarker).toBe(false);
    expect(round.layers.lunarGroundTrack).toBe(true);
  });

  it("clamps invalid lunar ground track extents and round-trips valid ones", () => {
    const enabled = {
      ...DEFAULT_APP_CONFIG.layers,
      lunarGroundTrack: true,
    };
    const v2 = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: enabled,
      scene: {
        ...buildDefaultSceneConfigFromLayerFlags(enabled),
        layers: buildDefaultSceneConfigFromLayerFlags(enabled).layers.map((row) =>
          row.id === "lunarGroundTrack" && row.source.kind === "derived"
            ? {
                ...row,
                enabled: true,
                source: {
                  ...row.source,
                  parameters: { pastHours: 13, futureHours: 48 },
                },
              }
            : row,
        ),
      },
    });
    const row = v2.scene?.layers.find((l) => l.id === "lunarGroundTrack");
    expect(row?.enabled).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.parameters?.pastHours : undefined).toBe(24);
    expect(row?.source.kind === "derived" ? row.source.parameters?.futureHours : undefined).toBe(48);
    expect(v2.layers.lunarGroundTrack).toBe(true);
    const round = normalizeLibrationConfig(v2);
    const row2 = round.scene?.layers.find((l) => l.id === "lunarGroundTrack");
    expect(row2?.source.kind === "derived" ? row2.source.parameters?.futureHours : undefined).toBe(48);
  });

  it("canonicalizes lunar ground track stroke colors and round-trips them", () => {
    const enabled = {
      ...DEFAULT_APP_CONFIG.layers,
      lunarGroundTrack: true,
    };
    const v2 = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: enabled,
      scene: {
        ...buildDefaultSceneConfigFromLayerFlags(enabled),
        layers: buildDefaultSceneConfigFromLayerFlags(enabled).layers.map((row) =>
          row.id === "lunarGroundTrack" && row.source.kind === "derived"
            ? {
                ...row,
                enabled: true,
                source: {
                  ...row.source,
                  parameters: {
                    pastHours: 24,
                    futureHours: 24,
                    pastColor: "not-a-color",
                    futureColor: "#F00",
                  },
                },
              }
            : row,
        ),
      },
    });
    const row = v2.scene?.layers.find((l) => l.id === "lunarGroundTrack");
    expect(row?.source.kind === "derived" ? row.source.parameters?.pastColor : undefined).toBe("#aacdf0");
    expect(row?.source.kind === "derived" ? row.source.parameters?.futureColor : undefined).toBe("#ff0000");
    const painted = {
      ...v2,
      scene: applyLunarGroundTrackColorToScene(v2.scene!, "pastColor", "#00ff00"),
    };
    const paintedRow = painted.scene?.layers.find((l) => l.id === "lunarGroundTrack");
    expect(paintedRow?.source.kind === "derived" ? paintedRow.source.parameters?.pastColor : undefined).toBe(
      "#00ff00",
    );
    expect(paintedRow?.source.kind === "derived" ? paintedRow.source.parameters?.futureColor : undefined).toBe(
      "#ff0000",
    );
  });

  it("fills Moon libration appearance defaults on old sublunarPoint rows", () => {
    const v2 = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers),
        layers: buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers).layers.map((row) =>
          row.id === "sublunarMarker" && row.source.kind === "derived"
            ? { ...row, source: { kind: "derived", product: "sublunarPoint" } }
            : row,
        ),
      },
    });
    const row = v2.scene?.layers.find((l) => l.id === "sublunarMarker");
    expect(row?.source.kind === "derived" ? row.source.parameters?.size : undefined).toBe("normal");
    expect(row?.source.kind === "derived" ? row.source.parameters?.librationEnabled : undefined).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.parameters?.librationStyle : undefined).toBe("ring");
    expect(row?.source.kind === "derived" ? row.source.parameters?.librationColor : undefined).toBe("#c5d4e8");
    expect(row?.source.kind === "derived" ? row.source.parameters?.librationThickness : undefined).toBe(
      "normal",
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.librationMotionScale : undefined).toBe(
      "normal",
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.librationOrientation : undefined).toBe(
      "observer",
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.librationUseReferenceCity : undefined).toBe(
      true,
    );
  });

  it("round-trips Moon appearance and keeps locus/analemma styles independent", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const painted = {
      ...base,
      scene: applySolarAnalemmaStrokeToScene(
        applyLunarLocusStrokeToScene(
          applySublunarMarkerAppearanceToScene(base.scene!, {
            size: "large",
            librationColor: "#aabbcc",
            librationStyle: "crosshair",
          }),
          { strokeColor: "#112233", strokeThickness: "thick" },
        ),
        { strokeColor: "#ff00aa", strokeThickness: "thin" },
      ),
    };
    const round = normalizeLibrationConfig(painted);
    const moon = round.scene?.layers.find((l) => l.id === "sublunarMarker");
    const locus = round.scene?.layers.find((l) => l.id === "lunarLocus");
    const analemma = round.scene?.layers.find((l) => l.id === "solarAnalemma");
    expect(moon?.source.kind === "derived" ? moon.source.parameters?.size : undefined).toBe("large");
    expect(moon?.source.kind === "derived" ? moon.source.parameters?.librationStyle : undefined).toBe(
      "crosshair",
    );
    expect(moon?.source.kind === "derived" ? moon.source.parameters?.librationColor : undefined).toBe(
      "#aabbcc",
    );
    expect(moon?.source.kind === "derived" ? moon.source.parameters?.librationOrientation : undefined).toBe(
      "observer",
    );
    expect(
      moon?.source.kind === "derived" ? moon.source.parameters?.librationUseReferenceCity : undefined,
    ).toBe(true);
    expect(locus?.source.kind === "derived" ? locus.source.parameters?.strokeColor : undefined).toBe(
      "#112233",
    );
    expect(locus?.source.kind === "derived" ? locus.source.parameters?.strokeThickness : undefined).toBe(
      "thick",
    );
    expect(analemma?.source.kind === "derived" ? analemma.source.parameters?.strokeColor : undefined).toBe(
      "#ff00aa",
    );
    expect(analemma?.source.kind === "derived" ? analemma.source.parameters?.strokeThickness : undefined).toBe(
      "thin",
    );
    const moonOnly = applySublunarMarkerAppearanceToScene(round.scene!, { librationColor: "#00ff00" });
    const locusAfterMoon = moonOnly.layers.find((l) => l.id === "lunarLocus");
    const analemmaAfterMoon = moonOnly.layers.find((l) => l.id === "solarAnalemma");
    expect(locusAfterMoon?.source.kind === "derived" ? locusAfterMoon.source.parameters?.strokeColor : undefined).toBe(
      "#112233",
    );
    expect(
      analemmaAfterMoon?.source.kind === "derived" ? analemmaAfterMoon.source.parameters?.strokeColor : undefined,
    ).toBe("#ff00aa");
  });

  it("defaults missing lunar locus and solar analemma stroke fields to current production styles", () => {
    const v2 = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers),
        layers: buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers).layers.map((row) => {
          if (row.id === "lunarLocus" && row.source.kind === "derived") {
            return { ...row, source: { kind: "derived", product: "sublunarLocus" } };
          }
          if (row.id === "solarAnalemma" && row.source.kind === "derived") {
            return { ...row, source: { kind: "derived", product: "solarAnalemmaGroundTrack" } };
          }
          return row;
        }),
      },
    });
    const locus = v2.scene?.layers.find((l) => l.id === "lunarLocus");
    const analemma = v2.scene?.layers.find((l) => l.id === "solarAnalemma");
    expect(locus?.source.kind === "derived" ? locus.source.parameters?.strokeColor : undefined).toBe(
      "#1c2638",
    );
    expect(locus?.source.kind === "derived" ? locus.source.parameters?.strokeThickness : undefined).toBe(
      "normal",
    );
    expect(analemma?.source.kind === "derived" ? analemma.source.parameters?.strokeColor : undefined).toBe(
      "#ffc878",
    );
    expect(analemma?.source.kind === "derived" ? analemma.source.parameters?.strokeThickness : undefined).toBe(
      "normal",
    );
  });
});

describe("solar eclipse scene presentation", () => {
  it("defaults the layer on with live and forecast presentation on and a 7-day horizon", () => {
    const v2 = defaultLibrationConfigV2();
    expect(v2.layers.solarEclipse).toBe(true);
    const row = v2.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(row?.enabled).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.product : undefined).toBe(
      "solarEclipseLiveFootprint",
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.showCentralLine : undefined).toBe(
      true,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.showCentralBand : undefined).toBe(
      true,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.showPartialRegion : undefined).toBe(
      true,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.showForecastCorridor : undefined).toBe(
      true,
    );
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.showForecastPartialRegion : undefined,
    ).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.parameters?.forecastHorizonDays : undefined).toBe(
      7,
    );
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.showLiveGroundPosition : undefined,
    ).toBe(true);
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.liveGroundPositionSize : undefined,
    ).toBe("normal");
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.liveGroundPositionColor : undefined,
    ).toBe("#d45a3c");
  });

  it("persists independent presentation toggles", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const painted = {
      ...base,
      layers: { ...base.layers, solarEclipse: true },
      scene: applySolarEclipsePresentationToScene(
        applyLayerEnableFlagsToScene(base.scene!, { ...base.layers, solarEclipse: true }),
        { showCentralLine: false, showCentralBand: true, showPartialRegion: false, forecastHorizonDays: 30, showForecastCorridor: false },
      ),
    };
    const round = normalizeLibrationConfig(painted);
    expect(round.layers.solarEclipse).toBe(true);
    const row = round.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(row?.enabled).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.parameters?.showCentralLine : undefined).toBe(
      false,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.showCentralBand : undefined).toBe(
      true,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.showPartialRegion : undefined).toBe(
      false,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.forecastHorizonDays : undefined).toBe(
      30,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.showForecastCorridor : undefined).toBe(
      false,
    );
  });

  it("normalizes a missing solarEclipse layer flag to on and preserves explicit off", () => {
    const { solarEclipse: _drop, ...legacyLayers } = DEFAULT_APP_CONFIG.layers;
    const missing = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: legacyLayers,
    } as LibrationConfigV2);
    expect(missing.layers.solarEclipse).toBe(true);
    const explicitOff = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: { ...DEFAULT_APP_CONFIG.layers, solarEclipse: false },
      scene: applyLayerEnableFlagsToScene(defaultLibrationConfigV2().scene!, {
        ...DEFAULT_APP_CONFIG.layers,
        solarEclipse: false,
      }),
    });
    expect(explicitOff.layers.solarEclipse).toBe(false);
  });

  it("normalizes a missing forecast horizon to 7 days and snaps unknown values", () => {
    const base = defaultLibrationConfigV2();
    const stripped = {
      ...base,
      scene: {
        ...base.scene!,
        layers: base.scene!.layers.map((l) => {
          if (l.id !== "solarEclipse" || l.source.kind !== "derived") {
            return l;
          }
          const {
            forecastHorizonDays: _drop,
            showForecastCorridor: _c,
            showForecastPartialRegion: _p,
            ...parameters
          } = l.source.parameters ?? {};
          return { ...l, source: { ...l.source, parameters } };
        }),
      },
    };
    const v2 = normalizeLibrationConfig(stripped);
    const next = v2.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(next?.source.kind === "derived" ? next.source.parameters?.forecastHorizonDays : undefined).toBe(
      7,
    );
    expect(next?.source.kind === "derived" ? next.source.parameters?.showForecastCorridor : undefined).toBe(
      true,
    );
    const snapped = normalizeLibrationConfig({
      ...base,
      scene: applySolarEclipsePresentationToScene(base.scene!, { forecastHorizonDays: 12 }),
    });
    const snappedRow = snapped.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(
      snappedRow?.source.kind === "derived" ? snappedRow.source.parameters?.forecastHorizonDays : undefined,
    ).toBe(14);
  });

  it("normalizes a missing live ground-position marker to on / normal / default color", () => {
    const base = defaultLibrationConfigV2();
    const stripped = {
      ...base,
      scene: {
        ...base.scene!,
        layers: base.scene!.layers.map((l) => {
          if (l.id !== "solarEclipse" || l.source.kind !== "derived") {
            return l;
          }
          const {
            showLiveGroundPosition: _g,
            liveGroundPositionColor: _c,
            liveGroundPositionSize: _s,
            ...parameters
          } = l.source.parameters ?? {};
          return { ...l, source: { ...l.source, parameters } };
        }),
      },
    };
    const v2 = normalizeLibrationConfig(stripped);
    const next = v2.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(next?.source.kind === "derived" ? next.source.parameters?.showLiveGroundPosition : undefined).toBe(
      true,
    );
    expect(next?.source.kind === "derived" ? next.source.parameters?.liveGroundPositionSize : undefined).toBe(
      "normal",
    );
    expect(next?.source.kind === "derived" ? next.source.parameters?.liveGroundPositionColor : undefined).toBe(
      "#d45a3c",
    );
  });

  it("persists live ground-position size, color, and explicit off", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const painted = {
      ...base,
      scene: applySolarEclipsePresentationToScene(base.scene!, {
        showLiveGroundPosition: false,
        liveGroundPositionSize: "large",
        liveGroundPositionColor: "#c94c3c",
      }),
    };
    const round = normalizeLibrationConfig(painted);
    const row = round.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(row?.source.kind === "derived" ? row.source.parameters?.showLiveGroundPosition : undefined).toBe(
      false,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.liveGroundPositionSize : undefined).toBe(
      "large",
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.liveGroundPositionColor : undefined).toBe(
      "#c94c3c",
    );
  });

  it("defaults active eclipse shading on/Normal and persists explicit off and Dramatic", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const solar = base.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(solar?.source.kind === "derived" ? solar.source.parameters?.activeEclipseShadingEnabled : undefined).toBe(
      true,
    );
    expect(
      solar?.source.kind === "derived" ? solar.source.parameters?.activeEclipseShadingIntensity : undefined,
    ).toBe("normal");
    const painted = {
      ...base,
      scene: applySolarEclipsePresentationToScene(base.scene!, {
        activeEclipseShadingEnabled: false,
        activeEclipseShadingIntensity: "dramatic",
      }),
    };
    const round = normalizeLibrationConfig(painted);
    const row = round.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(row?.source.kind === "derived" ? row.source.parameters?.activeEclipseShadingEnabled : undefined).toBe(
      false,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.activeEclipseShadingIntensity : undefined).toBe(
      "dramatic",
    );
    const reset = applySolarEclipsePresentationToScene(round.scene!, normalizeSolarEclipsePresentation(undefined));
    const resetRow = reset.layers.find((l) => l.id === "solarEclipse");
    expect(resetRow?.source.kind === "derived" ? resetRow.source.parameters?.activeEclipseShadingEnabled : undefined).toBe(
      true,
    );
    expect(
      resetRow?.source.kind === "derived" ? resetRow.source.parameters?.activeEclipseShadingIntensity : undefined,
    ).toBe("normal");
  });

  it("restores live ground-position defaults on a full presentation reset", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const custom = applySolarEclipsePresentationToScene(base.scene!, {
      showLiveGroundPosition: false,
      liveGroundPositionSize: "extraLarge",
      liveGroundPositionColor: "#112233",
    });
    const reset = applySolarEclipsePresentationToScene(custom, normalizeSolarEclipsePresentation(undefined));
    const round = normalizeLibrationConfig({ ...base, scene: reset });
    const row = round.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(row?.source.kind === "derived" ? row.source.parameters?.showLiveGroundPosition : undefined).toBe(
      true,
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.liveGroundPositionSize : undefined).toBe(
      "normal",
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.liveGroundPositionColor : undefined).toBe(
      "#d45a3c",
    );
  });
});

describe("lunar eclipse scene presentation", () => {
  it("defaults the layer on with child presentation on and omits deleted Moon-visible keys", () => {
    const v2 = defaultLibrationConfigV2();
    expect(v2.layers.lunarEclipse).toBe(true);
    const row = v2.scene?.layers.find((l) => l.id === "lunarEclipse");
    expect(row?.enabled).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.product : undefined).toBe(
      "lunarEclipseVisibility",
    );
    expect(row?.source.kind === "derived" ? row.source.parameters?.showMoonEclipseShadow : undefined).toBe(
      true,
    );
    expect(
      row?.source.kind === "derived" ? row.source.parameters?.forecastHorizonDays : undefined,
    ).toBe(7);
    expect(
      row?.source.kind === "derived" ? row.source.parameters : undefined,
    ).not.toHaveProperty("showVisibilityRegion");
    expect(
      row?.source.kind === "derived" ? row.source.parameters : undefined,
    ).not.toHaveProperty("showVisibilityBoundary");
    expect(
      row?.source.kind === "derived" ? row.source.parameters : undefined,
    ).not.toHaveProperty("showForecastVisibilityRegion");
    expect(
      row?.source.kind === "derived" ? row.source.parameters : undefined,
    ).not.toHaveProperty("showForecastVisibilityBoundary");
    expect(
      row?.source.kind === "derived" ? row.source.parameters : undefined,
    ).not.toHaveProperty("visibilityRegionColor");
  });

  it("persists independent lunar presentation toggles", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const painted = {
      ...base,
      layers: { ...base.layers, lunarEclipse: true },
      scene: applyLunarEclipsePresentationToScene(
        applyLayerEnableFlagsToScene(base.scene!, { ...base.layers, lunarEclipse: true }),
        { showMoonEclipseShadow: false },
      ),
    };
    const round = normalizeLibrationConfig(painted);
    expect(round.layers.lunarEclipse).toBe(true);
    const row = round.scene?.layers.find((l) => l.id === "lunarEclipse");
    expect(row?.enabled).toBe(true);
    expect(row?.source.kind === "derived" ? row.source.parameters?.showMoonEclipseShadow : undefined).toBe(
      false,
    );
    expect(
      row?.source.kind === "derived" ? row.source.parameters : undefined,
    ).not.toHaveProperty("showVisibilityRegion");
  });

  it("normalizes a missing lunarEclipse layer flag to on and preserves explicit off", () => {
    const { lunarEclipse: _drop, ...legacyLayers } = DEFAULT_APP_CONFIG.layers;
    const missing = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: legacyLayers,
    } as LibrationConfigV2);
    expect(missing.layers.lunarEclipse).toBe(true);
    const explicitOff = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      layers: { ...DEFAULT_APP_CONFIG.layers, lunarEclipse: false },
      scene: applyLayerEnableFlagsToScene(defaultLibrationConfigV2().scene!, {
        ...DEFAULT_APP_CONFIG.layers,
        lunarEclipse: false,
      }),
    });
    expect(explicitOff.layers.lunarEclipse).toBe(false);
  });

  it("normalizes missing lunar forecast keys to the 7-day default and preserves explicit live-only", () => {
    const base = defaultLibrationConfigV2();
    const row = base.scene?.layers.find((l) => l.id === "lunarEclipse");
    const stripped = normalizeLibrationConfig({
      ...base,
      scene: {
        ...base.scene!,
        layers: base.scene!.layers.map((l) => {
          if (l.id !== "lunarEclipse" || l.source.kind !== "derived") {
            return l;
          }
          const { forecastHorizonDays: _h, ...parameters } =
            l.source.parameters ?? {};
          return { ...l, source: { ...l.source, parameters } };
        }),
      },
    });
    const restored = stripped.scene?.layers.find((l) => l.id === "lunarEclipse");
    expect(restored?.source.kind === "derived" ? restored.source.parameters?.forecastHorizonDays : undefined).toBe(
      7,
    );
    const liveOnly = normalizeLibrationConfig({
      ...base,
      scene: applyLunarEclipsePresentationToScene(base.scene!, { forecastHorizonDays: 0 }),
    });
    const liveRow = liveOnly.scene?.layers.find((l) => l.id === "lunarEclipse");
    expect(liveRow?.source.kind === "derived" ? liveRow.source.parameters?.forecastHorizonDays : undefined).toBe(
      0,
    );
    void row;
  });

  it("accepts legacy Moon-visible keys on load and omits them from normalized output", () => {
    const base = defaultLibrationConfigV2();
    const withLegacy = (
      region: boolean | undefined,
      forecastRegion: boolean | undefined,
      boundary: boolean | undefined,
      forecastBoundary: boolean | undefined,
    ) =>
      normalizeLibrationConfig({
        ...base,
        scene: {
          ...base.scene!,
          layers: base.scene!.layers.map((l) => {
            if (l.id !== "lunarEclipse" || l.source.kind !== "derived") {
              return l;
            }
            const {
              showVisibilityRegion: _region,
              showVisibilityBoundary: _boundary,
              showForecastVisibilityRegion: _forecastRegion,
              showForecastVisibilityBoundary: _forecastBoundary,
              ...rest
            } = l.source.parameters ?? {};
            return {
              ...l,
              source: {
                ...l.source,
                parameters: {
                  ...rest,
                  ...(region === undefined ? {} : { showVisibilityRegion: region }),
                  ...(forecastRegion === undefined
                    ? {}
                    : { showForecastVisibilityRegion: forecastRegion }),
                  ...(boundary === undefined ? {} : { showVisibilityBoundary: boundary }),
                  ...(forecastBoundary === undefined
                    ? {}
                    : { showForecastVisibilityBoundary: forecastBoundary }),
                },
              },
            };
          }),
        },
      });
    const paramsOf = (v2: ReturnType<typeof normalizeLibrationConfig>) => {
      const row = v2.scene?.layers.find((l) => l.id === "lunarEclipse");
      return row?.source.kind === "derived" ? row.source.parameters : undefined;
    };
    const mixed = paramsOf(withLegacy(false, true, true, false));
    expect(mixed).not.toHaveProperty("showVisibilityRegion");
    expect(mixed).not.toHaveProperty("showVisibilityBoundary");
    expect(mixed).not.toHaveProperty("showForecastVisibilityRegion");
    expect(mixed).not.toHaveProperty("showForecastVisibilityBoundary");
    expect(mixed?.showMoonEclipseShadow).toBe(true);
    expect(paramsOf(withLegacy(undefined, false, undefined, true))?.showMoonEclipseShadow).toBe(true);
  });
});

describe("reference-city eclipse circumstances presentation", () => {
  it("defaults details and chrome status on", () => {
    const v2 = defaultLibrationConfigV2();
    expect(v2.scene?.eclipseCircumstances.detailsEnabled).toBe(true);
    expect(v2.scene?.eclipseCircumstances.chromeStatusEnabled).toBe(true);
  });

  it("normalizes missing eclipseCircumstances keys to enabled", () => {
    const base = defaultLibrationConfigV2();
    const { eclipseCircumstances: _drop, ...sceneRest } = base.scene!;
    const v2 = normalizeLibrationConfig({
      ...base,
      scene: sceneRest,
    } as LibrationConfigV2);
    expect(v2.scene?.eclipseCircumstances.detailsEnabled).toBe(true);
    expect(v2.scene?.eclipseCircumstances.chromeStatusEnabled).toBe(true);
  });

  it("persists independent details and chrome toggles without disabling solar eclipses", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const painted = {
      ...base,
      layers: { ...base.layers, solarEclipse: true },
      scene: applyReferenceCityEclipsePresentationToScene(
        applyLayerEnableFlagsToScene(base.scene!, { ...base.layers, solarEclipse: true }),
        { detailsEnabled: false, chromeStatusEnabled: false },
      ),
    };
    const round = normalizeLibrationConfig(painted);
    expect(round.layers.solarEclipse).toBe(true);
    expect(round.scene?.eclipseCircumstances.detailsEnabled).toBe(false);
    expect(round.scene?.eclipseCircumstances.chromeStatusEnabled).toBe(false);
    expect(round.scene?.layers.find((l) => l.id === "solarEclipse")?.enabled).toBe(true);
  });
});

describe("eclipse alignment scene presentation", () => {
  it("defaults master, solar, and lunar alignment on at normal intensity", () => {
    const v2 = defaultLibrationConfigV2();
    expect(v2.scene?.eclipseAlignment.enabled).toBe(true);
    expect(v2.scene?.eclipseAlignment.solarEnabled).toBe(true);
    expect(v2.scene?.eclipseAlignment.lunarEnabled).toBe(true);
    expect(v2.scene?.eclipseAlignment.intensity).toBe("normal");
  });

  it("normalizes missing eclipseAlignment keys to defaults", () => {
    const base = defaultLibrationConfigV2();
    const { eclipseAlignment: _drop, ...sceneRest } = base.scene!;
    const v2 = normalizeLibrationConfig({
      ...base,
      scene: sceneRest,
    } as LibrationConfigV2);
    expect(v2.scene?.eclipseAlignment.enabled).toBe(true);
    expect(v2.scene?.eclipseAlignment.solarEnabled).toBe(true);
    expect(v2.scene?.eclipseAlignment.lunarEnabled).toBe(true);
    expect(v2.scene?.eclipseAlignment.intensity).toBe("normal");
  });

  it("persists alignment toggles without disabling solar or lunar eclipse layers", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const painted = {
      ...base,
      layers: { ...base.layers, solarEclipse: true, lunarEclipse: true },
      scene: applyEclipseAlignmentPresentationToScene(
        applyLayerEnableFlagsToScene(base.scene!, {
          ...base.layers,
          solarEclipse: true,
          lunarEclipse: true,
        }),
        { enabled: false, solarEnabled: false, intensity: "dramatic" },
      ),
    };
    const round = normalizeLibrationConfig(painted);
    expect(round.layers.solarEclipse).toBe(true);
    expect(round.layers.lunarEclipse).toBe(true);
    expect(round.scene?.eclipseAlignment.enabled).toBe(false);
    expect(round.scene?.eclipseAlignment.solarEnabled).toBe(false);
    expect(round.scene?.eclipseAlignment.lunarEnabled).toBe(true);
    expect(round.scene?.eclipseAlignment.intensity).toBe("dramatic");
    expect(round.scene?.layers.find((l) => l.id === "solarEclipse")?.enabled).toBe(true);
    expect(round.scene?.layers.find((l) => l.id === "lunarEclipse")?.enabled).toBe(true);
  });

  it("snaps unknown intensity values to normal", () => {
    const base = defaultLibrationConfigV2();
    const v2 = normalizeLibrationConfig({
      ...base,
      scene: {
        ...base.scene!,
        eclipseAlignment: { ...base.scene!.eclipseAlignment, intensity: "laser" as never },
      },
    });
    expect(v2.scene?.eclipseAlignment.intensity).toBe("normal");
  });
});

describe("eclipse product polish presentation", () => {
  it("defaults type filters, labels, event information, and style tokens on", () => {
    const v2 = defaultLibrationConfigV2();
    const solar = v2.scene?.layers.find((l) => l.id === "solarEclipse");
    const params = solar?.source.kind === "derived" ? solar.source.parameters : undefined;
    expect(params?.showTypeTotal).toBe(true);
    expect(params?.showTypeHybrid).toBe(true);
    expect(v2.scene?.eclipseInfo.labelsEnabled).toBe(true);
    expect(v2.scene?.eclipseInfo.eventInformationEnabled).toBe(true);
    expect(v2.scene?.eclipseAlignment.solarColor).toMatch(/^#/);
    expect(v2.scene?.eclipseAlignment.lunarColor).toMatch(/^#/);
  });

  it("persists style and filter changes independently", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const painted = {
      ...base,
      scene: applyEclipseInfoPresentationToScene(
        applyEclipseAlignmentPresentationToScene(
          applyLunarEclipsePresentationToScene(
            applySolarEclipsePresentationToScene(base.scene!, {
              showTypeTotal: false,
              forecastCorridorColor: "#112233",
              livePartialOpacity: 0.08,
            }),
            { showTypePenumbral: false },
          ),
          { solarColor: "#fedcba", intensity: "subtle" },
        ),
        { labelsEnabled: false },
      ),
    };
    const round = normalizeLibrationConfig(painted);
    const solar = round.scene?.layers.find((l) => l.id === "solarEclipse");
    const lunar = round.scene?.layers.find((l) => l.id === "lunarEclipse");
    expect(solar?.source.kind === "derived" ? solar.source.parameters?.showTypeTotal : undefined).toBe(
      false,
    );
    expect(solar?.source.kind === "derived" ? solar.source.parameters?.forecastCorridorColor : undefined).toBe(
      "#112233",
    );
    expect(lunar?.source.kind === "derived" ? lunar.source.parameters?.showTypePenumbral : undefined).toBe(
      false,
    );
    expect(
      lunar?.source.kind === "derived" ? lunar.source.parameters : undefined,
    ).not.toHaveProperty("visibilityRegionColor");
    expect(round.scene?.eclipseAlignment.solarColor).toBe("#fedcba");
    expect(round.scene?.eclipseAlignment.lunarColor).not.toBe("#fedcba");
    expect(round.scene?.eclipseAlignment.intensity).toBe("subtle");
    expect(round.scene?.eclipseInfo.labelsEnabled).toBe(false);
    expect(round.scene?.eclipseInfo.eventInformationEnabled).toBe(true);
  });

  it("clamps fill opacity to the product bounds", () => {
    const base = defaultLibrationConfigV2();
    const high = normalizeLibrationConfig({
      ...base,
      scene: applySolarEclipsePresentationToScene(base.scene!, { liveCentralBandOpacity: 1 }),
    });
    const low = normalizeLibrationConfig({
      ...base,
      scene: applySolarEclipsePresentationToScene(base.scene!, { liveCentralBandOpacity: 0 }),
    });
    const highRow = high.scene?.layers.find((l) => l.id === "solarEclipse");
    const lowRow = low.scene?.layers.find((l) => l.id === "solarEclipse");
    expect(
      highRow?.source.kind === "derived" ? highRow.source.parameters?.liveCentralBandOpacity : undefined,
    ).toBe(0.55);
    expect(
      lowRow?.source.kind === "derived" ? lowRow.source.parameters?.liveCentralBandOpacity : undefined,
    ).toBe(0.04);
  });

  it("defaults missing ISS presentation keys and preserves explicit values", () => {
    const missing = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers),
        layers: buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers).layers.map((row) => {
          if (row.id === "orbitalTracks" && row.source.kind === "dynamicTracks") {
            return {
              ...row,
              source: { kind: "dynamicTracks", sourceId: "iss-orbital-track-v1" },
            };
          }
          return row;
        }),
      },
    });
    const missingRow = missing.scene?.layers.find((l) => l.id === "orbitalTracks");
    expect(
      missingRow?.source.kind === "dynamicTracks" ? missingRow.source.parameters : undefined,
    ).toMatchObject(DEFAULT_ISS_ORBITAL_PRESENTATION);

    const explicit = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: applyIssOrbitalPresentationToScene(defaultLibrationConfigV2().scene!, {
        trackEnabled: false,
        pastColor: "#ff3300",
        futureColor: "#22cc66",
        glyphType: "silhouette",
        glyphSize: "large",
        labelEnabled: false,
        pastHorizon: "15m",
        futureHorizon: "15m",
      }),
    });
    const round = normalizeLibrationConfig(JSON.parse(JSON.stringify(explicit)) as LibrationConfigV2);
    const row = round.scene?.layers.find((l) => l.id === "orbitalTracks");
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.trackEnabled : undefined).toBe(
      false,
    );
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.pastColor : undefined).toBe(
      "#ff3300",
    );
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.futureColor : undefined).toBe(
      "#22cc66",
    );
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.glyphType : undefined).toBe(
      "silhouette",
    );
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.labelEnabled : undefined).toBe(
      false,
    );
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.pastHorizon : undefined).toBe(
      "15m",
    );
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.pastMinutes : undefined).toBe(
      undefined,
    );
  });

  it("defaults missing planetary presentation and preserves explicit body flags", () => {
    const factory = normalizeLibrationConfig(defaultLibrationConfigV2());
    const row = factory.scene?.layers.find((l) => l.id === "planetaryObjects");
    expect(row?.enabled).toBe(false);
    expect(row?.source.kind).toBe("derived");
    expect(row?.source.kind === "derived" ? row.source.product : undefined).toBe("planetaryObjects");
    expect(planetaryObjectsPresentationFromScene(factory.scene!).bodies.mars.enabled).toBe(false);

    const explicit = normalizeLibrationConfig({
      ...factory,
      scene: applyPlanetaryObjectsPresentationToScene(factory.scene!, {
        bodies: { mars: { enabled: true, color: "#ff00ff", locusEnabled: true } },
        glyphType: "dot",
        loci: { duration: "5y" },
      }),
    });
    const round = normalizeLibrationConfig(JSON.parse(JSON.stringify(explicit)) as LibrationConfigV2);
    const pres = planetaryObjectsPresentationFromScene(round.scene!);
    expect(pres.bodies.mars.enabled).toBe(true);
    expect(pres.bodies.mars.color).toBe("#ff00ff");
    expect(pres.bodies.mars.locusEnabled).toBe(true);
    expect(pres.glyphType).toBe("dot");
    expect(pres.loci.duration).toBe("5y");
    expect(pres.bodies.venus.enabled).toBe(false);
  });

  it("defaults missing Milky Way presentation and preserves explicit flags", () => {
    const factory = normalizeLibrationConfig(defaultLibrationConfigV2());
    const row = factory.scene?.layers.find((l) => l.id === "milkyWay");
    expect(row?.enabled).toBe(false);
    expect(row?.source.kind).toBe("derived");
    expect(row?.source.kind === "derived" ? row.source.product : undefined).toBe("milkyWay");
    expect(milkyWayPresentationFromScene(factory.scene!).bandWidth).toBe("normal");
    expect(milkyWayPresentationFromScene(factory.scene!).galacticAnticenterEnabled).toBe(false);
    expect(milkyWayPresentationFromScene(factory.scene!).visibilityContoursEnabled).toBe(false);
    expect(milkyWayPresentationFromScene(factory.scene!).contour30Enabled).toBe(true);
    expect(milkyWayPresentationFromScene(factory.scene!).contour0Enabled).toBe(false);
    expect(milkyWayPresentationFromScene(factory.scene!).emphasizeAstronomicalNight).toBe(true);
    expect(milkyWayPresentationFromScene(factory.scene!).deemphasizeMoonlight).toBe(true);
    expect(milkyWayPresentationFromScene(factory.scene!).viewingEventsEnabled).toBe(false);
    expect(milkyWayPresentationFromScene(factory.scene!).showPrimeWindows).toBe(true);

    const explicit = normalizeLibrationConfig({
      ...factory,
      scene: applyMilkyWayPresentationToScene(factory.scene!, {
        bandWidth: "wide",
        galacticAnticenterEnabled: true,
        planeColor: "#aabbcc",
      }),
    });
    const round = normalizeLibrationConfig(JSON.parse(JSON.stringify(explicit)) as LibrationConfigV2);
    const pres = milkyWayPresentationFromScene(round.scene!);
    expect(pres.bandWidth).toBe("wide");
    expect(pres.galacticAnticenterEnabled).toBe(true);
    expect(pres.planeColor).toBe("#aabbcc");
    expect(pres.planeEnabled).toBe(true);
  });

  it("migrates LIB-038 pastMinutes/futureMinutes and keeps 45 min", () => {
    const migrated = normalizeLibrationConfig({
      ...defaultLibrationConfigV2(),
      scene: {
        ...buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers),
        layers: buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers).layers.map((row) => {
          if (row.id === "orbitalTracks" && row.source.kind === "dynamicTracks") {
            return {
              ...row,
              source: {
                kind: "dynamicTracks",
                sourceId: "iss-orbital-track-v1",
                parameters: {
                  pastMinutes: 45,
                  futureMinutes: 15,
                  pastColor: "#ff3300",
                  glyphType: "dot",
                },
              },
            };
          }
          return row;
        }),
      },
    });
    const row = migrated.scene?.layers.find((l) => l.id === "orbitalTracks");
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.pastHorizon : undefined).toBe(
      "45m",
    );
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.futureHorizon : undefined).toBe(
      "15m",
    );
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.pastColor : undefined).toBe(
      "#ff3300",
    );
    expect(row?.source.kind === "dynamicTracks" ? row.source.parameters?.pastMinutes : undefined).toBe(
      undefined,
    );
  });

  it("orbit base color follows the linked past color and leaves a customized past alone", () => {
    const factory = defaultLibrationConfigV2().scene!;
    expect(issOrbitalPresentationFromScene(factory).pastColor).toBe(
      issOrbitalPresentationFromScene(factory).baseColor,
    );
    const followed = applyIssOrbitalPresentationToScene(factory, { baseColor: "#ff0000" });
    const followedPres = issOrbitalPresentationFromScene(followed);
    expect(followedPres.baseColor).toBe("#ff0000");
    expect(followedPres.pastColor).toBe("#ff0000");
    expect(followedPres.futureColor).toBe(DEFAULT_ISS_ORBITAL_PRESENTATION.futureColor);
    expect(followedPres.dotColor).toBe(DEFAULT_ISS_ORBITAL_PRESENTATION.dotColor);

    const customized = applyIssOrbitalPresentationToScene(factory, { pastColor: "#00ff00" });
    const afterBase = applyIssOrbitalPresentationToScene(customized, { baseColor: "#0000ff" });
    const afterPres = issOrbitalPresentationFromScene(afterBase);
    expect(afterPres.baseColor).toBe("#0000ff");
    expect(afterPres.pastColor).toBe("#00ff00");
  });
});
