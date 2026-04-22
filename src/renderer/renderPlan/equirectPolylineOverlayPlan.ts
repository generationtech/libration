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

import { parallelYFromLatitudeDeg } from "../../core/equirectangularGridSampling";
import type { RenderLineItem, RenderPlan } from "./renderPlanTypes";

export interface EquirectangularPolylineOverlayPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  readonly points: readonly { latDeg: number; lonDeg: number }[];
  closed: boolean;
  layerOpacity: number;
}

function shortLonDeltaDeg(a: number, b: number): number {
  return (((b - a) + 540) % 360) - 180;
}

function unwrappedLongitudes(lons: readonly number[]): number[] {
  if (lons.length === 0) {
    return [];
  }
  const u: number[] = [lons[0]!];
  for (let i = 1; i < lons.length; i += 1) {
    u.push(u[i - 1]! + shortLonDeltaDeg(lons[i - 1]!, lons[i]!));
  }
  return u;
}

function equirectXFromUnwrappedLon(uDeg: number, w: number): number {
  return ((uDeg + 180) / 360) * w;
}

function adjustPairToShortStripPath(x0: number, x1: number, w: number): { x0: number; x1: number } {
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

export function buildEquirectangularPolylineOverlayRenderPlan(
  options: EquirectangularPolylineOverlayPlanOptions,
): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (w <= 0 || h <= 0) {
    return { items: [] };
  }
  const pts = options.points;
  if (pts.length < 2) {
    return { items: [] };
  }
  const op = options.layerOpacity;
  const stroke = `rgba(255, 200, 120, ${0.5 * op})`;
  const lons = unwrappedLongitudes(pts.map((p) => p.lonDeg));
  const items: RenderLineItem[] = [];

  const pushLine = (i0: number, i1: number) => {
    const u0 = lons[i0]!;
    const u1 = lons[i1]!;
    const raw0 = equirectXFromUnwrappedLon(u0, w);
    const raw1 = equirectXFromUnwrappedLon(u1, w);
    const { x0, x1 } = adjustPairToShortStripPath(raw0, raw1, w);
    const y0 = parallelYFromLatitudeDeg(pts[i0]!.latDeg, h);
    const y1 = parallelYFromLatitudeDeg(pts[i1]!.latDeg, h);
    if (Number.isFinite(x0) && Number.isFinite(x1)) {
      items.push({ kind: "line", x1: x0, y1: y0, x2: x1, y2: y1, stroke, strokeWidthPx: 1.2 });
    }
  };

  for (let i = 0; i < lons.length - 1; i += 1) {
    pushLine(i, i + 1);
  }
  if (options.closed) {
    pushLine(lons.length - 1, 0);
  }
  return { items };
}
