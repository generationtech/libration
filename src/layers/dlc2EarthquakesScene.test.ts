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
import { DEFAULT_APP_CONFIG, type AppConfig } from "../config/appConfig";
import {
  buildDefaultSceneConfigFromLayerFlags,
  deriveLayerEnableFlagsFromScene,
  normalizeSceneConfig,
} from "../config/v2/sceneConfig";
import { planSceneStackComposition } from "../config/sceneStackComposition";
import { createLayerRegistryFromConfig } from "../app/bootstrap";
import { runtimeIdForDynamicPointFeaturesSceneLayer } from "../layers/dynamicPointFeaturesOverlayLayer";
import { USGS_EARTHQUAKES_SOURCE_ID } from "../lifecycle";
import { buildDynamicPointFeaturesRenderPlan } from "../renderer/renderPlan/sceneDynamicPointFeaturesPlan";
import {
  DYNAMIC_POINT_FEATURES_KIND,
  type DynamicPointFeaturesPayload,
} from "../layers/dynamicPointFeaturesPayload";

describe("DLC-2 SceneConfig + composition + registry + RenderPlan", () => {
  it("normalizes earthquakes with durable dynamicPointFeatures sourceId", () => {
    const scene = normalizeSceneConfig(
      {
        layers: [
          {
            id: "earthquakes",
            enabled: true,
            source: {
              kind: "dynamicPointFeatures",
              sourceId: "Usgs-Earthquakes-V1",
            },
          },
        ],
      },
      { ...DEFAULT_APP_CONFIG.layers, earthquakes: true },
    );
    const row = scene.layers.find((l) => l.id === "earthquakes");
    expect(row).toBeDefined();
    expect(row!.enabled).toBe(true);
    expect(row!.source).toEqual({
      kind: "dynamicPointFeatures",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
      parameters: {
        minMagnitude: "2.5",
        maxAge: "24h",
        showLabels: true,
        labelMinMagnitude: "4",
        earthquakesOnly: true,
      },
    });
    expect(deriveLayerEnableFlagsFromScene(scene).earthquakes).toBe(true);
  });

  it("default stack includes earthquakes disabled with catalog sourceId", () => {
    const scene = buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers);
    const row = scene.layers.find((l) => l.id === "earthquakes");
    expect(row).toBeDefined();
    expect(row!.enabled).toBe(false);
    expect(row!.source).toEqual({
      kind: "dynamicPointFeatures",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
      parameters: {
        minMagnitude: "2.5",
        maxAge: "24h",
        showLabels: true,
        labelMinMagnitude: "4",
        earthquakesOnly: true,
      },
    });
  });

  it("composition includes earthquakes when enabled", () => {
    const scene = buildDefaultSceneConfigFromLayerFlags({
      ...DEFAULT_APP_CONFIG.layers,
      earthquakes: true,
    });
    const plan = planSceneStackComposition(scene);
    expect(plan.overlays.some((o) => o.layerId === "earthquakes")).toBe(true);
  });

  it("registry registers dynamic point-features runtime id when enabled", () => {
    const layers = { ...DEFAULT_APP_CONFIG.layers, earthquakes: true };
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      layers,
      scene: buildDefaultSceneConfigFromLayerFlags(layers),
    };
    const registry = createLayerRegistryFromConfig(config);
    const id = runtimeIdForDynamicPointFeaturesSceneLayer("earthquakes");
    expect(registry.getLayers().some((l) => l.id === id)).toBe(true);
  });

  it("RenderPlan emits path2d discs for magnitude-scaled markers", () => {
    const payload: DynamicPointFeaturesPayload = {
      kind: DYNAMIC_POINT_FEATURES_KIND,
      features: [
        { id: "eq-1", lonDeg: -120, latDeg: 35, magnitude: 4.5, label: "M 4.5" },
        { id: "eq-2", lonDeg: 140, latDeg: 38, magnitude: 5.2 },
      ],
    };
    const plan = buildDynamicPointFeaturesRenderPlan({
      viewportWidthPx: 800,
      viewportHeightPx: 400,
      layerOpacity: 1,
      payload,
    });
    expect(plan.items.some((i) => i.kind === "path2d")).toBe(true);
    expect(plan.items.some((i) => i.kind === "text" && i.text === "M 4.5")).toBe(
      true,
    );
  });
});
