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
 * Half-extents for phased top-band hour-disk seam tiling (wrap duplicates at x≈0 / x≈width).
 * Shared constants for semantic layout and the canvas renderer.
 */

/**
 * Outer padding (glow + stroke) around the hour disk radius used when deciding whether a phased marker needs a ±width
 * duplicate draw at the viewport seam.
 */
export const TOP_BAND_DISK_WRAP_HALO_PAD_PX = 1.38 + 1;

/**
 * Half-extent from phased marker center (px) for circle disks, including rim/glow strokes, for wrap tiling.
 */
export function topBandDiskWrapHalfExtentPx(radiusPx: number): number {
  const r = radiusPx;
  if (!(r > 0) || !Number.isFinite(r)) {
    return 0;
  }
  return r + TOP_BAND_DISK_WRAP_HALO_PAD_PX;
}
