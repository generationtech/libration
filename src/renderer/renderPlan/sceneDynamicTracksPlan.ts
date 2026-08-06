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
import { mapXFromLongitudeDeg } from "../../core/equirectangularProjection";
import type { DynamicTracksPayload } from "../../layers/dynamicTracksPayload";
import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import type {
  RenderLineItem,
  RenderPath2DItem,
  RenderPlan,
  RenderTextItem,
} from "./renderPlanTypes";
import { circlePath2D } from "./circlePath2D";

function mapLatToY(latDeg: number, viewportHeightPx: number): number {
  return ((90 - latDeg) / 180) * viewportHeightPx;
}

function shortLonDeltaDeg(a: number, b: number): number {
  return (((b - a) + 540) % 360) - 180;
}

function unwrappedLongitudes(lons: readonly number[]): number[] {
  if (lons.length === 0) return [];
  const u: number[] = [lons[0]!];
  for (let i = 1; i < lons.length; i += 1) {
    u.push(u[i - 1]! + shortLonDeltaDeg(lons[i - 1]!, lons[i]!));
  }
  return u;
}

function equirectXFromUnwrappedLon(uDeg: number, w: number): number {
  return ((uDeg + 180) / 360) * w;
}

function adjustPairToShortStripPath(
  x0: number,
  x1: number,
  w: number,
): { x0: number; x1: number } {
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

export interface DynamicTracksRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  layerOpacity: number;
  payload: DynamicTracksPayload;
}

/**
 * Builds a {@link RenderPlan} for dynamic tracks: trail lines + tip disc + optional label.
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
        const line: RenderLineItem = {
          kind: "line",
          x1: x0,
          y1: y0,
          x2: x1,
          y2: y1,
          stroke: `rgba(120, 210, 255, ${a(0.72)})`,
          strokeWidthPx: sw(1.6),
          lineCap: "round",
        };
        items.push(line);
      }
    }

    const tip = samples[samples.length - 1]!;
    const tipX = mapXFromLongitudeDeg(tip.lonDeg, w);
    const tipY = mapLatToY(tip.latDeg, h);
    const r = Math.min(7, Math.max(3.5, 3.8 * Math.max(0.7, w / 1400)));

    const disc: RenderPath2DItem = {
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(tipX, tipY, r),
      fill: `rgba(160, 230, 255, ${a(0.92)})`,
      stroke: `rgba(20, 40, 60, ${a(0.7)})`,
      strokeWidthPx: sw(1.2),
    };
    items.push(disc);

    items.push({
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(tipX, tipY, r + 2),
      stroke: `rgba(220, 245, 255, ${a(0.45)})`,
      strokeWidthPx: sw(1),
    });

    if (track.label !== undefined && track.label.trim() !== "") {
      const text: RenderTextItem = {
        kind: "text",
        x: tipX + r + 4,
        y: tipY - labelSize * 0.35,
        text: track.label,
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
