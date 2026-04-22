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

/** Layer stack entries with a user-defined order and stable id (SceneConfig layer instance). */
export type OrderableSceneLayer = {
  id: string;
  order: number;
};

/**
 * Z slot for the foundational equirectangular base map. All overlay z-indices are strictly
 * above this (see layer-composition-rules: base map beneath overlays).
 */
export const SCENE_BASE_MAP_Z_INDEX = 0;

/**
 * Z-index of the first overlay in stack order, after sort + visibility filtering.
 * The scene system assigns consecutive integers from here so ordering is a scene-level
 * contract, not a per-layer-type product rule.
 */
export const SCENE_OVERLAY_Z_BASE = 5;

/** Unambiguous marker when a layer is constructed outside the scene path (e.g. tests, demos). */
export const SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED = SCENE_OVERLAY_Z_BASE;

/**
 * Runtime sort: lower `order` first. When `order` is equal, entries keep their order in
 * `layers` (the SceneConfig stack array order), not id order.
 */
export function sortSceneLayersForRender<T extends OrderableSceneLayer>(layers: readonly T[]): T[] {
  return layers
    .map((layer, index) => ({ layer, index }))
    .sort((a, b) => {
      if (a.layer.order !== b.layer.order) {
        return a.layer.order - b.layer.order;
      }
      return a.index - b.index;
    })
    .map(({ layer }) => layer);
}

/**
 * Z-index for the n-th *participating* overlay after `sortSceneLayersForRender` (0-based).
 * Skipped (disabled or zero-opacity) stack entries are not assigned indices; the next
 * visible overlay reuses a consecutive slot so composition stays dense and order-stable.
 */
export function zIndexForSceneStackIndex(overlayIndexAfterSort: number): number {
  return SCENE_OVERLAY_Z_BASE + overlayIndexAfterSort;
}
