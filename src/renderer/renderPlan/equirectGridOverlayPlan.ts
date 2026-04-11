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
 * Render-plan builder: equirectangular latitude/longitude grid overlay (scene/map space).
 * Visibility, stroke hierarchy (prime meridian / equator vs minor lines), and geometry are resolved here;
 * {@link executeRenderPlanOnCanvas} applies line items only.
 */

import { mapXFromLongitudeDeg } from "../../core/equirectangularProjection";
import {
  meridianLongitudesDegForEquirectGrid,
  parallelLatitudesDegForEquirectGrid,
  parallelYFromLatitudeDeg,
} from "../../core/equirectangularGridSampling";
import type { RenderLineItem, RenderPlan } from "./renderPlanTypes";

export interface EquirectangularGridOverlayPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  meridianStepDeg: number;
  parallelStepDeg: number;
  /** Same factor baked into RGBA alphas as legacy grid draw (layer opacity). */
  layerOpacity: number;
}

/**
 * Builds vertical meridian strokes then horizontal parallel strokes, matching legacy painter order.
 */
export function buildEquirectangularGridOverlayRenderPlan(
  options: EquirectangularGridOverlayPlanOptions,
): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (w <= 0 || h <= 0) {
    return { items: [] };
  }

  const op = options.layerOpacity;
  const lineMinor = `rgba(220, 230, 255, ${0.07 * op})`;
  const lineMajor = `rgba(235, 242, 255, ${0.16 * op})`;

  const items: RenderLineItem[] = [];

  for (const lon of meridianLongitudesDegForEquirectGrid(options.meridianStepDeg)) {
    const x = mapXFromLongitudeDeg(lon, w);
    const major = lon === 0;
    items.push({
      kind: "line",
      x1: x,
      y1: 0,
      x2: x,
      y2: h,
      stroke: major ? lineMajor : lineMinor,
      strokeWidthPx: 1,
    });
  }

  for (const lat of parallelLatitudesDegForEquirectGrid(options.parallelStepDeg)) {
    const y = parallelYFromLatitudeDeg(lat, h);
    const major = lat === 0;
    items.push({
      kind: "line",
      x1: 0,
      y1: y,
      x2: w,
      y2: y,
      stroke: major ? lineMajor : lineMinor,
      strokeWidthPx: 1,
    });
  }

  return { items };
}
