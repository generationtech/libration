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
 * Dynamic tracks (DLC-3) in equirectangular scene space.
 * Trail polylines + tip discs are resolved here; the canvas executor applies primitives only.
 */

import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productTextFont.ts";
import type { DynamicTracksPayload } from "../../layers/dynamicTracksPayload";
import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import type {
  RenderLineItem,
  RenderPath2DItem,
  RenderPlan,
  RenderTextItem,
} from "./renderPlanTypes";
import { circlePath2D } from "./circlePath2D";
import {
  adjustPairToShortStripPath,
  equirectXFromUnwrappedLon,
  unwrappedLongitudes,
} from "./equirectSeamPath";

function mapLatToY(latDeg: number, viewportHeightPx: number): number {
  return ((90 - latDeg) / 180) * viewportHeightPx;
}

export interface DynamicTracksRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  layerOpacity: number;
  payload: DynamicTracksPayload;
}

/**
 * Builds a {@link RenderPlan} for dynamic tracks: trail lines + current-position disc + optional label.
 * Past segments use the full trail alpha; future segments are slightly fainter (same primitive).
 */
export function buildDynamicTracksRenderPlan(
  options: DynamicTracksRenderPlanOptions,
): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }

  const layerOp = Math.max(0, Math.min(1, options.layerOpacity));
  const liftScale = options.payload.overlayReadabilityLiftScale01;
  const tipVeil = options.payload.tipReadabilityNightVeil01;
  const v = effectiveOverlayReadabilityLiftVeil01(tipVeil, liftScale);
  const a = (alpha: number) =>
    Math.min(1, alpha * layerOp * (1 + 0.18 * v));
  const sw = (base: number) => Math.max(base, base * (1 + 0.45 * v));
  const items: RenderPlan["items"] = [];
  const labelSize = Math.min(11, Math.max(8, w * 0.012));
  const current = options.payload.currentPosition;
  const currentTimeMs = current?.timeMs;

  for (const track of options.payload.tracks) {
    const samples = track.samples;
    if (samples.length === 0) continue;

    if (samples.length >= 2) {
      const lons = samples.map((s) => s.lonDeg);
      const unwrapped = unwrappedLongitudes(lons);
      for (let i = 1; i < samples.length; i += 1) {
        const y0 = mapLatToY(samples[i - 1]!.latDeg, h);
        const y1 = mapLatToY(samples[i]!.latDeg, h);
        const rawX0 = equirectXFromUnwrappedLon(unwrapped[i - 1]!, w);
        const rawX1 = equirectXFromUnwrappedLon(unwrapped[i]!, w);
        const { x0, x1 } = adjustPairToShortStripPath(rawX0, rawX1, w);
        const future =
          currentTimeMs !== undefined && samples[i]!.timeMs > currentTimeMs;
        const line: RenderLineItem = {
          kind: "line",
          x1: x0,
          y1: y0,
          x2: x1,
          y2: y1,
          stroke: `rgba(120, 210, 255, ${a(future ? 0.38 : 0.72)})`,
          strokeWidthPx: sw(1.6),
          lineCap: "round",
        };
        items.push(line);
      }
    }

    const marker = current ?? samples[samples.length - 1]!;
    const nearestIdx = nearestSampleIndexByTime(samples, marker.timeMs);
    const lons = samples.map((s) => s.lonDeg);
    const unwrapped = samples.length >= 2 ? unwrappedLongitudes(lons) : lons;
    const nearU = unwrapped[nearestIdx] ?? marker.lonDeg;
    const markerU = unwrapLonNear(marker.lonDeg, nearU);
    let tipX = equirectXFromUnwrappedLon(markerU, w);
    tipX = ((tipX % w) + w) % w;
    const tipY = mapLatToY(marker.latDeg, h);
    const r = Math.min(8, Math.max(4.2, 4.4 * Math.max(0.7, w / 1400)));

    const disc: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(tipX, tipY, r),
      fill: `rgba(180, 240, 255, ${a(0.96)})`,
      stroke: `rgba(12, 28, 44, ${a(0.85)})`,
      strokeWidthPx: sw(1.4),
    };
    items.push(disc);

    items.push({
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(tipX, tipY, r + 2.5),
      stroke: `rgba(230, 250, 255, ${a(0.55)})`,
      strokeWidthPx: sw(1.15),
    });

    const labelText =
      track.label !== undefined && track.label.trim() !== ""
        ? track.label.trim()
        : undefined;
    if (labelText !== undefined) {
      const text: RenderTextItem = {
        kind: "text",
        x: tipX + r + 4,
        y: tipY - labelSize * 0.35,
        text: labelText,
        fill: `rgba(220, 245, 255, ${a(0.94)})`,
        font: {
          assetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
          displayName: "Renderer default",
          sizePx: labelSize,
          weight: 500,
          style: "normal",
        },
        textAlign: "left",
        textBaseline: "top",
        stroke: {
          color: `rgba(12, 20, 28, ${a(0.7)})`,
          widthPx: sw(Math.max(2, labelSize * 0.28)),
          lineJoin: "round",
          miterLimit: 2,
        },
        opacity: layerOp,
      };
      items.push(text);
    }
  }

  return { items };
}

function unwrapLonNear(lonDeg: number, nearUnwrapped: number): number {
  let x = lonDeg;
  while (x - nearUnwrapped > 180) x -= 360;
  while (nearUnwrapped - x > 180) x += 360;
  return x;
}

function nearestSampleIndexByTime(
  samples: readonly { timeMs: number }[],
  timeMs: number,
): number {
  let best = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < samples.length; i += 1) {
    const d = Math.abs(samples[i]!.timeMs - timeMs);
    if (d < bestDist) {
      best = i;
      bestDist = d;
    }
  }
  return best;
}
