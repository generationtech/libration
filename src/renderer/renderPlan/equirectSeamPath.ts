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
