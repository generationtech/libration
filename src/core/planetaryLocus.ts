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
 * Planetary locus: sub-object point sampled once per day at the same UTC clock
 * over a long interval, centered on the product-time calendar date.
 * Analogous in method to a solar analemma; not claimed to be a figure-eight.
 */

import type { PlanetaryBodyId } from "./planetaryBodies";
import {
  PLANETARY_EPHEMERIS_AUTHORITY_VERSION,
  isPlanetaryEphemerisSupportedUtc,
  planetaryGastDeg,
} from "./planetaryEphemeris";
import {
  planetaryLocusDurationDays,
  type PlanetaryLocusDurationId,
} from "./planetaryObjectsPresentation";
import { planetarySubpoint, wrapSigned180, type PlanetarySubpointDeg } from "./planetarySubpoint";

const MS_PER_DAY = 86_400_000;

export type PlanetaryLocusGeometry = {
  readonly points: readonly PlanetarySubpointDeg[];
  readonly sampleCount: number;
};

type CachedLocus = {
  key: string;
  /** Clock used for sampling, milliseconds of UTC day. */
  clockMsOfDay: number;
  /** Sidereal angle at today's sample clock, for GAST-shift within the hour. */
  gastAtClockDeg: number;
  points: readonly PlanetarySubpointDeg[];
};

const cache = new Map<string, CachedLocus>();
const CACHE_LIMIT = 16;

function utcClockMsOfDay(utcMs: number): number {
  const d = new Date(utcMs);
  return (
    ((d.getUTCHours() * 60 + d.getUTCMinutes()) * 60 + d.getUTCSeconds()) * 1000 +
    d.getUTCMilliseconds()
  );
}

function utcDateKey(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function utcHourBucket(utcMs: number): number {
  return new Date(utcMs).getUTCHours();
}

function sampleAtUtcClock(utcMs: number, clockMsOfDay: number): number {
  const d = new Date(utcMs);
  return Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
    0,
    0,
    0,
    0,
  ) + clockMsOfDay;
}

function cacheKey(
  body: PlanetaryBodyId,
  duration: PlanetaryLocusDurationId,
  dateKey: string,
  hour: number,
): string {
  return `${PLANETARY_EPHEMERIS_AUTHORITY_VERSION}|${body}|${duration}|${dateKey}|h${hour}`;
}

function computeLocusPoints(
  body: PlanetaryBodyId,
  centerUtcMs: number,
  clockMsOfDay: number,
  durationDays: number,
): PlanetarySubpointDeg[] {
  const halfPast = Math.floor(durationDays / 2);
  const halfFuture = durationDays - halfPast - 1;
  const out: PlanetarySubpointDeg[] = [];
  const center = new Date(centerUtcMs);
  const centerDayStart = Date.UTC(
    center.getUTCFullYear(),
    center.getUTCMonth(),
    center.getUTCDate(),
    0,
    0,
    0,
    0,
  );
  for (let k = -halfPast; k <= halfFuture; k += 1) {
    const t = centerDayStart + k * MS_PER_DAY + clockMsOfDay;
    if (!isPlanetaryEphemerisSupportedUtc(t)) {
      continue;
    }
    const p = planetarySubpoint(body, t);
    if (p) {
      out.push(p);
    }
  }
  return out;
}

/**
 * Daily same-UTC-clock subpoint samples, centered on the product-time calendar date.
 * Full ephemeris rebuilds when the UTC date or hour changes; within the hour the
 * cached figure is shifted by ΔGAST so Earth rotation tracks without recomputing years.
 */
export function samplePlanetaryLocus(
  body: PlanetaryBodyId,
  utcMs: number,
  duration: PlanetaryLocusDurationId,
): PlanetaryLocusGeometry | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  const days = planetaryLocusDurationDays(duration, body);
  const dateKey = utcDateKey(utcMs);
  const hour = utcHourBucket(utcMs);
  const key = cacheKey(body, duration, dateKey, hour);
  let entry = cache.get(key);
  if (!entry) {
    const clockMsOfDay = utcClockMsOfDay(utcMs);
    const points = computeLocusPoints(body, utcMs, clockMsOfDay, days);
    const todayClock = sampleAtUtcClock(utcMs, clockMsOfDay);
    const gast = planetaryGastDeg(todayClock);
    if (gast === null) {
      return null;
    }
    entry = { key, clockMsOfDay, gastAtClockDeg: gast, points };
    cache.set(key, entry);
    if (cache.size > CACHE_LIMIT) {
      const first = cache.keys().next().value;
      if (typeof first === "string") {
        cache.delete(first);
      }
    }
  }
  const nowGast = planetaryGastDeg(utcMs);
  if (nowGast === null) {
    return null;
  }
  const dGast = wrapSigned180(nowGast - entry.gastAtClockDeg);
  if (Math.abs(dGast) < 1e-9) {
    return { points: entry.points, sampleCount: entry.points.length };
  }
  const shifted = entry.points.map((p) => ({
    latDeg: p.latDeg,
    lonDeg: wrapSigned180(p.lonDeg - dGast),
  }));
  return { points: shifted, sampleCount: shifted.length };
}

export function resetPlanetaryLocusCacheForTests(): void {
  cache.clear();
}

/** @internal sample cardinality for tests. */
export function expectedPlanetaryLocusSampleCount(
  durationDays: number,
  supportedDayCount?: number,
): number {
  if (supportedDayCount !== undefined) {
    return supportedDayCount;
  }
  return durationDays;
}
