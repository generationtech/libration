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

import baseMapCatalogJson from "../assets/maps/base-map-catalog.json";
import {
  parseAndValidateBaseMapCatalog,
  type BaseMapCatalogEntry,
  type EquirectMapDefinition,
} from "./baseMapCatalog";
import {
  calendarMonthUtc1To12FromUnixMs,
  resolveMonthOfYearRasterSrc,
  type MonthOfYearFamilyPaths,
} from "./baseMapMonthResolve";
import type {
  BaseMapOption,
  BaseMapVariantMode,
  EquirectBaseMapAsset,
  BaseMapResolveContext,
} from "./baseMapTypes";

export { calendarMonthUtc1To12FromUnixMs } from "./baseMapMonthResolve";
export type {
  BaseMapOption,
  BaseMapVariantMode,
  EquirectBaseMapAsset,
  BaseMapResolveContext,
} from "./baseMapTypes";
export type { BaseMapCatalogEntry, BaseMapDefaultPresentation, BaseMapCapabilities } from "./baseMapCatalog";
export type { EquirectMapDefinition };

const CATALOG = parseAndValidateBaseMapCatalog(
  baseMapCatalogJson as unknown as import("./baseMapCatalog").BaseMapCatalogFile,
);

const DEFINITIONS: readonly EquirectMapDefinition[] = CATALOG.definitions;

const LEGACY_ID_ALIASES = new Map<string, string>([
  ["political-v1", "equirect-world-political-v1"],
  ["world-equirectangular-v1", CATALOG.defaultEquirectBaseMapId],
  ["equirect-world-topo-v1", "equirect-world-topography-v1"],
]);

const FULL_WORLD_EXTENT = {
  minLat: -90,
  maxLat: 90,
  minLon: -180,
  maxLon: 180,
} as const;

function toAsset(d: EquirectMapDefinition): EquirectBaseMapAsset {
  const variantMode: BaseMapVariantMode = d.variantMode ?? "static";
  const catalogSrc =
    variantMode === "monthOfYear" && d.monthOfYear ? d.monthOfYear.familyBaseSrc : d.src;
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

function assertDefinitionRuntime(entries: readonly EquirectMapDefinition[]): void {
  for (const def of entries) {
    if (def.id !== def.option.id) {
      throw new Error(
        `Base-map definition id and option.id must match: ${def.id} vs ${def.option.id}`,
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

assertDefinitionRuntime(DEFINITIONS);

const REGISTRY: readonly EquirectBaseMapAsset[] = DEFINITIONS.map((d) => toAsset(d));

const BASE_MAP_REGISTRY = new Map<string, EquirectBaseMapAsset>(REGISTRY.map((entry) => [entry.id, entry]));

const OPTION_BY_ID = new Map(
  DEFINITIONS.map((d) => [d.id, d.option] as const),
);

const DEFINITION_BY_ID = new Map(
  DEFINITIONS.map((d) => [d.id, d] as const),
);

const CATALOG_ENTRY_BY_ID = new Map(
  DEFINITIONS.map((d) => [d.id, d.catalogEntry] as const),
);

export const DEFAULT_EQUIRECT_BASE_MAP_ID: string = CATALOG.defaultEquirectBaseMapId;

const DEFAULT_DEFINITION = DEFINITION_BY_ID.get(DEFAULT_EQUIRECT_BASE_MAP_ID)!;

function isExcludedFromResolve(url: string, ex: ReadonlySet<string>): boolean {
  return ex.has(url.trim());
}

/** Last resort: the default map family’s primary static raster, even if in `ex`. */
function globalDefaultFallbackSrcLastResort(_ex: ReadonlySet<string>): string {
  const d = DEFAULT_DEFINITION;
  if ((d.variantMode ?? "static") === "static") {
    return d.src;
  }
  return d.monthOfYear!.familyBaseSrc;
}

function resolveDefinitionRasterSrc(
  def: EquirectMapDefinition,
  productInstantMs: number,
  excludedImageSrcs: ReadonlySet<string> = new Set(),
): string {
  const ex = excludedImageSrcs;
  const variantMode: BaseMapVariantMode = def.variantMode ?? "static";
  if (variantMode !== "monthOfYear" || !def.monthOfYear) {
    const s = def.src.trim();
    if (s !== "" && !isExcludedFromResolve(s, ex)) {
      return def.src;
    }
    return globalDefaultFallbackSrcLastResort(ex);
  }
  const month = calendarMonthUtc1To12FromUnixMs(productInstantMs);
  const fromFamily = resolveMonthOfYearRasterSrc(
    def.monthOfYear as MonthOfYearFamilyPaths,
    month,
    ex,
  ).trim();
  if (fromFamily !== "") {
    return fromFamily;
  }
  const legacy = def.src.trim();
  if (legacy !== "" && !isExcludedFromResolve(legacy, ex)) {
    return def.src;
  }
  return globalDefaultFallbackSrcLastResort(ex);
}

/**
 * All supported equirectangular base map choices for UI (labels, not raw id lists).
 * Order is the `entries` order in `base-map-catalog.json`.
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
  return (
    OPTION_BY_ID.get(asset.id) ?? { id: asset.id, label: asset.id, category: "reference" as const }
  );
}

/**
 * Returns the materialized catalog row for the family {@link resolveEquirectBaseMapAsset} would select.
 */
export function getEquirectBaseMapCatalogEntry(id: string): BaseMapCatalogEntry {
  const asset = resolveEquirectBaseMapAsset(id);
  return CATALOG_ENTRY_BY_ID.get(asset.id)!;
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
 * When `excludedImageSrcs` is set, month-aware families walk backward from the product month
 * skipping failed URLs, then `familyBaseSrc`, then the global default.
 */
export function resolveEquirectBaseMapImageSrc(id: string, context?: BaseMapResolveContext): string {
  const ex = context?.excludedImageSrcs ?? new Set();
  const canonicalId = canonicalBaseMapId(id.trim());
  const def = DEFINITION_BY_ID.get(canonicalId);
  const ms = context?.productInstantMs ?? Date.now();
  if (!def) {
    return resolveDefinitionRasterSrc(DEFAULT_DEFINITION, ms, ex);
  }
  return resolveDefinitionRasterSrc(def, ms, ex);
}

/**
 * For a fixed world raster URL (no registry id), used by legacy static base map layers.
 * If that URL is excluded, applies the same global default resolution as an unknown id.
 */
export function resolveEquirectBaseMapImageSrcForFixedWorldSrc(
  fixedSrc: string,
  context?: BaseMapResolveContext,
): string {
  const ex = context?.excludedImageSrcs ?? new Set();
  const t = fixedSrc.trim();
  if (t !== "" && !isExcludedFromResolve(t, ex)) {
    return fixedSrc;
  }
  return resolveEquirectBaseMapImageSrc(DEFAULT_EQUIRECT_BASE_MAP_ID, context);
}
