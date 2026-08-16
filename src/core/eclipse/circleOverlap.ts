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
 * Intersection area of two disks as a fraction of the first disk's area.
 * Pure circle geometry — no eclipse vocabulary.
 *
 * Returns 0 when the disks do not overlap, 1 when the second disk covers the first.
 * Grazing (separation == r1+r2 or |r1-r2|) is included in those limits.
 */
export function diskIntersectionFractionOfFirst(
  radiusFirst: number,
  radiusSecond: number,
  centerSeparation: number,
): number {
  if (
    !(radiusFirst > 0) ||
    !(radiusSecond >= 0) ||
    !Number.isFinite(centerSeparation) ||
    centerSeparation < 0
  ) {
    return 0;
  }
  const r1 = radiusFirst;
  const r2 = radiusSecond;
  const d = centerSeparation;
  if (d >= r1 + r2 - 1e-15) {
    return 0;
  }
  if (d <= Math.abs(r1 - r2) + 1e-15) {
    return r2 >= r1 ? 1 : (r2 * r2) / (r1 * r1);
  }
  const r1sq = r1 * r1;
  const r2sq = r2 * r2;
  const dsq = d * d;
  const a = Math.acos(Math.max(-1, Math.min(1, (dsq + r1sq - r2sq) / (2 * d * r1))));
  const b = Math.acos(Math.max(-1, Math.min(1, (dsq + r2sq - r1sq) / (2 * d * r2))));
  const area =
    r1sq * a +
    r2sq * b -
    0.5 * Math.sqrt(Math.max(0, (-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2)));
  return Math.max(0, Math.min(1, area / (Math.PI * r1sq)));
}
