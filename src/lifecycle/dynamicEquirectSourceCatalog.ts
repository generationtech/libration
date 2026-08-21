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
 * Default refresh for Clouds v1 (~10 min GIBS Band13 slots). Acquisition still
 * runs outside rAF. Live NASA GIBS WMS under the same durable sourceId.
 */
export const GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS = 10 * 60 * 1000;

const GLOBAL_CLOUDS_IR_ENTRY: DynamicEquirectSourceCatalogEntry = {
  sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
  label: "Clouds",
  kind: "equirectRaster",
  attribution:
    "NASA GIBS GOES-East, GOES-West, and Himawari Band 13 Clean Infrared equirect PNG via in-app live WMS (explicit TIME) under durable id global-clouds-ir-v1. DEV/tests may use a recorded PNG fixture; production never presents fixture as live.",
  licenseNote:
    "NASA GIBS / Earthdata imagery is free and open for public use with attribution. Live feed URL is not persisted in SceneConfig — only the durable sourceId is. Fixture bytes are app-local test/demo content.",
  defaultRefreshIntervalMs: GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS,
  spatialNote:
    "Full-world equirectangular −180…+180° longitude, −90…+90° latitude. Coverage is partial: geostationary disks only; Africa/Europe and polar holes stay transparent.",
  timePolicy: "wallClockCurrent",
  nominalCadenceMs: 10 * 60 * 1000,
  freshUntilMs: 3 * 60 * 60 * 1000,
  staleUntilMs: 6 * 60 * 60 * 1000,
  suppressAfterMs: 6 * 60 * 60 * 1000,
  coverageKind: "partial",
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
