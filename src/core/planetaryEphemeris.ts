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
 * Offline planetary apparent-position authority (ADR 0016).
 * astronomy-engine truncated VSOP87 (Mercury–Neptune) plus the library Pluto series.
 */

import {
  Body,
  EquatorFromVector,
  GeoVector,
  RotateVector,
  Rotation_EQJ_EQD,
  SiderealTime,
} from "astronomy-engine";
import { PLANETARY_BODY_METADATA, type PlanetaryBodyId } from "./planetaryBodies";

export const PLANETARY_EPHEMERIS_AUTHORITY_ID = "astronomy-engine-vsop87";
export const PLANETARY_EPHEMERIS_AUTHORITY_VERSION = "2.1.19";

/** Inclusive start of the product-supported planetary span. */
export const PLANETARY_EPHEMERIS_RANGE_START_MS = Date.UTC(1600, 0, 1, 0, 0, 0, 0);
/** Exclusive end of the product-supported planetary span. */
export const PLANETARY_EPHEMERIS_RANGE_END_MS = Date.UTC(2500, 0, 1, 0, 0, 0, 0);

export const PLANETARY_EPHEMERIS_UNAVAILABLE_COPY =
  "Planetary positions unavailable outside 1600–2500.";

const ENGINE_BODY: Record<PlanetaryBodyId, Body> = {
  mercury: Body.Mercury,
  venus: Body.Venus,
  mars: Body.Mars,
  jupiter: Body.Jupiter,
  saturn: Body.Saturn,
  uranus: Body.Uranus,
  neptune: Body.Neptune,
  pluto: Body.Pluto,
};

export type PlanetaryApparentEquator = {
  /** Apparent RA of date, degrees [0, 360). */
  readonly raDeg: number;
  /** Apparent declination of date, degrees [-90, 90]. */
  readonly decDeg: number;
  /** Greenwich apparent sidereal time, degrees [0, 360). */
  readonly gastDeg: number;
  /** Geocentric distance, AU. */
  readonly distAu: number;
};

export function isPlanetaryEphemerisSupportedUtc(utcMs: number): boolean {
  return (
    Number.isFinite(utcMs) &&
    utcMs >= PLANETARY_EPHEMERIS_RANGE_START_MS &&
    utcMs < PLANETARY_EPHEMERIS_RANGE_END_MS
  );
}

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

/**
 * Apparent geocentric equator-of-date coordinates plus GAST.
 * Light-time and aberration are applied. Returns null outside the product span
 * or if the engine yields a non-finite vector.
 */
export function planetaryApparentEquator(
  body: PlanetaryBodyId,
  utcMs: number,
): PlanetaryApparentEquator | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  try {
    const date = new Date(utcMs);
    const geo = GeoVector(ENGINE_BODY[body], date, true);
    if (!Number.isFinite(geo.x) || !Number.isFinite(geo.y) || !Number.isFinite(geo.z)) {
      return null;
    }
    const ofDate = RotateVector(Rotation_EQJ_EQD(date), geo);
    const eq = EquatorFromVector(ofDate);
    const gastHours = SiderealTime(date);
    if (!Number.isFinite(eq.ra) || !Number.isFinite(eq.dec) || !Number.isFinite(gastHours)) {
      return null;
    }
    return {
      raDeg: wrap360(eq.ra * 15),
      decDeg: eq.dec,
      gastDeg: wrap360(gastHours * 15),
      distAu: eq.dist,
    };
  } catch {
    return null;
  }
}

export function planetaryEphemerisBodyName(body: PlanetaryBodyId): string {
  return PLANETARY_BODY_METADATA[body].ephemerisId;
}

/** Greenwich apparent sidereal time in degrees [0, 360). Null outside the product span. */
export function planetaryGastDeg(utcMs: number): number | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  try {
    return wrap360(SiderealTime(new Date(utcMs)) * 15);
  } catch {
    return null;
  }
}
