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

import { mapXFromLongitudeDeg } from "./equirectangularProjection";

/**
 * Longitudes to stroke for a full-world equirectangular grid.
 *
 * Uses the half-open longitude interval [−180°, +180°): −180° is included, +180° is omitted.
 * Those angles are the same seam meridian; {@link mapXFromLongitudeDeg} maps them to x = 0 and
 * x = widthPx respectively, so emitting both duplicates the international date line stroke.
 */
export function meridianLongitudesDegForEquirectGrid(meridianStepDeg: number): number[] {
  if (!(meridianStepDeg > 0) || !Number.isFinite(meridianStepDeg)) {
    return [];
  }
  const out: number[] = [];
  for (let lon = -180; lon < 180; lon += meridianStepDeg) {
    out.push(lon);
  }
  return out;
}

/**
 * Latitudes to stroke for a full-world equirectangular grid (−90° south … +90° north).
 * Poles are distinct points; both rim parallels are included when the step reaches them.
 */
export function parallelLatitudesDegForEquirectGrid(parallelStepDeg: number): number[] {
  if (!(parallelStepDeg > 0) || !Number.isFinite(parallelStepDeg)) {
    return [];
  }
  const out: number[] = [];
  for (let lat = -90; lat <= 90; lat += parallelStepDeg) {
    out.push(lat);
  }
  return out;
}

/**
 * Equirectangular parallel y for full-height viewport (matches grid / pins / shading convention).
 */
export function parallelYFromLatitudeDeg(latDeg: number, viewportHeightPx: number): number {
  const h = Math.max(0, viewportHeightPx);
  return ((90 - latDeg) / 180) * h;
}
