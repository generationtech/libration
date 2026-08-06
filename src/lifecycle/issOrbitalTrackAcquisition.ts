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
 * DLC-3 acquisition adapter for ISS-lineage orbital tracks.
 * Returns real-format GeoJSON FeatureCollection fixtures. No network in this adapter —
 * live CelesTrak / TLE→ephemeris can replace the producer later under the same sourceId.
 * Never invoked from rAF / layer constructors / RenderPlan builders.
 */

import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import { createFixtureAcquisitionAdapter } from "./dynamicAcquisition";
import {
  ISS_ORBITAL_TRACK_SOURCE_ID,
  getDynamicTracksSourceCatalogEntry,
} from "./dynamicTracksSourceCatalog";
import type { DynamicSnapshotAcquisitionAdapter } from "./dynamicAcquisitionTypes";
import type { DynamicAcquisitionResult } from "./dynamicAcquisitionTypes";
import type {
  DynamicSourceId,
  DynamicTrack,
  DynamicTrackSample,
} from "./dynamicSnapshotTypes";

/**
 * Approximate ISS-like ground track (~51.6° inclination) as timed Lon/Lat samples.
 * Not a live ephemeris — schema matches a GeoJSON timed LineString FeatureCollection.
 */
function buildIssOrbitalTrackFixtureGeoJson(validTimeMs: number): {
  tracks: DynamicTrack[];
  payloadBytes: Uint8Array;
} {
  // Representative segment (~20 min of samples at 2 min spacing).
  const sampleSpecs: Array<{ lon: number; lat: number; offsetMs: number }> = [
    { lon: -120.4, lat: 32.1, offsetMs: -1_200_000 },
    { lon: -105.2, lat: 41.8, offsetMs: -1_080_000 },
    { lon: -88.6, lat: 48.9, offsetMs: -960_000 },
    { lon: -70.1, lat: 51.4, offsetMs: -840_000 },
    { lon: -51.3, lat: 49.2, offsetMs: -720_000 },
    { lon: -34.8, lat: 42.6, offsetMs: -600_000 },
    { lon: -21.5, lat: 33.0, offsetMs: -480_000 },
    { lon: -10.2, lat: 21.4, offsetMs: -360_000 },
    { lon: 0.8, lat: 8.6, offsetMs: -240_000 },
    { lon: 12.4, lat: -4.2, offsetMs: -120_000 },
    { lon: 24.9, lat: -16.8, offsetMs: 0 },
  ];

  const samples: DynamicTrackSample[] = sampleSpecs.map((s) => ({
    lonDeg: s.lon,
    latDeg: s.lat,
    timeMs: validTimeMs + s.offsetMs,
  }));

  const coordinates = samples.map((s) => [s.lonDeg, s.latDeg] as [number, number]);
  const times = samples.map((s) => s.timeMs);

  const collection = {
    type: "FeatureCollection" as const,
    metadata: {
      generated: validTimeMs,
      url: "fixture://iss-orbital-track-v1",
      title: "ISS Orbital Track — DLC-3 fixture",
      status: 200,
      count: 1,
    },
    features: [
      {
        type: "Feature" as const,
        id: "iss",
        geometry: {
          type: "LineString" as const,
          coordinates,
        },
        properties: {
          name: "ISS",
          noradId: 25544,
          times,
          validTimeMs,
          type: "orbital-track",
          title: "ISS (ZARYA)",
        },
      },
    ],
  };

  const tracks: DynamicTrack[] = [
    {
      id: "iss",
      samples,
      properties: {
        name: "ISS",
        noradId: 25544,
        type: "orbital-track",
        title: "ISS (ZARYA)",
      },
    },
  ];

  const payloadBytes = new TextEncoder().encode(JSON.stringify(collection));
  return { tracks, payloadBytes };
}

export type IssOrbitalTrackAcquireOptions = Readonly<{
  /** Override wall/acquire clock (tests). */
  nowMs?: () => number;
  /** Stable version token prefix; default uses acquired epoch. */
  versionIdFor?: (acquiredAtMs: number) => string;
}>;

/**
 * Produce one store-ready tracks entry for {@link ISS_ORBITAL_TRACK_SOURCE_ID}.
 */
export function produceIssOrbitalTrackFixtureAcquisition(
  options: IssOrbitalTrackAcquireOptions = {},
  signal?: AbortSignal,
): DynamicAcquisitionResult {
  if (signal?.aborted) {
    return { ok: false, error: "aborted" };
  }
  const catalog = getDynamicTracksSourceCatalogEntry(ISS_ORBITAL_TRACK_SOURCE_ID);
  if (catalog === null) {
    return { ok: false, error: "missing catalog entry" };
  }
  const acquiredAtMs = (options.nowMs ?? Date.now)();
  if (!Number.isFinite(acquiredAtMs)) {
    return { ok: false, error: "invalid acquiredAtMs" };
  }
  const versionId =
    options.versionIdFor?.(acquiredAtMs) ?? `iss-track-${acquiredAtMs}`;
  const { tracks, payloadBytes } = buildIssOrbitalTrackFixtureGeoJson(acquiredAtMs);
  const record = buildDynamicSnapshotRecord(
    {
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
      kind: "tracks",
      versionId,
      acquiredAtMs,
      validTimeMs: acquiredAtMs,
      attribution: catalog.attribution,
      ...(catalog.licenseNote !== undefined
        ? { licenseNote: catalog.licenseNote }
        : {}),
    },
    {
      kind: "tracks",
      tracks,
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
 * Fixture acquisition adapter for the DLC-3 ISS orbital tracks consumer.
 * Register with the acquisition controller outside the paint path.
 */
export function createIssOrbitalTrackFixtureAcquisitionAdapter(
  options: IssOrbitalTrackAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  return createFixtureAcquisitionAdapter(
    ISS_ORBITAL_TRACK_SOURCE_ID,
    (signal) => produceIssOrbitalTrackFixtureAcquisition(options, signal),
  );
}

/** Scene stack row id for the DLC-3 Model B layer (SceneConfig). */
export const ORBITAL_TRACKS_SCENE_LAYER_ID = "orbitalTracks";

/** Type guard helper for durable source wiring. */
export function isIssOrbitalTrackSourceId(sourceId: DynamicSourceId): boolean {
  return sourceId === ISS_ORBITAL_TRACK_SOURCE_ID;
}
