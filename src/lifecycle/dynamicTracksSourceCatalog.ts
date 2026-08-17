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
  /**
   * When `wallClockCurrent`, presentation is suppressed unless product time is
   * live-enough relative to wall-clock now.
   */
  timePolicy?: "wallClockCurrent";
}>;

/** DLC-3 first tracks consumer: ISS orbital ground track. */
export const ISS_ORBITAL_TRACK_SOURCE_ID: DynamicSourceId = "iss-orbital-track-v1";

/**
 * Default TLE refresh while ISS is enabled (~2 hours).
 * CelesTrak GP updates once per 2 hours and asks clients to download once per
 * update. Marker motion is local SGP4(product UTC); the TLE itself does not
 * need a 1-minute poll.
 */
export const ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS = 2 * 60 * 60 * 1000;

const ISS_ORBITAL_TRACK_ENTRY: DynamicTracksSourceCatalogEntry = {
  sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
  label: "ISS orbital track",
  kind: "tracks",
  attribution:
    "Live ISS TLE via ordered in-app acquisition (CelesTrak GP primary; Where the ISS at TLE secondary) for NORAD 25544, propagated to a timed geographic ground track (SGP4) under durable id iss-orbital-track-v1. Production hides ISS when no live TLE can be acquired; recorded GeoJSON fixture is tests/DEV only and is never painted as live.",
  licenseNote:
    "CelesTrak GP / TLE products are free for redistribution with attribution (one download per 2-hour GP update). Where the ISS at TLE is a public rate-limited REST API (wheretheiss.at/w/developer). Live feed URLs are not persisted in SceneConfig — only the durable sourceId is. Fixture bytes are app-local test/DEV content and are not a production current-ISS substitute.",
  defaultRefreshIntervalMs: ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS,
  spatialNote:
    "Time-tagged track samples in geographic lon/lat degrees (−180…+180°, −90…+90°), GeoJSON FeatureCollection with timed LineString contract.",
  timePolicy: "wallClockCurrent",
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
