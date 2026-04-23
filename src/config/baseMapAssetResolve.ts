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

import {
  calendarMonthUtc1To12FromUnixMs,
  resolveMonthOfYearRasterSrc,
  type MonthOfYearFamilyPaths,
} from "./baseMapMonthResolve";

export { calendarMonthUtc1To12FromUnixMs } from "./baseMapMonthResolve";

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
 * Explicit variant contract for a base map family (registry metadata, not filename guessing).
 */
export type BaseMapVariantMode = "static" | "monthOfYear";

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
  /** When `"monthOfYear"`, {@link resolveEquirectBaseMapImageSrc} uses product month + explicit paths. */
  variantMode?: BaseMapVariantMode;
};

export type BaseMapResolveContext = Readonly<{
  /** Effective product instant (`TimeContext.now`) in Unix milliseconds. */
  productInstantMs: number;
}>;

type EquirectMapDefinition = {
  id: string;
  /**
   * Static raster URL, or legacy flat fallback for a `"monthOfYear"` family when
   * variant paths are unavailable.
   */
  src: string;
  variantMode?: BaseMapVariantMode;
  monthOfYear?: MonthOfYearFamilyPaths;
  /** Product UI — kept alongside the asset to avoid id / label drift. */
  option: BaseMapOption;
} & Pick<EquirectBaseMapAsset, "transitionalPlaceholder">;

export const DEFAULT_EQUIRECT_BASE_MAP_ID = "equirect-world-legacy-v1";

/** Must match {@link WORLD_EQUIRECTANGULAR_SRC} in `baseMapLayer.ts`. */
const WORLD_EQUIRECTANGULAR_JPG = "/maps/world-equirectangular.jpg";

const FULL_WORLD_EXTENT = {
  minLat: -90,
  maxLat: 90,
  minLon: -180,
  maxLon: 180,
} as const;

const EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR = "/maps/variants/equirect-world-topography-v1";

const EQUIRECT_WORLD_TOPOGRAPHY_V1_MONTH_SRCS = [
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/01.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/02.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/03.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/04.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/05.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/06.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/07.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/08.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/09.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/10.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/11.jpg`,
  `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/12.jpg`,
] as const satisfies MonthOfYearFamilyPaths["monthAssetSrcs"];

const DEFINITIONS: readonly EquirectMapDefinition[] = [
  {
    id: DEFAULT_EQUIRECT_BASE_MAP_ID,
    src: WORLD_EQUIRECTANGULAR_JPG,
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
    variantMode: "monthOfYear",
    src: "/maps/world-equirectangular-topography.jpg",
    monthOfYear: {
      familyBaseSrc: `${EQUIRECT_WORLD_TOPOGRAPHY_V1_DIR}/base.jpg`,
      monthAssetSrcs: EQUIRECT_WORLD_TOPOGRAPHY_V1_MONTH_SRCS,
    },
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
  const variantMode: BaseMapVariantMode = d.variantMode ?? "static";
  const catalogSrc =
    variantMode === "monthOfYear" && d.monthOfYear
      ? d.monthOfYear.familyBaseSrc
      : d.src;
  return {
    id: d.id,
    src: catalogSrc,
    projectionId: "equirectangular",
    extent: FULL_WORLD_EXTENT,
    orientation: "north-up",
    hasPadding: false,
    ...(d.transitionalPlaceholder ? { transitionalPlaceholder: d.transitionalPlaceholder } : {}),
    ...(variantMode === "monthOfYear" ? { variantMode: "monthOfYear" as const } : {}),
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
    const variantMode: BaseMapVariantMode = def.variantMode ?? "static";
    if (variantMode === "monthOfYear") {
      if (!def.monthOfYear) {
        throw new Error(`Base-map ${def.id}: monthOfYear metadata is required when variantMode is monthOfYear.`);
      }
      const { familyBaseSrc, monthAssetSrcs } = def.monthOfYear;
      if (familyBaseSrc.trim() === "") {
        throw new Error(`Base-map ${def.id}: familyBaseSrc must be non-empty for monthOfYear.`);
      }
      if (monthAssetSrcs.length !== 12) {
        throw new Error(`Base-map ${def.id}: monthAssetSrcs must have exactly 12 entries.`);
      }
      const onboarded = def.monthOfYear.onboardedMonths;
      if (onboarded) {
        for (const m of onboarded) {
          if (!Number.isInteger(m) || m < 1 || m > 12) {
            throw new Error(`Base-map ${def.id}: onboardedMonths must use integers 1–12.`);
          }
        }
      }
    } else if (def.monthOfYear) {
      throw new Error(`Base-map ${def.id}: monthOfYear must not be set unless variantMode is monthOfYear.`);
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

const DEFINITION_BY_ID = new Map<string, EquirectMapDefinition>(DEFINITIONS.map((d) => [d.id, d]));

const DEFAULT_DEFINITION = DEFINITION_BY_ID.get(DEFAULT_EQUIRECT_BASE_MAP_ID)!;

function resolveDefinitionRasterSrc(def: EquirectMapDefinition, productInstantMs: number): string {
  const variantMode: BaseMapVariantMode = def.variantMode ?? "static";
  if (variantMode !== "monthOfYear" || !def.monthOfYear) {
    return def.src;
  }
  const month = calendarMonthUtc1To12FromUnixMs(productInstantMs);
  const fromFamily = resolveMonthOfYearRasterSrc(def.monthOfYear, month).trim();
  if (fromFamily !== "") {
    return fromFamily;
  }
  const legacy = def.src.trim();
  if (legacy !== "") {
    return def.src;
  }
  return DEFAULT_DEFINITION.src;
}

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

/**
 * Resolves the public raster URL for a base map family id.
 * Static families ignore `context`. Month-aware families use {@link BaseMapResolveContext.productInstantMs}
 * (UTC civil month). When `context` is omitted, wall-clock `Date.now()` is used (e.g. editor previews).
 */
export function resolveEquirectBaseMapImageSrc(id: string, context?: BaseMapResolveContext): string {
  const canonicalId = canonicalBaseMapId(id.trim());
  const def = DEFINITION_BY_ID.get(canonicalId);
  const ms = context?.productInstantMs ?? Date.now();
  if (!def) {
    return resolveDefinitionRasterSrc(DEFAULT_DEFINITION, ms);
  }
  const resolved = resolveDefinitionRasterSrc(def, ms).trim();
  if (resolved === "") {
    return resolveDefinitionRasterSrc(DEFAULT_DEFINITION, ms);
  }
  return resolved;
}
