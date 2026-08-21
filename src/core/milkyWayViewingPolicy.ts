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
 * milky-way-viewing-v2 — one primary reference-city Milky Way Viewing Window.
 * Intersection of Galactic-center altitude, astronomical darkness, and existing
 * local physical moonlight. Clouds and light pollution are not inputs.
 *
 * v1 (LIB-051) exposed Viewing / Strong / Prime partitions. Those are not
 * product-level states in v2. The v2 gate is the former Prime core.
 */

export const MILKY_WAY_VIEWING_POLICY_VERSION = "milky-way-viewing-v2";

/** Baseline viability: GC must reach this altitude or the family does not apply. */
export const MIN_GC_ALTITUDE_DEG = 15;

/** Fraction of the local nightly maximum Galactic-center altitude. */
export const MIN_ALTITUDE_QUALITY = 0.9;

/** Astronomical night. */
export const MAX_SUN_ALTITUDE_DEG = -18;

/**
 * Local moonlight from phase × incidence × lunar-eclipse transmission, [0, 1].
 * Moon below the horizon is 0. Chosen after measuring the existing model:
 * moon-down ≈ 0; a high full Moon is ~0.4–1. Conservative Prime-like gate.
 */
export const MAX_MOONLIGHT_01 = 0.08;

/** Explanatory copy only — not an event gate. */
export const NEAR_NEW_MOON_ILLUMINATED_FRACTION = 0.08;

export function nightlyMaximumGcAltitudeDeg(
  observerLatDeg: number,
  gcDeclinationDeg: number,
): number {
  return 90 - Math.abs(observerLatDeg - gcDeclinationDeg);
}

export function milkyWayAltitudeQuality01(
  gcAltitudeDeg: number,
  nightlyMaximumAltitudeDeg: number,
): number {
  if (!(nightlyMaximumAltitudeDeg > 0) || !Number.isFinite(gcAltitudeDeg)) {
    return 0;
  }
  return Math.max(0, Math.min(1, gcAltitudeDeg / nightlyMaximumAltitudeDeg));
}

export function milkyWayViewingQualifies(input: {
  gcAltitudeDeg: number;
  solarAltitudeDeg: number;
  localMoonlight01: number;
  nightlyMaximumAltitudeDeg: number;
}): boolean {
  const hMax = input.nightlyMaximumAltitudeDeg;
  if (!(hMax >= MIN_GC_ALTITUDE_DEG)) {
    return false;
  }
  if (!(input.gcAltitudeDeg >= MIN_GC_ALTITUDE_DEG)) {
    return false;
  }
  if (!(input.solarAltitudeDeg <= MAX_SUN_ALTITUDE_DEG)) {
    return false;
  }
  const quality = milkyWayAltitudeQuality01(input.gcAltitudeDeg, hMax);
  if (!(quality >= MIN_ALTITUDE_QUALITY)) {
    return false;
  }
  const moon = Math.max(0, Math.min(1, input.localMoonlight01));
  return moon <= MAX_MOONLIGHT_01;
}
