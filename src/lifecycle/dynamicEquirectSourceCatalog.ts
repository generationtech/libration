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
 * Durable equirect dynamic-source catalog (DLC-1).
 * Persist {@link DynamicEquirectSourceCatalogEntry#sourceId} in SceneConfig — never CDN URLs.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import type { DynamicSourceId } from "./dynamicSnapshotTypes";
import { isValidDynamicSourceId } from "./dynamicSnapshotContracts";
import {
  CLOUDS_CATALOG_ATTRIBUTION,
  CLOUDS_EUMET_LICENSE_NOTE,
} from "./cloudProvenance";
import { CLOUDS_COMPOSITE_REFRESH_INTERVAL_MS, CLOUDS_GIBS_GEO_FRESH_MAX_AGE_MS, CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS } from "./cloudsSectors";

export type DynamicEquirectSourceCatalogEntry = Readonly<{
  sourceId: DynamicSourceId;
  /** Short UI label. */
  label: string;
  kind: "equirectRaster";
  attribution: string;
  licenseNote?: string;
  /** Preferred periodic refresh cadence (ms). */
  defaultRefreshIntervalMs: number;
  /**
   * Spatial contract note for curators / docs.
   * Product prefers −180…+180° equirect.
   */
  spatialNote: string;
  /**
   * When `wallClockCurrent`, presentation is suppressed unless product time is
   * live-enough relative to wall-clock now.
   */
  timePolicy?: "wallClockCurrent";
  /** Provider/source nominal observation cadence when known. */
  nominalCadenceMs?: number;
  /** Observation age ≤ this is presented as recent. */
  freshUntilMs?: number;
  /** Observation age ≤ this may still paint as stale. */
  staleUntilMs?: number;
  /** Observation age above this suppresses paint. */
  suppressAfterMs?: number;
  coverageKind?: "global" | "partial";
}>;

/** DLC-1 first consumer: global equirect clouds (durable id preserved). */
export const GLOBAL_CLOUDS_IR_SOURCE_ID: DynamicSourceId = "global-clouds-ir-v1";

/**
 * Default refresh for Clouds v3 (per-sector GEO ~10–15 min). The adapter
 * skips EUMET ring GetMap when a valid ring was fetched within 30 min.
 * Acquisition still runs outside rAF.
 */
export const GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS =
  CLOUDS_COMPOSITE_REFRESH_INTERVAL_MS;

const GLOBAL_CLOUDS_IR_ENTRY: DynamicEquirectSourceCatalogEntry = {
  sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
  label: "Clouds",
  kind: "equirectRaster",
  attribution: CLOUDS_CATALOG_ATTRIBUTION,
  licenseNote: `${CLOUDS_EUMET_LICENSE_NOTE} NASA GIBS Band13 sectors are independent observations with NASA Earthdata attribution.`,
  defaultRefreshIntervalMs: GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS,
  spatialNote:
    "Full-world equirectangular −180…+180° longitude, −90…+90° latitude. Best-current composition: EUMETSAT geostationary-ring IR as backstop; GOES-West, GOES-East, Meteosat FES, and Himawari overwrite their footprints with independent observation times. Polar holes stay transparent.",
  timePolicy: "wallClockCurrent",
  nominalCadenceMs: 10 * 60 * 1000,
  freshUntilMs: CLOUDS_GIBS_GEO_FRESH_MAX_AGE_MS,
  staleUntilMs: CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS,
  suppressAfterMs: CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS,
  coverageKind: "global",
};

const BY_ID = new Map<DynamicSourceId, DynamicEquirectSourceCatalogEntry>([
  [GLOBAL_CLOUDS_IR_SOURCE_ID, GLOBAL_CLOUDS_IR_ENTRY],
]);

export function listDynamicEquirectSourceCatalog(): readonly DynamicEquirectSourceCatalogEntry[] {
  return [...BY_ID.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

export function getDynamicEquirectSourceCatalogEntry(
  sourceId: DynamicSourceId,
): DynamicEquirectSourceCatalogEntry | null {
  if (!isValidDynamicSourceId(sourceId)) return null;
  return BY_ID.get(sourceId) ?? null;
}
