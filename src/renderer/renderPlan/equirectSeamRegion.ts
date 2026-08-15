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
import { equirectXFromUnwrappedLon, unwrappedLongitudes } from "./equirectSeamPath";

const WORLD_COPIES_DEG = [-360, 0, 360] as const;

export type EquirectRing = readonly { latDeg: number; lonDeg: number }[];

function ringUnwrapped(ring: EquirectRing): { lats: number[]; lons: number[] } {
  const lats = ring.map((p) => p.latDeg);
  const lons = unwrappedLongitudes(ring.map((p) => p.lonDeg));
  return { lats, lons };
}

function pathForCopy(
  lats: readonly number[],
  lons: readonly number[],
  offsetDeg: number,
  w: number,
  h: number,
): RenderPathDescriptor | null {
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
  return b.build();
}

/**
 * Project a lat/lon ring to zero or more screen-space path descriptors (world copies).
 * Polar rings whose unwrapped longitude span exceeds 270° close through the nearer polar edge.
 */
export function equirectRingToPathDescriptors(
  ring: EquirectRing,
  viewportWidthPx: number,
  viewportHeightPx: number,
): RenderPathDescriptor[] {
  const w = viewportWidthPx;
  const h = viewportHeightPx;
  if (w <= 0 || h <= 0 || ring.length < 3) {
    return [];
  }
  const { lats, lons } = ringUnwrapped(ring);
  const span = Math.max(...lons) - Math.min(...lons);
  let useLats = lats;
  let useLons = lons;
  if (span > 270) {
    const meanLat = lats.reduce((s, v) => s + v, 0) / lats.length;
    const poleLat = meanLat < 0 ? -90 : 90;
    useLats = [...lats, poleLat, poleLat, lats[0]!];
    const lo = Math.min(...lons);
    const hi = Math.max(...lons);
    useLons = [...lons, hi, lo, lons[0]!];
  }
  const out: RenderPathDescriptor[] = [];
  for (const offset of WORLD_COPIES_DEG) {
    const d = pathForCopy(useLats, useLons, offset, w, h);
    if (d) {
      out.push(d);
    }
  }
  return out;
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
  const out: RenderPathDescriptor[] = [];
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
    out.push(b.build());
  }
  return out;
}
