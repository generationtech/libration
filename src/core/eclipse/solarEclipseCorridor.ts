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
 * Time-independent solar eclipse event corridor: the geographic strip swept by
 * the central (umbral/antumbral) shadow over the event, plus a representative
 * greatest-eclipse partial region.
 *
 * Distinct from the live E1 footprint, which is the compact moving umbra at T.
 */

import { evaluateBesselianElements } from "./besselianElements";
import {
  centralPathWidthKm,
  haversineKm,
  isCentralShadowOnEarth,
  penumbraIntersectsEarth,
  shadowAxisIntersection,
  shadowOutlineRing,
  wrapLongitudeDeg,
  type GeographicPoint,
} from "./besselianGeographic";
import { SOLAR_ECLIPSE_AUTHORITY_METADATA } from "./eclipseAuthority";
import type { SolarEclipseEvent, SolarEclipseEventForecastGeometry } from "./solarEclipseTypes";

export const SOLAR_ECLIPSE_CORRIDOR_ALGORITHM_ID = "solar-event-corridor-v1";
/** 60 s: ~15–40 km along a typical central path; ~1–2 px on a 1920-px world map. */
export const SOLAR_ECLIPSE_CORRIDOR_SAMPLE_MS = 60_000;
const GAP_DISTANCE_KM = 400;
const DEG = Math.PI / 180;

function shortLonDeltaDeg(a: number, b: number): number {
  return (((b - a) + 540) % 360) - 180;
}

const corridorCache = new Map<string, SolarEclipseEventForecastGeometry>();

function cacheKey(eventId: string, sampleStepMs: number): string {
  return `${SOLAR_ECLIPSE_AUTHORITY_METADATA.authorityVersion}|${SOLAR_ECLIPSE_CORRIDOR_ALGORITHM_ID}|${sampleStepMs}|${eventId}`;
}

type CentralSample = {
  readonly utcMs: number;
  readonly center: GeographicPoint;
  readonly outline: readonly GeographicPoint[];
};

function leftRightLimits(
  center: GeographicPoint,
  outline: readonly GeographicPoint[],
  tangentEast: number,
  tangentNorth: number,
): { left: GeographicPoint; right: GeographicPoint } | null {
  const mag = Math.hypot(tangentEast, tangentNorth);
  if (!(mag > 1e-9) || outline.length < 2) {
    return null;
  }
  const leftEast = -tangentNorth / mag;
  const leftNorth = tangentEast / mag;
  const cosLat = Math.cos(center.latDeg * DEG);
  let bestLeft = -Infinity;
  let bestRight = Infinity;
  let left: GeographicPoint | null = null;
  let right: GeographicPoint | null = null;
  for (const p of outline) {
    const east = shortLonDeltaDeg(center.lonDeg, p.lonDeg) * cosLat;
    const north = p.latDeg - center.latDeg;
    const proj = east * leftEast + north * leftNorth;
    if (proj > bestLeft) {
      bestLeft = proj;
      left = p;
    }
    if (proj < bestRight) {
      bestRight = proj;
      right = p;
    }
  }
  if (!left || !right) {
    return null;
  }
  return { left, right };
}

function tangentAt(
  samples: readonly CentralSample[],
  i: number,
): { east: number; north: number } {
  const prev = samples[Math.max(0, i - 1)]!;
  const next = samples[Math.min(samples.length - 1, i + 1)]!;
  const mid = samples[i]!;
  const cosLat = Math.cos(mid.center.latDeg * DEG);
  return {
    east: shortLonDeltaDeg(prev.center.lonDeg, next.center.lonDeg) * cosLat,
    north: next.center.latDeg - prev.center.latDeg,
  };
}

function ringFromLimits(
  lefts: readonly GeographicPoint[],
  rights: readonly GeographicPoint[],
): GeographicPoint[] {
  if (lefts.length < 2 || rights.length < 2) {
    return [];
  }
  const ring: GeographicPoint[] = [];
  for (const p of lefts) {
    ring.push({ latDeg: p.latDeg, lonDeg: wrapLongitudeDeg(p.lonDeg) });
  }
  for (let i = rights.length - 1; i >= 0; i -= 1) {
    const p = rights[i]!;
    ring.push({ latDeg: p.latDeg, lonDeg: wrapLongitudeDeg(p.lonDeg) });
  }
  const first = ring[0]!;
  ring.push({ latDeg: first.latDeg, lonDeg: first.lonDeg });
  return ring;
}

function splitRuns(samples: readonly CentralSample[]): CentralSample[][] {
  if (samples.length === 0) {
    return [];
  }
  const runs: CentralSample[][] = [];
  let cur: CentralSample[] = [samples[0]!];
  for (let i = 1; i < samples.length; i += 1) {
    const a = samples[i - 1]!;
    const b = samples[i]!;
    const gapT = b.utcMs - a.utcMs > SOLAR_ECLIPSE_CORRIDOR_SAMPLE_MS * 3;
    const gapD =
      haversineKm(a.center.latDeg, a.center.lonDeg, b.center.latDeg, b.center.lonDeg) > GAP_DISTANCE_KM;
    if (gapT || gapD) {
      runs.push(cur);
      cur = [b];
    } else {
      cur.push(b);
    }
  }
  runs.push(cur);
  return runs;
}

function collectCentralSamples(event: SolarEclipseEvent, sampleStepMs: number): CentralSample[] {
  const samples: CentralSample[] = [];
  const seen = new Set<number>();
  const pushAt = (utcMs: number): void => {
    if (seen.has(utcMs)) {
      return;
    }
    const el = evaluateBesselianElements(event.besselian, utcMs);
    if (!el.insideElementWindow || !isCentralShadowOnEarth(el)) {
      return;
    }
    const hit = shadowAxisIntersection(el);
    if (!hit?.onEarth) {
      return;
    }
    const outline = shadowOutlineRing(el, "umbra", 12);
    if (outline.length < 4) {
      return;
    }
    seen.add(utcMs);
    samples.push({
      utcMs,
      center: { latDeg: hit.latDeg, lonDeg: hit.lonDeg },
      outline,
    });
  };
  for (let t = event.globalStartMs; t <= event.globalEndMs; t += sampleStepMs) {
    pushAt(t);
  }
  pushAt(event.greatestEclipseUtcMs);
  samples.sort((a, b) => a.utcMs - b.utcMs);
  return samples;
}

function buildCorridorBands(samples: readonly CentralSample[]): GeographicPoint[][] {
  const bands: GeographicPoint[][] = [];
  for (const run of splitRuns(samples)) {
    if (run.length < 2) {
      continue;
    }
    const lefts: GeographicPoint[] = [];
    const rights: GeographicPoint[] = [];
    for (let i = 0; i < run.length; i += 1) {
      const t = tangentAt(run, i);
      const lr = leftRightLimits(run[i]!.center, run[i]!.outline, t.east, t.north);
      if (!lr) {
        continue;
      }
      lefts.push(lr.left);
      rights.push(lr.right);
    }
    const ring = ringFromLimits(lefts, rights);
    if (ring.length >= 4) {
      bands.push(ring);
    }
  }
  return bands;
}

function partialAtGreatest(event: SolarEclipseEvent): GeographicPoint[] {
  const el = evaluateBesselianElements(event.besselian, event.greatestEclipseUtcMs);
  if (!el.insideElementWindow || !penumbraIntersectsEarth(el)) {
    return [];
  }
  return shadowOutlineRing(el, "penumbra", 5);
}

function widthAtGreatest(event: SolarEclipseEvent): number | null {
  if (event.subtype === "partial") {
    return null;
  }
  const el = evaluateBesselianElements(event.besselian, event.greatestEclipseUtcMs);
  if (!el.insideElementWindow || !isCentralShadowOnEarth(el)) {
    return null;
  }
  const hit = shadowAxisIntersection(el);
  if (!hit?.onEarth) {
    return null;
  }
  const w = centralPathWidthKm(el, hit.zeta, hit.rho);
  return Number.isFinite(w) ? w : null;
}

export function solarEclipseEventForecastGeometry(
  event: SolarEclipseEvent,
  sampleStepMs: number = SOLAR_ECLIPSE_CORRIDOR_SAMPLE_MS,
): SolarEclipseEventForecastGeometry {
  const key = cacheKey(event.id, sampleStepMs);
  const cached = corridorCache.get(key);
  if (cached) {
    return cached;
  }
  const partialForecastRegion = partialAtGreatest(event);
  const widthAtGreatestEclipseKm = widthAtGreatest(event);
  let centerline: GeographicPoint[] = [];
  let corridorBands: GeographicPoint[][] = [];
  if (event.subtype !== "partial") {
    const samples = collectCentralSamples(event, sampleStepMs);
    centerline = samples.map((s) => s.center);
    corridorBands = buildCorridorBands(samples);
  }
  const geom: SolarEclipseEventForecastGeometry = {
    eventId: event.id,
    authorityVersion: SOLAR_ECLIPSE_AUTHORITY_METADATA.authorityVersion,
    algorithmId: SOLAR_ECLIPSE_CORRIDOR_ALGORITHM_ID,
    subtype: event.subtype,
    centerline,
    corridorBands,
    partialForecastRegion,
    widthAtGreatestEclipseKm,
    sampleStepMs,
  };
  corridorCache.set(key, geom);
  return geom;
}

export function resetSolarEclipseCorridorCacheForTests(): void {
  corridorCache.clear();
}

export function solarEclipseCorridorCacheSizeForTests(): number {
  return corridorCache.size;
}
