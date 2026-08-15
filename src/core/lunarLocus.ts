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
 * Compact lunar locus: {@link sublunarPoint} sampled once per mean lunar day
 * across approximately one lunar orbital cycle, centered on the canonical instant.
 */

import {
  LUNAR_MODEL_GMST_RATE_DEG_PER_DAY,
  LUNAR_MODEL_JULIAN_CENTURY_DAYS,
  LUNAR_MODEL_MEAN_LONGITUDE_RATE_DEG_PER_JULIAN_CENTURY,
  sublunarPoint,
  type SublunarPointDeg,
} from "./sublunarPoint";

const MS_PER_DAY = 86_400_000;

/** Inclusive rendered sample count: k = −13 … +14 (current Moon is k = 0). */
export const LUNAR_LOCUS_SAMPLE_COUNT = 28;

/** Mean-lunar-day offsets before the canonical instant. */
export const LUNAR_LOCUS_PAST_STEPS = 13;

/** Mean-lunar-day offsets after the canonical instant. */
export const LUNAR_LOCUS_FUTURE_STEPS = 14;

/**
 * Extra past samples for Catmull-Rom neighbors, including one prefix span
 * (k = −14 → −13) so the one-cycle join can match the approach into k = −13.
 * Not part of the rendered sample window.
 */
export const LUNAR_LOCUS_PAST_TANGENT_SUPPORT = 2;

/** Extra future sample so the last rendered span has a real p3 (k = +15). */
export const LUNAR_LOCUS_FUTURE_TANGENT_SUPPORT = 1;

/** Prefix spans interpolated before k = −13 for join correspondence. */
const LUNAR_LOCUS_PREFIX_SPANS = 1;

/** Centripetal Catmull-Rom subdivisions per sample span. */
export const LUNAR_LOCUS_INTERP_SUBDIVISIONS = 12;

/** Recompute non-current samples when the canonical instant crosses this bucket. */
export const LUNAR_LOCUS_CACHE_BUCKET_MS = 1000;

/**
 * Same RGB as the Moon marker's unlit / new-moon disc (`rgba(28, 38, 56, …)`).
 * Plan-builder alpha/veil match the solar analemma. Not the lunar ground-track light stroke.
 */
export const DEFAULT_LUNAR_LOCUS_STROKE_RGB = "#1c2638";

/** Representative verification epochs (tests and DEV fixtures). Not a standstill model. */
export const LUNAR_LOCUS_EPOCH_UTC = {
  recent: "2026-01-16T22:00:00.000Z",
  standstill: "2025-03-08T12:00:00.000Z",
  minor: "2015-09-16T12:00:00.000Z",
  baseline: "2030-06-15T12:00:00.000Z",
} as const;

export type LunarLocusEpochId = keyof typeof LUNAR_LOCUS_EPOCH_UTC;

export type LunarLocusSample = {
  readonly index: number;
  readonly k: number;
  readonly utcMs: number;
  readonly geographic: SublunarPointDeg;
  /** Residual longitude δlon_k = wrap(lon_k − lon_0), (−180°, +180°]. */
  readonly residualLonDeg: number;
};

export type LunarLocusGeometry = {
  readonly cadenceMs: number;
  readonly sampleCount: number;
  readonly referenceUtcMs: number;
  readonly currentIndex: number;
  readonly samples: readonly LunarLocusSample[];
};

export type LunarLocusSummary = {
  readonly cadenceMs: number;
  readonly sampleCount: number;
  readonly firstUtcMs: number;
  readonly lastUtcMs: number;
  readonly latMinDeg: number;
  readonly latMaxDeg: number;
  readonly residualLonMinDeg: number;
  readonly residualLonMaxDeg: number;
  readonly firstLastAngularDistanceDeg: number;
  readonly closesApproximately: boolean;
};

type CachedLocus = {
  key: string;
  cadenceMs: number;
  currentIndex: number;
  samples: LunarLocusSample[];
};

let cache: CachedLocus | null = null;

/**
 * Mean lunar-day period implied by this repository's lunar model:
 * time for 360° of (GMST − mean lunar ecliptic longitude).
 */
export function meanLunarDayMsFromModel(): number {
  const lpDegPerDay =
    LUNAR_MODEL_MEAN_LONGITUDE_RATE_DEG_PER_JULIAN_CENTURY / LUNAR_MODEL_JULIAN_CENTURY_DAYS;
  const relativeDegPerDay = LUNAR_MODEL_GMST_RATE_DEG_PER_DAY - lpDegPerDay;
  return (360 / relativeDegPerDay) * MS_PER_DAY;
}

/**
 * Mean-lunar-day steps in one sidereal month of this lunar model
 * (`360° / Lp` divided by the mean lunar day). ≈26.4.
 */
export function meanLunarDaysPerSiderealMonth(): number {
  const lpDegPerDay =
    LUNAR_MODEL_MEAN_LONGITUDE_RATE_DEG_PER_JULIAN_CENTURY / LUNAR_MODEL_JULIAN_CENTURY_DAYS;
  const siderealMonthDays = 360 / lpDegPerDay;
  return siderealMonthDays / (meanLunarDayMsFromModel() / MS_PER_DAY);
}

/** Same wrap as `(((b − a) + 540) % 360) − 180`. */
export function residualLongitudeDeg(lonDeg: number, referenceLonDeg: number): number {
  return (((lonDeg - referenceLonDeg + 540) % 360) - 180);
}

export function wrapLongitudeDeg(lonDeg: number): number {
  return ((lonDeg + 540) % 360) - 180;
}

function cacheKey(utcMs: number): string {
  return String(Math.floor(utcMs / LUNAR_LOCUS_CACHE_BUCKET_MS));
}

function computeSamples(utcMs: number, cadenceMs: number): Omit<CachedLocus, "key"> {
  const kMin = -LUNAR_LOCUS_PAST_STEPS;
  const kMax = LUNAR_LOCUS_FUTURE_STEPS;
  const currentIndex = LUNAR_LOCUS_PAST_STEPS;
  const reference = sublunarPoint(utcMs);
  const samples: LunarLocusSample[] = [];
  let index = 0;
  for (let k = kMin; k <= kMax; k += 1) {
    const t = utcMs + k * cadenceMs;
    const geographic = k === 0 ? reference : sublunarPoint(t);
    samples.push({
      index,
      k,
      utcMs: t,
      geographic,
      residualLonDeg: residualLongitudeDeg(geographic.lonDeg, reference.lonDeg),
    });
    index += 1;
  }
  return { cadenceMs, currentIndex, samples };
}

function withLiveCurrent(cached: CachedLocus, utcMs: number): LunarLocusGeometry {
  const current = sublunarPoint(utcMs);
  const samples = cached.samples.map((sample) => {
    if (sample.k !== 0) {
      return {
        ...sample,
        residualLonDeg: residualLongitudeDeg(sample.geographic.lonDeg, current.lonDeg),
      };
    }
    return {
      ...sample,
      utcMs,
      geographic: current,
      residualLonDeg: 0,
    };
  });
  return {
    cadenceMs: cached.cadenceMs,
    sampleCount: samples.length,
    referenceUtcMs: utcMs,
    currentIndex: cached.currentIndex,
    samples,
  };
}

/**
 * Sample {@link sublunarPoint} at k = −13 … +14 mean lunar days from `utcMs`.
 * The k = 0 sample is always the live canonical instant (same function as the Moon marker).
 * Other samples are memoized per 1-second product-time bucket.
 */
export function sampleLunarLocus(utcMs: number): LunarLocusGeometry {
  const key = cacheKey(utcMs);
  if (cache === null || cache.key !== key) {
    const cadenceMs = meanLunarDayMsFromModel();
    const computed = computeSamples(utcMs, cadenceMs);
    cache = { key, ...computed };
  }
  return withLiveCurrent(cache, utcMs);
}

/** Test seam: drop the module cache without exposing a second sampling path. */
export function resetLunarLocusCacheForTests(): void {
  cache = null;
}

function angularDistanceDeg(a: SublunarPointDeg, b: SublunarPointDeg): number {
  const dLon = residualLongitudeDeg(b.lonDeg, a.lonDeg);
  const dLat = b.latDeg - a.latDeg;
  return Math.hypot(dLon, dLat);
}

export function summarizeLunarLocus(geometry: LunarLocusGeometry): LunarLocusSummary {
  const first = geometry.samples[0]!;
  const last = geometry.samples[geometry.samples.length - 1]!;
  let latMin = first.geographic.latDeg;
  let latMax = first.geographic.latDeg;
  let resMin = first.residualLonDeg;
  let resMax = first.residualLonDeg;
  for (const s of geometry.samples) {
    latMin = Math.min(latMin, s.geographic.latDeg);
    latMax = Math.max(latMax, s.geographic.latDeg);
    resMin = Math.min(resMin, s.residualLonDeg);
    resMax = Math.max(resMax, s.residualLonDeg);
  }
  const firstLastAngularDistanceDeg = angularDistanceDeg(first.geographic, last.geographic);
  return {
    cadenceMs: geometry.cadenceMs,
    sampleCount: geometry.sampleCount,
    firstUtcMs: first.utcMs,
    lastUtcMs: last.utcMs,
    latMinDeg: latMin,
    latMaxDeg: latMax,
    residualLonMinDeg: resMin,
    residualLonMaxDeg: resMax,
    firstLastAngularDistanceDeg,
    closesApproximately: firstLastAngularDistanceDeg < 8,
  };
}

/** Monthly |latDeg| envelope from daily samples — standstill-candidate check, not a new ephemeris. */
export function monthlyAbsLatitudeMaxDeg(utcMs: number, dayCount: number = 28): number {
  let maxAbs = 0;
  for (let d = 0; d < dayCount; d += 1) {
    const lat = sublunarPoint(utcMs + d * MS_PER_DAY).latDeg;
    maxAbs = Math.max(maxAbs, Math.abs(lat));
  }
  return maxAbs;
}

type ResidualPt = { x: number; y: number };

function hypot2(a: ResidualPt, b: ResidualPt): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function lerpPt(a: ResidualPt, b: ResidualPt, t: number): ResidualPt {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function smoothstep01(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function residualAtOffset(
  utcMs: number,
  cadenceMs: number,
  lon0: number,
  k: number,
): ResidualPt {
  const geographic = sublunarPoint(utcMs + k * cadenceMs);
  return {
    x: residualLongitudeDeg(geographic.lonDeg, lon0),
    y: geographic.latDeg,
  };
}

/**
 * Centripetal Catmull-Rom between p1 and p2. Degenerate spans fall back to linear.
 */
function centripetalSegment(p0: ResidualPt, p1: ResidualPt, p2: ResidualPt, p3: ResidualPt, t: number): ResidualPt {
  const alpha = 0.5;
  const t01 = Math.max(1e-6, hypot2(p0, p1) ** alpha);
  const t12 = Math.max(1e-6, hypot2(p1, p2) ** alpha);
  const t23 = Math.max(1e-6, hypot2(p2, p3) ** alpha);
  const t0 = 0;
  const t1 = t0 + t01;
  const t2 = t1 + t12;
  const t3 = t2 + t23;
  const tt = t1 + t * (t2 - t1);
  const a1x = ((t1 - tt) / t01) * p0.x + ((tt - t0) / t01) * p1.x;
  const a1y = ((t1 - tt) / t01) * p0.y + ((tt - t0) / t01) * p1.y;
  const a2x = ((t2 - tt) / t12) * p1.x + ((tt - t1) / t12) * p2.x;
  const a2y = ((t2 - tt) / t12) * p1.y + ((tt - t1) / t12) * p2.y;
  const a3x = ((t3 - tt) / t23) * p2.x + ((tt - t2) / t23) * p3.x;
  const a3y = ((t3 - tt) / t23) * p2.y + ((tt - t2) / t23) * p3.y;
  const b1x = ((t2 - tt) / (t2 - t0)) * a1x + ((tt - t0) / (t2 - t0)) * a2x;
  const b1y = ((t2 - tt) / (t2 - t0)) * a1y + ((tt - t0) / (t2 - t0)) * a2y;
  const b2x = ((t3 - tt) / (t3 - t1)) * a2x + ((tt - t1) / (t3 - t1)) * a3x;
  const b2y = ((t3 - tt) / (t3 - t1)) * a2y + ((tt - t1) / (t3 - t1)) * a3y;
  const cx = ((t2 - tt) / t12) * b1x + ((tt - t1) / t12) * b2x;
  const cy = ((t2 - tt) / t12) * b1y + ((tt - t1) / t12) * b2y;
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
  }
  return { x: cx, y: cy };
}

/**
 * Smooth polyline through residual (δlon, lat), plotted as unwrapped
 * geographic longitudes `lon0 + δlon` so a compact figure near ±180° stays continuous.
 *
 * Catmull-Rom is **open** with real neighbors outside the rendered window
 * (`k = −15, −14` and `k = +15`). The path is cropped near one sidereal month
 * after `k = −13` (the closest same-direction return, not an earlier figure-8
 * near-miss) and the last interpolated span is merged onto the matching
 * approach into the start so the slowly evolving figure can close without
 * treating the merely-near first/last samples as consecutive control points.
 * Does not resample {@link sublunarPoint} more densely in time.
 */
export function interpolateLunarLocusPolyline(geometry: LunarLocusGeometry): SublunarPointDeg[] {
  const n = geometry.samples.length;
  if (n === 0) {
    return [];
  }
  const current = geometry.samples[geometry.currentIndex] ?? geometry.samples[0]!;
  const lon0 = current.geographic.lonDeg;
  if (n === 1) {
    return [{ latDeg: current.geographic.latDeg, lonDeg: lon0 }];
  }
  const residual: ResidualPt[] = geometry.samples.map((s) => ({
    x: s.residualLonDeg,
    y: s.geographic.latDeg,
  }));
  const kFirst = geometry.samples[0]!.k;
  const kLast = geometry.samples[n - 1]!.k;
  const utcMs = geometry.referenceUtcMs;
  const cadenceMs = geometry.cadenceMs;
  const ctrl = (i: number): ResidualPt => {
    if (i >= 0 && i < n) {
      return residual[i]!;
    }
    const k = i < 0 ? kFirst + i : kLast + (i - (n - 1));
    return residualAtOffset(utcMs, cadenceMs, lon0, k);
  };
  const subdiv = LUNAR_LOCUS_INTERP_SUBDIVISIONS;
  const prefixSpans = Math.min(LUNAR_LOCUS_PREFIX_SPANS, LUNAR_LOCUS_PAST_TANGENT_SUPPORT - 1);
  const out: ResidualPt[] = [];
  const iStart = -prefixSpans;
  const iEnd = n - 1;
  for (let i = iStart; i < iEnd; i += 1) {
    const p0 = ctrl(i - 1);
    const p1 = ctrl(i);
    const p2 = ctrl(i + 1);
    const p3 = ctrl(i + 2);
    for (let s = 0; s < subdiv; s += 1) {
      out.push(centripetalSegment(p0, p1, p2, p3, s / subdiv));
    }
  }
  out.push(ctrl(iEnd));
  const startIdx = prefixSpans * subdiv;
  const start = out[startIdx];
  if (start === undefined) {
    return residual.map((p) => ({ latDeg: p.y, lonDeg: lon0 + p.x }));
  }
  const startNext = out[startIdx + 1] ?? start;
  const startOut = { x: startNext.x - start.x, y: startNext.y - start.y };
  const periodSteps = meanLunarDaysPerSiderealMonth();
  const expectedIdx = startIdx + periodSteps * subdiv;
  const window = subdiv;
  const searchFrom = Math.max(startIdx + subdiv * 2, Math.floor(expectedIdx - window));
  const searchTo = Math.min(out.length - 1, Math.ceil(expectedIdx + window));
  let bestI = Math.min(out.length - 1, Math.max(searchFrom, Math.round(expectedIdx)));
  let bestD = Infinity;
  for (let i = searchFrom; i <= searchTo; i += 1) {
    const p = out[i];
    const prev = out[i - 1];
    if (p === undefined || prev === undefined) {
      continue;
    }
    const incoming = { x: p.x - prev.x, y: p.y - prev.y };
    const align = incoming.x * startOut.x + incoming.y * startOut.y;
    if (align < 0) {
      continue;
    }
    const d = hypot2(p, start);
    if (d < bestD) {
      bestD = d;
      bestI = i;
    }
  }
  if (!Number.isFinite(bestD)) {
    bestI = Math.min(out.length - 1, Math.max(searchFrom, Math.round(expectedIdx)));
  }
  const blendN = Math.min(subdiv, Math.max(0, bestI - startIdx));
  if (blendN >= 2 && startIdx + 1 >= blendN) {
    for (let j = 0; j < blendN; j += 1) {
      const t = smoothstep01((j + 1) / blendN);
      const retIdx = bestI - blendN + 1 + j;
      const sIdx = startIdx - blendN + 1 + j;
      const a = out[retIdx];
      const b = out[sIdx];
      if (a !== undefined && b !== undefined) {
        out[retIdx] = lerpPt(a, b, t);
      }
    }
  }
  const cropped = out.slice(startIdx, bestI + 1);
  return cropped.map((p) => ({ latDeg: p.y, lonDeg: lon0 + p.x }));
}
