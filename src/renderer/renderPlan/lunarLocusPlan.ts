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
 * Compact lunar locus in equirectangular scene space.
 * Line-only: solar-analemma stroke weight with a restrained lunar stroke.
 * Wrapped copies keep the figure associated with the Moon near ±180°.
 */

import { parallelYFromLatitudeDeg } from "../../core/equirectangularGridSampling";
import { DEFAULT_LUNAR_LOCUS_STROKE_RGB } from "../../core/lunarLocus";
import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground";
import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import type { LunarLocusPayload } from "../../layers/lunarLocusPayload";
import type { RenderLineItem, RenderPlan } from "./renderPlanTypes";
import { equirectXFromUnwrappedLon } from "./equirectSeamPath";

export interface LunarLocusRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  layerOpacity: number;
  payload: LunarLocusPayload;
}

const WORLD_COPIES_DEG = [-360, 0, 360] as const;

function strokeRgba(css: string, alpha: number): string {
  const px = parseCssColorToRgba8888(css);
  if (!px) {
    return `rgba(28, 38, 56, ${alpha})`;
  }
  return `rgba(${px.r}, ${px.g}, ${px.b}, ${alpha})`;
}

function pushWrappedClosedPolyline(
  items: RenderPlan["items"],
  points: LunarLocusPayload["points"],
  w: number,
  h: number,
  stroke: string,
  strokeWidthPx: number,
): void {
  if (points.length < 2) {
    return;
  }
  const n = points.length;
  for (const offset of WORLD_COPIES_DEG) {
    for (let i = 0; i < n; i += 1) {
      const i1 = (i + 1) % n;
      const x0 = equirectXFromUnwrappedLon(points[i]!.lonDeg + offset, w);
      const x1 = equirectXFromUnwrappedLon(points[i1]!.lonDeg + offset, w);
      const y0 = parallelYFromLatitudeDeg(points[i]!.latDeg, h);
      const y1 = parallelYFromLatitudeDeg(points[i1]!.latDeg, h);
      if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
        continue;
      }
      if (Math.abs(x1 - x0) >= w * 0.5) {
        continue;
      }
      const bothLeft = x0 < 0 && x1 < 0;
      const bothRight = x0 > w && x1 > w;
      if (bothLeft || bothRight) {
        continue;
      }
      const line: RenderLineItem = {
        kind: "line",
        x1: x0,
        y1: y0,
        x2: x1,
        y2: y1,
        stroke,
        strokeWidthPx,
      };
      items.push(line);
    }
  }
}

/**
 * Builds a {@link RenderPlan} for the lunar locus: closed line only, no sample markers.
 * Stroke width matches the solar analemma construction; color is lunar, not solar-warm.
 */
export function buildLunarLocusRenderPlan(options: LunarLocusRenderPlanOptions): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }
  const op = Math.max(0, Math.min(1, options.layerOpacity));
  if (op <= 0) {
    return { items: [] };
  }
  const veil = effectiveOverlayReadabilityLiftVeil01(
    options.payload.readability?.nightVeil01,
    options.payload.readability?.overlayReadabilityLiftScale01,
  );
  const baseStrokeA = 0.5 * op;
  const strokeA = Math.min(0.92 * op, baseStrokeA + 0.32 * veil * op);
  const strokeW = 1.2 + 0.95 * veil;
  const stroke = strokeRgba(DEFAULT_LUNAR_LOCUS_STROKE_RGB, strokeA);
  const items: RenderPlan["items"] = [];
  pushWrappedClosedPolyline(items, options.payload.points, w, h, stroke, strokeW);
  return { items };
}
