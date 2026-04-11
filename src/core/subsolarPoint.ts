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
 * Approximate subsolar latitude/longitude (degrees, east longitude positive)
 * for the given UTC instant. Suitable for day/night visualization, not surveying.
 *
 * Uses mean solar geometry: mean longitude, mean anomaly, ecliptic longitude,
 * obliquity, then GMST vs right ascension for the subsolar meridian.
 */

export interface SubsolarPointDeg {
  latDeg: number;
  lonDeg: number;
}

const MS_PER_DAY = 86400000;
/** Julian date from Unix ms (UTC). */
function julianDate(utcMs: number): number {
  return utcMs / MS_PER_DAY + 2440587.5;
}

/**
 * Approximate Sun ecliptic longitude (degrees, 0…360), same mean orbit as
 * {@link subsolarPoint}. Used for lunar phase (elongation) alongside Moon longitude.
 */
export function sunEclipticLongitudeDeg(utcMs: number): number {
  const JD = julianDate(utcMs);
  const n = JD - 2451545.0;
  const L = 280.46 + 0.9856474 * n;
  const g = 357.528 + 0.9856003 * n;
  const gRad = (g * Math.PI) / 180;
  const lambdaDeg = L + 1.915 * Math.sin(gRad) + 0.02 * Math.sin(2 * gRad);
  return ((lambdaDeg % 360) + 360) % 360;
}

/**
 * Returns the point on Earth where the Sun is at the zenith (subsolar point).
 */
export function subsolarPoint(utcMs: number): SubsolarPointDeg {
  const JD = julianDate(utcMs);
  const n = JD - 2451545.0;

  const lambdaDeg = sunEclipticLongitudeDeg(utcMs);
  const lambdaRad = (lambdaDeg * Math.PI) / 180;

  const epsDeg = 23.439 - 4e-7 * n;
  const epsRad = (epsDeg * Math.PI) / 180;

  const sinDec = Math.sin(epsRad) * Math.sin(lambdaRad);
  const decRad = Math.asin(sinDec);

  const y = Math.cos(epsRad) * Math.sin(lambdaRad);
  const x = Math.cos(lambdaRad);
  const raRad = Math.atan2(y, x);

  let gmst = 280.46061837 + 360.98564736629 * n;
  gmst = ((gmst % 360) + 360) % 360;

  const raDeg = (raRad * 180) / Math.PI;
  let lonDeg = raDeg - gmst;
  lonDeg = ((lonDeg + 540) % 360) - 180;

  const latDeg = (decRad * 180) / Math.PI;

  return { latDeg, lonDeg };
}
