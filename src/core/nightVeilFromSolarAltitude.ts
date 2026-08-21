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
 * Night-side veil factor from solar altitude, aligned with the continuous illumination
 * field in {@link sampleIlluminationRgba8} (clear day above +4°, settled by −18°).
 *
 * Solar altitude remains the physical authority. The factory transfer is a C1 monotone
 * cubic through twilight-semantic anchors, not a Hermite smootherstep across the whole
 * interval. These functions do not move the Sun, terminator, or twilight geometry.
 */

export const ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG = 4;
export const ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG = -18;

/**
 * DEV/diagnostic transfer ids. Production uses {@link PRODUCTION_NIGHT_VEIL_TRANSFER_ID}
 * unless a DEV override is set. Not user configuration.
 */
export const NIGHT_VEIL_TRANSFER_IDS = [
  "smootherstep",
  "linearSmooth",
  "twilightAnchored",
  "smoothstep",
] as const;

export type NightVeilTransferId = (typeof NIGHT_VEIL_TRANSFER_IDS)[number];

/** Factory presentation. LIB-056 selected the twilight-anchored C1 curve. */
export const PRODUCTION_NIGHT_VEIL_TRANSFER_ID: NightVeilTransferId = "twilightAnchored";

const ALTITUDE_SPAN_DEG =
  ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG - ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG;

/** Ease-in covers +4° → 0°; ease-out covers the last 4° of astronomical twilight. */
const LINEAR_SMOOTH_END_FRACTION = 4 / ALTITUDE_SPAN_DEG;

/**
 * Twilight-semantic veil samples for the C1 piecewise candidate.
 * Anchors are scientific references, not rendered band edges.
 */
const TWILIGHT_ANCHORED_DEPRESSION_DEG = [0, 4, 10, 16, 22] as const;
const TWILIGHT_ANCHORED_VEIL01 = [0, 0.1, 0.32, 0.7, 1] as const;

let devNightVeilTransferOverride: NightVeilTransferId | null = null;

export function setDevNightVeilTransferOverride(id: NightVeilTransferId | null): void {
  devNightVeilTransferOverride = id;
}

export function getActiveNightVeilTransferId(): NightVeilTransferId {
  return devNightVeilTransferOverride ?? PRODUCTION_NIGHT_VEIL_TRANSFER_ID;
}

export function parseNightVeilTransferId(raw: string | null | undefined): NightVeilTransferId | null {
  if (raw == null || raw === "") {
    return null;
  }
  if (raw === "current") {
    return "smootherstep";
  }
  if ((NIGHT_VEIL_TRANSFER_IDS as readonly string[]).includes(raw)) {
    return raw as NightVeilTransferId;
  }
  return null;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function unitSmoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

function unitSmootherstep(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/**
 * Zero slope at 0 and 1, constant slope through the open middle, C1 at the joins.
 * Quadratic caps so the end-piece slope never exceeds the middle slope.
 * `w` is the end-cap fraction of the unit interval.
 */
function unitLinearWithSmoothCaps(t: number, w: number): number {
  const x = clamp01(t);
  if (w <= 0) {
    return x;
  }
  if (w >= 0.5) {
    return unitSmoothstep(x);
  }
  const s = 1 / (1 - w);
  if (x < w) {
    return ((s / (2 * w)) * x) * x;
  }
  if (x > 1 - w) {
    const u = 1 - x;
    return 1 - ((s / (2 * w)) * u) * u;
  }
  return s * (x - w / 2);
}

/**
 * Fritsch–Carlson monotone cubic (C1) through strictly increasing knots.
 */
function monotoneCubic01(xs: readonly number[], ys: readonly number[], x: number): number {
  const last = xs.length - 1;
  if (x <= xs[0]!) {
    return ys[0]!;
  }
  if (x >= xs[last]!) {
    return ys[last]!;
  }
  const n = last;
  const delta: number[] = [];
  for (let i = 0; i < n; i++) {
    delta[i] = (ys[i + 1]! - ys[i]!) / (xs[i + 1]! - xs[i]!);
  }
  const m: number[] = new Array(n + 1);
  m[0] = delta[0]!;
  m[n] = delta[n - 1]!;
  for (let i = 1; i < n; i++) {
    if (delta[i - 1]! * delta[i]! <= 0) {
      m[i] = 0;
    } else {
      m[i] = (delta[i - 1]! + delta[i]!) / 2;
    }
  }
  for (let i = 0; i < n; i++) {
    if (Math.abs(delta[i]!) < 1e-15) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i]! / delta[i]!;
    const b = m[i + 1]! / delta[i]!;
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * delta[i]!;
      m[i + 1] = t * b * delta[i]!;
    }
  }
  let i = 0;
  while (i < n - 1 && x > xs[i + 1]!) {
    i++;
  }
  const h = xs[i + 1]! - xs[i]!;
  const t = (x - xs[i]!) / h;
  const t2 = t * t;
  const t3 = t2 * t;
  return (
    (2 * t3 - 3 * t2 + 1) * ys[i]! +
    (t3 - 2 * t2 + t) * h * m[i]! +
    (-2 * t3 + 3 * t2) * ys[i + 1]! +
    (t3 - t2) * h * m[i + 1]!
  );
}

function unitTFromSolarAltitudeDeg(altitudeDeg: number): number {
  if (!Number.isFinite(altitudeDeg)) {
    return 0;
  }
  return (
    (altitudeDeg - ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG) /
    (ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG - ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG)
  );
}

function twilightAnchoredVeil01(altitudeDeg: number): number {
  const depressionDeg = ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG - altitudeDeg;
  return clamp01(
    monotoneCubic01(TWILIGHT_ANCHORED_DEPRESSION_DEG, TWILIGHT_ANCHORED_VEIL01, depressionDeg),
  );
}

/** Named candidate. `smootherstep` is the historical factory curve. */
export function nightVeil01ForTransfer(
  transferId: NightVeilTransferId,
  altitudeDeg: number,
): number {
  const t = unitTFromSolarAltitudeDeg(altitudeDeg);
  switch (transferId) {
    case "smootherstep":
      return unitSmootherstep(t);
    case "smoothstep":
      return unitSmoothstep(t);
    case "linearSmooth":
      return unitLinearWithSmoothCaps(t, LINEAR_SMOOTH_END_FRACTION);
    case "twilightAnchored":
      return twilightAnchoredVeil01(altitudeDeg);
    default: {
      const _exhaustive: never = transferId;
      return _exhaustive;
    }
  }
}

/** 0 = day clarity; 1 = deep-night weighting (active factory or DEV override). */
export function illuminationNightVeil01FromSolarAltitudeDeg(altitudeDeg: number): number {
  return nightVeil01ForTransfer(getActiveNightVeilTransferId(), altitudeDeg);
}
