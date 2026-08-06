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
 * DLC-2 / DLU-3 acquisition for USGS-lineage earthquake point features.
 * Fixture producer remains for offline / test fallback. Live HTTP uses the
 * DLU-2 seam under durable sourceId `usgs-earthquakes-v1`.
 * Never invoked from rAF / layer constructors / RenderPlan builders.
 */

import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import { createFixtureAcquisitionAdapter } from "./dynamicAcquisition";
import { createLiveHttpAcquisitionAdapter } from "./liveHttpAcquisition";
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
import type {
  LiveHttpFetchFn,
  LiveHttpFetchOk,
} from "./liveHttpAcquisitionTypes";

/**
 * USGS Earthquake Hazards Program real-time GeoJSON summary (past day, all magnitudes).
 * Free public-domain U.S. Government feed; durable SceneConfig id stays
 * {@link USGS_EARTHQUAKES_SOURCE_ID} — never persist this URL.
 */
export const USGS_EARTHQUAKES_LIVE_FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

/** Content-Types accepted from the USGS feed (parameter-stripped). */
export const USGS_EARTHQUAKES_LIVE_ACCEPT_CONTENT_TYPES = [
  "application/json",
  "application/geo+json",
] as const;

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

export type EarthquakesLiveAcquireOptions = EarthquakesAcquireOptions &
  Readonly<{
    /** Override production USGS feed URL (tests). */
    url?: string;
    /** Injectable fetch (tests / desktop bridge). */
    fetchFn?: LiveHttpFetchFn;
    /**
     * When live HTTP fails (non-abort), fall back to the offline fixture under
     * the same durable sourceId. Default true.
     */
    useFixtureFallback?: boolean;
  }>;

export type UsgsEarthquakesGeoJsonParseOk = Readonly<{
  ok: true;
  features: readonly DynamicPointFeature[];
  /** USGS `metadata.generated` when present and finite. */
  generatedMs?: number;
}>;

export type UsgsEarthquakesGeoJsonParseFail = Readonly<{
  ok: false;
  error: string;
}>;

export type UsgsEarthquakesGeoJsonParseResult =
  | UsgsEarthquakesGeoJsonParseOk
  | UsgsEarthquakesGeoJsonParseFail;

function isFiniteLonLat(lon: number, lat: number): boolean {
  return (
    Number.isFinite(lon) &&
    Number.isFinite(lat) &&
    lon >= -180 &&
    lon <= 180 &&
    lat >= -90 &&
    lat <= 90
  );
}

function featureIdFromRaw(raw: unknown, index: number): string {
  if (typeof raw === "string" && raw.trim().length > 0) {
    return raw.trim();
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return String(raw);
  }
  return `usgs-eq-${index}`;
}

/**
 * Parse USGS (or USGS-shaped) GeoJSON FeatureCollection bytes into point features.
 * Skips non-Point geometries and invalid coordinates; fails only when the root
 * document is not a usable FeatureCollection.
 */
export function parseUsgsEarthquakesGeoJsonBytes(
  bytes: Uint8Array,
): UsgsEarthquakesGeoJsonParseResult {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    return { ok: false, error: "empty geojson body" };
  }

  let text: string;
  try {
    text = new TextDecoder().decode(bytes);
  } catch {
    return { ok: false, error: "failed to decode geojson bytes" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    return { ok: false, error: "invalid geojson json" };
  }

  if (
    parsed === null ||
    typeof parsed !== "object" ||
    Array.isArray(parsed) ||
    (parsed as { type?: unknown }).type !== "FeatureCollection" ||
    !Array.isArray((parsed as { features?: unknown }).features)
  ) {
    return { ok: false, error: "expected FeatureCollection" };
  }

  const root = parsed as {
    features: unknown[];
    metadata?: { generated?: unknown };
  };

  const features: DynamicPointFeature[] = [];
  for (let i = 0; i < root.features.length; i++) {
    const feat = root.features[i];
    if (feat === null || typeof feat !== "object" || Array.isArray(feat)) {
      continue;
    }
    const f = feat as {
      id?: unknown;
      geometry?: {
        type?: unknown;
        coordinates?: unknown;
      };
      properties?: unknown;
    };
    if (f.geometry?.type !== "Point") continue;
    const coords = f.geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) continue;
    const lon = Number(coords[0]);
    const lat = Number(coords[1]);
    if (!isFiniteLonLat(lon, lat)) continue;

    const props =
      f.properties !== null &&
      typeof f.properties === "object" &&
      !Array.isArray(f.properties)
        ? (f.properties as Record<string, unknown>)
        : undefined;

    const timeRaw = props?.time;
    const validTimeMs =
      typeof timeRaw === "number" && Number.isFinite(timeRaw)
        ? timeRaw
        : undefined;

    const point: DynamicPointFeature = {
      id: featureIdFromRaw(f.id ?? props?.code, i),
      lonDeg: lon,
      latDeg: lat,
      ...(validTimeMs !== undefined ? { validTimeMs } : {}),
      ...(props !== undefined ? { properties: props } : {}),
    };
    features.push(point);
  }

  let generatedMs: number | undefined;
  const generated = root.metadata?.generated;
  if (typeof generated === "number" && Number.isFinite(generated)) {
    generatedMs = generated;
  }

  return {
    ok: true,
    features,
    ...(generatedMs !== undefined ? { generatedMs } : {}),
  };
}

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
 * Map live USGS GeoJSON HTTP bytes into a store-ready acquisition result.
 */
export function produceEarthquakesLiveAcquisitionFromFetched(
  fetched: LiveHttpFetchOk,
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
  const parsed = parseUsgsEarthquakesGeoJsonBytes(fetched.bytes);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const acquiredAtMs = (options.nowMs ?? Date.now)();
  if (!Number.isFinite(acquiredAtMs)) {
    return { ok: false, error: "invalid acquiredAtMs" };
  }
  const validTimeMs =
    parsed.generatedMs !== undefined && Number.isFinite(parsed.generatedMs)
      ? parsed.generatedMs
      : acquiredAtMs;
  const versionId =
    options.versionIdFor?.(acquiredAtMs) ?? `earthquakes-live-${acquiredAtMs}`;

  const record = buildDynamicSnapshotRecord(
    {
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
      kind: "pointFeatures",
      versionId,
      acquiredAtMs,
      validTimeMs,
      attribution: catalog.attribution,
      ...(catalog.licenseNote !== undefined
        ? { licenseNote: catalog.licenseNote }
        : {}),
    },
    {
      kind: "pointFeatures",
      features: parsed.features,
    },
  );
  if (record === null) {
    return { ok: false, error: "invalid snapshot record" };
  }
  return {
    ok: true,
    entry: { record, payloadBytes: fetched.bytes },
  };
}

/**
 * Fixture acquisition adapter for the DLC-2 earthquakes consumer / offline fallback.
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

/**
 * DLU-3 live HTTP acquisition adapter for {@link USGS_EARTHQUAKES_SOURCE_ID}.
 * Uses the shared DLU-2 live HTTP seam; optional fixture fallback when offline.
 */
export function createEarthquakesLiveHttpAcquisitionAdapter(
  options: EarthquakesLiveAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  const catalog = getDynamicPointFeaturesSourceCatalogEntry(USGS_EARTHQUAKES_SOURCE_ID);
  const useFixtureFallback = options.useFixtureFallback !== false;
  const acquireOptions: EarthquakesAcquireOptions = {
    ...(options.nowMs !== undefined ? { nowMs: options.nowMs } : {}),
    ...(options.versionIdFor !== undefined
      ? { versionIdFor: options.versionIdFor }
      : {}),
  };

  return createLiveHttpAcquisitionAdapter({
    sourceId: USGS_EARTHQUAKES_SOURCE_ID,
    url: options.url ?? USGS_EARTHQUAKES_LIVE_FEED_URL,
    acceptContentTypes: USGS_EARTHQUAKES_LIVE_ACCEPT_CONTENT_TYPES,
    ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
    attribution: {
      ...(catalog?.attribution !== undefined
        ? { attribution: catalog.attribution }
        : {}),
      ...(catalog?.licenseNote !== undefined
        ? { licenseNote: catalog.licenseNote }
        : {}),
    },
    toEntry: (fetched, signal) =>
      produceEarthquakesLiveAcquisitionFromFetched(
        fetched,
        acquireOptions,
        signal,
      ),
    ...(useFixtureFallback
      ? {
          fixtureFallback: (signal?: AbortSignal) =>
            produceEarthquakesFixtureAcquisition(acquireOptions, signal),
        }
      : {}),
  });
}

/** Scene stack row id for the DLC-2 Model B layer (SceneConfig). */
export const EARTHQUAKES_SCENE_LAYER_ID = "earthquakes";

/** Type guard helper for durable source wiring. */
export function isUsgsEarthquakesSourceId(sourceId: DynamicSourceId): boolean {
  return sourceId === USGS_EARTHQUAKES_SOURCE_ID;
}
