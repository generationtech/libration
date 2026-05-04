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
 * Bundled registry for emissive **composition** rasters (night lights, etc.).
 * Separate from {@link base-map-catalog.json}: not selectable as `scene.baseMap.id`.
 * @see `src/assets/composition/emissive-composition-catalog.json`
 */

import emissiveCompositionCatalogJson from "../assets/composition/emissive-composition-catalog.json";

export type EmissiveCompositionCatalogEntry = Readonly<{
  id: string;
  label: string;
  shortDescription?: string;
  src: string;
  attribution?: string;
  transitionalPlaceholder?: true;
}>;

export type EmissiveCompositionCatalogFile = Readonly<{
  version: number;
  defaultEmissiveCompositionAssetId: string;
  entries: readonly EmissiveCompositionCatalogEntry[];
}>;

/** Resolved equirect composition input; same geographic contract as base maps, different product role. */
export type EmissiveCompositionAsset = Readonly<{
  id: string;
  src: string;
  projectionId: "equirectangular";
  extent: Readonly<{ minLat: -90; maxLat: 90; minLon: -180; maxLon: 180 }>;
  orientation: "north-up";
  hasPadding: false;
  transitionalPlaceholder?: true;
  label: string;
  shortDescription?: string;
  attribution?: string;
}>;

const FULL_WORLD_EXTENT = {
  minLat: -90,
  maxLat: 90,
  minLon: -180,
  maxLon: 180,
} as const;

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

/**
 * Validates the emissive composition catalog file shape (throws on invalid authoring data).
 * Exported for tests with fixture objects.
 */
export function parseAndValidateEmissiveCompositionCatalog(
  file: EmissiveCompositionCatalogFile,
): Readonly<{
  defaultEmissiveCompositionAssetId: string;
  entries: readonly EmissiveCompositionCatalogEntry[];
  assetsById: ReadonlyMap<string, EmissiveCompositionAsset>;
}> {
  if (file.version !== 1) {
    throw new Error(`Emissive composition catalog: expected version 1, got ${String(file.version)}`);
  }
  const { defaultEmissiveCompositionAssetId, entries } = file;
  if (typeof defaultEmissiveCompositionAssetId !== "string" || defaultEmissiveCompositionAssetId.trim() === "") {
    throw new Error("Emissive composition catalog: defaultEmissiveCompositionAssetId is empty");
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Emissive composition catalog: entries must be a non-empty array");
  }

  const seen = new Set<string>();
  const assetsById = new Map<string, EmissiveCompositionAsset>();

  for (const raw of entries) {
    if (!isPlainObject(raw)) {
      throw new Error("Emissive composition catalog: entry is not an object");
    }
    const e = raw as unknown as EmissiveCompositionCatalogEntry;
    if (typeof e.id !== "string" || e.id !== e.id.trim() || e.id === "") {
      throw new Error("Emissive composition catalog: entry has empty or whitespace id");
    }
    if (seen.has(e.id)) {
      throw new Error(`Duplicate emissive composition asset id in catalog: ${e.id}`);
    }
    seen.add(e.id);
    if (typeof e.label !== "string" || e.label.trim() === "") {
      throw new Error(`Emissive composition catalog: ${e.id} requires a non-empty label`);
    }
    if (typeof e.src !== "string" || e.src.trim() === "") {
      throw new Error(`Emissive composition catalog: ${e.id} requires non-empty src`);
    }
    const src = e.src.trim();
    if (!src.startsWith("/")) {
      throw new Error(`Emissive composition catalog: ${e.id} src must be an app-root path starting with /`);
    }

    const asset: EmissiveCompositionAsset = {
      id: e.id,
      src,
      projectionId: "equirectangular",
      extent: FULL_WORLD_EXTENT,
      orientation: "north-up",
      hasPadding: false,
      label: e.label.trim(),
      ...(e.shortDescription !== undefined && e.shortDescription.trim() !== ""
        ? { shortDescription: e.shortDescription.trim() }
        : {}),
      ...(e.attribution !== undefined && e.attribution.trim() !== ""
        ? { attribution: e.attribution.trim() }
        : {}),
      ...(e.transitionalPlaceholder === true ? { transitionalPlaceholder: true as const } : {}),
    };
    assetsById.set(e.id, asset);
  }

  if (!seen.has(defaultEmissiveCompositionAssetId)) {
    throw new Error(
      `Emissive composition catalog: defaultEmissiveCompositionAssetId "${defaultEmissiveCompositionAssetId}" is not a catalog entry id.`,
    );
  }

  return {
    defaultEmissiveCompositionAssetId,
    entries: entries as readonly EmissiveCompositionCatalogEntry[],
    assetsById,
  };
}

const CATALOG = parseAndValidateEmissiveCompositionCatalog(
  emissiveCompositionCatalogJson as unknown as EmissiveCompositionCatalogFile,
);

/** Canonical default id from the bundled catalog (single source of truth). */
export const DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID = CATALOG.defaultEmissiveCompositionAssetId;

export const SUPPORTED_EMISSIVE_COMPOSITION_ASSET_IDS: readonly string[] = Object.freeze(
  Array.from(CATALOG.assetsById.keys()),
);

export function getEmissiveCompositionCatalogEntry(
  id: string,
): EmissiveCompositionCatalogEntry | undefined {
  const trimmed = id.trim();
  if (trimmed === "") {
    return undefined;
  }
  return CATALOG.entries.find((e) => e.id === trimmed);
}

export function isKnownEmissiveCompositionAssetId(id: string): boolean {
  return CATALOG.assetsById.has(id.trim());
}

/**
 * Maps a persisted or partial `assetId` to a catalog **canonical** id.
 * Blank and unknown ids resolve to {@link DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID}.
 */
export function resolveEmissiveCompositionAssetIdToCanonicalId(requestedId: string): string {
  const id = typeof requestedId === "string" ? requestedId.trim() : "";
  if (id === "" || !CATALOG.assetsById.has(id)) {
    return DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID;
  }
  return id;
}

export function resolveEmissiveCompositionAsset(assetId: string): EmissiveCompositionAsset {
  const canonical = resolveEmissiveCompositionAssetIdToCanonicalId(assetId);
  const asset = CATALOG.assetsById.get(canonical);
  if (!asset) {
    throw new Error(`Emissive composition: internal error, missing asset for "${canonical}"`);
  }
  return asset;
}
