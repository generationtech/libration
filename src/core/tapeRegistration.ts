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

import type { ReadPoint } from "./chromeTimeDomain.ts";

/**
 * Normalized tape anchor [0,1) from the explicit read point: the phased hour row registers so that
 * {@link civilFractionalHour} sits at {@link readPoint.x}.
 */
export function phasedTapeAnchorFraction(readPoint: ReadPoint, widthPx: number): number {
  const w = Math.max(0, widthPx);
  if (w === 0) {
    return 0.5;
  }
  return wrapFraction01(readPoint.x / w);
}

/** Maps a real value to its fractional part in [0, 1) (stable for negative inputs). */
export function wrapFraction01(x: number): number {
  const u = x % 1;
  return u < 0 ? u + 1 : u;
}

/**
 * Single authoritative horizontal position for hour index / fractional hour on the phased tape.
 * {@link civilFractionalHour} comes from {@link deriveCivilProjection}; {@link anchorFrac} from
 * {@link phasedTapeAnchorFraction}({@link ReadPoint}, width).
 */
export function tapeHourToX(
  hourIndex: number,
  civilFractionalHour: number,
  widthPx: number,
  anchorFrac: number,
): number {
  const w = Math.max(0, widthPx);
  if (w === 0) {
    return 0;
  }
  return wrapFraction01(anchorFrac + (hourIndex - civilFractionalHour) / 24) * w;
}
