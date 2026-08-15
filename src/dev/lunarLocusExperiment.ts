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
 * Development-only lunar-locus sampling: mean lunar-day cadence from the existing
 * {@link sublunarPoint} mean rates. Not a production overlay.
 */

import {
  LUNAR_MODEL_GMST_RATE_DEG_PER_DAY,
  LUNAR_MODEL_JULIAN_CENTURY_DAYS,
  LUNAR_MODEL_MEAN_LONGITUDE_RATE_DEG_PER_JULIAN_CENTURY,
  sublunarPoint,
  type SublunarPointDeg,
} from "../core/sublunarPoint";
import { shortLonDeltaDeg } from "../renderer/renderPlan/equirectSeamPath";

const MS_PER_DAY = 86_400_000;

/** Inclusive sample count: k = 0 … N−1. */
export const LUNAR_LOCUS_SAMPLE_COUNT = 28;

export type LunarLocusMode = "geographic" | "residual" | "glyph";
export type LunarLocusTreatment = "dots" | "dots-line";

export type LunarLocusEpochId = "recent" | "standstill" | "minor" | "baseline";

export const LUNAR_LOCUS_EPOCH_UTC = {
  recent: "2026-01-16T22:00:00.000Z",
  standstill: "2025-03-08T12:00:00.000Z",
  minor: "2015-09-16T12:00:00.000Z",
  baseline: "2030-06-15T12:00:00.000Z",
} as const satisfies Record<LunarLocusEpochId, string>;

export type LunarLocusSample = {
  readonly index: number;
  readonly utcMs: number;
  readonly geographic: SublunarPointDeg;
  /** Residual longitude δlon_k = wrap(lon_k − lon_0), (−180°, +180°]. */
  readonly residualLonDeg: number;
};

export type LunarLocusGeometry = {
  readonly cadenceMs: number;
  readonly sampleCount: number;
  readonly referenceUtcMs: number;
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

/**
 * Mean lunar-day period implied by this repository's lunar model:
 * time for 360° of (GMST − mean lunar ecliptic longitude).
 *
 * Starting public approximation is 24 h 50 m; this function is the implementation cadence.
 */
export function meanLunarDayMsFromModel(): number {
  const lpDegPerDay =
    LUNAR_MODEL_MEAN_LONGITUDE_RATE_DEG_PER_JULIAN_CENTURY / LUNAR_MODEL_JULIAN_CENTURY_DAYS;
  const relativeDegPerDay = LUNAR_MODEL_GMST_RATE_DEG_PER_DAY - lpDegPerDay;
  return (360 / relativeDegPerDay) * MS_PER_DAY;
}

/** Same wrap as {@link shortLonDeltaDeg}(a, b): (((b − a) + 540) % 360) − 180. */
export function residualLongitudeDeg(lonDeg: number, referenceLonDeg: number): number {
  return shortLonDeltaDeg(referenceLonDeg, lonDeg);
}

export function wrapLongitudeDeg(lonDeg: number): number {
  return ((lonDeg + 540) % 360) - 180;
}

/**
 * Sample {@link sublunarPoint} at k = 0 … N−1 mean lunar days from `utcMs`.
 * Sample 0 is the canonical instant (current Moon).
 */
export function sampleLunarLocus(
  utcMs: number,
  sampleCount: number = LUNAR_LOCUS_SAMPLE_COUNT,
): LunarLocusGeometry {
  const cadenceMs = meanLunarDayMsFromModel();
  const n = Math.max(1, Math.floor(sampleCount));
  const reference = sublunarPoint(utcMs);
  const samples: LunarLocusSample[] = [];
  for (let k = 0; k < n; k += 1) {
    const t = utcMs + k * cadenceMs;
    const geographic = k === 0 ? reference : sublunarPoint(t);
    samples.push({
      index: k,
      utcMs: t,
      geographic,
      residualLonDeg: residualLongitudeDeg(geographic.lonDeg, reference.lonDeg),
    });
  }
  return {
    cadenceMs,
    sampleCount: n,
    referenceUtcMs: utcMs,
    samples,
  };
}

export function plottedPointDeg(
  sample: LunarLocusSample,
  referenceLonDeg: number,
  mode: LunarLocusMode,
): SublunarPointDeg {
  if (mode === "geographic") {
    return sample.geographic;
  }
  return {
    latDeg: sample.geographic.latDeg,
    lonDeg: wrapLongitudeDeg(referenceLonDeg + sample.residualLonDeg),
  };
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
