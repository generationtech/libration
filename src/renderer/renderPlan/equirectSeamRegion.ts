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
 * Equirectangular filled-region seam handling: unwrap short-arc longitudes and emit
 * wrapped world copies so a dateline-crossing polygon does not span the map.
 */

import { parallelYFromLatitudeDeg } from "../../core/equirectangularGridSampling";
import { createPathBuilder } from "./pathBuilder";
import type { RenderPathDescriptor } from "./pathTypes";
import {
  circularLongitudeSpanDeg,
  equirectXFromUnwrappedLon,
  foldLongitudesIntoSmallestArc,
  unwrappedLongitudes,
} from "./equirectSeamPath";

const WORLD_COPIES_DEG = [-360, 0, 360] as const;

export type EquirectRing = readonly { latDeg: number; lonDeg: number }[];

export type EquirectProjectedCopy = {
  readonly pathDescriptor: RenderPathDescriptor;
  readonly minX: number;
  readonly maxX: number;
};

/**
 * Keep world copies whose visible x-spans do not overlap. Dateline left/right
 * strips are complementary and both remain; a ±360° copy that would paint the
 * same viewport pixels as another copy is dropped so translucent fills do not
 * alpha-stack on themselves.
 */
export function selectNonOverlappingWorldCopies<T extends { minX: number; maxX: number }>(
  copies: readonly T[],
  viewportWidthPx: number,
): T[] {
  if (copies.length <= 1) {
    return [...copies];
  }
  const seamPx = Math.max(2, viewportWidthPx * 0.006);
  const ranked = copies
    .map((item) => {
      const lo = Math.max(item.minX, 0);
      const hi = Math.min(item.maxX, viewportWidthPx);
      const width = hi - lo;
      return width > 0.5 ? { item, lo, hi, width } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) => b.width - a.width || a.lo - b.lo);
  const kept: typeof ranked = [];
  for (const candidate of ranked) {
    const overlaps = kept.some((row) => {
      const overlap = Math.min(row.hi, candidate.hi) - Math.max(row.lo, candidate.lo);
      return overlap > seamPx;
    });
    if (!overlaps) {
      kept.push(candidate);
    }
  }
  const keptItems = new Set(kept.map((row) => row.item));
  return copies.filter((item) => keptItems.has(item));
}

function ringUnwrapped(ring: EquirectRing): { lats: number[]; lons: number[] } {
  const lats = ring.map((p) => p.latDeg);
  const lons = foldLongitudesIntoSmallestArc(ring.map((p) => p.lonDeg));
  return { lats, lons };
}

function pathForCopy(
  lats: readonly number[],
  lons: readonly number[],
  offsetDeg: number,
  w: number,
  h: number,
): EquirectProjectedCopy | null {
  if (lats.length < 3) {
    return null;
  }
  const b = createPathBuilder();
  let started = false;
  let minX = Infinity;
  let maxX = -Infinity;
  for (let i = 0; i < lats.length; i += 1) {
    const x = equirectXFromUnwrappedLon(lons[i]! + offsetDeg, w);
    const y = parallelYFromLatitudeDeg(lats[i]!, h);
    if (!Number.isFinite(x) || !Number.isFinite(y)) {
      continue;
    }
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    if (!started) {
      b.moveTo(x, y);
      started = true;
    } else {
      b.lineTo(x, y);
    }
  }
  if (!started) {
    return null;
  }
  b.closePath();
  const slop = w * 0.05;
  if (maxX < -slop || minX > w + slop) {
    return null;
  }
  return { pathDescriptor: b.build(), minX, maxX };
}

/**
 * Project a lat/lon ring to zero or more screen-space path descriptors (world copies).
 * Closed rings fold into their smallest longitude arc so a winding oval does not
 * fill the world. Polar caps (circular lon span > 270°) close through the nearer pole.
 */
export function equirectRingToPathDescriptors(
  ring: EquirectRing,
  viewportWidthPx: number,
  viewportHeightPx: number,
  options?: { polarCloseLatDeg?: number },
): RenderPathDescriptor[] {
  const w = viewportWidthPx;
  const h = viewportHeightPx;
  if (w <= 0 || h <= 0 || ring.length < 3) {
    return [];
  }
  const { lats, lons } = ringUnwrapped(ring);
  const span = circularLongitudeSpanDeg(ring.map((p) => p.lonDeg));
  let useLats = lats;
  let useLons = lons;
  if (span > 270) {
    const meanLat = lats.reduce((s, v) => s + v, 0) / lats.length;
    const hinted = options?.polarCloseLatDeg;
    const poleLat =
      typeof hinted === "number" && Number.isFinite(hinted) ? hinted : meanLat < 0 ? -90 : 90;
    useLats = [...lats, poleLat, poleLat, lats[0]!];
    const lo = Math.min(...lons);
    const hi = Math.max(...lons);
    useLons = [...lons, hi, lo, lons[0]!];
  }
  const copies: EquirectProjectedCopy[] = [];
  for (const offset of WORLD_COPIES_DEG) {
    const d = pathForCopy(useLats, useLons, offset, w, h);
    if (d) {
      copies.push(d);
    }
  }
  return selectNonOverlappingWorldCopies(copies, w).map((c) => c.pathDescriptor);
}

export function equirectPolylineToPathDescriptors(
  points: EquirectRing,
  viewportWidthPx: number,
  viewportHeightPx: number,
): RenderPathDescriptor[] {
  const w = viewportWidthPx;
  const h = viewportHeightPx;
  if (w <= 0 || h <= 0 || points.length < 2) {
    return [];
  }
  const lats = points.map((p) => p.latDeg);
  const lons = unwrappedLongitudes(points.map((p) => p.lonDeg));
  const copies: EquirectProjectedCopy[] = [];
  for (const offset of WORLD_COPIES_DEG) {
    const b = createPathBuilder();
    let started = false;
    let minX = Infinity;
    let maxX = -Infinity;
    for (let i = 0; i < lats.length; i += 1) {
      const x = equirectXFromUnwrappedLon(lons[i]! + offset, w);
      const y = parallelYFromLatitudeDeg(lats[i]!, h);
      if (!Number.isFinite(x) || !Number.isFinite(y)) {
        continue;
      }
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      if (!started) {
        b.moveTo(x, y);
        started = true;
      } else {
        b.lineTo(x, y);
      }
    }
    if (!started) {
      continue;
    }
    const slop = w * 0.05;
    if (maxX < -slop || minX > w + slop) {
      continue;
    }
    copies.push({ pathDescriptor: b.build(), minX, maxX });
  }
  return selectNonOverlappingWorldCopies(copies, w).map((c) => c.pathDescriptor);
}
