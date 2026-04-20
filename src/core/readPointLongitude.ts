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

function clampLongitudeDegForReadPoint(lonDeg: number): number {
  if (!Number.isFinite(lonDeg)) {
    return 0;
  }
  return Math.max(-180, Math.min(180, lonDeg));
}

/**
 * Horizontal x for the authoritative read-point tick and phased tape registration anchor on the equirectangular strip:
 * {@link mapXFromLongitudeDeg} of the resolved reference meridian (continuous; not quantized to the 15° structural/NATO column center).
 * Longitude-only placement (independent of display mode and civil time).
 */
export function readPointXFromReferenceLongitudeDeg(referenceLongitudeDeg: number, widthPx: number): number {
  const w = Math.max(0, widthPx);
  if (w === 0) {
    return 0;
  }
  return mapXFromLongitudeDeg(clampLongitudeDegForReadPoint(referenceLongitudeDeg), w);
}
