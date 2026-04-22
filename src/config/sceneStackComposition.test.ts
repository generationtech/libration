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
import { SCENE_BASE_MAP_Z_INDEX, zIndexForSceneStackIndex } from "./sceneLayerOrder";
import { planSceneStackComposition } from "./sceneStackComposition";
import {
  buildDefaultSceneConfigFromLayerFlags,
  SCENE_STACK_LAYER_IDS,
  type SceneConfig,
} from "./v2/sceneConfig";
import { SCENE_STACK_COMPOSITION_OVERLAY_IDS } from "./sceneStackComposition";
import type { LayerEnableFlags } from "./appConfig";

const ALL: LayerEnableFlags = {
  baseMap: true,
  solarShading: true,
  grid: true,
  staticEquirectOverlay: true,
  cityPins: true,
  subsolarMarker: true,
  sublunarMarker: true,
  solarAnalemma: true,
};

function sceneWith(
  base: Partial<SceneConfig["baseMap"]> | undefined,
  patchLayers: (rows: SceneConfig["layers"]) => SceneConfig["layers"],
): SceneConfig {
  const d = buildDefaultSceneConfigFromLayerFlags(ALL);
  return {
    ...d,
    baseMap: base ? { ...d.baseMap, ...base } : d.baseMap,
    layers: patchLayers(d.layers),
  };
}

describe("planSceneStackComposition", () => {
  it("overlay id list matches v2 sceneConfig SCENE_STACK_LAYER_IDS", () => {
    expect([...SCENE_STACK_COMPOSITION_OVERLAY_IDS].sort()).toEqual(
      [...SCENE_STACK_LAYER_IDS].sort(),
    );
  });

  it("places base map at the foundational z with opacity from config", () => {
    const s = sceneWith(
      { visible: true, opacity: 0.7 },
      (L) => L,
    );
    const p = planSceneStackComposition(s);
    expect(p.baseMap).toEqual({ zIndex: SCENE_BASE_MAP_Z_INDEX, opacity: 0.7 });
  });

  it("omits base map when not visible (no accidental draw slot)", () => {
    const s = sceneWith({ visible: false }, (L) => L);
    expect(planSceneStackComposition(s).baseMap).toBeNull();
  });

  it("omits base map when opacity is zero", () => {
    const s = sceneWith({ visible: true, opacity: 0 }, (L) => L);
    expect(planSceneStackComposition(s).baseMap).toBeNull();
  });

  it("assigns overlay z-indices in deterministic scene order, dense after skips", () => {
    const s = buildDefaultSceneConfigFromLayerFlags(ALL);
    const p = planSceneStackComposition(s);
    expect(p.overlays.map((o) => o.layerId)).toEqual([
      "solarShading",
      "grid",
      "staticEquirectOverlay",
      "cityPins",
      "subsolarMarker",
      "sublunarMarker",
      "solarAnalemma",
    ]);
    p.overlays.forEach((o, i) => {
      expect(o.zIndex).toBe(zIndexForSceneStackIndex(i));
      expect(o.stackIndex).toBe(i);
      expect(o.opacity).toBe(1);
    });
  });

  it("keeps base z strictly below every overlay", () => {
    const s = buildDefaultSceneConfigFromLayerFlags(ALL);
    const p = planSceneStackComposition(s);
    expect(p.baseMap?.zIndex).toBe(0);
    for (const o of p.overlays) {
      expect(o.zIndex).toBeGreaterThan(p.baseMap!.zIndex);
    }
  });

  it("reorders z-indices when `order` fields are swapped (reordered stack semantics)", () => {
    const s0 = buildDefaultSceneConfigFromLayerFlags(ALL);
    const g0 = s0.layers.find((l) => l.id === "grid")!;
    const sol0 = s0.layers.find((l) => l.id === "solarShading")!;
    const s1 = {
      ...s0,
      layers: s0.layers.map((L) => {
        if (L.id === "grid") {
          return { ...L, order: 0 };
        }
        if (L.id === "solarShading") {
          return { ...L, order: 1 };
        }
        return L;
      }),
    };
    const p0 = planSceneStackComposition(s0);
    const p1 = planSceneStackComposition(s1);
    const zG0 = p0.overlays.find((o) => o.layerId === "grid")!.zIndex;
    const zSol0 = p0.overlays.find((o) => o.layerId === "solarShading")!.zIndex;
    const zG1 = p1.overlays.find((o) => o.layerId === "grid")!.zIndex;
    const zSol1 = p1.overlays.find((o) => o.layerId === "solarShading")!.zIndex;
    expect(g0.order).toBe(1);
    expect(sol0.order).toBe(0);
    expect(zSol0).toBeLessThan(zG0);
    expect(zG1).toBeLessThan(zSol1);
  });

  it("propagates per-layer opacity (composition alpha path)", () => {
    const s = sceneWith(undefined, (rows) =>
      rows.map((L) => (L.id === "grid" ? { ...L, opacity: 0.25 } : L)),
    );
    const grid = planSceneStackComposition(s).overlays.find((o) => o.layerId === "grid");
    expect(grid?.opacity).toBe(0.25);
  });

  it("propagates static equirect overlay opacity when that row participates", () => {
    const s = sceneWith(undefined, (rows) =>
      rows.map((L) =>
        L.id === "staticEquirectOverlay" ? { ...L, enabled: true, opacity: 0.31 } : L,
      ),
    );
    const p = planSceneStackComposition(s).overlays.find(
      (o) => o.layerId === "staticEquirectOverlay",
    );
    expect(p?.opacity).toBe(0.31);
  });

  it("omits static equirect overlay when its scene row is disabled", () => {
    const s = sceneWith(undefined, (rows) =>
      rows.map((L) =>
        L.id === "staticEquirectOverlay" ? { ...L, enabled: false } : L,
      ),
    );
    expect(
      planSceneStackComposition(s).overlays.some((o) => o.layerId === "staticEquirectOverlay"),
    ).toBe(false);
  });

  it("skips disabled stack rows without creating z-index gaps in the plan", () => {
    const s = sceneWith(undefined, (rows) =>
      rows.map((L) => {
        if (L.id === "grid") {
          return { ...L, enabled: false };
        }
        if (L.id === "solarAnalemma") {
          return { ...L, enabled: false };
        }
        return L;
      }),
    );
    const p = planSceneStackComposition(s);
    const idx = p.overlays.findIndex((o) => o.layerId === "sublunarMarker");
    expect(p.overlays[idx]?.stackIndex).toBe(p.overlays.length - 1);
    expect(p.overlays[idx]?.zIndex).toBe(zIndexForSceneStackIndex(p.overlays.length - 1));
  });

  it("omits solar analemma from the plan when its scene row is disabled (Phase 4 derived)", () => {
    const s = sceneWith(undefined, (rows) =>
      rows.map((L) => (L.id === "solarAnalemma" ? { ...L, enabled: false, opacity: 1 } : L)),
    );
    expect(
      planSceneStackComposition(s).overlays.some((o) => o.layerId === "solarAnalemma"),
    ).toBe(false);
  });

  it("applies per-layer opacity for solar analemma in the composition plan (derived path)", () => {
    const s = sceneWith(undefined, (rows) =>
      rows.map((L) =>
        L.id === "solarAnalemma" ? { ...L, enabled: true, opacity: 0.37 } : L,
      ),
    );
    const o = planSceneStackComposition(s).overlays.find(
      (x) => x.layerId === "solarAnalemma",
    );
    expect(o?.opacity).toBe(0.37);
  });

  it("z-order: solar analemma above static equirect when scene order values say so", () => {
    const s0 = sceneWith(undefined, (L) => L);
    const a0 = s0.layers.find((l) => l.id === "solarAnalemma")!.order;
    const p0 = s0.layers.find((l) => l.id === "staticEquirectOverlay")!.order;
    expect(p0).toBeLessThan(a0);
    const s1 = {
      ...s0,
      layers: s0.layers.map((row) => {
        if (row.id === "staticEquirectOverlay") {
          return { ...row, order: 7 };
        }
        if (row.id === "solarAnalemma") {
          return { ...row, order: 1 };
        }
        return row;
      }),
    };
    const p = planSceneStackComposition(s1);
    const zA = p.overlays.find((o) => o.layerId === "solarAnalemma")!.zIndex;
    const zS = p.overlays.find((o) => o.layerId === "staticEquirectOverlay")!.zIndex;
    expect(zA).toBeLessThan(zS);
  });
});
