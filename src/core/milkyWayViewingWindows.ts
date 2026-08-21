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
 * Headless reference-city Milky Way Viewing Window enumerator.
 * Authority is Galactic-center altitude, solar altitude, and existing local
 * moonlight — never contour pixels, RenderPlan, clouds, or light pollution.
 */

import { activeLunarEclipseAt } from "./eclipse/eclipseAuthority";
import { lunarEclipseGeometryAt } from "./eclipse/lunarEclipseGeometry";
import {
  galacticEquatorOfDate,
  MILKY_WAY_AUTHORITY_VERSION,
} from "./milkyWayGalactic";
import {
  altitudeDegFromSubpoint,
  geographicDirectionDotProduct,
  localMoonlightContribution01,
  milkyWayVisibilityMoonStateAt,
  solarAltitudeDegAt,
  type MilkyWayVisibilityMoonState,
} from "./milkyWayVisibilityGeometry";
import {
  MAX_SUN_ALTITUDE_DEG,
  MILKY_WAY_VIEWING_POLICY_VERSION,
  MIN_GC_ALTITUDE_DEG,
  milkyWayAltitudeQuality01,
  milkyWayViewingQualifies,
  nightlyMaximumGcAltitudeDeg,
} from "./milkyWayViewingPolicy";
import {
  isPlanetaryEphemerisSupportedUtc,
  PLANETARY_EPHEMERIS_RANGE_END_MS,
  PLANETARY_EPHEMERIS_RANGE_START_MS,
  planetaryGastDeg,
} from "./planetaryEphemeris";
import { subpointFromApparentEquator, wrapSigned180, type PlanetarySubpointDeg } from "./planetarySubpoint";
import { subsolarPoint } from "./subsolarPoint";

export type MilkyWayViewingObserver = {
  readonly cityId: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
};

export type MilkyWayViewingFeasibility =
  | "ok"
  | "gcNeverRises"
  | "gcInsufficient"
  | "unsupportedRange"
  | "emptyRange";

export type MilkyWayViewingInstantField = {
  readonly utcMs: number;
  readonly gcSub: PlanetarySubpointDeg;
  readonly gcDeclinationDeg: number;
  readonly subsolar: PlanetarySubpointDeg;
  readonly moon: MilkyWayVisibilityMoonState;
};

export type MilkyWayViewingConditions = {
  readonly utcMs: number;
  readonly gcAltitudeDeg: number;
  readonly solarAltitudeDeg: number;
  readonly localMoonlight01: number;
  readonly nightlyMaximumAltitudeDeg: number;
  readonly altitudeQuality01: number;
  readonly qualifies: boolean;
  readonly moonAboveHorizon: boolean;
  readonly lunarIlluminatedFraction: number;
};

export type MilkyWayViewingWindow = {
  readonly id: string;
  readonly policyVersion: typeof MILKY_WAY_VIEWING_POLICY_VERSION;
  readonly cityId: string;
  readonly startUtcMs: number;
  readonly endUtcMs: number;
  readonly peakUtcMs: number;
  readonly peakAltitudeDeg: number;
  readonly nightlyMaximumAltitudeDeg: number;
  readonly peakAltitudeQuality01: number;
  readonly minimumSunAltitudeDeg: number;
  readonly representativeMoonlight01: number;
  readonly peakMoonAboveHorizon: boolean;
  readonly peakIlluminatedFraction: number;
};

export type MilkyWayViewingSearchResult = {
  readonly windows: readonly MilkyWayViewingWindow[];
  readonly feasibility: MilkyWayViewingFeasibility;
  readonly nightlyMaximumAltitudeDeg: number | null;
};

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;
const COARSE_STEP_MS = 12 * 60_000;
const CULMINATION_HALF_WINDOW_MS = 10 * HOUR_MS;
const BOUNDARY_TOLERANCE_MS = 2_000;
const MIN_INTERVAL_MS = 60_000;
const EQD_BUCKET_MS = 6 * HOUR_MS;
const GAST_DEG_PER_HOUR = 15.0410786;
const FORWARD_SEARCH_CHUNKS_MS = [30 * DAY_MS, 90 * DAY_MS, 365 * DAY_MS] as const;

type MilkyWayEnumerateStats = {
  callCount: number;
  lastSpanMs: number;
  totalSpanMs: number;
};

let enumerateStats: MilkyWayEnumerateStats = {
  callCount: 0,
  lastSpanMs: 0,
  totalSpanMs: 0,
};

export function milkyWayEnumerateStatsForTests(): MilkyWayEnumerateStats {
  return { ...enumerateStats };
}

export function resetMilkyWayEnumerateStatsForTests(): void {
  enumerateStats = { callCount: 0, lastSpanMs: 0, totalSpanMs: 0 };
}

type EqdSample = { readonly raDeg: number; readonly decDeg: number };

const eqdCache = new Map<number, EqdSample | null>();
const resultCache = new Map<string, MilkyWayViewingSearchResult>();
const fieldCache = new Map<number, MilkyWayViewingInstantField | null>();

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function clampSupportedRange(startUtcMs: number, endUtcMs: number): {
  startUtcMs: number;
  endUtcMs: number;
} | null {
  const start = Math.max(startUtcMs, PLANETARY_EPHEMERIS_RANGE_START_MS);
  const end = Math.min(endUtcMs, PLANETARY_EPHEMERIS_RANGE_END_MS);
  if (!(end > start)) {
    return null;
  }
  return { startUtcMs: start, endUtcMs: end };
}

function galacticCenterEqd(utcMs: number): EqdSample | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  const bucket = Math.floor(utcMs / EQD_BUCKET_MS);
  const hit = eqdCache.get(bucket);
  if (hit !== undefined) {
    return hit;
  }
  const eq = galacticEquatorOfDate(0, 0, utcMs);
  const val = eq ? { raDeg: eq.raDeg, decDeg: eq.decDeg } : null;
  eqdCache.set(bucket, val);
  if (eqdCache.size > 512) {
    const oldest = eqdCache.keys().next().value;
    if (oldest !== undefined) {
      eqdCache.delete(oldest);
    }
  }
  return val;
}

export function galacticCenterSubpointAt(
  utcMs: number,
): { readonly latDeg: number; readonly lonDeg: number } | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  const eqd = galacticCenterEqd(utcMs);
  const gastDeg = planetaryGastDeg(utcMs);
  if (!eqd || gastDeg === null) {
    return null;
  }
  return subpointFromApparentEquator({
    raDeg: eqd.raDeg,
    decDeg: eqd.decDeg,
    gastDeg,
  });
}

export function milkyWayViewingInstantFieldAt(utcMs: number): MilkyWayViewingInstantField | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  const hit = fieldCache.get(utcMs);
  if (hit !== undefined) {
    return hit;
  }
  const eqd = galacticCenterEqd(utcMs);
  const gastDeg = planetaryGastDeg(utcMs);
  if (!eqd || gastDeg === null) {
    fieldCache.set(utcMs, null);
    return null;
  }
  const gcSub = subpointFromApparentEquator({
    raDeg: eqd.raDeg,
    decDeg: eqd.decDeg,
    gastDeg,
  });
  const eclipse = activeLunarEclipseAt(utcMs);
  const moon = milkyWayVisibilityMoonStateAt(
    utcMs,
    eclipse ? lunarEclipseGeometryAt(eclipse, utcMs) : null,
  );
  const field: MilkyWayViewingInstantField = {
    utcMs,
    gcSub,
    gcDeclinationDeg: eqd.decDeg,
    subsolar: subsolarPoint(utcMs),
    moon,
  };
  fieldCache.set(utcMs, field);
  if (fieldCache.size > 256) {
    const oldest = fieldCache.keys().next().value;
    if (oldest !== undefined) {
      fieldCache.delete(oldest);
    }
  }
  return field;
}

export function evaluateMilkyWayViewingAt(
  field: MilkyWayViewingInstantField,
  latitudeDeg: number,
  longitudeDeg: number,
): MilkyWayViewingConditions {
  const observerPoint = { latDeg: latitudeDeg, lonDeg: longitudeDeg };
  const gcAltitudeDeg = altitudeDegFromSubpoint(observerPoint, field.gcSub);
  const solarAltitudeDeg = solarAltitudeDegAt(latitudeDeg, longitudeDeg, field.subsolar);
  const moonDot = geographicDirectionDotProduct(
    latitudeDeg,
    longitudeDeg,
    field.moon.sublunar.latDeg,
    field.moon.sublunar.lonDeg,
  );
  const localMoonlight01 = localMoonlightContribution01(
    moonDot,
    field.moon.lunarIlluminatedFraction,
    field.moon.moonlightTransmission01,
  );
  const nightlyMaximumAltitudeDeg = nightlyMaximumGcAltitudeDeg(
    latitudeDeg,
    field.gcDeclinationDeg,
  );
  const altitudeQuality01 = milkyWayAltitudeQuality01(
    gcAltitudeDeg,
    nightlyMaximumAltitudeDeg,
  );
  const qualifies = milkyWayViewingQualifies({
    gcAltitudeDeg,
    solarAltitudeDeg,
    localMoonlight01,
    nightlyMaximumAltitudeDeg,
  });
  return {
    utcMs: field.utcMs,
    gcAltitudeDeg,
    solarAltitudeDeg,
    localMoonlight01,
    nightlyMaximumAltitudeDeg,
    altitudeQuality01,
    qualifies,
    moonAboveHorizon: moonDot > 0,
    lunarIlluminatedFraction: field.moon.lunarIlluminatedFraction,
  };
}

export function milkyWayViewingConditionsAt(
  utcMs: number,
  observer: MilkyWayViewingObserver,
): MilkyWayViewingConditions | null {
  const field = milkyWayViewingInstantFieldAt(utcMs);
  if (!field) {
    return null;
  }
  return evaluateMilkyWayViewingAt(field, observer.latitudeDeg, observer.longitudeDeg);
}

function estimateCulminationUtcMs(
  utcMs: number,
  observerLonDeg: number,
  raDeg: number,
): number | null {
  const gast = planetaryGastDeg(utcMs);
  if (gast === null) {
    return null;
  }
  const targetGast = wrap360(raDeg - observerLonDeg);
  const deltaDeg = wrapSigned180(targetGast - gast);
  return utcMs + (deltaDeg / GAST_DEG_PER_HOUR) * HOUR_MS;
}

function sunAltitudeAt(utcMs: number, observer: MilkyWayViewingObserver): number | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  return solarAltitudeDegAt(
    observer.latitudeDeg,
    observer.longitudeDeg,
    subsolarPoint(utcMs),
  );
}

function nightMightOverlapGc(
  culmMs: number,
  observer: MilkyWayViewingObserver,
): boolean {
  for (const t of [culmMs - 6 * HOUR_MS, culmMs, culmMs + 6 * HOUR_MS]) {
    const sun = sunAltitudeAt(t, observer);
    if (sun !== null && sun <= MAX_SUN_ALTITUDE_DEG) {
      return true;
    }
  }
  return false;
}

function milkyWayViewingWindowId(cityId: string, startUtcMs: number): string {
  return `milky-way:${cityId}:${startUtcMs}`;
}

function matchesQualifies(utcMs: number, observer: MilkyWayViewingObserver): boolean {
  return milkyWayViewingConditionsAt(utcMs, observer)?.qualifies === true;
}

/** First instant in (lo, hi] at which the window holds. lo is known false. */
function refineStart(lo: number, hi: number, observer: MilkyWayViewingObserver): number {
  let a = lo;
  let b = hi;
  for (let i = 0; i < 24 && b - a > BOUNDARY_TOLERANCE_MS; i += 1) {
    const mid = Math.floor((a + b) / 2);
    if (matchesQualifies(mid, observer)) {
      b = mid;
    } else {
      a = mid;
    }
  }
  return b;
}

/** First instant in (lo, hi] at which the window fails (exclusive end). lo is known true. */
function refineEnd(lo: number, hi: number, observer: MilkyWayViewingObserver): number {
  let a = lo;
  let b = hi;
  for (let i = 0; i < 24 && b - a > BOUNDARY_TOLERANCE_MS; i += 1) {
    const mid = Math.floor((a + b) / 2);
    if (matchesQualifies(mid, observer)) {
      a = mid;
    } else {
      b = mid;
    }
  }
  return b;
}

function peakInside(
  startUtcMs: number,
  endUtcMs: number,
  observer: MilkyWayViewingObserver,
): { peakUtcMs: number; peakAltitudeDeg: number } {
  let bestT = startUtcMs;
  let bestH = -90;
  const seedStep = Math.max(60_000, Math.floor((endUtcMs - startUtcMs) / 24));
  for (let t = startUtcMs; t <= endUtcMs; t += seedStep) {
    const c = milkyWayViewingConditionsAt(t, observer);
    if (c && c.gcAltitudeDeg > bestH) {
      bestH = c.gcAltitudeDeg;
      bestT = t;
    }
  }
  const endC = milkyWayViewingConditionsAt(endUtcMs, observer);
  if (endC && endC.gcAltitudeDeg > bestH) {
    bestH = endC.gcAltitudeDeg;
    bestT = endUtcMs;
  }
  let lo = Math.max(startUtcMs, bestT - seedStep);
  let hi = Math.min(endUtcMs, bestT + seedStep);
  for (let i = 0; i < 18; i += 1) {
    const span = hi - lo;
    if (span <= BOUNDARY_TOLERANCE_MS) {
      break;
    }
    const m1 = lo + Math.floor(span / 3);
    const m2 = hi - Math.floor(span / 3);
    const a = milkyWayViewingConditionsAt(m1, observer);
    const b = milkyWayViewingConditionsAt(m2, observer);
    const ha = a?.gcAltitudeDeg ?? -90;
    const hb = b?.gcAltitudeDeg ?? -90;
    if (ha < hb - 1e-6) {
      lo = m1;
    } else if (hb < ha - 1e-6) {
      hi = m2;
    } else {
      hi = m2;
    }
  }
  const mid = Math.floor((lo + hi) / 2);
  const c = milkyWayViewingConditionsAt(mid, observer);
  if (c && c.gcAltitudeDeg >= bestH) {
    return { peakUtcMs: mid, peakAltitudeDeg: c.gcAltitudeDeg };
  }
  return { peakUtcMs: bestT, peakAltitudeDeg: bestH };
}

function factsAtPeak(
  startUtcMs: number,
  endUtcMs: number,
  peakUtcMs: number,
  observer: MilkyWayViewingObserver,
): {
  minimumSunAltitudeDeg: number;
  representativeMoonlight01: number;
  peakMoonAboveHorizon: boolean;
  peakIlluminatedFraction: number;
} {
  let minSun = 90;
  const step = Math.max(60_000, Math.floor((endUtcMs - startUtcMs) / 16));
  for (let t = startUtcMs; t <= endUtcMs; t += step) {
    const c = milkyWayViewingConditionsAt(t, observer);
    if (c && c.solarAltitudeDeg < minSun) {
      minSun = c.solarAltitudeDeg;
    }
  }
  const endC = milkyWayViewingConditionsAt(endUtcMs, observer);
  if (endC && endC.solarAltitudeDeg < minSun) {
    minSun = endC.solarAltitudeDeg;
  }
  const peak = milkyWayViewingConditionsAt(peakUtcMs, observer);
  return {
    minimumSunAltitudeDeg: minSun,
    representativeMoonlight01: peak?.localMoonlight01 ?? 0,
    peakMoonAboveHorizon: peak?.moonAboveHorizon ?? false,
    peakIlluminatedFraction: peak?.lunarIlluminatedFraction ?? 1,
  };
}

function cacheKey(
  observer: MilkyWayViewingObserver,
  startUtcMs: number,
  endUtcMs: number,
): string {
  return [
    MILKY_WAY_VIEWING_POLICY_VERSION,
    MILKY_WAY_AUTHORITY_VERSION,
    observer.cityId,
    observer.latitudeDeg.toFixed(4),
    observer.longitudeDeg.toFixed(4),
    String(startUtcMs),
    String(endUtcMs),
  ].join("|");
}

function enumerateUncached(
  observer: MilkyWayViewingObserver,
  startUtcMs: number,
  endUtcMs: number,
): MilkyWayViewingSearchResult {
  enumerateStats = {
    callCount: enumerateStats.callCount + 1,
    lastSpanMs: Math.max(0, endUtcMs - startUtcMs),
    totalSpanMs: enumerateStats.totalSpanMs + Math.max(0, endUtcMs - startUtcMs),
  };
  const clipped = clampSupportedRange(startUtcMs, endUtcMs);
  if (!clipped) {
    const anySupported =
      isPlanetaryEphemerisSupportedUtc(startUtcMs) ||
      isPlanetaryEphemerisSupportedUtc(endUtcMs - 1);
    return {
      windows: [],
      feasibility: anySupported ? "emptyRange" : "unsupportedRange",
      nightlyMaximumAltitudeDeg: null,
    };
  }

  const probe = galacticCenterEqd(clipped.startUtcMs) ?? galacticCenterEqd(clipped.endUtcMs - 1);
  if (!probe) {
    return { windows: [], feasibility: "unsupportedRange", nightlyMaximumAltitudeDeg: null };
  }
  const hMax = nightlyMaximumGcAltitudeDeg(observer.latitudeDeg, probe.decDeg);
  if (hMax < 0) {
    return { windows: [], feasibility: "gcNeverRises", nightlyMaximumAltitudeDeg: hMax };
  }
  if (hMax < MIN_GC_ALTITUDE_DEG) {
    return { windows: [], feasibility: "gcInsufficient", nightlyMaximumAltitudeDeg: hMax };
  }

  type Sample = { t: number; qualifies: boolean };
  const samples: Sample[] = [];
  const day0 = Math.floor(clipped.startUtcMs / DAY_MS) * DAY_MS - DAY_MS;
  const dayN = Math.ceil(clipped.endUtcMs / DAY_MS) * DAY_MS + DAY_MS;
  for (let day = day0; day <= dayN; day += DAY_MS) {
    if (!isPlanetaryEphemerisSupportedUtc(day + 12 * HOUR_MS)) {
      continue;
    }
    const noon = day + 12 * HOUR_MS;
    const eqd = galacticCenterEqd(noon);
    if (!eqd) {
      continue;
    }
    const dayHMax = nightlyMaximumGcAltitudeDeg(observer.latitudeDeg, eqd.decDeg);
    if (dayHMax < MIN_GC_ALTITUDE_DEG) {
      continue;
    }
    const culm = estimateCulminationUtcMs(noon, observer.longitudeDeg, eqd.raDeg);
    if (culm === null) {
      continue;
    }
    if (!nightMightOverlapGc(culm, observer)) {
      continue;
    }
    const from = Math.max(clipped.startUtcMs, culm - CULMINATION_HALF_WINDOW_MS);
    const to = Math.min(clipped.endUtcMs, culm + CULMINATION_HALF_WINDOW_MS);
    if (!(to > from)) {
      continue;
    }
    for (let t = from; t <= to; t += COARSE_STEP_MS) {
      const c = milkyWayViewingConditionsAt(t, observer);
      samples.push({ t, qualifies: c?.qualifies === true });
    }
    if (samples.length === 0 || samples[samples.length - 1]!.t < to) {
      const c = milkyWayViewingConditionsAt(to, observer);
      samples.push({ t: to, qualifies: c?.qualifies === true });
    }
  }
  samples.sort((a, b) => a.t - b.t);
  const deduped: Sample[] = [];
  for (const s of samples) {
    const prev = deduped[deduped.length - 1];
    if (prev && prev.t === s.t) {
      prev.qualifies = s.qualifies;
    } else {
      deduped.push({ ...s });
    }
  }

  const windows: MilkyWayViewingWindow[] = [];
  let i = 0;
  while (i < deduped.length) {
    const startSample = deduped[i]!;
    if (!startSample.qualifies) {
      i += 1;
      continue;
    }
    let j = i + 1;
    while (
      j < deduped.length &&
      deduped[j]!.qualifies &&
      deduped[j]!.t - deduped[j - 1]!.t <= COARSE_STEP_MS * 2
    ) {
      j += 1;
    }
    const prev = i > 0 ? deduped[i - 1]! : null;
    const next = j < deduped.length ? deduped[j]! : null;
    const last = deduped[j - 1]!;
    const startUtc =
      prev === null || startSample.t - prev.t > COARSE_STEP_MS * 2
        ? startSample.t
        : refineStart(prev.t, startSample.t, observer);
    const endUtc =
      next === null || next.t - last.t > COARSE_STEP_MS * 2
        ? Math.min(clipped.endUtcMs, last.t + COARSE_STEP_MS)
        : refineEnd(last.t, next.t, observer);
    if (endUtc - startUtc >= MIN_INTERVAL_MS) {
      const peak = peakInside(startUtc, Math.max(startUtc, endUtc - 1), observer);
      const facts = factsAtPeak(
        startUtc,
        Math.max(startUtc, endUtc - 1),
        peak.peakUtcMs,
        observer,
      );
      const quality = milkyWayAltitudeQuality01(peak.peakAltitudeDeg, hMax);
      windows.push({
        id: milkyWayViewingWindowId(observer.cityId, startUtc),
        policyVersion: MILKY_WAY_VIEWING_POLICY_VERSION,
        cityId: observer.cityId,
        startUtcMs: startUtc,
        endUtcMs: endUtc,
        peakUtcMs: peak.peakUtcMs,
        peakAltitudeDeg: peak.peakAltitudeDeg,
        nightlyMaximumAltitudeDeg: hMax,
        peakAltitudeQuality01: quality,
        minimumSunAltitudeDeg: facts.minimumSunAltitudeDeg,
        representativeMoonlight01: facts.representativeMoonlight01,
        peakMoonAboveHorizon: facts.peakMoonAboveHorizon,
        peakIlluminatedFraction: facts.peakIlluminatedFraction,
      });
    }
    i = j;
  }

  windows.sort((a, b) => a.startUtcMs - b.startUtcMs);
  for (let k = 1; k < windows.length; k += 1) {
    const prevW = windows[k - 1]!;
    const cur = windows[k]!;
    const gap = cur.startUtcMs - prevW.endUtcMs;
    if (gap > 0 && gap <= BOUNDARY_TOLERANCE_MS * 2) {
      windows[k] = {
        ...cur,
        startUtcMs: prevW.endUtcMs,
        id: milkyWayViewingWindowId(observer.cityId, prevW.endUtcMs),
      };
    }
  }
  return {
    windows,
    feasibility: "ok",
    nightlyMaximumAltitudeDeg: hMax,
  };
}

export function listMilkyWayViewingWindows(args: {
  observer: MilkyWayViewingObserver;
  startUtcMs: number;
  endUtcMs: number;
}): MilkyWayViewingSearchResult {
  const { observer, startUtcMs, endUtcMs } = args;
  if (!(endUtcMs > startUtcMs) || !Number.isFinite(startUtcMs) || !Number.isFinite(endUtcMs)) {
    return { windows: [], feasibility: "emptyRange", nightlyMaximumAltitudeDeg: null };
  }
  const key = cacheKey(observer, startUtcMs, endUtcMs);
  let result = resultCache.get(key);
  if (!result) {
    result = enumerateUncached(observer, startUtcMs, endUtcMs);
    resultCache.set(key, result);
    if (resultCache.size > 32) {
      const oldest = resultCache.keys().next().value;
      if (oldest !== undefined) {
        resultCache.delete(oldest);
      }
    }
  }
  return result;
}

function nextSearchChunkMs(expansion: number): number {
  return FORWARD_SEARCH_CHUNKS_MS[Math.min(expansion, FORWARD_SEARCH_CHUNKS_MS.length - 1)]!;
}

/**
 * Incremental forward search. Does not enumerate the whole `[after, end]` span.
 */
export function searchMilkyWayWindowsForward(args: {
  observer: MilkyWayViewingObserver;
  startUtcMs: number;
  endUtcMs: number;
}): MilkyWayViewingWindow[] {
  if (!(args.endUtcMs > args.startUtcMs)) {
    return [];
  }
  const out: MilkyWayViewingWindow[] = [];
  let cursor = args.startUtcMs;
  let expansion = 0;
  while (cursor < args.endUtcMs) {
    const chunkMs = nextSearchChunkMs(expansion);
    const chunkEnd = Math.min(args.endUtcMs, cursor + chunkMs);
    const listed = listMilkyWayViewingWindows({
      observer: args.observer,
      startUtcMs: cursor,
      endUtcMs: chunkEnd,
    });
    out.push(...listed.windows);
    cursor = chunkEnd;
    expansion += 1;
  }
  return out;
}

export function findNextMilkyWayViewingWindow(args: {
  observer: MilkyWayViewingObserver;
  afterUtcMs: number;
  horizonMs?: number;
  endUtcMs?: number;
}): MilkyWayViewingWindow | null {
  const horizonMs = args.horizonMs ?? 365 * DAY_MS;
  const searchEnd = args.endUtcMs ?? args.afterUtcMs + horizonMs;
  let cursor = args.afterUtcMs;
  let expansion = 0;
  while (cursor < searchEnd) {
    const chunkMs = nextSearchChunkMs(expansion);
    const chunkEnd = Math.min(searchEnd, cursor + chunkMs);
    const listed = listMilkyWayViewingWindows({
      observer: args.observer,
      startUtcMs: cursor,
      endUtcMs: chunkEnd,
    });
    for (const w of listed.windows) {
      if (w.startUtcMs > args.afterUtcMs) {
        return w;
      }
    }
    cursor = chunkEnd;
    expansion += 1;
  }
  return null;
}

/**
 * Incremental backward search. `beforeUtcMs` is exclusive for event start.
 */
export function findPreviousMilkyWayViewingWindow(args: {
  observer: MilkyWayViewingObserver;
  beforeUtcMs: number;
  startUtcMs: number;
}): MilkyWayViewingWindow | null {
  let cursor = args.beforeUtcMs;
  let expansion = 0;
  while (cursor > args.startUtcMs) {
    const chunkMs = nextSearchChunkMs(expansion);
    const chunkStart = Math.max(args.startUtcMs, cursor - chunkMs);
    const listed = listMilkyWayViewingWindows({
      observer: args.observer,
      startUtcMs: chunkStart,
      endUtcMs: cursor,
    });
    for (let i = listed.windows.length - 1; i >= 0; i -= 1) {
      const w = listed.windows[i]!;
      if (w.startUtcMs < args.beforeUtcMs) {
        return w;
      }
    }
    cursor = chunkStart;
    expansion += 1;
  }
  return null;
}

export function windowContainingUtc(
  windows: readonly MilkyWayViewingWindow[],
  utcMs: number,
): MilkyWayViewingWindow | null {
  for (const w of windows) {
    if (utcMs >= w.startUtcMs && utcMs < w.endUtcMs) {
      return w;
    }
  }
  return null;
}

export function resetMilkyWayViewingWindowCacheForTests(): void {
  eqdCache.clear();
  resultCache.clear();
  fieldCache.clear();
  resetMilkyWayEnumerateStatsForTests();
}
