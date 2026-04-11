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
 * Full-world equirectangular horizontal registration for the current layout:
 * longitude −180°…+180° maps linearly to x ∈ [0, widthPx], left to right.
 *
 * **Single basis for registration:** the same `widthPx` must be used for
 * - scene drawing (canvas viewport width in `CanvasRenderBackend`),
 * - top-band longitude anchor and tape geometry (`buildDisplayChromeState` / `buildUtcTopScaleLayout`).
 *
 * Vertical latitude mapping lives in the renderer (`(90 - lat) / 180 * height`) and is not exported here;
 * this module pins the shared **longitude ↔ x** contract only.
 */

/**
 * Maps east longitude (degrees) to x on a full-width equirectangular strip:
 * x = 0 → −180°, x = widthPx → +180°.
 */
export function mapXFromLongitudeDeg(lonDeg: number, widthPx: number): number {
  const w = Math.max(0, widthPx);
  if (w === 0) {
    return 0;
  }
  return ((lonDeg + 180) / 360) * w;
}

/**
 * Inverse of {@link mapXFromLongitudeDeg}: x on the strip → east longitude (degrees).
 */
export function longitudeDegFromMapX(x: number, widthPx: number): number {
  const w = Math.max(0, widthPx);
  if (w === 0) {
    return 0;
  }
  return -180 + (x / w) * 360;
}

/**
 * East longitude of the international date line seam in this projection (−180° and +180° coincide).
 * {@link mapXFromLongitudeDeg} maps both to x = 0 and x = widthPx respectively.
 */
export const INTERNATIONAL_DATE_LINE_LONGITUDE_DEG = 180;

/**
 * Raw horizontal center (CSS px) for the IDL seam: picks among periodic copies `k ∈ {−1,0,1}` so the strip
 * intersects the viewport, preferring the copy closest to the horizontal center; tie-break prefers smaller `k`
 * (canonical −180° edge at x = 0). Does **not** guarantee the strip stays fully on-screen — use
 * {@link computeDayLineIndicatorCenterX} for overlay placement.
 */
export function computeRawDayLineSeamCenterX(viewportWidthPx: number, stripWidthPx: number): number {
  const w = Math.max(0, viewportWidthPx);
  if (w === 0) {
    return 0;
  }
  const half = Math.max(0, stripWidthPx) * 0.5;
  const base = mapXFromLongitudeDeg(-INTERNATIONAL_DATE_LINE_LONGITUDE_DEG, w);
  let bestK = 0;
  let bestDist = Infinity;
  for (let k = -1; k <= 1; k += 1) {
    const cx = base + k * w;
    if (cx + half <= 0 || cx - half >= w) {
      continue;
    }
    const dist = Math.abs(cx - w * 0.5);
    if (dist < bestDist - 1e-9) {
      bestDist = dist;
      bestK = k;
    } else if (Math.abs(dist - bestDist) < 1e-9 && k < bestK) {
      bestK = k;
    }
  }
  return base + bestK * w;
}

/**
 * Horizontal center for the day-line overlay strip: starts from {@link computeRawDayLineSeamCenterX}, then clamps
 * so the full strip `[center − half, center + half]` lies inside `[edgeInsetPx, widthPx − edgeInsetPx]`. This
 * avoids edge-clipped, partially off-screen placement when the projected seam sits on the viewport border.
 */
export function computeDayLineIndicatorCenterX(
  viewportWidthPx: number,
  stripWidthPx: number,
  edgeInsetPx: number,
): number {
  const w = Math.max(0, viewportWidthPx);
  const half = Math.max(0, stripWidthPx) * 0.5;
  const inset = Math.max(0, edgeInsetPx);
  const raw = computeRawDayLineSeamCenterX(w, stripWidthPx);
  const minC = half + inset;
  const maxC = w - half - inset;
  if (minC >= maxC) {
    return w * 0.5;
  }
  return Math.min(maxC, Math.max(minC, raw));
}
