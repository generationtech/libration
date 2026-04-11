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
 * Integer offsets {@code k} such that {@code centerX + k·widthPx} lies within {@code ±halfExtent} of the visible strip
 * {@code [0, widthPx)} — used to tile phased top-band geometry with period {@code widthPx}.
 */
export function topBandWrapOffsetsForCenteredExtent(
  centerX: number,
  halfExtent: number,
  widthPx: number,
): readonly number[] {
  const w = Math.max(0, widthPx);
  const m = Math.max(0, halfExtent);
  if (w <= 0) {
    return [0];
  }
  const ks: number[] = [];
  for (let k = -1; k <= 1; k += 1) {
    const cx = centerX + k * w;
    if (cx + m > 0 && cx - m < w) {
      ks.push(k);
    }
  }
  return ks.length > 0 ? ks : [0];
}

/**
 * Offsets {@code k} such that the span {@code [min(x0,x1)+k·w, max(x0,x1)+k·w]} intersects the viewport strip
 * {@code [0, widthPx)}.
 */
export function topBandWrapOffsetsForSpan(x0: number, x1: number, widthPx: number): readonly number[] {
  const w = Math.max(0, widthPx);
  if (w <= 0) {
    return [0];
  }
  const lo = Math.min(x0, x1);
  const hi = Math.max(x0, x1);
  if (!(lo < hi)) {
    return [0];
  }
  const ks: number[] = [];
  for (let k = -1; k <= 1; k += 1) {
    const a = lo + k * w;
    const b = hi + k * w;
    if (b >= 0 && a < w && a < b) {
      ks.push(k);
    }
  }
  return ks.length > 0 ? ks : [0];
}
