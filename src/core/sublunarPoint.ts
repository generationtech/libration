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
 * Approximate sub-lunar latitude/longitude (degrees, east longitude positive)
 * for the given UTC instant. Suitable for map markers, not surveying.
 *
 * Uses Julian centuries from J2000, mean lunar elements, and a few dominant
 * periodic terms for ecliptic longitude/latitude (Meeus-style), then the same
 * ecliptic→equatorial and GMST steps as {@link subsolarPoint}.
 */

export interface SublunarPointDeg {
  latDeg: number;
  lonDeg: number;
}

const MS_PER_DAY = 86400000;

function julianDate(utcMs: number): number {
  return utcMs / MS_PER_DAY + 2440587.5;
}

/**
 * Approximate Moon ecliptic longitude (degrees, 0…360), same series as
 * {@link sublunarPoint}. Paired with {@link sunEclipticLongitudeDeg} for phase.
 */
export function moonEclipticLongitudeDeg(utcMs: number): number {
  const JD = julianDate(utcMs);
  const T = (JD - 2451545.0) / 36525.0;

  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = 297.8501921 + 445267.1114034 * T;
  const M = 357.5291092 + 35999.0502909 * T;
  const Mp = 134.9633964 + 477198.8675055 * T;

  const deg = Math.PI / 180;
  let lambda =
    Lp +
    6.288774 * Math.sin(Mp * deg) +
    1.274027 * Math.sin((2 * D - Mp) * deg) +
    0.658314 * Math.sin(2 * D * deg) +
    0.213618 * Math.sin(2 * Mp * deg) -
    0.185596 * Math.sin(M * deg);

  return ((lambda % 360) + 360) % 360;
}

/**
 * Point on Earth where the Moon is at the zenith (sub-lunar point).
 */
export function sublunarPoint(utcMs: number): SublunarPointDeg {
  const JD = julianDate(utcMs);
  const T = (JD - 2451545.0) / 36525.0;
  const n = JD - 2451545.0;

  const Mp = 134.9633964 + 477198.8675055 * T;
  const F = 93.272095 + 483202.0175233 * T;

  const d = Math.PI / 180;
  const lambda = moonEclipticLongitudeDeg(utcMs);

  const beta =
    5.128122 * Math.sin(F * d) +
    0.280606 * Math.sin((Mp + F) * d) +
    0.277693 * Math.sin((Mp - F) * d);

  const epsDeg = 23.439291 - 0.0130042 * T;
  const epsRad = (epsDeg * Math.PI) / 180;
  const lambdaRad = (lambda * Math.PI) / 180;
  const betaRad = (beta * Math.PI) / 180;

  const sinDec =
    Math.sin(betaRad) * Math.cos(epsRad) +
    Math.cos(betaRad) * Math.sin(epsRad) * Math.sin(lambdaRad);
  const decRad = Math.asin(sinDec);

  const y =
    Math.sin(lambdaRad) * Math.cos(betaRad) * Math.cos(epsRad) -
    Math.sin(betaRad) * Math.sin(epsRad);
  const x = Math.cos(lambdaRad) * Math.cos(betaRad);
  const raRad = Math.atan2(y, x);

  let gmst = 280.46061837 + 360.98564736629 * n;
  gmst = ((gmst % 360) + 360) % 360;

  const raDeg = (raRad * 180) / Math.PI;
  let lonDeg = raDeg - gmst;
  lonDeg = ((lonDeg + 540) % 360) - 180;

  const latDeg = (decRad * 180) / Math.PI;

  return { latDeg, lonDeg };
}
