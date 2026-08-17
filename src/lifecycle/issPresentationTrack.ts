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
 * Local ISS ground-track regeneration from an already-acquired TLE (LIB-041).
 * Horizon changes expand the SGP4 sample window in-process. Never fetches.
 */

import {
  issOrbitalPeriodMsFromSatrecNoRadPerMin,
  issOrbitalPeriodMsFromTleLine2,
} from "../core/issOrbitHorizon";
import { twoline2satrec } from "satellite.js";
import {
  ISS_ORBITAL_TRACK_SAMPLE_STEP_MS,
  propagateIssGroundTrackFromTle,
  type IssTleLines,
} from "./issOrbitalTrackAcquisition";
import type { DynamicTrackSample } from "./dynamicSnapshotTypes";

export type IssPresentationTrackKeyParts = Readonly<{
  line1: string;
  line2: string;
  lookbackMs: number;
  lookaheadMs: number;
  sampleStepMs: number;
  productTimeBucketMs: number;
}>;

type CacheEntry = Readonly<{
  key: string;
  samples: readonly DynamicTrackSample[];
}>;

let cache: CacheEntry | null = null;

export function issPresentationTrackCacheKey(parts: IssPresentationTrackKeyParts): string {
  return [
    parts.line1,
    parts.line2,
    String(Math.round(parts.lookbackMs)),
    String(Math.round(parts.lookaheadMs)),
    String(Math.round(parts.sampleStepMs)),
    String(parts.productTimeBucketMs),
  ].join("|");
}

export function resetIssPresentationTrackCacheForTests(): void {
  cache = null;
}

/**
 * Period from published TLE mean motion (rev/day). `satrec.no` (rad/min) is fallback.
 */
export function issOrbitalPeriodMsFromTle(tle: IssTleLines): number | null {
  const fromTle = issOrbitalPeriodMsFromTleLine2(tle.line2);
  if (fromTle !== null) {
    return fromTle;
  }
  try {
    const satrec = twoline2satrec(tle.line1, tle.line2);
    return issOrbitalPeriodMsFromSatrecNoRadPerMin(satrec.no);
  } catch {
    return null;
  }
}

export function issPresentationProductTimeBucketMs(
  productUtcMs: number,
  sampleStepMs: number = ISS_ORBITAL_TRACK_SAMPLE_STEP_MS,
): number {
  if (!(sampleStepMs > 0) || !Number.isFinite(productUtcMs)) {
    return productUtcMs;
  }
  return Math.floor(productUtcMs / sampleStepMs) * sampleStepMs;
}

/**
 * Timed geographic samples covering the requested lookback/lookahead around product UTC.
 * Cached by TLE identity, resolved horizons, cadence, and a sample-step time bucket.
 */
export function getIssPresentationTrackSamples(options: {
  tle: IssTleLines;
  productUtcMs: number;
  lookbackMs: number;
  lookaheadMs: number;
  sampleStepMs?: number;
}): readonly DynamicTrackSample[] | null {
  const sampleStepMs =
    options.sampleStepMs !== undefined &&
    Number.isFinite(options.sampleStepMs) &&
    options.sampleStepMs > 0
      ? options.sampleStepMs
      : ISS_ORBITAL_TRACK_SAMPLE_STEP_MS;
  const lookbackMs = Math.max(0, options.lookbackMs);
  const lookaheadMs = Math.max(0, options.lookaheadMs);
  const productTimeBucketMs = issPresentationProductTimeBucketMs(
    options.productUtcMs,
    sampleStepMs,
  );
  const key = issPresentationTrackCacheKey({
    line1: options.tle.line1,
    line2: options.tle.line2,
    lookbackMs,
    lookaheadMs,
    sampleStepMs,
    productTimeBucketMs,
  });
  if (cache !== null && cache.key === key) {
    return cache.samples;
  }
  const propagated = propagateIssGroundTrackFromTle(options.tle, {
    centerTimeMs: options.productUtcMs,
    lookbackMs,
    lookaheadMs,
    sampleStepMs,
  });
  if (!propagated.ok) {
    return null;
  }
  cache = { key, samples: propagated.samples };
  return propagated.samples;
}
