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
 * Shared by {@link renderDisplayChrome} legacy paths and {@link buildTopBandCircleBandHourStackRenderPlan}.
 */

import {
  TOP_BAND_DISK_WRAP_HALO_PAD_PX,
  topBandDiskWrapHalfExtentPx,
} from "../config/topBandDiskWrapGeometry.ts";

export { TOP_BAND_DISK_WRAP_HALO_PAD_PX, topBandDiskWrapHalfExtentPx };

/**
 * Half-extent for the upper next-hour numerals: at least the disk halo so glyphs stay continuous with disks, and at
 * least ~one em so two-digit local labels (e.g. `11`) do not clip at the seam.
 */
export function topBandUpperNumeralWrapHalfExtentPx(radiusPx: number, topNumeralSizePx: number): number {
  const t = Math.max(0, topNumeralSizePx);
  return Math.max(topBandDiskWrapHalfExtentPx(radiusPx), t * 0.95);
}

/**
 * Half-extent for NOON/MIDNIGHT annotations: wider than the disk halo so long words still receive a wrap duplicate.
 */
export function topBandAnnotationWrapHalfExtentPx(
  radiusPx: number,
  annotationSizePx: number,
  kind: "none" | "noon" | "midnight",
): number {
  const disk = topBandDiskWrapHalfExtentPx(radiusPx);
  if (kind === "none") {
    return disk;
  }
  const a = Math.max(0, annotationSizePx);
  /** ~half-width of “MIDNIGHT” at the annotation font size (canvas proportional font; stable lower bound). */
  const textHalf = a * 4.25;
  return Math.max(disk, textHalf);
}
