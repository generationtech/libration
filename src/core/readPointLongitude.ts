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

import { mapXFromLongitudeDeg } from "./equirectangularProjection.ts";

const LON_PER_STRUCTURAL_HOUR = 360 / 24;

/**
 * East longitude (°) at the geometric center of the 15° structural column that contains {@code lonDeg}
 * (same grid as the top-band NATO strip).
 */
function structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) {
    return 0;
  }
  const lon = Math.max(-180, Math.min(180, lonDeg));
  const h = Math.min(23, Math.floor((lon + 180) / 15));
  return -180 + LON_PER_STRUCTURAL_HOUR * h + LON_PER_STRUCTURAL_HOUR / 2;
}

/**
 * Horizontal x for the present-time tick: center of the structural 15° column containing {@code referenceLongitudeDeg}.
 * Longitude-only placement (independent of display mode and civil time).
 */
export function readPointXFromReferenceLongitudeDeg(referenceLongitudeDeg: number, widthPx: number): number {
  const w = Math.max(0, widthPx);
  if (w === 0) {
    return 0;
  }
  const lonCenter = structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(referenceLongitudeDeg);
  return mapXFromLongitudeDeg(lonCenter, w);
}
