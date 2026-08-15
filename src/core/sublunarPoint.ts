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

/** Julian century length used by this module's Meeus-style series. */
export const LUNAR_MODEL_JULIAN_CENTURY_DAYS = 36525;

/**
 * Mean GMST rate (degrees per day of `n = JD − 2451545`), same coefficient as {@link sublunarPoint}.
 */
export const LUNAR_MODEL_GMST_RATE_DEG_PER_DAY = 360.98564736629;

/**
 * Moon mean ecliptic longitude `Lp` rate (degrees per Julian century of `T`).
 */
export const LUNAR_MODEL_MEAN_LONGITUDE_RATE_DEG_PER_JULIAN_CENTURY = 481267.88123421;

/**
 * Moon mean ascending-node longitude `Ω` at J2000 (degrees).
 * Same truncated Meeus-style model as {@link sublunarPoint}.
 */
export const LUNAR_MODEL_NODE_LONGITUDE_AT_J2000_DEG = 125.0445479;

/** `Ω` rate, degrees per Julian century of `T`. */
export const LUNAR_MODEL_NODE_RATE_DEG_PER_JULIAN_CENTURY = -1934.136261;

/** Argument of latitude `F` at J2000 (degrees). */
export const LUNAR_MODEL_ARGUMENT_OF_LATITUDE_AT_J2000_DEG = 93.272095;

/** `F` rate, degrees per Julian century of `T`. */
export const LUNAR_MODEL_ARGUMENT_OF_LATITUDE_RATE_DEG_PER_JULIAN_CENTURY = 483202.0175233;

function julianDate(utcMs: number): number {
  return utcMs / MS_PER_DAY + 2440587.5;
}

/**
 * Approximate Moon ecliptic longitude (degrees, 0…360), same series as
 * {@link sublunarPoint}. Paired with {@link sunEclipticLongitudeDeg} for phase.
 */
export function moonEclipticLongitudeDeg(utcMs: number): number {
  const JD = julianDate(utcMs);
  const T = (JD - 2451545.0) / LUNAR_MODEL_JULIAN_CENTURY_DAYS;

  const Lp = 218.3164477 + LUNAR_MODEL_MEAN_LONGITUDE_RATE_DEG_PER_JULIAN_CENTURY * T;
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

function julianCenturiesFromJ2000(utcMs: number): number {
  const JD = julianDate(utcMs);
  return (JD - 2451545.0) / LUNAR_MODEL_JULIAN_CENTURY_DAYS;
}

function wrapDeg360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Approximate Moon ecliptic latitude (degrees), same series as {@link sublunarPoint}.
 */
export function moonEclipticLatitudeDeg(utcMs: number): number {
  const T = julianCenturiesFromJ2000(utcMs);
  const Mp = 134.9633964 + 477198.8675055 * T;
  const F = LUNAR_MODEL_ARGUMENT_OF_LATITUDE_AT_J2000_DEG +
    LUNAR_MODEL_ARGUMENT_OF_LATITUDE_RATE_DEG_PER_JULIAN_CENTURY * T;
  const d = Math.PI / 180;
  return (
    5.128122 * Math.sin(F * d) +
    0.280606 * Math.sin((Mp + F) * d) +
    0.277693 * Math.sin((Mp - F) * d)
  );
}

/** Mean argument of latitude `F` (degrees, 0…360), same linear term as {@link sublunarPoint}. */
export function moonArgumentOfLatitudeDeg(utcMs: number): number {
  const T = julianCenturiesFromJ2000(utcMs);
  return wrapDeg360(
    LUNAR_MODEL_ARGUMENT_OF_LATITUDE_AT_J2000_DEG +
      LUNAR_MODEL_ARGUMENT_OF_LATITUDE_RATE_DEG_PER_JULIAN_CENTURY * T,
  );
}

/** Mean longitude of the ascending node `Ω` (degrees, 0…360). */
export function moonMeanAscendingNodeLongitudeDeg(utcMs: number): number {
  const T = julianCenturiesFromJ2000(utcMs);
  return wrapDeg360(
    LUNAR_MODEL_NODE_LONGITUDE_AT_J2000_DEG + LUNAR_MODEL_NODE_RATE_DEG_PER_JULIAN_CENTURY * T,
  );
}

export type MoonEquatorialRaDecGmstDeg = {
  /** Right ascension, degrees. */
  readonly raDeg: number;
  /** Declination, degrees. */
  readonly decDeg: number;
  /** Greenwich mean sidereal time, degrees (0…360). */
  readonly gmstDeg: number;
};

/**
 * Moon equatorial coordinates and GMST from the same truncated series as {@link sublunarPoint}.
 * Does not read the system clock.
 */
export function moonEquatorialRaDecGmst(utcMs: number): MoonEquatorialRaDecGmstDeg {
  const JD = julianDate(utcMs);
  const T = (JD - 2451545.0) / LUNAR_MODEL_JULIAN_CENTURY_DAYS;
  const n = JD - 2451545.0;

  const lambda = moonEclipticLongitudeDeg(utcMs);
  const beta = moonEclipticLatitudeDeg(utcMs);

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

  let gmst = 280.46061837 + LUNAR_MODEL_GMST_RATE_DEG_PER_DAY * n;
  gmst = ((gmst % 360) + 360) % 360;

  return {
    raDeg: (raRad * 180) / Math.PI,
    decDeg: (decRad * 180) / Math.PI,
    gmstDeg: gmst,
  };
}

/**
 * Point on Earth where the Moon is at the zenith (sub-lunar point).
 */
export function sublunarPoint(utcMs: number): SublunarPointDeg {
  const { raDeg, decDeg, gmstDeg } = moonEquatorialRaDecGmst(utcMs);
  let lonDeg = raDeg - gmstDeg;
  lonDeg = ((lonDeg + 540) % 360) - 180;
  return { latDeg: decDeg, lonDeg };
}
