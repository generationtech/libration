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
 * Durable tracks dynamic-source catalog (DLC-3).
 * Persist {@link DynamicTracksSourceCatalogEntry#sourceId} in SceneConfig — never CDN URLs.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import type { DynamicSourceId } from "./dynamicSnapshotTypes";
import { isValidDynamicSourceId } from "./dynamicSnapshotContracts";

export type DynamicTracksSourceCatalogEntry = Readonly<{
  sourceId: DynamicSourceId;
  /** Short UI label. */
  label: string;
  kind: "tracks";
  attribution: string;
  licenseNote?: string;
  /** Preferred periodic refresh cadence (ms). */
  defaultRefreshIntervalMs: number;
  /** Spatial / product contract note for curators / docs. */
  spatialNote: string;
}>;

/** DLC-3 first tracks consumer: ISS orbital ground track. */
export const ISS_ORBITAL_TRACK_SOURCE_ID: DynamicSourceId = "iss-orbital-track-v1";

/**
 * Default refresh for orbital track summaries (~60 s). Acquisition still runs outside rAF.
 * Live CelesTrak / TLE→ephemeris pipelines may tighten later under the same sourceId.
 */
export const ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS = 60 * 1000;

const ISS_ORBITAL_TRACK_ENTRY: DynamicTracksSourceCatalogEntry = {
  sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
  label: "ISS orbital track",
  kind: "tracks",
  attribution:
    "Recorded ISS-shaped GeoJSON FeatureCollection fixture (real application/geo+json timed LineString) for DLC-3 lifecycle consumer validation. Lineage stands in for free public orbital products (e.g. CelesTrak GP / TLE-derived ground tracks); live remote acquisition is a follow-up adapter swap — durable id stays iss-orbital-track-v1.",
  licenseNote:
    "Public orbital element products (CelesTrak / space-track style) are typically redistributable with attribution. Fixture bytes are app-local test/demo content shaped like a timed GeoJSON track. Replace with live acquisition under the same sourceId when shipping production refresh.",
  defaultRefreshIntervalMs: ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS,
  spatialNote:
    "Time-tagged track samples in geographic lon/lat degrees (−180…+180°, −90…+90°), GeoJSON FeatureCollection with timed LineString contract.",
};

const BY_ID = new Map<DynamicSourceId, DynamicTracksSourceCatalogEntry>([
  [ISS_ORBITAL_TRACK_SOURCE_ID, ISS_ORBITAL_TRACK_ENTRY],
]);

export function listDynamicTracksSourceCatalog(): readonly DynamicTracksSourceCatalogEntry[] {
  return [...BY_ID.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

export function getDynamicTracksSourceCatalogEntry(
  sourceId: DynamicSourceId,
): DynamicTracksSourceCatalogEntry | null {
  if (!isValidDynamicSourceId(sourceId)) return null;
  return BY_ID.get(sourceId) ?? null;
}
