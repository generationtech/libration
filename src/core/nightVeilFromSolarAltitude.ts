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
 * Night-side veil factor from solar altitude, aligned with the continuous illumination
 * field in {@link sampleIlluminationRgba8} (clear day above +4°, settled by −18°).
 */

export const ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG = 4;
export const ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG = -18;

function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

/** 0 = day clarity; 1 = deep-night weighting (same ramp as planetary night mask). */
export function illuminationNightVeil01FromSolarAltitudeDeg(altitudeDeg: number): number {
  return smootherstep(
    ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG,
    ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG,
    altitudeDeg,
  );
}
