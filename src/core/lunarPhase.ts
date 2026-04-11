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

import { moonEclipticLongitudeDeg } from "./sublunarPoint";
import { sunEclipticLongitudeDeg } from "./subsolarPoint";

/**
 * Approximate lunar phase from mean solar/lunar longitudes (same models as
 * subsolar / sub-lunar position). No high-precision astronomy; adequate for UI.
 */

export interface LunarPhaseApprox {
  /** Fraction of the apparent lunar disc illuminated, 0 (new) … 1 (full). */
  illuminatedFraction: number;
  /**
   * Geocentric ecliptic elongation: Moon longitude minus Sun longitude (degrees),
   * normalized to (−180, 180]. Positive ⇒ waxing (new → full).
   */
  geocentricElongationDeg: number;
  /** True when illumination is increasing toward full moon. */
  waxing: boolean;
}

function normalizeElongationDeg(deg: number): number {
  let e = deg % 360;
  if (e > 180) {
    e -= 360;
  }
  if (e <= -180) {
    e += 360;
  }
  return e;
}

/**
 * Illuminated fraction and elongation from approximate ecliptic longitudes.
 * Uses the standard relation with geocentric elongation E (radians):
 * k = (1 − cos E) / 2.
 */
export function approximateLunarPhase(utcMs: number): LunarPhaseApprox {
  const lambdaMoon = moonEclipticLongitudeDeg(utcMs);
  const lambdaSun = sunEclipticLongitudeDeg(utcMs);
  const geocentricElongationDeg = normalizeElongationDeg(lambdaMoon - lambdaSun);
  const eRad = (geocentricElongationDeg * Math.PI) / 180;
  const illuminatedFraction = (1 - Math.cos(eRad)) / 2;
  /** New → full: normalized elongation in [0, 180). At full (±180) the disc is symmetric. */
  const waxing = geocentricElongationDeg >= 0 && geocentricElongationDeg < 180;

  return {
    illuminatedFraction,
    geocentricElongationDeg,
    waxing,
  };
}
