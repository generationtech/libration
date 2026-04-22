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

const SCENE_Z_BASE = 5;

/**
 * Runtime sort: lower `order` first; tie-break by `id` for stable ordering.
 */
export function sortSceneLayersForRender<T extends OrderableSceneLayer>(layers: readonly T[]): T[] {
  return [...layers].sort((a, b) => {
    if (a.order !== b.order) {
      return a.order - b.order;
    }
    return a.id.localeCompare(b.id);
  });
}

/**
 * z-index for a scene layer after sorting: first stack entry above the base map uses this base.
 */
export function zIndexForSceneStackIndex(sortedIndex: number): number {
  return SCENE_Z_BASE + sortedIndex;
}
