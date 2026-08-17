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
 * Trail polylines + tip discs/silhouette are resolved here; the canvas executor applies primitives only.
 */

import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground.ts";
import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productTextFont.ts";
import {
  DEFAULT_ISS_ORBITAL_PRESENTATION,
  issGlyphSizeScale,
  issOrbitLineWidthPx,
  type IssOrbitalPresentation,
} from "../../core/issOrbitalPresentation";
import type {
  DynamicTrackSampleMarker,
  DynamicTracksPayload,
} from "../../layers/dynamicTracksPayload";
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
import { issStationGlyphPathDescriptor } from "./issStationGlyphPath";
import { createDescriptorPathItem } from "./pathItemFactories";

function mapLatToY(latDeg: number, viewportHeightPx: number): number {
  return ((90 - latDeg) / 180) * viewportHeightPx;
}

function strokeRgba(css: string, alpha: number): string {
  const px = parseCssColorToRgba8888(css);
  if (!px) {
    return `rgba(120, 210, 255, ${alpha})`;
  }
  return `rgba(${px.r}, ${px.g}, ${px.b}, ${alpha})`;
}

export interface DynamicTracksRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  layerOpacity: number;
  payload: DynamicTracksPayload;
}

/**
 * Builds a {@link RenderPlan} for dynamic tracks: trail lines + current-position glyph + optional label.
 * Future segments are drawn first, then past, then the current glyph so the marker stays primary.
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
  const presentation: IssOrbitalPresentation =
    options.payload.presentation ?? DEFAULT_ISS_ORBITAL_PRESENTATION;
  const lineWidth = issOrbitLineWidthPx(presentation.lineThickness);
  const sizeScale = issGlyphSizeScale(presentation.glyphSize);

  for (const track of options.payload.tracks) {
    const samples = track.samples;
    if (samples.length === 0) continue;

    if (presentation.trackEnabled) {
      const futurePts =
        presentation.futureEnabled
          ? (track.futureSamples ??
            fallbackSegment(samples, currentTimeMs, "future", current))
          : [];
      const pastPts =
        presentation.pastEnabled
          ? (track.pastSamples ??
            fallbackSegment(samples, currentTimeMs, "past", current))
          : [];
      pushSeamAwarePolyline(
        items,
        futurePts,
        w,
        h,
        strokeRgba(presentation.futureColor, a(0.38)),
        sw(lineWidth),
      );
      pushSeamAwarePolyline(
        items,
        pastPts,
        w,
        h,
        strokeRgba(presentation.pastColor, a(0.72)),
        sw(lineWidth),
      );
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
    const r = Math.min(8, Math.max(4.2, 4.4 * Math.max(0.7, w / 1400))) * sizeScale;

    if (presentation.glyphType === "silhouette") {
      const heading = options.payload.travelHeadingRad ?? 0;
      items.push(
        createDescriptorPathItem({
          pathDescriptor: issStationGlyphPathDescriptor(tipX, tipY, r, heading),
          fill: strokeRgba(presentation.glyphColor, a(0.96)),
          stroke: `rgba(12, 28, 44, ${a(0.85)})`,
          strokeWidthPx: sw(Math.max(0.9, 1.15 * sizeScale)),
        }),
      );
    } else {
      const disc: RenderPath2DItem = {
        kind: "path2d",
        pathKind: "path2d",
        path: circlePath2D(tipX, tipY, r),
        fill: strokeRgba(presentation.dotColor, a(0.96)),
        stroke: `rgba(12, 28, 44, ${a(0.85)})`,
        strokeWidthPx: sw(1.4),
      };
      items.push(disc);
      items.push({
        kind: "path2d",
        pathKind: "path2d",
        path: circlePath2D(tipX, tipY, r + 2.5 * sizeScale),
        stroke: `rgba(230, 250, 255, ${a(0.55)})`,
        strokeWidthPx: sw(1.15),
      });
    }

    const labelText =
      presentation.labelEnabled &&
      track.label !== undefined &&
      track.label.trim() !== ""
        ? track.label.trim()
        : undefined;
    if (labelText !== undefined) {
      const glyphHalf = presentation.glyphType === "silhouette" ? r * 1.05 : r;
      const text: RenderTextItem = {
        kind: "text",
        x: tipX + glyphHalf + 4,
        y: tipY - labelSize * 0.35,
        text: labelText,
        fill: strokeRgba(presentation.baseColor, a(0.94)),
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

function pushSeamAwarePolyline(
  items: RenderPlan["items"],
  points: readonly DynamicTrackSampleMarker[],
  w: number,
  h: number,
  stroke: string,
  strokeWidthPx: number,
): void {
  if (points.length < 2) {
    return;
  }
  const unwrapped = unwrappedLongitudes(points.map((p) => p.lonDeg));
  for (let i = 1; i < points.length; i += 1) {
    const y0 = mapLatToY(points[i - 1]!.latDeg, h);
    const y1 = mapLatToY(points[i]!.latDeg, h);
    const rawX0 = equirectXFromUnwrappedLon(unwrapped[i - 1]!, w);
    const rawX1 = equirectXFromUnwrappedLon(unwrapped[i]!, w);
    const { x0, x1 } = adjustPairToShortStripPath(rawX0, rawX1, w);
    const line: RenderLineItem = {
      kind: "line",
      x1: x0,
      y1: y0,
      x2: x1,
      y2: y1,
      stroke,
      strokeWidthPx,
      lineCap: "round",
    };
    items.push(line);
  }
}

function fallbackSegment(
  samples: readonly DynamicTrackSampleMarker[],
  currentTimeMs: number | undefined,
  which: "past" | "future",
  current: DynamicTrackSampleMarker | undefined,
): DynamicTrackSampleMarker[] {
  const out: DynamicTrackSampleMarker[] = [];
  if (which === "past") {
    for (const sample of samples) {
      if (currentTimeMs === undefined || sample.timeMs <= currentTimeMs) {
        out.push(sample);
      }
    }
    if (current !== undefined && (out.length === 0 || out[out.length - 1] !== current)) {
      out.push(current);
    }
  } else {
    if (current !== undefined) {
      out.push(current);
    }
    for (const sample of samples) {
      if (currentTimeMs === undefined || sample.timeMs > currentTimeMs) {
        out.push(sample);
      }
    }
  }
  return out;
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
