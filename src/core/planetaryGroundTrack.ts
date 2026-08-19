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
 * Continuous geographic sub-object ground track around product time.
 * Earth-rotation dominated; not an orbit of the planet around Earth.
 */

import type { PlanetaryBodyId } from "./planetaryBodies";
import {
  PLANETARY_EPHEMERIS_AUTHORITY_VERSION,
  PLANETARY_EPHEMERIS_RANGE_END_MS,
  PLANETARY_EPHEMERIS_RANGE_START_MS,
} from "./planetaryEphemeris";
import { planetarySubpoint, type PlanetarySubpointDeg } from "./planetarySubpoint";

/** Visual trajectory sampling. Earth rotation dominates; 15 min ≈ 3.75°. */
export const PLANETARY_GROUND_TRACK_SAMPLE_INTERVAL_MS = 15 * 60 * 1000;

/** Recompute past/future samples when the canonical instant crosses this bucket. */
export const PLANETARY_GROUND_TRACK_CACHE_BUCKET_MS = 60 * 1000;

const MS_PER_HOUR = 60 * 60 * 1000;

export type PlanetaryGroundTrackGeometry = {
  readonly past: readonly PlanetarySubpointDeg[];
  readonly current: PlanetarySubpointDeg;
  readonly future: readonly PlanetarySubpointDeg[];
};

type CachedTrack = {
  key: string;
  past: readonly PlanetarySubpointDeg[];
  future: readonly PlanetarySubpointDeg[];
};

const cache = new Map<string, CachedTrack>();
const CACHE_LIMIT = 24;

function cacheKey(
  body: PlanetaryBodyId,
  utcMs: number,
  pastHours: number,
  futureHours: number,
): string {
  const bucket = Math.floor(utcMs / PLANETARY_GROUND_TRACK_CACHE_BUCKET_MS);
  return `${PLANETARY_EPHEMERIS_AUTHORITY_VERSION}|${body}|${bucket}|${pastHours}|${futureHours}`;
}

function sampleOpenRangeBefore(
  body: PlanetaryBodyId,
  startMs: number,
  endExclusiveMs: number,
  intervalMs: number,
): PlanetarySubpointDeg[] {
  const out: PlanetarySubpointDeg[] = [];
  if (!(endExclusiveMs > startMs) || !(intervalMs > 0)) {
    return out;
  }
  for (let t = startMs; t < endExclusiveMs - 0.5; t += intervalMs) {
    const p = planetarySubpoint(body, t);
    if (p) {
      out.push(p);
    }
  }
  return out;
}

function sampleOpenRangeAfter(
  body: PlanetaryBodyId,
  startExclusiveMs: number,
  endMs: number,
  intervalMs: number,
): PlanetarySubpointDeg[] {
  const out: PlanetarySubpointDeg[] = [];
  if (!(endMs > startExclusiveMs) || !(intervalMs > 0)) {
    return out;
  }
  for (let t = startExclusiveMs + intervalMs; t <= endMs + 0.5; t += intervalMs) {
    const p = planetarySubpoint(body, t);
    if (p) {
      out.push(p);
    }
  }
  const lastT =
    startExclusiveMs + Math.floor((endMs - startExclusiveMs) / intervalMs) * intervalMs;
  if (lastT > startExclusiveMs && endMs - lastT > 0.5) {
    const p = planetarySubpoint(body, endMs);
    if (p) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Time-windowed geographic trajectory of {@link planetarySubpoint}.
 * Past/future polylines are memoized per 1-minute product-time bucket.
 * The current sample is always live at `utcMs`.
 */
export function samplePlanetaryGroundTrack(
  body: PlanetaryBodyId,
  utcMs: number,
  pastHours: number,
  futureHours: number,
): PlanetaryGroundTrackGeometry | null {
  const current = planetarySubpoint(body, utcMs);
  if (!current) {
    return null;
  }
  const pastH = Math.max(0, pastHours);
  const futureH = Math.max(0, futureHours);
  const key = cacheKey(body, utcMs, pastH, futureH);
  let entry = cache.get(key);
  if (!entry) {
    const pastStart = Math.max(
      PLANETARY_EPHEMERIS_RANGE_START_MS,
      utcMs - pastH * MS_PER_HOUR,
    );
    const futureEnd = Math.min(
      PLANETARY_EPHEMERIS_RANGE_END_MS - 1,
      utcMs + futureH * MS_PER_HOUR,
    );
    const past =
      pastH > 0
        ? sampleOpenRangeBefore(body, pastStart, utcMs, PLANETARY_GROUND_TRACK_SAMPLE_INTERVAL_MS)
        : [];
    const future =
      futureH > 0
        ? sampleOpenRangeAfter(body, utcMs, futureEnd, PLANETARY_GROUND_TRACK_SAMPLE_INTERVAL_MS)
        : [];
    entry = { key, past, future };
    cache.set(key, entry);
    if (cache.size > CACHE_LIMIT) {
      const first = cache.keys().next().value;
      if (typeof first === "string") {
        cache.delete(first);
      }
    }
  }
  return {
    past: entry.past,
    current,
    future: entry.future,
  };
}

export function resetPlanetaryGroundTrackCacheForTests(): void {
  cache.clear();
}
