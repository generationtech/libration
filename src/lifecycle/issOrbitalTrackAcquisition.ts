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
 * DLC-3 / DLU-4 acquisition for ISS-lineage orbital tracks.
 * Fixture producer remains for offline / test fallback. Live HTTP tries
 * CelesTrak GP (TLE) first, then Where the ISS at TLE, under durable
 * sourceId `iss-orbital-track-v1`, then propagates a timed ground track via
 * SGP4 outside rAF.
 * Never invoked from rAF / layer constructors / RenderPlan builders.
 */

import {
  degreesLat,
  degreesLong,
  eciToGeodetic,
  gstime,
  propagate,
  twoline2satrec,
  type EciVec3,
  type Kilometer,
  type SatRec,
} from "satellite.js";
import { buildDynamicSnapshotRecord } from "./dynamicSnapshotContracts";
import { createFixtureAcquisitionAdapter } from "./dynamicAcquisition";
import {
  applyAcquisitionAttribution,
  fetchLiveHttpBytes,
} from "./liveHttpAcquisition";
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
import type {
  LiveHttpFetchFn,
  LiveHttpFetchOk,
} from "./liveHttpAcquisitionTypes";

/**
 * CelesTrak GP query for ISS (NORAD 25544) in TLE/3LE format.
 * Free public orbital elements; durable SceneConfig id stays
 * {@link ISS_ORBITAL_TRACK_SOURCE_ID} — never persist this URL.
 */
export const ISS_ORBITAL_TRACK_LIVE_FEED_URL =
  "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE";

/**
 * Secondary live TLE (text 3LE). Public rate-limited REST API with CORS.
 * @see https://wheretheiss.at/w/developer
 */
export const ISS_ORBITAL_TRACK_SECONDARY_LIVE_FEED_URL =
  "https://api.wheretheiss.at/v1/satellites/25544/tles?format=text";

/** Bound for one ISS TLE HTTP attempt so a hung primary can fail over. */
export const ISS_TLE_ACQUIRE_TIMEOUT_MS = 8_000;

/** After all live providers fail, retry once on this delay if still enabled. */
export const ISS_TLE_FAILURE_RETRY_MS = 5 * 60 * 1000;

export type IssTleLiveProviderId = "celestrak" | "wheretheiss-at";

export type IssTleLiveProvider = Readonly<{
  id: IssTleLiveProviderId;
  url: string;
  acceptContentTypes: readonly string[];
  attribution: string;
}>;

export const ISS_TLE_LIVE_PROVIDERS: readonly IssTleLiveProvider[] = [
  {
    id: "celestrak",
    url: ISS_ORBITAL_TRACK_LIVE_FEED_URL,
    acceptContentTypes: ["text/plain"],
    attribution:
      "CelesTrak GP (TLE) for ISS NORAD 25544 via in-app live acquisition.",
  },
  {
    id: "wheretheiss-at",
    url: ISS_ORBITAL_TRACK_SECONDARY_LIVE_FEED_URL,
    acceptContentTypes: ["text/plain"],
    attribution:
      "Where the ISS at TLE for ISS NORAD 25544 via in-app live acquisition (api.wheretheiss.at).",
  },
];

/** Content-Types accepted from the CelesTrak TLE feed (parameter-stripped). */
export const ISS_ORBITAL_TRACK_LIVE_ACCEPT_CONTENT_TYPES = [
  "text/plain",
] as const;

/** NORAD catalog number for ISS (ZARYA). */
export const ISS_NORAD_CATALOG_NUMBER = 25544;

/** Ground-track lookback before center time (past track). */
export const ISS_ORBITAL_TRACK_LOOKBACK_MS = 60 * 60 * 1000;

/** Ground-track lookahead after center time (future track). */
export const ISS_ORBITAL_TRACK_LOOKAHEAD_MS = 30 * 60 * 1000;

/** Sample spacing along the propagated track. */
export const ISS_ORBITAL_TRACK_SAMPLE_STEP_MS = 2 * 60 * 1000;

/** Track-property keys carrying the live TLE so the current marker can be re-propagated. */
export const ISS_TLE_NAME_PROPERTY = "tleName";
export const ISS_TLE_LINE1_PROPERTY = "tleLine1";
export const ISS_TLE_LINE2_PROPERTY = "tleLine2";
/** Acquisition origin stamp: live TLE vs recorded fixture. */
export const ISS_ORIGIN_PROPERTY = "issOrigin";
/** Which live TLE provider supplied the element set (`celestrak` / `wheretheiss-at`). */
export const ISS_TLE_PROVIDER_PROPERTY = "issTleProvider";

export type IssTleLines = Readonly<{
  name: string;
  line1: string;
  line2: string;
}>;

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
          noradId: ISS_NORAD_CATALOG_NUMBER,
          times,
          validTimeMs,
          type: "orbital-track",
          title: "ISS (ZARYA)",
          [ISS_ORIGIN_PROPERTY]: "fixture",
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
        noradId: ISS_NORAD_CATALOG_NUMBER,
        type: "orbital-track",
        title: "ISS (ZARYA)",
        [ISS_ORIGIN_PROPERTY]: "fixture",
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

export type IssOrbitalTrackLiveAcquireOptions = IssOrbitalTrackAcquireOptions &
  Readonly<{
    /** Override production CelesTrak TLE URL (tests). */
    url?: string;
    /** Injectable fetch (tests / desktop bridge). */
    fetchFn?: LiveHttpFetchFn;
    /**
     * When live HTTP fails (non-abort), fall back to the offline fixture under
     * the same durable sourceId. Default false — production must not paint
     * fixture as the current ISS. Tests / DEV may opt in.
     */
    useFixtureFallback?: boolean;
    /** Override lookback window for SGP4 ground-track samples (tests). */
    lookbackMs?: number;
    /** Override lookahead window for SGP4 ground-track samples (tests). */
    lookaheadMs?: number;
    /** Override sample step for SGP4 ground-track samples (tests). */
    sampleStepMs?: number;
    /** Per-attempt HTTP timeout; default {@link ISS_TLE_ACQUIRE_TIMEOUT_MS}. */
    timeoutMs?: number;
    /**
     * Live TLE provider identity stamped onto a successful live snapshot.
     * Production chain sets this per attempt; tests may override.
     */
    tleProvider?: IssTleLiveProviderId;
  }>;

export type IssTleParseOk = Readonly<{
  ok: true;
  name: string;
  line1: string;
  line2: string;
}>;

export type IssTleParseFail = Readonly<{
  ok: false;
  error: string;
}>;

export type IssTleParseResult = IssTleParseOk | IssTleParseFail;

export type IssGroundTrackPropagateOk = Readonly<{
  ok: true;
  name: string;
  samples: readonly DynamicTrackSample[];
}>;

export type IssGroundTrackPropagateFail = Readonly<{
  ok: false;
  error: string;
}>;

export type IssGroundTrackPropagateResult =
  | IssGroundTrackPropagateOk
  | IssGroundTrackPropagateFail;

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

function normalizeLonDeg(lon: number): number {
  let x = lon % 360;
  if (x > 180) x -= 360;
  if (x < -180) x += 360;
  return x;
}

function isEciPosition(
  position: EciVec3<Kilometer> | boolean,
): position is EciVec3<Kilometer> {
  return (
    typeof position === "object" &&
    position !== null &&
    Number.isFinite(position.x) &&
    Number.isFinite(position.y) &&
    Number.isFinite(position.z)
  );
}

function geodeticSampleAt(
  satrec: SatRec,
  timeMs: number,
): DynamicTrackSample | null {
  const date = new Date(timeMs);
  const pv = propagate(satrec, date);
  if (!isEciPosition(pv.position)) {
    return null;
  }
  const gmst = gstime(date);
  const gd = eciToGeodetic(pv.position, gmst);
  const lonDeg = normalizeLonDeg(degreesLong(gd.longitude));
  const latDeg = degreesLat(gd.latitude);
  if (!isFiniteLonLat(lonDeg, latDeg)) {
    return null;
  }
  return { lonDeg, latDeg, timeMs };
}

/**
 * Julian-date TLE epoch as Unix milliseconds, or null if the TLE cannot be parsed.
 */
export function issTleEpochUnixMs(tle: IssTleLines): number | null {
  let satrec: SatRec;
  try {
    satrec = twoline2satrec(tle.line1, tle.line2);
  } catch {
    return null;
  }
  const jd = satrec.jdsatepoch;
  if (!Number.isFinite(jd)) {
    return null;
  }
  return (jd - 2440587.5) * 86_400_000;
}

export type IssPositionAtTimeOk = Readonly<{
  ok: true;
  sample: DynamicTrackSample;
}>;

export type IssPositionAtTimeFail = Readonly<{
  ok: false;
  error: string;
}>;

export type IssPositionAtTimeResult = IssPositionAtTimeOk | IssPositionAtTimeFail;

/**
 * One SGP4 geographic sample at an exact UTC instant.
 * The current ISS marker must use this, not the first or last track sample.
 */
export function propagateIssPositionAtTime(
  tle: IssTleLines,
  productUtcMs: number,
): IssPositionAtTimeResult {
  if (!Number.isFinite(productUtcMs)) {
    return { ok: false, error: "invalid productUtcMs" };
  }
  let satrec: SatRec;
  try {
    satrec = twoline2satrec(tle.line1, tle.line2);
  } catch {
    return { ok: false, error: "failed to initialize satrec from TLE" };
  }
  const sample = geodeticSampleAt(satrec, productUtcMs);
  if (sample === null) {
    return { ok: false, error: "propagation yielded no position" };
  }
  return { ok: true, sample };
}

export function tleLinesFromTrackProperties(
  properties: Readonly<Record<string, unknown>> | undefined,
): IssTleLines | null {
  if (properties === undefined) return null;
  const line1 = properties[ISS_TLE_LINE1_PROPERTY];
  const line2 = properties[ISS_TLE_LINE2_PROPERTY];
  if (typeof line1 !== "string" || typeof line2 !== "string") {
    return null;
  }
  if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) {
    return null;
  }
  const nameRaw = properties[ISS_TLE_NAME_PROPERTY];
  const name =
    typeof nameRaw === "string" && nameRaw.trim().length > 0
      ? nameRaw.trim()
      : "ISS (ZARYA)";
  return { name, line1, line2 };
}

function nearestSampleByTime(
  samples: readonly DynamicTrackSample[],
  productUtcMs: number,
): DynamicTrackSample | null {
  if (samples.length === 0 || !Number.isFinite(productUtcMs)) {
    return null;
  }
  let best = samples[0]!;
  let bestDist = Math.abs(best.timeMs - productUtcMs);
  for (let i = 1; i < samples.length; i += 1) {
    const s = samples[i]!;
    const d = Math.abs(s.timeMs - productUtcMs);
    if (d < bestDist) {
      best = s;
      bestDist = d;
    }
  }
  return best;
}

/**
 * Current ISS sample at `productUtcMs`: explicit SGP4 when a TLE is on the
 * track, otherwise the timed sample nearest the product instant (fixture).
 */
export function resolveIssCurrentSample(
  track: Readonly<{
    samples: readonly DynamicTrackSample[];
    properties?: Readonly<Record<string, unknown>>;
  }>,
  productUtcMs: number,
): DynamicTrackSample | null {
  const tle = tleLinesFromTrackProperties(track.properties);
  if (tle !== null) {
    const propagated = propagateIssPositionAtTime(tle, productUtcMs);
    if (propagated.ok) {
      return propagated.sample;
    }
  }
  return nearestSampleByTime(track.samples, productUtcMs);
}

/**
 * Parse CelesTrak TLE / 3LE (or 2LE) text bytes into name + two element lines.
 */
export function parseIssTleBytes(bytes: Uint8Array): IssTleParseResult {
  if (!(bytes instanceof Uint8Array) || bytes.byteLength === 0) {
    return { ok: false, error: "empty tle body" };
  }

  let text: string;
  try {
    text = new TextDecoder().decode(bytes);
  } catch {
    return { ok: false, error: "failed to decode tle bytes" };
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.trim().length > 0);

  if (lines.length < 2) {
    return { ok: false, error: "expected at least two TLE lines" };
  }

  let name = "ISS (ZARYA)";
  let line1: string;
  let line2: string;

  if (lines.length >= 3 && !lines[0]!.startsWith("1 ")) {
    name = lines[0]!.trim() || name;
    line1 = lines[1]!;
    line2 = lines[2]!;
  } else {
    line1 = lines[0]!;
    line2 = lines[1]!;
  }

  if (!line1.startsWith("1 ") || !line2.startsWith("2 ")) {
    return { ok: false, error: "invalid TLE line prefixes" };
  }
  if (line1.length < 60 || line2.length < 60) {
    return { ok: false, error: "TLE lines too short" };
  }

  return { ok: true, name, line1, line2 };
}

/**
 * Propagate a timed geographic ground track from TLE lines via SGP4.
 * Runs outside rAF — call from acquisition adapters only.
 */
export function propagateIssGroundTrackFromTle(
  tle: Readonly<{ name: string; line1: string; line2: string }>,
  options: Readonly<{
    centerTimeMs: number;
    lookbackMs?: number;
    lookaheadMs?: number;
    sampleStepMs?: number;
  }>,
): IssGroundTrackPropagateResult {
  const centerTimeMs = options.centerTimeMs;
  if (!Number.isFinite(centerTimeMs)) {
    return { ok: false, error: "invalid centerTimeMs" };
  }

  const lookbackMs =
    options.lookbackMs !== undefined &&
    Number.isFinite(options.lookbackMs) &&
    options.lookbackMs >= 0
      ? options.lookbackMs
      : ISS_ORBITAL_TRACK_LOOKBACK_MS;
  const lookaheadMs =
    options.lookaheadMs !== undefined &&
    Number.isFinite(options.lookaheadMs) &&
    options.lookaheadMs >= 0
      ? options.lookaheadMs
      : ISS_ORBITAL_TRACK_LOOKAHEAD_MS;
  const sampleStepMs =
    options.sampleStepMs !== undefined &&
    Number.isFinite(options.sampleStepMs) &&
    options.sampleStepMs > 0
      ? options.sampleStepMs
      : ISS_ORBITAL_TRACK_SAMPLE_STEP_MS;

  let satrec: SatRec;
  try {
    satrec = twoline2satrec(tle.line1, tle.line2);
  } catch {
    return { ok: false, error: "failed to initialize satrec from TLE" };
  }

  const startMs = centerTimeMs - lookbackMs;
  const endMs = centerTimeMs + lookaheadMs;
  const samples: DynamicTrackSample[] = [];

  for (let t = startMs; t <= endMs + 1; t += sampleStepMs) {
    const sample = geodeticSampleAt(satrec, t);
    if (sample !== null) {
      samples.push(sample);
    }
  }

  if (samples.length < 2) {
    return { ok: false, error: "propagation yielded insufficient samples" };
  }

  return {
    ok: true,
    name: tle.name.trim().length > 0 ? tle.name.trim() : "ISS (ZARYA)",
    samples,
  };
}

function buildTracksGeoJsonPayload(options: {
  validTimeMs: number;
  name: string;
  samples: readonly DynamicTrackSample[];
  sourceUrl: string;
  title: string;
  tle?: IssTleLines;
  tleProvider?: IssTleLiveProviderId;
}): { tracks: DynamicTrack[]; payloadBytes: Uint8Array } {
  const tleProps =
    options.tle !== undefined
      ? {
          [ISS_ORIGIN_PROPERTY]: "live-tle",
          [ISS_TLE_NAME_PROPERTY]: options.tle.name,
          [ISS_TLE_LINE1_PROPERTY]: options.tle.line1,
          [ISS_TLE_LINE2_PROPERTY]: options.tle.line2,
          ...(options.tleProvider !== undefined
            ? { [ISS_TLE_PROVIDER_PROPERTY]: options.tleProvider }
            : {}),
        }
      : { [ISS_ORIGIN_PROPERTY]: "fixture" };
  const coordinates = options.samples.map(
    (s) => [s.lonDeg, s.latDeg] as [number, number],
  );
  const times = options.samples.map((s) => s.timeMs);
  const collection = {
    type: "FeatureCollection" as const,
    metadata: {
      generated: options.validTimeMs,
      url: options.sourceUrl,
      title: options.title,
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
          name: options.name,
          noradId: ISS_NORAD_CATALOG_NUMBER,
          times,
          validTimeMs: options.validTimeMs,
          type: "orbital-track",
          title: options.name,
          ...tleProps,
        },
      },
    ],
  };

  const tracks: DynamicTrack[] = [
    {
      id: "iss",
      samples: options.samples,
      properties: {
        name: options.name,
        noradId: ISS_NORAD_CATALOG_NUMBER,
        type: "orbital-track",
        title: options.name,
        ...tleProps,
      },
    },
  ];

  return {
    tracks,
    payloadBytes: new TextEncoder().encode(JSON.stringify(collection)),
  };
}

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
 * Map live CelesTrak TLE HTTP bytes into a store-ready tracks acquisition result
 * (SGP4 ground track + GeoJSON payload for cache lineage).
 */
export function produceIssOrbitalTrackLiveAcquisitionFromFetched(
  fetched: LiveHttpFetchOk,
  options: IssOrbitalTrackLiveAcquireOptions = {},
  signal?: AbortSignal,
): DynamicAcquisitionResult {
  if (signal?.aborted) {
    return { ok: false, error: "aborted" };
  }
  const catalog = getDynamicTracksSourceCatalogEntry(ISS_ORBITAL_TRACK_SOURCE_ID);
  if (catalog === null) {
    return { ok: false, error: "missing catalog entry" };
  }

  const parsed = parseIssTleBytes(fetched.bytes);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }

  const acquiredAtMs = (options.nowMs ?? Date.now)();
  if (!Number.isFinite(acquiredAtMs)) {
    return { ok: false, error: "invalid acquiredAtMs" };
  }

  const propagated = propagateIssGroundTrackFromTle(
    {
      name: parsed.name,
      line1: parsed.line1,
      line2: parsed.line2,
    },
    {
      centerTimeMs: acquiredAtMs,
      ...(options.lookbackMs !== undefined
        ? { lookbackMs: options.lookbackMs }
        : {}),
      ...(options.lookaheadMs !== undefined
        ? { lookaheadMs: options.lookaheadMs }
        : {}),
      ...(options.sampleStepMs !== undefined
        ? { sampleStepMs: options.sampleStepMs }
        : {}),
    },
  );
  if (!propagated.ok) {
    return { ok: false, error: propagated.error };
  }

  if (signal?.aborted) {
    return { ok: false, error: "aborted" };
  }

  const versionId =
    options.versionIdFor?.(acquiredAtMs) ?? `iss-track-live-${acquiredAtMs}`;
  const tle: IssTleLines = {
    name: parsed.name,
    line1: parsed.line1,
    line2: parsed.line2,
  };
  const tleProvider = options.tleProvider ?? "celestrak";
  const providerAttribution =
    ISS_TLE_LIVE_PROVIDERS.find((p) => p.id === tleProvider)?.attribution ??
    catalog.attribution;
  const { tracks, payloadBytes } = buildTracksGeoJsonPayload({
    validTimeMs: acquiredAtMs,
    name: propagated.name,
    samples: propagated.samples,
    sourceUrl: fetched.responseUrl || ISS_ORBITAL_TRACK_LIVE_FEED_URL,
    title: "ISS Orbital Track — DLU-4 live",
    tle,
    tleProvider,
  });

  const record = buildDynamicSnapshotRecord(
    {
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
      kind: "tracks",
      versionId,
      acquiredAtMs,
      validTimeMs: acquiredAtMs,
      attribution: providerAttribution,
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
 * Fixture acquisition adapter for the DLC-3 ISS orbital tracks consumer /
 * offline fallback. Register with the acquisition controller outside the paint path.
 */
export function createIssOrbitalTrackFixtureAcquisitionAdapter(
  options: IssOrbitalTrackAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  return createFixtureAcquisitionAdapter(
    ISS_ORBITAL_TRACK_SOURCE_ID,
    (signal) => produceIssOrbitalTrackFixtureAcquisition(options, signal),
  );
}

/**
 * DLU-4 live HTTP acquisition adapter for {@link ISS_ORBITAL_TRACK_SOURCE_ID}.
 * Tries CelesTrak then Where the ISS at TLE in one cycle, each with a bounded
 * timeout. Fixture fallback is opt-in (tests/DEV); production hides ISS when
 * no live TLE can be acquired.
 */
export function createIssOrbitalTrackLiveHttpAcquisitionAdapter(
  options: IssOrbitalTrackLiveAcquireOptions = {},
): DynamicSnapshotAcquisitionAdapter {
  const catalog = getDynamicTracksSourceCatalogEntry(ISS_ORBITAL_TRACK_SOURCE_ID);
  const useFixtureFallback = options.useFixtureFallback === true;
  const timeoutMs =
    options.timeoutMs !== undefined &&
    Number.isFinite(options.timeoutMs) &&
    options.timeoutMs > 0
      ? options.timeoutMs
      : ISS_TLE_ACQUIRE_TIMEOUT_MS;
  const acquireOptions: IssOrbitalTrackLiveAcquireOptions = {
    ...(options.nowMs !== undefined ? { nowMs: options.nowMs } : {}),
    ...(options.versionIdFor !== undefined
      ? { versionIdFor: options.versionIdFor }
      : {}),
    ...(options.lookbackMs !== undefined
      ? { lookbackMs: options.lookbackMs }
      : {}),
    ...(options.lookaheadMs !== undefined
      ? { lookaheadMs: options.lookaheadMs }
      : {}),
    ...(options.sampleStepMs !== undefined
      ? { sampleStepMs: options.sampleStepMs }
      : {}),
  };

  const providers: readonly IssTleLiveProvider[] =
    options.url !== undefined
      ? [
          {
            id: "celestrak",
            url: options.url,
            acceptContentTypes: ISS_ORBITAL_TRACK_LIVE_ACCEPT_CONTENT_TYPES,
            attribution:
              catalog?.attribution ??
              ISS_TLE_LIVE_PROVIDERS[0]!.attribution,
          },
        ]
      : ISS_TLE_LIVE_PROVIDERS;

  return {
    sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    async acquire(signal?: AbortSignal): Promise<DynamicAcquisitionResult> {
      if (signal?.aborted) {
        return { ok: false, error: "aborted" };
      }

      let lastError = "live fetch failed";
      for (const provider of providers) {
        if (signal?.aborted) {
          return { ok: false, error: "aborted" };
        }
        const fetched = await fetchLiveHttpBytes({
          url: provider.url,
          acceptContentTypes: provider.acceptContentTypes,
          signal,
          timeoutMs,
          ...(options.fetchFn !== undefined ? { fetchFn: options.fetchFn } : {}),
        });
        if (fetched.ok) {
          const mapped = produceIssOrbitalTrackLiveAcquisitionFromFetched(
            fetched,
            { ...acquireOptions, tleProvider: provider.id },
            signal,
          );
          if (mapped.ok) {
            return {
              ok: true,
              entry: applyAcquisitionAttribution({
                entry: mapped.entry,
                attribution: {
                  attribution: provider.attribution,
                  ...(catalog?.licenseNote !== undefined
                    ? { licenseNote: catalog.licenseNote }
                    : {}),
                },
              }),
            };
          }
          lastError = mapped.error;
          continue;
        }
        if (fetched.aborted || signal?.aborted) {
          return { ok: false, error: "aborted" };
        }
        lastError =
          fetched.error.trim().length > 0 ? fetched.error.trim() : lastError;
      }

      if (useFixtureFallback) {
        return produceIssOrbitalTrackFixtureAcquisition(acquireOptions, signal);
      }
      return { ok: false, error: lastError };
    },
  };
}

/** Scene stack row id for the DLC-3 Model B layer (SceneConfig). */
export const ORBITAL_TRACKS_SCENE_LAYER_ID = "orbitalTracks";

/** Type guard helper for durable source wiring. */
export function isIssOrbitalTrackSourceId(sourceId: DynamicSourceId): boolean {
  return sourceId === ISS_ORBITAL_TRACK_SOURCE_ID;
}
