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
 * DLC-2 acquisition adapter for USGS-lineage earthquake point features.
 * Returns real-format GeoJSON FeatureCollection fixtures. No network in this adapter —
 * live USGS HTTP can replace the producer later under the same sourceId.
 * Never invoked from rAF / layer constructors / RenderPlan builders.
 */

import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import { createFixtureAcquisitionAdapter } from "./dynamicAcquisition";
import {
  USGS_EARTHQUAKES_SOURCE_ID,
  getDynamicPointFeaturesSourceCatalogEntry,
} from "./dynamicPointFeaturesSourceCatalog";
import type { DynamicSnapshotAcquisitionAdapter } from "./dynamicAcquisitionTypes";
import type { DynamicAcquisitionResult } from "./dynamicAcquisitionTypes";
import type {
  DynamicPointFeature,
  DynamicSourceId,
} from "./dynamicSnapshotTypes";

/**
 * Recorded USGS-shaped GeoJSON (FeatureCollection of Point features).
 * Coordinates are [lon, lat] per GeoJSON / USGS Earthquake Hazards Program.
 */
function buildUsgsEarthquakeFixtureGeoJson(validTimeMs: number): {
  features: DynamicPointFeature[];
  payloadBytes: Uint8Array;
} {
  // Representative worldwide events (not a live feed) — real GeoJSON schema.
  const rows: Array<{
    id: string;
    lon: number;
    lat: number;
    mag: number;
    place: string;
    timeOffsetMs: number;
  }> = [
    {
      id: "us7000fixture1",
      lon: -155.28,
      lat: 19.42,
      mag: 4.2,
      place: "12 km ENE of Pāhala, Hawaii",
      timeOffsetMs: -3_600_000,
    },
    {
      id: "us7000fixture2",
      lon: 142.37,
      lat: 38.15,
      mag: 5.1,
      place: "Off the east coast of Honshu, Japan",
      timeOffsetMs: -7_200_000,
    },
    {
      id: "us7000fixture3",
      lon: -71.65,
      lat: -33.05,
      mag: 3.8,
      place: "25 km W of Valparaíso, Chile",
      timeOffsetMs: -10_800_000,
    },
    {
      id: "us7000fixture4",
      lon: 28.23,
      lat: 38.41,
      mag: 4.6,
      place: "Aegean Sea",
      timeOffsetMs: -14_400_000,
    },
  ];

  const geoFeatures = rows.map((r) => {
    const time = validTimeMs + r.timeOffsetMs;
    return {
      type: "Feature" as const,
      id: r.id,
      geometry: {
        type: "Point" as const,
        coordinates: [r.lon, r.lat] as [number, number],
      },
      properties: {
        mag: r.mag,
        place: r.place,
        time,
        updated: validTimeMs,
        type: "earthquake",
        title: `M ${r.mag.toFixed(1)} - ${r.place}`,
      },
    };
  });

  const collection = {
    type: "FeatureCollection" as const,
    metadata: {
      generated: validTimeMs,
      url: "fixture://usgs-earthquakes-v1",
      title: "USGS Earthquakes — DLC-2 fixture",
      status: 200,
      api: "1.6.0",
      count: geoFeatures.length,
    },
    features: geoFeatures,
  };

  const features: DynamicPointFeature[] = rows.map((r) => ({
    id: r.id,
    lonDeg: r.lon,
    latDeg: r.lat,
    validTimeMs: validTimeMs + r.timeOffsetMs,
    properties: {
      mag: r.mag,
      place: r.place,
      time: validTimeMs + r.timeOffsetMs,
      type: "earthquake",
      title: `M ${r.mag.toFixed(1)} - ${r.place}`,
    },
  }));

  const payloadBytes = new TextEncoder().encode(JSON.stringify(collection));
  return { features, payloadBytes };
}

export type EarthquakesAcquireOptions = Readonly<{
  /** Override wall/acquire clock (tests). */
  nowMs?: () => number;
  /** Stable version token prefix; default uses acquired epoch. */
  versionIdFor?: (acquiredAtMs: number) => string;
}>;

/**
 * Produce one store-ready point-features entry for {@link USGS_EARTHQUAKES_SOURCE_ID}.
 */
export function produceEarthquakesFixtureAcquisition(
  options: EarthquakesAcquireOptions = {},
  signal?: AbortSignal,
): DynamicAcquisitionResult {
  if (signal?.aborted) {
    return { ok: false, error: "aborted" };
  }
  const catalog = getDynamicPointFeaturesSourceCatalogEntry(USGS_EARTHQUAKES_SOURCE_ID);
  if (catalog === null) {
    return { ok: false, error: "missing catalog entry" };
  }
  const acquiredAtMs = (options.nowMs ?? Date.now)();
  if (!Number.isFinite(acquiredAtMs)) {
    return { ok: false, error: "invalid acquiredAtMs" };
  }
  const versionId =
    options.versionIdFor?.(acquiredAtMs) ?? `earthquakes-${acquiredAtMs}`;
  const { features, payloadBytes } = buildUsgsEarthquakeFixtureGeoJson(acquiredAtMs);
  const record = buildDynamicSnapshotRecord(
    {
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
      kind: "pointFeatures",
      versionId,
      acquiredAtMs,
      validTimeMs: acquiredAtMs,
      attribution: catalog.attribution,
      ...(catalog.licenseNote !== undefined
        ? { licenseNote: catalog.licenseNote }
        : {}),
    },
    {
      kind: "pointFeatures",
      features,
    },
  );
  if (record === null) {
    return { ok: false, error: "invalid snapshot record" };
  }
  return {
    ok: true,
    entry: { record, payloadBytes },
  };
}

/**
 * Fixture acquisition adapter for the DLC-2 earthquakes consumer.
 * Register with the acquisition controller outside the paint path.
 */
export function createEarthquakesFixtureAcquisitionAdapter(
  options: EarthquakesAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  return createFixtureAcquisitionAdapter(
    USGS_EARTHQUAKES_SOURCE_ID,
    (signal) => produceEarthquakesFixtureAcquisition(options, signal),
  );
}

/** Scene stack row id for the DLC-2 Model B layer (SceneConfig). */
export const EARTHQUAKES_SCENE_LAYER_ID = "earthquakes";

/** Type guard helper for durable source wiring. */
export function isUsgsEarthquakesSourceId(sourceId: DynamicSourceId): boolean {
  return sourceId === USGS_EARTHQUAKES_SOURCE_ID;
}
