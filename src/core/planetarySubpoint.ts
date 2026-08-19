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
 * Terrestrial sub-object point: where a body is at the zenith.
 * Same longitude-sign convention as {@link subsolarPoint} / {@link sublunarPoint}:
 * east longitude positive, wrapped to ±180°.
 *
 *   lat = apparent declination of date
 *   lon = wrap180(apparent RA of date − GAST)
 */

import type { PlanetaryBodyId } from "./planetaryBodies";
import {
  planetaryApparentEquator,
  type PlanetaryApparentEquator,
} from "./planetaryEphemeris";

export type PlanetarySubpointDeg = {
  readonly latDeg: number;
  readonly lonDeg: number;
};

export function wrapSigned180(deg: number): number {
  return ((deg + 540) % 360) - 180;
}

/**
 * Geographic sub-object point from already-computed apparent equator + GAST.
 * Independent of the ephemeris source so the transform can be tested alone.
 */
export function subpointFromApparentEquator(
  eq: Pick<PlanetaryApparentEquator, "raDeg" | "decDeg" | "gastDeg">,
): PlanetarySubpointDeg {
  const latDeg = Math.max(-90, Math.min(90, eq.decDeg));
  const lonDeg = wrapSigned180(eq.raDeg - eq.gastDeg);
  return { latDeg, lonDeg };
}

/**
 * Geographic point where `body` is at the zenith at `utcMs`.
 * Null when the planetary authority does not support the instant.
 */
export function planetarySubpoint(
  body: PlanetaryBodyId,
  utcMs: number,
): PlanetarySubpointDeg | null {
  const eq = planetaryApparentEquator(body, utcMs);
  if (!eq) {
    return null;
  }
  return subpointFromApparentEquator(eq);
}
