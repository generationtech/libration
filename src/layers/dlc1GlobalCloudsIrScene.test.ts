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
import { runtimeIdForDynamicEquirectSceneLayer } from "../layers/dynamicEquirectRasterOverlayLayer";
import { GLOBAL_CLOUDS_IR_SOURCE_ID } from "../lifecycle";

describe("DLC-1 SceneConfig + composition + registry", () => {
  it("normalizes globalCloudsIr with durable dynamicEquirectRaster sourceId", () => {
    const scene = normalizeSceneConfig(
      {
        layers: [
          {
            id: "globalCloudsIr",
            enabled: true,
            source: {
              kind: "dynamicEquirectRaster",
              sourceId: "Global-Clouds-IR-V1",
            },
          },
        ],
      },
      { ...DEFAULT_APP_CONFIG.layers, globalCloudsIr: true },
    );
    const row = scene.layers.find((l) => l.id === "globalCloudsIr");
    expect(row).toBeDefined();
    expect(row!.enabled).toBe(true);
    expect(row!.source).toEqual({
      kind: "dynamicEquirectRaster",
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
    });
    expect(deriveLayerEnableFlagsFromScene(scene).globalCloudsIr).toBe(true);
  });

  it("default stack includes globalCloudsIr disabled with catalog sourceId", () => {
    const scene = buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers);
    const row = scene.layers.find((l) => l.id === "globalCloudsIr");
    expect(row).toBeDefined();
    expect(row!.enabled).toBe(false);
    expect(row!.source).toEqual({
      kind: "dynamicEquirectRaster",
      sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
    });
  });

  it("composition includes globalCloudsIr when enabled", () => {
    const scene = buildDefaultSceneConfigFromLayerFlags({
      ...DEFAULT_APP_CONFIG.layers,
      globalCloudsIr: true,
    });
    const plan = planSceneStackComposition(scene);
    expect(plan.overlays.some((o) => o.layerId === "globalCloudsIr")).toBe(true);
  });

  it("registry registers dynamic equirect runtime id when enabled", () => {
    const layers = { ...DEFAULT_APP_CONFIG.layers, globalCloudsIr: true };
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      layers,
      scene: buildDefaultSceneConfigFromLayerFlags(layers),
    };
    const registry = createLayerRegistryFromConfig(config);
    const id = runtimeIdForDynamicEquirectSceneLayer("globalCloudsIr");
    expect(registry.getLayers().some((l) => l.id === id)).toBe(true);
  });
});
