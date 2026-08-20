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
 * Event-static lunar eclipse visibility footprint.
 *
 * A location P belongs to the footprint iff there exists t in the authoritative
 * event interval [globalStartMs, globalEndMs] such that geometric lunar altitude
 * at P is ≥ 0° (spherical lunarDot ≥ 0; no refraction). Equivalently: the union
 * of Moon-up hemispheres centered at sublunarPoint(t) over that interval.
 *
 * This is event-whole geography, not "Moon-visible now". The boundary is computed
 * once per event id and does not depend on product UTC.
 *
 * Construction (lunar-visibility-footprint-v1):
 * Sample the sublunar track, classify meridians by max_t lunarDot, and extract
 * one closed equirect ring around the visible band (start/end horizon limbs plus
 * the swept envelope). Line-only presentation; the ring encloses the visible
 * union, which is typically larger than a hemisphere.
 */

import { LUNAR_ECLIPSE_AUTHORITY_METADATA } from "./eclipseAuthority";
import type { LunarEclipseEvent } from "./lunarEclipseTypes";
import {
  lunarVisibilityRegionRing,
  sphericalMoonAltitudeCosine,
  wrapLongitudeDeg,
  type GeographicPoint,
} from "./lunarVisibilityGeometry";
import { sublunarPoint } from "../sublunarPoint";

export const LUNAR_VISIBILITY_FOOTPRINT_ALGORITHM_ID = "lunar-visibility-footprint-v1";
/** 2 min: well below world-map line thickness vs 1 min; 5 min is coarser at the limbs. */
export const LUNAR_VISIBILITY_FOOTPRINT_SAMPLE_MS = 120_000;
/**
 * Cosine epsilon for geometric altitude = 0°. About 8e-6 degrees.
 * Tests must not treat floating noise on the exact horizon as a product disagreement.
 */
export const LUNAR_VISIBILITY_FOOTPRINT_COSINE_EPS = 1e-7;
const LON_PROBE_STEP_DEG = 2;
const LAT_SCAN_STEP_DEG = 10;
const BISECTION_ITERS = 28;
const DEG = Math.PI / 180;

export type LunarEclipseVisibilityFootprint = {
  readonly eventId: string;
  readonly authorityVersion: string;
  readonly algorithmId: string;
  readonly startUtcMs: number;
  readonly endUtcMs: number;
  readonly sampleStepMs: number;
  readonly boundary: readonly GeographicPoint[];
  readonly geometryHash: string;
};

export type LunarVisibilityFootprintOptions = {
  readonly sampleStepMs?: number;
};

type Vec3 = { readonly x: number; readonly y: number; readonly z: number };

type CachedFootprint = LunarEclipseVisibilityFootprint & {
  readonly units: readonly Vec3[];
};

const footprintCache = new Map<string, CachedFootprint>();

function cacheKey(eventId: string, sampleStepMs: number): string {
  return `${LUNAR_ECLIPSE_AUTHORITY_METADATA.authorityVersion}|${LUNAR_VISIBILITY_FOOTPRINT_ALGORITHM_ID}|${sampleStepMs}|${eventId}`;
}

function latLonToUnit(latDeg: number, lonDeg: number): Vec3 {
  const phi = latDeg * DEG;
  const lam = lonDeg * DEG;
  const c = Math.cos(phi);
  return { x: c * Math.cos(lam), y: c * Math.sin(lam), z: Math.sin(phi) };
}

function maxDotAt(latDeg: number, lonDeg: number, units: readonly Vec3[]): number {
  const p = latLonToUnit(latDeg, lonDeg);
  let m = -Infinity;
  for (let i = 0; i < units.length; i += 1) {
    const u = units[i]!;
    const d = p.x * u.x + p.y * u.y + p.z * u.z;
    if (d > m) {
      m = d;
    }
  }
  return m;
}

function isInside(latDeg: number, lonDeg: number, units: readonly Vec3[]): boolean {
  return maxDotAt(latDeg, lonDeg, units) >= -LUNAR_VISIBILITY_FOOTPRINT_COSINE_EPS;
}

function sampleTrackUnits(event: LunarEclipseEvent, sampleStepMs: number): Vec3[] {
  const start = event.globalStartMs;
  const end = event.globalEndMs;
  const times = new Set<number>();
  for (let t = start; t <= end; t += sampleStepMs) {
    times.add(t);
  }
  times.add(end);
  times.add(event.greatestEclipseUtcMs);
  if (event.p1UtcMs !== null) {
    times.add(event.p1UtcMs);
  }
  if (event.p4UtcMs !== null) {
    times.add(event.p4UtcMs);
  }
  const units: Vec3[] = [];
  const sorted = [...times].sort((a, b) => a - b);
  for (const utcMs of sorted) {
    const p = sublunarPoint(utcMs);
    units.push(latLonToUnit(p.latDeg, p.lonDeg));
  }
  return units;
}

function meridianHasVisibility(lonDeg: number, units: readonly Vec3[]): boolean {
  for (let lat = 90; lat >= -90; lat -= LAT_SCAN_STEP_DEG) {
    if (isInside(lat, lonDeg, units)) {
      return true;
    }
  }
  return false;
}

function bisectLon(
  insideLon: number,
  outsideLon: number,
  units: readonly Vec3[],
): number {
  let a = insideLon;
  let b = outsideLon;
  for (let i = 0; i < BISECTION_ITERS; i += 1) {
    const mid = (a + b) / 2;
    if (meridianHasVisibility(mid, units)) {
      a = mid;
    } else {
      b = mid;
    }
  }
  return a;
}

function bisectLat(
  insideLat: number,
  outsideLat: number,
  lonDeg: number,
  units: readonly Vec3[],
): number {
  let a = insideLat;
  let b = outsideLat;
  for (let i = 0; i < BISECTION_ITERS; i += 1) {
    const mid = (a + b) / 2;
    if (isInside(mid, lonDeg, units)) {
      a = mid;
    } else {
      b = mid;
    }
  }
  return a;
}

function latRangeOnMeridian(
  lonDeg: number,
  units: readonly Vec3[],
): { north: number; south: number } | null {
  const lats: number[] = [];
  for (let lat = 90; lat >= -90; lat -= LAT_SCAN_STEP_DEG) {
    lats.push(lat);
  }
  if (lats[lats.length - 1] !== -90) {
    lats.push(-90);
  }
  const inside = lats.map((lat) => isInside(lat, lonDeg, units));
  let first = -1;
  let last = -1;
  for (let i = 0; i < inside.length; i += 1) {
    if (inside[i]) {
      if (first < 0) {
        first = i;
      }
      last = i;
    }
  }
  if (first < 0) {
    return null;
  }
  let north = lats[first]!;
  let south = lats[last]!;
  if (first > 0) {
    north = bisectLat(lats[first]!, lats[first - 1]!, lonDeg, units);
  } else {
    north = 90;
  }
  if (last < lats.length - 1) {
    south = bisectLat(lats[last]!, lats[last + 1]!, lonDeg, units);
  } else {
    south = -90;
  }
  return { north, south };
}

function visibleLongitudeRun(
  units: readonly Vec3[],
  trackMidLonDeg: number,
): { startLon: number; endLon: number; widthDeg: number } | null {
  const n = Math.round(360 / LON_PROBE_STEP_DEG);
  const flags: boolean[] = [];
  for (let i = 0; i < n; i += 1) {
    flags.push(meridianHasVisibility(-180 + (360 * i) / n, units));
  }
  if (!flags.some(Boolean)) {
    return null;
  }
  const wrappedMid = wrapLongitudeDeg(trackMidLonDeg);
  const midIdx = Math.round((((wrappedMid + 180) % 360) + 360) % 360 / (360 / n)) % n;
  type Run = { start: number; len: number };
  const runs: Run[] = [];
  if (flags.every(Boolean)) {
    runs.push({ start: 0, len: n });
  } else {
    for (let i = 0; i < n; i += 1) {
      if (!flags[i] && flags[(i + 1) % n]) {
        let len = 0;
        let j = (i + 1) % n;
        while (flags[j] && len < n) {
          len += 1;
          j = (j + 1) % n;
        }
        runs.push({ start: (i + 1) % n, len });
      }
    }
  }
  if (runs.length === 0) {
    return null;
  }
  const containsMid = (run: Run): boolean => {
    for (let k = 0; k < run.len; k += 1) {
      if ((run.start + k) % n === midIdx) {
        return true;
      }
    }
    return false;
  };
  runs.sort((a, b) => {
    const midDelta = Number(containsMid(b)) - Number(containsMid(a));
    if (midDelta !== 0) {
      return midDelta;
    }
    return b.len - a.len;
  });
  const best = runs[0]!;
  const rawStart = -180 + (360 * best.start) / n;
  const approxWidth = (360 * Math.max(1, best.len - 1)) / n;
  const rawEnd = rawStart + approxWidth;
  const startLon = bisectLon(rawStart, rawStart - LON_PROBE_STEP_DEG, units);
  const endLon = bisectLon(rawEnd, rawEnd + LON_PROBE_STEP_DEG, units);
  const widthDeg = Math.max(LON_PROBE_STEP_DEG, endLon - startLon);
  return { startLon, endLon: startLon + widthDeg, widthDeg };
}

function sampleLonPath(startLon: number, endLon: number, stepDeg: number): number[] {
  const out: number[] = [];
  const span = endLon - startLon;
  const steps = Math.max(2, Math.round(Math.abs(span) / stepDeg));
  for (let i = 0; i <= steps; i += 1) {
    out.push(startLon + (span * i) / steps);
  }
  return out;
}

function sampleLatPath(startLat: number, endLat: number, lonDeg: number): GeographicPoint[] {
  const out: GeographicPoint[] = [];
  const span = endLat - startLat;
  const steps = Math.max(8, Math.round(Math.abs(span) / 5));
  for (let i = 0; i <= steps; i += 1) {
    out.push({ latDeg: startLat + (span * i) / steps, lonDeg });
  }
  return out;
}

function buildVisibleBandRing(
  units: readonly Vec3[],
  run: { startLon: number; endLon: number; widthDeg: number },
): GeographicPoint[] {
  const lons = sampleLonPath(run.startLon, run.endLon, LON_PROBE_STEP_DEG);
  const north: GeographicPoint[] = [];
  const south: GeographicPoint[] = [];
  for (const lon of lons) {
    const range = latRangeOnMeridian(lon, units);
    if (!range) {
      continue;
    }
    north.push({ latDeg: range.north, lonDeg: lon });
    south.push({ latDeg: range.south, lonDeg: lon });
  }
  if (north.length < 2 || south.length < 2) {
    return [];
  }
  const east = sampleLatPath(north[north.length - 1]!.latDeg, south[south.length - 1]!.latDeg, run.endLon);
  const west = sampleLatPath(south[0]!.latDeg, north[0]!.latDeg, run.startLon);
  const ring: GeographicPoint[] = [];
  for (const p of north) {
    ring.push(p);
  }
  for (let i = 1; i < east.length; i += 1) {
    ring.push(east[i]!);
  }
  for (let i = south.length - 1; i >= 0; i -= 1) {
    ring.push(south[i]!);
  }
  for (let i = 1; i < west.length; i += 1) {
    ring.push(west[i]!);
  }
  const first = ring[0]!;
  ring.push({ latDeg: first.latDeg, lonDeg: first.lonDeg });
  return ring;
}

function geometryHash(boundary: readonly GeographicPoint[]): string {
  let h = 2166136261;
  for (const p of boundary) {
    const lat = Math.round(p.latDeg * 1e4);
    const lon = Math.round(p.lonDeg * 1e4);
    h ^= lat;
    h = Math.imul(h, 16777619);
    h ^= lon;
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function buildFootprint(
  event: LunarEclipseEvent,
  sampleStepMs: number,
): CachedFootprint {
  const units = sampleTrackUnits(event, sampleStepMs);
  const mid = sublunarPoint(event.greatestEclipseUtcMs);
  const run = visibleLongitudeRun(units, mid.lonDeg);
  const boundary = run ? buildVisibleBandRing(units, run) : [];
  return {
    eventId: event.id,
    authorityVersion: LUNAR_ECLIPSE_AUTHORITY_METADATA.authorityVersion,
    algorithmId: LUNAR_VISIBILITY_FOOTPRINT_ALGORITHM_ID,
    startUtcMs: event.globalStartMs,
    endUtcMs: event.globalEndMs,
    sampleStepMs,
    boundary,
    geometryHash: geometryHash(boundary),
    units,
  };
}

export function lunarEclipseVisibilityFootprint(
  event: LunarEclipseEvent,
  options?: LunarVisibilityFootprintOptions,
): LunarEclipseVisibilityFootprint {
  const sampleStepMs = options?.sampleStepMs ?? LUNAR_VISIBILITY_FOOTPRINT_SAMPLE_MS;
  const key = cacheKey(event.id, sampleStepMs);
  const hit = footprintCache.get(key);
  if (hit) {
    return hit;
  }
  const built = buildFootprint(event, sampleStepMs);
  footprintCache.set(key, built);
  return built;
}

export function pointInLunarVisibilityFootprint(
  event: LunarEclipseEvent,
  latDeg: number,
  lonDeg: number,
  options?: LunarVisibilityFootprintOptions,
): boolean {
  const sampleStepMs = options?.sampleStepMs ?? LUNAR_VISIBILITY_FOOTPRINT_SAMPLE_MS;
  const key = cacheKey(event.id, sampleStepMs);
  let cached = footprintCache.get(key);
  if (!cached) {
    cached = buildFootprint(event, sampleStepMs);
    footprintCache.set(key, cached);
  }
  return isInside(latDeg, lonDeg, cached.units);
}

/**
 * Instantaneous Moon-up hemisphere at utcMs must be a subset of the event footprint.
 * Used by containment tests; not a map primitive.
 */
export function instantaneousMoonUpInteriorSamples(
  utcMs: number,
): GeographicPoint[] {
  const moon = sublunarPoint(utcMs);
  const moonU = latLonToUnit(moon.latDeg, moon.lonDeg);
  const samples: GeographicPoint[] = [{ latDeg: moon.latDeg, lonDeg: moon.lonDeg }];
  const ring = lunarVisibilityRegionRing(moon.latDeg, moon.lonDeg);
  for (let i = 0; i < ring.length; i += 15) {
    const p = ring[i]!;
    const u = latLonToUnit(p.latDeg, p.lonDeg);
    const mx = moonU.x + u.x;
    const my = moonU.y + u.y;
    const mz = moonU.z + u.z;
    const mag = Math.hypot(mx, my, mz);
    if (!(mag > 0)) {
      continue;
    }
    const latDeg = (Math.asin(Math.max(-1, Math.min(1, mz / mag))) / Math.PI) * 180;
    const lonDeg = wrapLongitudeDeg((Math.atan2(my, mx) / Math.PI) * 180);
    if (sphericalMoonAltitudeCosine(latDeg, lonDeg, moon.latDeg, moon.lonDeg) >= 0) {
      samples.push({ latDeg, lonDeg });
    }
  }
  return samples;
}

export function resetLunarEclipseVisibilityFootprintCacheForTests(): void {
  footprintCache.clear();
}

export function wrapFootprintLongitudeDeg(lonDeg: number): number {
  return wrapLongitudeDeg(lonDeg);
}
