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
 * Durable point-features dynamic-source catalog (DLC-2).
 * Persist {@link DynamicPointFeaturesSourceCatalogEntry#sourceId} in SceneConfig — never CDN URLs.
 * @see docs/specs/scene/dynamic-data-lifecycle-plan.md
 */

import type { DynamicSourceId } from "./dynamicSnapshotTypes";
import { isValidDynamicSourceId } from "./dynamicSnapshotContracts";

export type DynamicPointFeaturesSourceCatalogEntry = Readonly<{
  sourceId: DynamicSourceId;
  /** Short UI label. */
  label: string;
  kind: "pointFeatures";
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

/** DLC-2 first point-features consumer: USGS-lineage earthquake feed. */
export const USGS_EARTHQUAKES_SOURCE_ID: DynamicSourceId = "usgs-earthquakes-v1";

/**
 * Default refresh for earthquake summaries (~5 min). Acquisition still runs outside rAF.
 * Live USGS `all_day.geojson` under the same durable sourceId (DLU-3).
 */
export const USGS_EARTHQUAKES_DEFAULT_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

const USGS_EARTHQUAKES_ENTRY: DynamicPointFeaturesSourceCatalogEntry = {
  sourceId: USGS_EARTHQUAKES_SOURCE_ID,
  label: "Earthquakes",
  kind: "pointFeatures",
  attribution:
    "USGS Earthquake Hazards Program real-time GeoJSON (all_day.geojson) via in-app live acquisition under durable id usgs-earthquakes-v1. Production does not fall back to fixture data. Tests and DEV scenarios may use a recorded USGS-shaped FeatureCollection.",
  licenseNote:
    "USGS earthquake products are U.S. Government work / public domain. Live feed URL is not persisted in SceneConfig — only the durable sourceId is.",
  defaultRefreshIntervalMs: USGS_EARTHQUAKES_DEFAULT_REFRESH_INTERVAL_MS,
  spatialNote:
    "Point features in geographic lon/lat degrees (−180…+180°, −90…+90°), USGS GeoJSON FeatureCollection contract.",
  timePolicy: "wallClockCurrent",
};

const BY_ID = new Map<DynamicSourceId, DynamicPointFeaturesSourceCatalogEntry>([
  [USGS_EARTHQUAKES_SOURCE_ID, USGS_EARTHQUAKES_ENTRY],
]);

export function listDynamicPointFeaturesSourceCatalog(): readonly DynamicPointFeaturesSourceCatalogEntry[] {
  return [...BY_ID.values()].sort((a, b) => a.sourceId.localeCompare(b.sourceId));
}

export function getDynamicPointFeaturesSourceCatalogEntry(
  sourceId: DynamicSourceId,
): DynamicPointFeaturesSourceCatalogEntry | null {
  if (!isValidDynamicSourceId(sourceId)) return null;
  return BY_ID.get(sourceId) ?? null;
}
