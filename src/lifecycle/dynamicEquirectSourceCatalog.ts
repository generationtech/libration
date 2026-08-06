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
}>;

/** DLC-1 first consumer: global equirect clouds / satellite IR. */
export const GLOBAL_CLOUDS_IR_SOURCE_ID: DynamicSourceId = "global-clouds-ir-v1";

/**
 * Default refresh for cloud/IR (~15 min). Acquisition still runs outside rAF.
 * Live feeds may tighten later per source policy.
 */
export const GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS = 15 * 60 * 1000;

const GLOBAL_CLOUDS_IR_ENTRY: DynamicEquirectSourceCatalogEntry = {
  sourceId: GLOBAL_CLOUDS_IR_SOURCE_ID,
  label: "Global clouds / IR",
  kind: "equirectRaster",
  attribution:
    "Recorded global equirect JPEG fixture (real image/jpeg) for DLC-1 lifecycle consumer validation. Lineage stands in for free global cloud/IR products (e.g. NOAA GOES full-disk IR / NASA GIBS cloud mosaics); live remote acquisition is a follow-up adapter swap — durable id stays global-clouds-ir-v1.",
  licenseNote:
    "Fixture bytes are app-local test/demo content. Replace with a rights-cleared live feed under the same sourceId when shipping production acquisition.",
  defaultRefreshIntervalMs: GLOBAL_CLOUDS_IR_DEFAULT_REFRESH_INTERVAL_MS,
  spatialNote: "Full-world equirectangular −180…+180° longitude, −90…+90° latitude.",
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
