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

import { WORLD_EQUIRECTANGULAR_SRC } from "../layers/baseMapLayer";

/**
 * Static equirectangular base-map registry for SceneConfig.baseMap.id resolution.
 * This is intentionally small and explicit for the current phase (no dynamic catalog/lifecycle).
 */
export type EquirectBaseMapAsset = {
  id: string;
  src: string;
  projectionId: "equirectangular";
  extent: { minLat: -90; maxLat: 90; minLon: -180; maxLon: 180 };
  orientation: "north-up";
  hasPadding: false;
  /**
   * Transitional: id is real and supported, but currently points at a placeholder
   * raster until a distinct production asset is onboarded.
   */
  transitionalPlaceholder?: true;
};

export const DEFAULT_EQUIRECT_BASE_MAP_ID = "equirect-world-legacy-v1";

const FULL_WORLD_EXTENT = {
  minLat: -90,
  maxLat: 90,
  minLon: -180,
  maxLon: 180,
} as const;

const REGISTRY: readonly EquirectBaseMapAsset[] = [
  {
    id: DEFAULT_EQUIRECT_BASE_MAP_ID,
    src: WORLD_EQUIRECTANGULAR_SRC,
    projectionId: "equirectangular",
    extent: FULL_WORLD_EXTENT,
    orientation: "north-up",
    hasPadding: false,
  },
  {
    id: "equirect-world-political-v1",
    src: "/maps/world-equirectangular-political.jpg",
    projectionId: "equirectangular",
    extent: FULL_WORLD_EXTENT,
    orientation: "north-up",
    hasPadding: false,
    transitionalPlaceholder: true,
  },
  {
    id: "equirect-world-topography-v1",
    src: "/maps/world-equirectangular-topography.jpg",
    projectionId: "equirectangular",
    extent: FULL_WORLD_EXTENT,
    orientation: "north-up",
    hasPadding: false,
    transitionalPlaceholder: true,
  },
  {
    id: "equirect-world-geology-v1",
    src: "/maps/world-equirectangular-geology.jpg",
    projectionId: "equirectangular",
    extent: FULL_WORLD_EXTENT,
    orientation: "north-up",
    hasPadding: false,
    transitionalPlaceholder: true,
  },
] as const;

const LEGACY_ID_ALIASES = new Map<string, string>([
  ["political-v1", "equirect-world-political-v1"],
  ["world-equirectangular-v1", DEFAULT_EQUIRECT_BASE_MAP_ID],
  ["equirect-world-topo-v1", "equirect-world-topography-v1"],
]);

function assertRegistry(entries: readonly EquirectBaseMapAsset[]): void {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.id.trim() === "") {
      throw new Error("Base-map asset registry entry has an empty id.");
    }
    if (seen.has(entry.id)) {
      throw new Error(`Duplicate base-map asset id in registry: ${entry.id}`);
    }
    seen.add(entry.id);
    if (entry.projectionId !== "equirectangular") {
      throw new Error(`Base-map asset ${entry.id} must use equirectangular projection.`);
    }
    if (
      entry.extent.minLat !== -90 ||
      entry.extent.maxLat !== 90 ||
      entry.extent.minLon !== -180 ||
      entry.extent.maxLon !== 180
    ) {
      throw new Error(`Base-map asset ${entry.id} must declare full-world extent.`);
    }
    if (entry.orientation !== "north-up") {
      throw new Error(`Base-map asset ${entry.id} must be north-up.`);
    }
    if (entry.hasPadding) {
      throw new Error(`Base-map asset ${entry.id} cannot declare padded borders.`);
    }
  }
}

assertRegistry(REGISTRY);

const BASE_MAP_REGISTRY = new Map<string, EquirectBaseMapAsset>(
  REGISTRY.map((entry) => [entry.id, entry]),
);

export const SUPPORTED_EQUIRECT_BASE_MAP_IDS = REGISTRY.map((entry) => entry.id);

export function resolveEquirectBaseMapAsset(id: string): EquirectBaseMapAsset {
  const trimmed = id.trim();
  const canonicalId = LEGACY_ID_ALIASES.get(trimmed) ?? trimmed;
  return BASE_MAP_REGISTRY.get(canonicalId) ?? BASE_MAP_REGISTRY.get(DEFAULT_EQUIRECT_BASE_MAP_ID)!;
}

export function resolveEquirectBaseMapImageSrc(id: string): string {
  return resolveEquirectBaseMapAsset(id).src;
}
