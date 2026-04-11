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

/** Full-world strip: one UTC structural column spans this many degrees of longitude (24 columns). */
export const LON_PER_UTC_STRUCTURAL_HOUR = 360 / 24;

/**
 * Structural UTC column 0–23 for east longitude on the 15° tape (same grid as {@link UtcTopScaleHourSegment}).
 * Half-open in longitude except the eastern edge: [−180°, −165°) → 0, …, [165°, 180°] → 23 (165° and +180° map to the last column).
 */
export function structuralHourIndexFromReferenceLongitudeDeg(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) {
    return 0;
  }
  const lon = Math.max(-180, Math.min(180, lonDeg));
  return Math.min(23, Math.floor((lon + 180) / 15));
}

/**
 * East longitude (°) at the geometric center of the 15° structural column that contains {@code lonDeg}.
 */
export function structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(lonDeg: number): number {
  const h = structuralHourIndexFromReferenceLongitudeDeg(lonDeg);
  return -180 + LON_PER_UTC_STRUCTURAL_HOUR * h + LON_PER_UTC_STRUCTURAL_HOUR / 2;
}
