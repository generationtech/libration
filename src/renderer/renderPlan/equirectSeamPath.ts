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
 * Shared equirectangular polyline seam handling: unwrap longitudes along the short arc
 * and fold each segment onto the short strip path so ±180° crossings do not span the world.
 */

export function shortLonDeltaDeg(a: number, b: number): number {
  return (((b - a) + 540) % 360) - 180;
}

export function wrapLongitudeDeg(lonDeg: number): number {
  let x = ((((lonDeg + 180) % 360) + 360) % 360) - 180;
  if (x === -180) {
    x = 180;
  }
  return x;
}

/**
 * Smallest arc containing all longitudes (0–360). A closed oval that winds once
 * while sequential unwrap accumulates 360° still reports the oval's true width.
 */
export function circularLongitudeSpanDeg(lons: readonly number[]): number {
  if (lons.length === 0) {
    return 0;
  }
  const wrapped = lons.map(wrapLongitudeDeg).sort((a, b) => a - b);
  let maxGap = 0;
  for (let i = 1; i < wrapped.length; i += 1) {
    maxGap = Math.max(maxGap, wrapped[i]! - wrapped[i - 1]!);
  }
  maxGap = Math.max(maxGap, wrapped[0]! + 360 - wrapped[wrapped.length - 1]!);
  return Math.min(360, Math.max(0, 360 - maxGap));
}

/**
 * Fold longitudes into the smallest containing arc so a closed ring can be
 * projected without a world-spanning unwrap.
 */
export function foldLongitudesIntoSmallestArc(lons: readonly number[]): number[] {
  if (lons.length === 0) {
    return [];
  }
  const wrapped = lons.map(wrapLongitudeDeg);
  const sorted = [...wrapped].sort((a, b) => a - b);
  let maxGap = sorted[0]! + 360 - sorted[sorted.length - 1]!;
  let arcStart = sorted[0]!;
  for (let i = 1; i < sorted.length; i += 1) {
    const gap = sorted[i]! - sorted[i - 1]!;
    if (gap > maxGap) {
      maxGap = gap;
      arcStart = sorted[i]!;
    }
  }
  return wrapped.map((l) => arcStart + ((((l - arcStart) % 360) + 360) % 360));
}

export function unwrappedLongitudes(lons: readonly number[]): number[] {
  if (lons.length === 0) {
    return [];
  }
  const u: number[] = [lons[0]!];
  for (let i = 1; i < lons.length; i += 1) {
    u.push(u[i - 1]! + shortLonDeltaDeg(lons[i - 1]!, lons[i]!));
  }
  return u;
}

export function equirectXFromUnwrappedLon(uDeg: number, w: number): number {
  return ((uDeg + 180) / 360) * w;
}

export function adjustPairToShortStripPath(x0: number, x1: number, w: number): { x0: number; x1: number } {
  let a = x0;
  let b = x1;
  let d = b - a;
  if (d > w * 0.5) {
    b -= w;
  } else if (d < -w * 0.5) {
    b += w;
  }
  a = ((a % w) + w) % w;
  b = ((b % w) + w) % w;
  d = b - a;
  if (d > w * 0.5) {
    b -= w;
  } else if (d < -w * 0.5) {
    b += w;
  }
  return { x0: a, x1: b };
}
