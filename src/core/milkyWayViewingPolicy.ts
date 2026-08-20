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
 * milky-way-viewing-v1 — explicit astronomical conditions for a reference-city
 * Milky Way Viewing Window. Not a hidden aggregate score.
 *
 * Viewing / Strong / Prime are the intersection of Galactic-center altitude,
 * solar altitude, and existing local physical moonlight. Clouds and light
 * pollution are not inputs.
 */

export const MILKY_WAY_VIEWING_POLICY_VERSION = "milky-way-viewing-v1";

export const MILKY_WAY_VIEWING_LEVELS = ["viewing", "strong", "prime"] as const;
export type MilkyWayViewingLevel = (typeof MILKY_WAY_VIEWING_LEVELS)[number];

/** Baseline viability: GC must reach this altitude or the family does not apply. */
export const VIEWING_MIN_GC_ALTITUDE_DEG = 15;

/** Strong also requires this absolute floor so barely-risen GC is not “Strong”. */
export const STRONG_MIN_GC_ALTITUDE_DEG = 20;

/** Fraction of the local nightly maximum altitude. */
export const STRONG_MIN_ALTITUDE_QUALITY = 0.75;
export const PRIME_MIN_ALTITUDE_QUALITY = 0.9;

/** Viewing may open at nautical twilight; Strong/Prime need astronomical night. */
export const VIEWING_MAX_SUN_ALTITUDE_DEG = -12;
export const STRONG_MAX_SUN_ALTITUDE_DEG = -18;
export const PRIME_MAX_SUN_ALTITUDE_DEG = -18;

/**
 * Local moonlight from phase × incidence × lunar-eclipse transmission, [0, 1].
 * Moon below the horizon is 0. Chosen after measuring the existing model:
 * moon-down ≈ 0; a high full Moon is ~0.4–1; a very low full Moon is still small.
 * Viewing has no moonlight gate. Strong/Prime reject bright modeled moonlight.
 */
export const STRONG_MAX_MOONLIGHT_01 = 0.22;
export const PRIME_MAX_MOONLIGHT_01 = 0.08;

export function milkyWayViewingLevelRank(level: MilkyWayViewingLevel): number {
  switch (level) {
    case "viewing":
      return 0;
    case "strong":
      return 1;
    case "prime":
      return 2;
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

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

/**
 * Highest qualifying level, or null if Viewing itself fails.
 * Prime is relative to local culmination once GC actually reaches the useful floor.
 */
export function classifyMilkyWayViewingLevel(input: {
  gcAltitudeDeg: number;
  solarAltitudeDeg: number;
  localMoonlight01: number;
  nightlyMaximumAltitudeDeg: number;
}): MilkyWayViewingLevel | null {
  const hMax = input.nightlyMaximumAltitudeDeg;
  if (!(hMax >= VIEWING_MIN_GC_ALTITUDE_DEG)) {
    return null;
  }
  if (!(input.gcAltitudeDeg >= VIEWING_MIN_GC_ALTITUDE_DEG)) {
    return null;
  }
  if (!(input.solarAltitudeDeg <= VIEWING_MAX_SUN_ALTITUDE_DEG)) {
    return null;
  }
  const quality = milkyWayAltitudeQuality01(input.gcAltitudeDeg, hMax);
  const moon = Math.max(0, Math.min(1, input.localMoonlight01));
  const primeGeometry =
    quality >= PRIME_MIN_ALTITUDE_QUALITY &&
    input.gcAltitudeDeg >= VIEWING_MIN_GC_ALTITUDE_DEG;
  const strongGeometry =
    input.gcAltitudeDeg >= STRONG_MIN_GC_ALTITUDE_DEG &&
    quality >= STRONG_MIN_ALTITUDE_QUALITY;
  if (
    primeGeometry &&
    input.solarAltitudeDeg <= PRIME_MAX_SUN_ALTITUDE_DEG &&
    moon <= PRIME_MAX_MOONLIGHT_01
  ) {
    return "prime";
  }
  if (
    strongGeometry &&
    input.solarAltitudeDeg <= STRONG_MAX_SUN_ALTITUDE_DEG &&
    moon <= STRONG_MAX_MOONLIGHT_01
  ) {
    return "strong";
  }
  return "viewing";
}

export function isMilkyWayViewingLevel(raw: unknown): raw is MilkyWayViewingLevel {
  return typeof raw === "string" && (MILKY_WAY_VIEWING_LEVELS as readonly string[]).includes(raw);
}
