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

import type { MonthOfYearFamilyPaths } from "./baseMapMonthResolve";
import type { BaseMapOption, BaseMapVariantMode } from "./baseMapTypes";

/**
 * File-backed catalog of supported equirectangular base map families. Loaded at build time; not fetched at runtime.
 * @see `src/assets/maps/base-map-catalog.json`
 */
export type BaseMapCategory = BaseMapOption["category"];

export type BaseMapDefaultPresentation = Readonly<{
  opacity?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  gamma?: number;
}>;

export type BaseMapCapabilities = Readonly<{
  temporal?: boolean;
  overlayOptimized?: boolean;
  emissiveCompatible?: boolean;
  darkFriendly?: boolean;
  seasonal?: boolean;
}>;

export type BaseMapCatalogEntry = Readonly<{
  id: string;
  label: string;
  shortDescription?: string;
  category: BaseMapCategory;
  attribution?: string;
  /** UI / registry; paired with EquirectBaseMapAsset. */
  transitionalPlaceholder?: true;
  variantMode: BaseMapVariantMode;
  /**
   * Static: primary equirect raster. Month-of-year: the family base (must match `monthOfYear.familyBaseSrc` when present).
   */
  src: string;
  /**
   * For `variantMode: "monthOfYear"` only. Legacy flat equirect used when month walk fails, before the global default.
   */
  legacyStaticSrc?: string;
  previewThumbnailSrc?: string;
  monthOfYear?: Readonly<{
    familyBaseSrc: string;
    monthAssetSrcs: readonly [string, string, string, string, string, string, string, string, string, string, string, string];
    onboardedMonths?: readonly number[];
  }>;
  defaultPresentation?: BaseMapDefaultPresentation;
  capabilities?: BaseMapCapabilities;
  recommendedRoles?: readonly string[];
}>;

/**
 * Materialized from {@link BaseMapCatalogEntry} for the resolver: keeps UI option + back-reference to the catalog row.
 */
export type EquirectMapDefinition = Readonly<{
  id: string;
  src: string;
  variantMode: BaseMapVariantMode;
  monthOfYear?: MonthOfYearFamilyPaths;
  option: BaseMapOption;
  transitionalPlaceholder?: true;
  catalogEntry: BaseMapCatalogEntry;
}>;

export type BaseMapCatalogFile = Readonly<{
  version: number;
  defaultEquirectBaseMapId: string;
  entries: readonly BaseMapCatalogEntry[];
}>;

function isPlainObject(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

const CATEGORIES: readonly BaseMapCategory[] = ["reference", "political", "terrain", "scientific"];

function asCategory(s: string): s is BaseMapCategory {
  return (CATEGORIES as readonly string[]).includes(s);
}

function toMonthOfYearForResolve(m: BaseMapCatalogEntry["monthOfYear"]): MonthOfYearFamilyPaths | undefined {
  if (!m) {
    return undefined;
  }
  return {
    familyBaseSrc: m.familyBaseSrc,
    monthAssetSrcs: m.monthAssetSrcs,
    onboardedMonths: m.onboardedMonths,
  };
}

/**
 * Build internal resolver definitions and validate catalog shape (throws on invalid data).
 * Used on module load; tests re-run validation with fixtures.
 */
export function parseAndValidateBaseMapCatalog(file: BaseMapCatalogFile): Readonly<{
  defaultEquirectBaseMapId: string;
  entries: readonly BaseMapCatalogEntry[];
  definitions: readonly EquirectMapDefinition[];
}> {
  if (file.version !== 1) {
    throw new Error(`Base map catalog: expected version 1, got ${String(file.version)}`);
  }
  const { defaultEquirectBaseMapId, entries } = file;
  if (defaultEquirectBaseMapId.trim() === "") {
    throw new Error("Base map catalog: defaultEquirectBaseMapId is empty");
  }
  if (!Array.isArray(entries) || entries.length === 0) {
    throw new Error("Base map catalog: entries must be a non-empty array");
  }

  const seen = new Set<string>();
  const definitions: EquirectMapDefinition[] = [];

  for (const raw of entries) {
    if (!isPlainObject(raw as unknown as object)) {
      throw new Error("Base map catalog: entry is not an object");
    }
    const e = raw as BaseMapCatalogEntry;
    if (e.id !== e.id.trim() || e.id === "") {
      throw new Error("Base map catalog: entry has empty or whitespace id");
    }
    if (seen.has(e.id)) {
      throw new Error(`Duplicate base-map asset id in catalog: ${e.id}`);
    }
    seen.add(e.id);
    if (!e.label || e.label.trim() === "") {
      throw new Error(`Base map catalog: ${e.id} requires a non-empty label`);
    }
    if (!asCategory(e.category)) {
      throw new Error(`Base map catalog: ${e.id} has invalid category "${e.category}"`);
    }
    const optTrans = e.transitionalPlaceholder === true;
    const defTrans = e.transitionalPlaceholder === true;
    if (defTrans !== optTrans) {
      throw new Error(`Base map catalog: ${e.id} transitional flag mismatch (internal).`);
    }

    const variantMode: BaseMapVariantMode = e.variantMode ?? "static";
    if (variantMode !== "static" && variantMode !== "monthOfYear") {
      throw new Error(`Base map catalog: ${e.id} invalid variantMode "${String(e.variantMode)}"`);
    }

    if (e.src.trim() === "") {
      throw new Error(`Base map catalog: ${e.id} requires non-empty src`);
    }

    if (variantMode === "static") {
      if (e.monthOfYear) {
        throw new Error(`Base map catalog: ${e.id} must not set monthOfYear when variantMode is static.`);
      }
    } else {
      const m = e.monthOfYear;
      if (!m) {
        throw new Error(`Base map catalog: ${e.id} monthOfYear metadata is required when variantMode is monthOfYear.`);
      }
      if (e.src.trim() !== m.familyBaseSrc.trim()) {
        throw new Error(
          `Base map catalog: ${e.id} top-level src must match monthOfYear.familyBaseSrc for monthOfYear families.`,
        );
      }
      if (m.familyBaseSrc.trim() === "") {
        throw new Error(`Base map catalog: ${e.id} familyBaseSrc must be non-empty for monthOfYear.`);
      }
      if (!m.monthAssetSrcs || m.monthAssetSrcs.length !== 12) {
        throw new Error(`Base map catalog: ${e.id} monthAssetSrcs must have exactly 12 entries.`);
      }
      const ob = m.onboardedMonths;
      if (ob) {
        for (const n of ob) {
          if (!Number.isInteger(n) || n < 1 || n > 12) {
            throw new Error(`Base map catalog: ${e.id} onboardedMonths must use integers 1–12.`);
          }
        }
      }
    }

    const monthForResolve = toMonthOfYearForResolve(e.monthOfYear);
    if (variantMode === "static" && e.legacyStaticSrc) {
      throw new Error(`Base map catalog: ${e.id} legacyStaticSrc is only valid for monthOfYear families.`);
    }

    const defSrcForResolve =
      variantMode === "monthOfYear" ? (e.legacyStaticSrc?.trim() ?? "") : e.src;
    if (variantMode === "static") {
      definitions.push({
        id: e.id,
        src: e.src,
        variantMode: "static",
        option: toOptionFromEntry(e),
        transitionalPlaceholder: e.transitionalPlaceholder,
        catalogEntry: e,
      } as EquirectMapDefinition);
    } else {
      definitions.push({
        id: e.id,
        src: defSrcForResolve,
        variantMode: "monthOfYear",
        monthOfYear: monthForResolve!,
        option: toOptionFromEntry(e),
        transitionalPlaceholder: e.transitionalPlaceholder,
        catalogEntry: e,
      } as EquirectMapDefinition);
    }
  }

  if (!seen.has(defaultEquirectBaseMapId)) {
    throw new Error(
      `Base map catalog: defaultEquirectBaseMapId "${defaultEquirectBaseMapId}" is not a catalog entry id.`,
    );
  }

  return { defaultEquirectBaseMapId, entries, definitions: definitions as readonly EquirectMapDefinition[] };
}

function toOptionFromEntry(e: BaseMapCatalogEntry): BaseMapOption {
  return {
    id: e.id,
    label: e.label,
    shortDescription: e.shortDescription,
    category: e.category,
    attribution: e.attribution,
    previewThumbnailSrc: e.previewThumbnailSrc,
    transitionalPlaceholder: e.transitionalPlaceholder,
  };
}
