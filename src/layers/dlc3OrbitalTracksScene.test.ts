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
import { runtimeIdForDynamicTracksSceneLayer } from "../layers/dynamicTracksOverlayLayer";
import { DEFAULT_ISS_ORBITAL_PRESENTATION } from "../core/issOrbitalPresentation";
import { ISS_ORBITAL_TRACK_SOURCE_ID } from "../lifecycle";
import { buildDynamicTracksRenderPlan } from "../renderer/renderPlan/sceneDynamicTracksPlan";
import {
  DYNAMIC_TRACKS_KIND,
  type DynamicTracksPayload,
} from "../layers/dynamicTracksPayload";

describe("DLC-3 SceneConfig + composition + registry + RenderPlan", () => {
  it("normalizes orbitalTracks with durable dynamicTracks sourceId", () => {
    const scene = normalizeSceneConfig(
      {
        layers: [
          {
            id: "orbitalTracks",
            enabled: true,
            source: {
              kind: "dynamicTracks",
              sourceId: "Iss-Orbital-Track-V1",
            },
          },
        ],
      },
      { ...DEFAULT_APP_CONFIG.layers, orbitalTracks: true },
    );
    const row = scene.layers.find((l) => l.id === "orbitalTracks");
    expect(row).toBeDefined();
    expect(row!.enabled).toBe(true);
    expect(row!.source).toEqual({
      kind: "dynamicTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
      parameters: DEFAULT_ISS_ORBITAL_PRESENTATION,
    });
    expect(deriveLayerEnableFlagsFromScene(scene).orbitalTracks).toBe(true);
  });

  it("default stack includes orbitalTracks disabled with catalog sourceId", () => {
    const scene = buildDefaultSceneConfigFromLayerFlags(DEFAULT_APP_CONFIG.layers);
    const row = scene.layers.find((l) => l.id === "orbitalTracks");
    expect(row).toBeDefined();
    expect(row!.enabled).toBe(false);
    expect(row!.source).toEqual({
      kind: "dynamicTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
      parameters: DEFAULT_ISS_ORBITAL_PRESENTATION,
    });
  });

  it("composition includes orbitalTracks when enabled", () => {
    const scene = buildDefaultSceneConfigFromLayerFlags({
      ...DEFAULT_APP_CONFIG.layers,
      orbitalTracks: true,
    });
    const plan = planSceneStackComposition(scene);
    expect(plan.overlays.some((o) => o.layerId === "orbitalTracks")).toBe(true);
  });

  it("registry registers dynamic tracks runtime id when enabled", () => {
    const layers = { ...DEFAULT_APP_CONFIG.layers, orbitalTracks: true };
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      layers,
      scene: buildDefaultSceneConfigFromLayerFlags(layers),
    };
    const registry = createLayerRegistryFromConfig(config);
    const id = runtimeIdForDynamicTracksSceneLayer("orbitalTracks");
    expect(registry.getLayers().some((l) => l.id === id)).toBe(true);
  });

  it("RenderPlan emits trail lines and tip disc for track samples", () => {
    const payload: DynamicTracksPayload = {
      kind: DYNAMIC_TRACKS_KIND,
      tracks: [
        {
          id: "iss",
          label: "ISS (ZARYA)",
          samples: [
            { lonDeg: -120, latDeg: 32, timeMs: 1 },
            { lonDeg: -100, latDeg: 40, timeMs: 2 },
            { lonDeg: -80, latDeg: 48, timeMs: 3 },
          ],
        },
      ],
    };
    const plan = buildDynamicTracksRenderPlan({
      viewportWidthPx: 800,
      viewportHeightPx: 400,
      layerOpacity: 1,
      payload,
    });
    expect(plan.items.some((i) => i.kind === "line")).toBe(true);
    expect(plan.items.some((i) => i.kind === "path2d")).toBe(true);
    expect(plan.items.some((i) => i.kind === "text" && i.text === "ISS (ZARYA)")).toBe(
      true,
    );
  });
});
