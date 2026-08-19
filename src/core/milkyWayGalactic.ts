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
 * IAU 1958 Galactic celestial directions via astronomy-engine GAL↔EQJ, then
 * equator-of-date and GAST (same Earth-rotation wrap as planetary subpoints).
 */

import {
  CombineRotation,
  EquatorFromVector,
  RotateVector,
  Rotation_EQJ_EQD,
  Rotation_GAL_EQJ,
  Spherical,
  VectorFromSphere,
  type RotationMatrix,
  type Vector,
} from "astronomy-engine";
import {
  PLANETARY_EPHEMERIS_AUTHORITY_VERSION,
  isPlanetaryEphemerisSupportedUtc,
  planetaryGastDeg,
} from "./planetaryEphemeris";
import { subpointFromApparentEquator, type PlanetarySubpointDeg } from "./planetarySubpoint";

/** Same product span as ADR 0016: EQD/GAST are unsupported outside 1600–2500. */
export const MILKY_WAY_AUTHORITY_ID = "astronomy-engine-iau1958-galactic";
export const MILKY_WAY_AUTHORITY_VERSION = PLANETARY_EPHEMERIS_AUTHORITY_VERSION;

export const MILKY_WAY_UNAVAILABLE_COPY =
  "Milky Way geometry unavailable outside 1600–2500.";

/** Dummy epoch for direction-only Galactic Cartesian vectors (time is unused). */
const DIRECTION_EPOCH_UTC = Date.UTC(2000, 0, 1, 12, 0, 0, 0);

export type GalacticLonLatDeg = {
  readonly lonDeg: number;
  readonly latDeg: number;
};

export type GalacticEquatorOfDate = {
  /** Apparent RA of date, degrees [0, 360). */
  readonly raDeg: number;
  /** Apparent declination of date, degrees [-90, 90]. */
  readonly decDeg: number;
  /** Greenwich apparent sidereal time, degrees [0, 360). */
  readonly gastDeg: number;
};

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

let galToEqj: ReturnType<typeof Rotation_GAL_EQJ> | null = null;

function galacticToEqjMatrix(): ReturnType<typeof Rotation_GAL_EQJ> {
  if (!galToEqj) {
    galToEqj = Rotation_GAL_EQJ();
  }
  return galToEqj;
}

/**
 * Unit direction in J2000 mean equator (EQJ) for Galactic longitude/latitude.
 * `lonDeg` is Galactic l, `latDeg` is Galactic b. IAU 1958 GAL frame.
 */
export function galacticDirectionEqj(lonDeg: number, latDeg: number): Vector {
  const gal = VectorFromSphere(new Spherical(latDeg, wrap360(lonDeg), 1), DIRECTION_EPOCH_UTC);
  return RotateVector(galacticToEqjMatrix(), gal);
}

/**
 * Galactic (l, b) → equator-of-date RA/Dec plus GAST at `utcMs`.
 * Applies EQJ→EQD (precession and nutation). Null outside the product span.
 */
export function galacticEquatorOfDate(
  lonDeg: number,
  latDeg: number,
  utcMs: number,
): GalacticEquatorOfDate | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  try {
    const date = new Date(utcMs);
    const eqj = galacticDirectionEqj(lonDeg, latDeg);
    const ofDate = RotateVector(Rotation_EQJ_EQD(date), eqj);
    const eq = EquatorFromVector(ofDate);
    const gastDeg = planetaryGastDeg(utcMs);
    if (!Number.isFinite(eq.ra) || !Number.isFinite(eq.dec) || gastDeg === null) {
      return null;
    }
    return {
      raDeg: wrap360(eq.ra * 15),
      decDeg: eq.dec,
      gastDeg,
    };
  } catch {
    return null;
  }
}

/**
 * Terrestrial zenith subpoint of a Galactic direction at `utcMs`.
 * Same east-positive ±180° wrap as Sun/Moon/planets: lat = Dec, lon = wrap180(RA − GAST).
 */
export function galacticZenithSubpoint(
  lonDeg: number,
  latDeg: number,
  utcMs: number,
): PlanetarySubpointDeg | null {
  const eq = galacticEquatorOfDate(lonDeg, latDeg, utcMs);
  if (!eq) {
    return null;
  }
  return subpointFromApparentEquator(eq);
}

export type GalacticEqjSample = {
  readonly lDeg: number;
  readonly bDeg: number;
  readonly eqj: Vector;
};

/**
 * EQJ→EQD at `utcMs` (precession and nutation). Apply to already-EQJ Galactic directions.
 * Null outside the product span.
 */
export function eqjToEquatorOfDateMatrix(
  utcMs: number,
): ReturnType<typeof Rotation_EQJ_EQD> | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  try {
    return Rotation_EQJ_EQD(new Date(utcMs));
  } catch {
    return null;
  }
}

/**
 * Combine GAL→EQJ (constant) with EQJ→EQD at `utcMs`. For Galactic Cartesian, not EQJ.
 */
export function galacticToEquatorOfDateMatrix(
  utcMs: number,
): ReturnType<typeof CombineRotation> | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  try {
    return CombineRotation(galacticToEqjMatrix(), Rotation_EQJ_EQD(new Date(utcMs)));
  } catch {
    return null;
  }
}

export function equatorOfDateFromEqjVector(
  eqj: Vector,
  eqjToEqd: RotationMatrix,
  gastDeg: number,
): PlanetarySubpointDeg | null {
  try {
    const ofDate = RotateVector(eqjToEqd, eqj);
    const eq = EquatorFromVector(ofDate);
    if (!Number.isFinite(eq.ra) || !Number.isFinite(eq.dec)) {
      return null;
    }
    return subpointFromApparentEquator({
      raDeg: wrap360(eq.ra * 15),
      decDeg: eq.dec,
      gastDeg,
    });
  } catch {
    return null;
  }
}

export function equatorRaDecFromEqjVector(
  eqj: Vector,
  eqjToEqd: RotationMatrix,
): { raDeg: number; decDeg: number } | null {
  try {
    const ofDate = RotateVector(eqjToEqd, eqj);
    const eq = EquatorFromVector(ofDate);
    if (!Number.isFinite(eq.ra) || !Number.isFinite(eq.dec)) {
      return null;
    }
    return { raDeg: wrap360(eq.ra * 15), decDeg: eq.dec };
  } catch {
    return null;
  }
}
