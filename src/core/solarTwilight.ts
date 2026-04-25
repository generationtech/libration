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
 * Geometric solar twilight model for full-world scenes: classifies a point
 * on the surface by solar altitude (degrees, horizon = 0, nadir = −90).
 *
 * With **surface normal · unit vector to the Sun = dot** (equirect day/night
 * pass), solar elevation equals **asin(clamp(dot,−1,1))** in radians. This
 * is renderer-agnostic product geometry, not a backend concern.
 */

export const CIVIL_TWILIGHT_HORIZON_OFFSET_DEG = 6;
export const NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG = 12;
export const ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG = 18;

export type TwilightBand =
  | "daylight"
  | "civilTwilight"
  | "nauticalTwilight"
  | "astronomicalTwilight"
  | "night";

/**
 * Solar altitude in degrees: 90° = Sun at the zenith, 0° = on the horizon,
 * negative = below the horizon. Derived from the subsolar surface dot product
 * `dot = cos(zenith angle to Sun) = sin(solar altitude)`.
 */
export function solarAltitudeDegFromSurfaceSunDotProduct(dot: number): number {
  const c = Math.max(-1, Math.min(1, dot));
  return (Math.asin(c) * 180) / Math.PI;
}

/**
 * Twilight band from solar altitude. Boundaries (degrees below horizon) follow
 * civil (−6), nautical (−12), astronomical (−18). Horizon / sunrise–sunset is
 * treated as the start of civil twilight.
 */
export function classifyTwilightBand(solarAltitudeDeg: number): TwilightBand {
  const a = solarAltitudeDeg;
  if (a > 0) {
    return "daylight";
  }
  if (a > -CIVIL_TWILIGHT_HORIZON_OFFSET_DEG) {
    return "civilTwilight";
  }
  if (a > -NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG) {
    return "nauticalTwilight";
  }
  if (a > -ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG) {
    return "astronomicalTwilight";
  }
  return "night";
}
