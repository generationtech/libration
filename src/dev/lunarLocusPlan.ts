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
 * DEV-only lunar-locus RenderPlan: ordinary line and path2d primitives.
 * Cadence and residual math stay in {@link ./lunarLocusExperiment.ts}.
 */

import { parallelYFromLatitudeDeg } from "../core/equirectangularGridSampling";
import { mapXFromLongitudeDeg } from "../core/equirectangularProjection";
import { circlePath2D } from "../renderer/renderPlan/circlePath2D";
import {
  adjustPairToShortStripPath,
  equirectXFromUnwrappedLon,
  unwrappedLongitudes,
} from "../renderer/renderPlan/equirectSeamPath";
import type { RenderLineItem, RenderPlan } from "../renderer/renderPlan/renderPlanTypes";
import {
  plottedPointDeg,
  sampleLunarLocus,
  type LunarLocusMode,
  type LunarLocusTreatment,
} from "./lunarLocusExperiment";

export type LunarLocusPlanOptions = {
  readonly utcMs: number;
  readonly viewportWidthPx: number;
  readonly viewportHeightPx: number;
  readonly mode: LunarLocusMode;
  readonly treatment: LunarLocusTreatment;
};

function wrapLonForMap(lonDeg: number): number {
  return ((lonDeg + 540) % 360) - 180;
}

/**
 * Builds the experimental locus as dots (required) plus an optional faint connecting line.
 * Sample 0 (current Moon) is a larger, brighter disc. 1:1 degree mapping; no unequal stretch.
 */
export function buildLunarLocusRenderPlan(options: LunarLocusPlanOptions): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }
  const geometry = sampleLunarLocus(options.utcMs);
  const refLon = geometry.samples[0]!.geographic.lonDeg;
  const plotted = geometry.samples.map((s) => plottedPointDeg(s, refLon, options.mode));
  const items: RenderPlan["items"] = [];

  if (options.treatment === "dots-line" && plotted.length >= 2) {
    const lons = unwrappedLongitudes(plotted.map((p) => p.lonDeg));
    const stroke = "rgba(170, 210, 245, 0.28)";
    for (let i = 0; i < lons.length - 1; i += 1) {
      const raw0 = equirectXFromUnwrappedLon(lons[i]!, w);
      const raw1 = equirectXFromUnwrappedLon(lons[i + 1]!, w);
      const { x0, x1 } = adjustPairToShortStripPath(raw0, raw1, w);
      const y0 = parallelYFromLatitudeDeg(plotted[i]!.latDeg, h);
      const y1 = parallelYFromLatitudeDeg(plotted[i + 1]!.latDeg, h);
      if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
        continue;
      }
      const line: RenderLineItem = {
        kind: "line",
        x1: x0,
        y1: y0,
        x2: x1,
        y2: y1,
        stroke,
        strokeWidthPx: 1.05,
        lineCap: "round",
      };
      items.push(line);
    }
  }

  for (let i = 0; i < plotted.length; i += 1) {
    const p = plotted[i]!;
    const cx = mapXFromLongitudeDeg(wrapLonForMap(p.lonDeg), w);
    const cy = parallelYFromLatitudeDeg(p.latDeg, h);
    if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
      continue;
    }
    const isRef = i === 0;
    const r = isRef ? 4.2 : 2.4;
    items.push({
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(cx, cy, r),
      fill: isRef ? "rgba(230, 245, 255, 0.95)" : "rgba(175, 215, 245, 0.78)",
      stroke: isRef ? "rgba(20, 36, 55, 0.75)" : "rgba(24, 40, 58, 0.45)",
      strokeWidthPx: isRef ? 1.15 : 0.7,
    });
  }

  return { items };
}
