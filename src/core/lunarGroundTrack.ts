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

import { sublunarPoint, type SublunarPointDeg } from "./sublunarPoint";

export const LUNAR_GROUND_TRACK_EXTENT_HOURS = [6, 12, 24, 48, 72] as const;

export type LunarGroundTrackExtentHours = (typeof LUNAR_GROUND_TRACK_EXTENT_HOURS)[number];

export const DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS = 24 satisfies LunarGroundTrackExtentHours;
export const DEFAULT_LUNAR_GROUND_TRACK_FUTURE_HOURS = 24 satisfies LunarGroundTrackExtentHours;

/** Visual trajectory sampling; not an ephemeris cadence. */
export const LUNAR_GROUND_TRACK_SAMPLE_INTERVAL_MS = 10 * 60 * 1000;

/** Unlabeled interval ticks along the path (current instant uses the Moon marker). */
export const LUNAR_GROUND_TRACK_TICK_INTERVAL_MS = 6 * 60 * 60 * 1000;

/** Recompute past/future samples when the canonical instant crosses this bucket. */
export const LUNAR_GROUND_TRACK_CACHE_BUCKET_MS = 60 * 1000;

const MS_PER_HOUR = 60 * 60 * 1000;

const EXTENT_SET = new Set<number>(LUNAR_GROUND_TRACK_EXTENT_HOURS);

export type LunarGroundTrackSample = SublunarPointDeg;

export type LunarGroundTrackGeometry = {
  readonly past: readonly LunarGroundTrackSample[];
  readonly current: LunarGroundTrackSample;
  readonly future: readonly LunarGroundTrackSample[];
  readonly ticks: readonly LunarGroundTrackSample[];
};

type CachedTrack = {
  key: string;
  past: readonly LunarGroundTrackSample[];
  future: readonly LunarGroundTrackSample[];
  ticks: readonly LunarGroundTrackSample[];
};

let cache: CachedTrack | null = null;

export function isLunarGroundTrackExtentHours(value: unknown): value is LunarGroundTrackExtentHours {
  return typeof value === "number" && Number.isFinite(value) && EXTENT_SET.has(value);
}

/**
 * Maps unknown persisted/UI values onto the allowed extent set.
 * Non-members, including non-finite numbers, become the default 24 h.
 */
export function normalizeLunarGroundTrackExtentHours(raw: unknown): LunarGroundTrackExtentHours {
  if (isLunarGroundTrackExtentHours(raw)) {
    return raw;
  }
  return DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS;
}

function cacheKey(utcMs: number, pastHours: number, futureHours: number): string {
  const bucket = Math.floor(utcMs / LUNAR_GROUND_TRACK_CACHE_BUCKET_MS);
  return `${bucket}|${pastHours}|${futureHours}`;
}

function sampleOpenRangeBefore(
  startMs: number,
  endExclusiveMs: number,
  intervalMs: number,
): LunarGroundTrackSample[] {
  const out: LunarGroundTrackSample[] = [];
  if (!(endExclusiveMs > startMs) || !(intervalMs > 0)) {
    return out;
  }
  for (let t = startMs; t < endExclusiveMs - 0.5; t += intervalMs) {
    out.push(sublunarPoint(t));
  }
  return out;
}

function sampleOpenRangeAfter(
  startExclusiveMs: number,
  endMs: number,
  intervalMs: number,
): LunarGroundTrackSample[] {
  const out: LunarGroundTrackSample[] = [];
  if (!(endMs > startExclusiveMs) || !(intervalMs > 0)) {
    return out;
  }
  for (let t = startExclusiveMs + intervalMs; t <= endMs + 0.5; t += intervalMs) {
    out.push(sublunarPoint(t));
  }
  const lastT =
    startExclusiveMs +
    Math.floor((endMs - startExclusiveMs) / intervalMs) * intervalMs;
  if (lastT > startExclusiveMs && endMs - lastT > 0.5) {
    out.push(sublunarPoint(endMs));
  }
  return out;
}

function sampleTicks(utcMs: number, pastHours: number, futureHours: number): LunarGroundTrackSample[] {
  const pastMs = pastHours * MS_PER_HOUR;
  const futureMs = futureHours * MS_PER_HOUR;
  const out: LunarGroundTrackSample[] = [];
  for (let t = utcMs - pastMs; t <= utcMs + futureMs + 0.5; t += LUNAR_GROUND_TRACK_TICK_INTERVAL_MS) {
    if (Math.abs(t - utcMs) < 0.5) {
      continue;
    }
    out.push(sublunarPoint(t));
  }
  return out;
}

function computePastFutureTicks(
  utcMs: number,
  pastHours: LunarGroundTrackExtentHours,
  futureHours: LunarGroundTrackExtentHours,
): Omit<CachedTrack, "key"> {
  const pastStart = utcMs - pastHours * MS_PER_HOUR;
  const futureEnd = utcMs + futureHours * MS_PER_HOUR;
  return {
    past: sampleOpenRangeBefore(pastStart, utcMs, LUNAR_GROUND_TRACK_SAMPLE_INTERVAL_MS),
    future: sampleOpenRangeAfter(utcMs, futureEnd, LUNAR_GROUND_TRACK_SAMPLE_INTERVAL_MS),
    ticks: sampleTicks(utcMs, pastHours, futureHours),
  };
}

/**
 * Time-windowed geographic trajectory of {@link sublunarPoint} around a canonical UTC instant.
 * Past/future polylines are memoized per 1-minute product-time bucket and extent pair.
 * The current sample is always {@link sublunarPoint} at `utcMs` (same function as the Moon marker).
 */
export function sampleLunarGroundTrack(
  utcMs: number,
  pastHours: unknown = DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS,
  futureHours: unknown = DEFAULT_LUNAR_GROUND_TRACK_FUTURE_HOURS,
): LunarGroundTrackGeometry {
  const pastH = normalizeLunarGroundTrackExtentHours(pastHours);
  const futureH = normalizeLunarGroundTrackExtentHours(futureHours);
  const key = cacheKey(utcMs, pastH, futureH);
  if (cache === null || cache.key !== key) {
    const computed = computePastFutureTicks(utcMs, pastH, futureH);
    cache = { key, ...computed };
  }
  return {
    past: cache.past,
    current: sublunarPoint(utcMs),
    future: cache.future,
    ticks: cache.ticks,
  };
}

/** Test seam: drop the module cache without exposing a second sampling path. */
export function resetLunarGroundTrackCacheForTests(): void {
  cache = null;
}

/** @internal exported for tests that assert sample cardinality. */
export function expectedLunarGroundTrackSampleCount(
  pastHours: LunarGroundTrackExtentHours,
  futureHours: LunarGroundTrackExtentHours,
): { past: number; future: number; ticks: number } {
  const interval = LUNAR_GROUND_TRACK_SAMPLE_INTERVAL_MS;
  const past = Math.ceil((pastHours * MS_PER_HOUR) / interval);
  const future = Math.floor((futureHours * MS_PER_HOUR) / interval);
  const ticks =
    Math.floor(pastHours / 6) + Math.floor(futureHours / 6);
  return { past, future, ticks };
}
