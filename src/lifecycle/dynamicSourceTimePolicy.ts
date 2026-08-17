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
 * Shared current-only vs historical-capable classification for dynamic sources.
 * Catalogs own the field; this module is the single lookup so consumers do not
 * infer independently.
 */

import { getDynamicEquirectSourceCatalogEntry } from "./dynamicEquirectSourceCatalog";
import { getDynamicPointFeaturesSourceCatalogEntry } from "./dynamicPointFeaturesSourceCatalog";
import { getDynamicTracksSourceCatalogEntry } from "./dynamicTracksSourceCatalog";
import type { DynamicSourceId } from "./dynamicSnapshotTypes";

/**
 * `wallClockCurrent`: the snapshot represents present wall-clock reality under
 * the current provider implementation (latest GIBS mosaic, USGS past-day,
 * current CelesTrak TLE). It must not be shown when product time is not
 * live-enough.
 */
export type DynamicSourceTimePolicy = "wallClockCurrent";

export function getDynamicSourceTimePolicy(
  sourceId: DynamicSourceId,
): DynamicSourceTimePolicy | null {
  const equirect = getDynamicEquirectSourceCatalogEntry(sourceId);
  if (equirect?.timePolicy !== undefined) {
    return equirect.timePolicy;
  }
  const points = getDynamicPointFeaturesSourceCatalogEntry(sourceId);
  if (points?.timePolicy !== undefined) {
    return points.timePolicy;
  }
  const tracks = getDynamicTracksSourceCatalogEntry(sourceId);
  if (tracks?.timePolicy !== undefined) {
    return tracks.timePolicy;
  }
  return null;
}

export function isWallClockCurrentSource(sourceId: DynamicSourceId): boolean {
  return getDynamicSourceTimePolicy(sourceId) === "wallClockCurrent";
}
