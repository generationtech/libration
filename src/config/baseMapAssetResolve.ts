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
 * User-facing option model for the base map selector (editor and scene-facing UI).
 * Paired 1:1 with {@link EquirectBaseMapAsset} entries in the static registry.
 */
export type BaseMapOption = {
  id: string;
  label: string;
  shortDescription?: string;
  category: "reference" | "scientific" | "terrain" | "political";
  attribution?: string;
  previewThumbnailSrc?: string;
  transitionalPlaceholder?: boolean;
};

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

type EquirectMapDefinition = {
  id: string;
  src: string;
  /** Product UI — kept alongside the asset to avoid id / label drift. */
  option: BaseMapOption;
} & Pick<EquirectBaseMapAsset, "transitionalPlaceholder">;

export const DEFAULT_EQUIRECT_BASE_MAP_ID = "equirect-world-legacy-v1";

const FULL_WORLD_EXTENT = {
  minLat: -90,
  maxLat: 90,
  minLon: -180,
  maxLon: 180,
} as const;

const DEFINITIONS: readonly EquirectMapDefinition[] = [
  {
    id: DEFAULT_EQUIRECT_BASE_MAP_ID,
    src: WORLD_EQUIRECTANGULAR_SRC,
    transitionalPlaceholder: undefined,
    option: {
      id: DEFAULT_EQUIRECT_BASE_MAP_ID,
      label: "World (legacy, shaded)",
      shortDescription: "The original default equirectangular world basemap in Libration.",
      category: "reference",
    },
  },
  {
    id: "equirect-world-political-v1",
    src: "/maps/world-equirectangular-political.jpg",
    transitionalPlaceholder: true,
    option: {
      id: "equirect-world-political-v1",
      label: "World political",
      shortDescription: "Country and boundary emphasis for orientation and place names.",
      category: "political",
      transitionalPlaceholder: true,
    },
  },
  {
    id: "equirect-world-topography-v1",
    src: "/maps/world-equirectangular-topography.jpg",
    option: {
      id: "equirect-world-topography-v1",
      label: "World topography",
      shortDescription: "Terrain and relief, useful for landforms and elevation context.",
      category: "terrain",
      previewThumbnailSrc: "/maps/previews/world-equirectangular-topography-thumb.jpg",
      attribution: "Based on NASA Blue Marble Next Generation topography / bathymetry.",
    },
  },
  {
    id: "equirect-world-geology-v1",
    src: "/maps/world-equirectangular-geology.jpg",
    transitionalPlaceholder: true,
    option: {
      id: "equirect-world-geology-v1",
      label: "World geology",
      shortDescription: "Geological provinces and related features (scientific use).",
      category: "scientific",
      transitionalPlaceholder: true,
    },
  },
] as const;

const LEGACY_ID_ALIASES = new Map<string, string>([
  ["political-v1", "equirect-world-political-v1"],
  ["world-equirectangular-v1", DEFAULT_EQUIRECT_BASE_MAP_ID],
  ["equirect-world-topo-v1", "equirect-world-topography-v1"],
]);

function toAsset(d: EquirectMapDefinition): EquirectBaseMapAsset {
  return {
    id: d.id,
    src: d.src,
    projectionId: "equirectangular",
    extent: FULL_WORLD_EXTENT,
    orientation: "north-up",
    hasPadding: false,
    ...(d.transitionalPlaceholder ? { transitionalPlaceholder: d.transitionalPlaceholder } : {}),
  };
}

function assertRegistry(entries: readonly EquirectMapDefinition[]): void {
  const seen = new Set<string>();
  for (const def of entries) {
    if (def.id !== def.option.id) {
      throw new Error(
        `Base-map definition id and option.id must match: ${def.id} vs ${def.option.id}`,
      );
    }
    if (def.id.trim() === "") {
      throw new Error("Base-map asset registry entry has an empty id.");
    }
    if (seen.has(def.id)) {
      throw new Error(`Duplicate base-map asset id in registry: ${def.id}`);
    }
    seen.add(def.id);
    const defTrans = def.transitionalPlaceholder === true;
    const optTrans = def.option.transitionalPlaceholder === true;
    if (defTrans !== optTrans) {
      throw new Error(
        `Transitional flag mismatch for ${def.id}: align definition and BaseMapOption.`,
      );
    }
  }
  const assets: EquirectBaseMapAsset[] = entries.map(toAsset);
  for (const entry of assets) {
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

assertRegistry(DEFINITIONS);

const REGISTRY: readonly EquirectBaseMapAsset[] = DEFINITIONS.map((d) => toAsset(d));

const BASE_MAP_REGISTRY = new Map<string, EquirectBaseMapAsset>(REGISTRY.map((entry) => [entry.id, entry]));

const OPTION_BY_ID = new Map<string, BaseMapOption>(DEFINITIONS.map((d) => [d.id, d.option]));

/**
 * All supported equirectangular base map choices for UI (labels, not raw id lists).
 * Order matches the static {@link SUPPORTED_EQUIRECT_BASE_MAP_IDS} registry.
 */
export const EQUIRECT_BASE_MAP_OPTIONS: readonly BaseMapOption[] = DEFINITIONS.map((d) => d.option);

/**
 * Per-category order for config UI (optgroup ordering).
 */
export const BASE_MAP_OPTION_CATEGORY_ORDER: readonly BaseMapOption["category"][] = [
  "reference",
  "political",
  "terrain",
  "scientific",
] as const;

/**
 * Resolves a {@link BaseMapOption} for any `SceneConfig.baseMap.id` (including legacy aliases);
 * the returned `id` is always the canonical registry id.
 */
export function getEquirectBaseMapOptionForId(sceneBaseMapId: string): BaseMapOption {
  const asset = resolveEquirectBaseMapAsset(sceneBaseMapId);
  return OPTION_BY_ID.get(asset.id) ?? { id: asset.id, label: asset.id, category: "reference" };
}

function canonicalBaseMapId(id: string): string {
  const trimmed = id.trim();
  return LEGACY_ID_ALIASES.get(trimmed) ?? trimmed;
}

export const SUPPORTED_EQUIRECT_BASE_MAP_IDS = REGISTRY.map((entry) => entry.id);

export function resolveEquirectBaseMapAsset(id: string): EquirectBaseMapAsset {
  const canonicalId = canonicalBaseMapId(id);
  return (
    BASE_MAP_REGISTRY.get(canonicalId) ?? BASE_MAP_REGISTRY.get(DEFAULT_EQUIRECT_BASE_MAP_ID)!
  );
}

/**
 * For editor writes: always persist a canonical `SceneConfig.baseMap.id` that matches
 * the registry, so stored configs stay stable and round-trip the selector.
 */
export function canonicalEquirectBaseMapIdForPersistence(id: string): string {
  return resolveEquirectBaseMapAsset(id).id;
}

export function resolveEquirectBaseMapImageSrc(id: string): string {
  return resolveEquirectBaseMapAsset(id).src;
}
