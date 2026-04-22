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

/**
 * Scene stack composition: maps {@link SceneConfig} to a deterministic (zIndex, opacity) plan.
 * This is the single scene-level view of what participates in the composited image; it does
 * not construct layer objects (app/bootstrap does) and does not render.
 */
import {
  SCENE_BASE_MAP_Z_INDEX,
  sortSceneLayersForRender,
  zIndexForSceneStackIndex,
} from "./sceneLayerOrder";
import type { SceneConfig, SceneStackLayerId } from "./v2/sceneConfig";

/**
 * Runtime allowlist of stack row ids (must match {@link SCENE_STACK_LAYER_IDS} in sceneConfig;
 * tests assert equality to catch drift). Declared here so this module does not import scene
 * values from v2/sceneConfig (avoids circular init with re-exports in that file).
 */
export const SCENE_STACK_COMPOSITION_OVERLAY_IDS: readonly SceneStackLayerId[] = [
  "solarShading",
  "grid",
  "staticEquirectOverlay",
  "cityPins",
  "subsolarMarker",
  "sublunarMarker",
];
const expectedSceneIds: ReadonlySet<string> = new Set(SCENE_STACK_COMPOSITION_OVERLAY_IDS);

export type SceneBaseMapCompositePart = {
  zIndex: typeof SCENE_BASE_MAP_Z_INDEX;
  /** Alpha used during canvas composition (0–1). */
  opacity: number;
};

export type SceneOverlayCompositePart = {
  layerId: SceneStackLayerId;
  zIndex: number;
  /** Alpha used during canvas composition (0–1). */
  opacity: number;
  /** 0-based index among participating overlays, after sort and filtering. */
  stackIndex: number;
};

export type SceneStackCompositionPlan = {
  /** Omitted from the plan when the base does not draw (hidden or fully transparent). */
  baseMap: SceneBaseMapCompositePart | null;
  /**
   * Overlays in drawing order: lower index draws first, higher draws later. Each entry
   * is one participating scene stack row (enabled, opacity &gt; 0, known id).
   */
  overlays: readonly SceneOverlayCompositePart[];
};

/**
 * Produces a deterministic z-order and opacity list from {@link SceneConfig} alone.
 * Base map is explicit at {@link SCENE_BASE_MAP_Z_INDEX}; overlays are consecutive
 * from {@link SCENE_OVERLAY_Z_BASE} in stack order. Stack row ids that are not in
 * the scene allowlist are skipped (defensive; normalized config only emits known rows).
 */
export function planSceneStackComposition(scene: SceneConfig): SceneStackCompositionPlan {
  const baseOp = scene.baseMap.opacity ?? 1;
  const baseMap: SceneBaseMapCompositePart | null =
    scene.baseMap.visible && baseOp > 0
      ? { zIndex: SCENE_BASE_MAP_Z_INDEX, opacity: baseOp }
      : null;

  const ordered = sortSceneLayersForRender([...scene.layers]);
  const overlays: SceneOverlayCompositePart[] = [];
  let i = 0;
  for (const inst of ordered) {
    if (!inst.enabled) {
      continue;
    }
    if (!expectedSceneIds.has(inst.id)) {
      continue;
    }
    const op = inst.opacity ?? 1;
    if (op <= 0) {
      continue;
    }
    const layerId = inst.id as SceneStackLayerId;
    overlays.push({
      layerId,
      zIndex: zIndexForSceneStackIndex(i),
      opacity: op,
      stackIndex: i,
    });
    i++;
  }
  return { baseMap, overlays };
}
