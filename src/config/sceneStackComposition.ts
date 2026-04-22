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
import type { SceneConfig, SceneLayerInstance } from "./v2/sceneConfig";

export type SceneBaseMapCompositePart = {
  zIndex: typeof SCENE_BASE_MAP_Z_INDEX;
  /** Alpha used during canvas composition (0–1). */
  opacity: number;
};

export type SceneOverlayCompositePart = {
  layerId: string;
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

const COMPOSITION_ELIGIBLE_DERIVED_PRODUCTS = new Set<string>([
  "solarDayNightShading",
  "latLonGrid",
  "referenceAndCustomCityPins",
  "subsolarPoint",
  "sublunarPoint",
  "solarAnalemmaGroundTrack",
]);

/**
 * Scene-authoritative overlay participation predicate.
 * Rows participate only when they are enabled, visible (opacity > 0), and source-eligible for
 * composition in the current runtime (static raster or known derived overlay product).
 */
export function isSceneLayerCompositionEligible(inst: SceneLayerInstance): boolean {
  if (!inst.enabled) {
    return false;
  }
  const op = inst.opacity ?? 1;
  if (op <= 0) {
    return false;
  }
  if (inst.source.kind === "staticRaster") {
    return true;
  }
  if (inst.source.kind === "derived") {
    return COMPOSITION_ELIGIBLE_DERIVED_PRODUCTS.has(inst.source.product);
  }
  return false;
}

/**
 * Produces a deterministic z-order and opacity list from {@link SceneConfig} alone.
 * Base map is explicit at {@link SCENE_BASE_MAP_Z_INDEX}; overlays are consecutive
 * from {@link SCENE_OVERLAY_Z_BASE} in stack order. Participation is determined from
 * each row's semantics (enabled/opacity/source), not by row-id allowlists.
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
    if (!isSceneLayerCompositionEligible(inst)) {
      continue;
    }
    const layerId = inst.id;
    const op = inst.opacity ?? 1;
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
