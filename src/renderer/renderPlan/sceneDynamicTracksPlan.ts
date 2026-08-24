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

import {
  blackOrWhiteForegroundForBackgroundCss,
  parseCssColorToRgba8888,
} from "../../color/contrastForegroundOnCssBackground.ts";
import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productTextFont.ts";
import {
  IDENTITY_SCENE_CAMERA,
  identityYFromCanonicalLatitudeDeg,
  sceneCameraHorizontalWorldCopyOffsets,
  sceneXFromIdentityX,
  sceneXShiftForWorldCopy,
  sceneYFromIdentityY,
  sceneYFromLatitudeDeg,
  type SceneCamera,
} from "../../core/sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  sceneFrameLongitudeDeg,
  sceneFrameLongitudesDeg,
  type SceneReferenceFrame,
} from "../../core/sceneReferenceFrame";
import {
  issOrbitDistanceIndex,
  issOrbitFadeMultiplier,
} from "../../core/issOrbitHorizon";
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

function mapLatToY(
  latDeg: number,
  viewportHeightPx: number,
  frame: SceneReferenceFrame,
): number {
  return identityYFromCanonicalLatitudeDeg(latDeg, viewportHeightPx, frame);
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
  camera?: SceneCamera;
  frame?: SceneReferenceFrame;
  layerOpacity: number;
  payload: DynamicTracksPayload;
}

export type IssCurrentGlyphCopy = {
  sceneX: number;
  sceneY: number;
  renderedRadiusPx: number;
};

/** Painted ISS current-glyph radius used by the tracks plan and by click-to-track. */
export function issCurrentGlyphRadiusPx(
  viewportWidthPx: number,
  sizeScale: number,
): number {
  return (
    Math.min(8, Math.max(4.2, 4.4 * Math.max(0.7, viewportWidthPx / 1400))) *
    sizeScale
  );
}

/**
 * Scene copies of the current ISS glyph, using the same unwrap + wrap-copy
 * path as {@link buildDynamicTracksRenderPlan}.
 */
export function collectIssCurrentGlyphCopies(options: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  frame?: SceneReferenceFrame;
  payload: DynamicTracksPayload;
}): IssCurrentGlyphCopy[] {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return [];
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  const frame = options.frame ?? EARTH_FIXED_SCENE_REFERENCE_FRAME;
  const presentation: IssOrbitalPresentation =
    options.payload.presentation ?? DEFAULT_ISS_ORBITAL_PRESENTATION;
  const sizeScale = issGlyphSizeScale(presentation.glyphSize);
  const r = issCurrentGlyphRadiusPx(w, sizeScale);
  const current = options.payload.currentPosition;
  const track = options.payload.tracks.find((row) => row.samples.length > 0);
  const samples = track?.samples;
  const marker = current ?? samples?.[samples.length - 1];
  if (marker === undefined) {
    return [];
  }
  const nearestIdx =
    samples !== undefined && samples.length > 0
      ? nearestSampleIndexByTime(samples, marker.timeMs)
      : 0;
  const lons =
    samples !== undefined && samples.length > 0
      ? sceneFrameLongitudesDeg(
          samples.map((s) => s.lonDeg),
          frame,
        )
      : [sceneFrameLongitudeDeg(marker.lonDeg, frame)];
  const unwrapped = lons.length >= 2 ? unwrappedLongitudes(lons) : lons;
  const nearU =
    unwrapped[nearestIdx] ?? sceneFrameLongitudeDeg(marker.lonDeg, frame);
  const markerU = unwrapLonNear(
    sceneFrameLongitudeDeg(marker.lonDeg, frame),
    nearU,
  );
  let tipIdentityX = equirectXFromUnwrappedLon(markerU, w);
  tipIdentityX = ((tipIdentityX % w) + w) % w;
  const tipY = sceneYFromLatitudeDeg(marker.latDeg, h, camera, frame);
  const copies: IssCurrentGlyphCopy[] = [];
  for (const copy of sceneCameraHorizontalWorldCopyOffsets(camera, w)) {
    const tipX =
      sceneXFromIdentityX(tipIdentityX, w, camera) +
      sceneXShiftForWorldCopy(w, camera, copy);
    if (tipX < -r * 6 || tipX > w + r * 6) {
      continue;
    }
    copies.push({ sceneX: tipX, sceneY: tipY, renderedRadiusPx: r });
  }
  return copies;
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
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  const frame = options.frame ?? EARTH_FIXED_SCENE_REFERENCE_FRAME;

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
      const periodMs = options.payload.orbitalPeriodMs;
      const productUtcMs = currentTimeMs ?? 0;
      pushFadedOrbitPolylines(
        items,
        futurePts,
        w,
        h,
        camera,
        frame,
        presentation.futureColor,
        a,
        0.38,
        sw(lineWidth),
        productUtcMs,
        periodMs,
      );
      pushFadedOrbitPolylines(
        items,
        pastPts,
        w,
        h,
        camera,
        frame,
        presentation.pastColor,
        a,
        0.72,
        sw(lineWidth),
        productUtcMs,
        periodMs,
      );
    }

    const marker = current ?? samples[samples.length - 1]!;
    const nearestIdx = nearestSampleIndexByTime(samples, marker.timeMs);
    const lons = sceneFrameLongitudesDeg(samples.map((s) => s.lonDeg), frame);
    const unwrapped = samples.length >= 2 ? unwrappedLongitudes(lons) : lons;
    const nearU = unwrapped[nearestIdx] ?? sceneFrameLongitudeDeg(marker.lonDeg, frame);
    const markerU = unwrapLonNear(sceneFrameLongitudeDeg(marker.lonDeg, frame), nearU);
    let tipIdentityX = equirectXFromUnwrappedLon(markerU, w);
    tipIdentityX = ((tipIdentityX % w) + w) % w;
    const tipY = sceneYFromLatitudeDeg(marker.latDeg, h, camera, frame);
    const r = issCurrentGlyphRadiusPx(w, sizeScale);
    const tipCopies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
    const labelText =
      presentation.labelEnabled &&
      track.label !== undefined &&
      track.label.trim() !== ""
        ? track.label.trim()
        : undefined;

    for (const copy of tipCopies) {
      const tipX = sceneXFromIdentityX(tipIdentityX, w, camera) + sceneXShiftForWorldCopy(w, camera, copy);
      if (tipX < -r * 6 || tipX > w + r * 6) {
        continue;
      }

    if (presentation.glyphType === "silhouette") {
      const heading = options.payload.travelHeadingRad ?? 0;
      const pathDescriptor = issStationGlyphPathDescriptor(tipX, tipY, r, heading);
      const fgWidth = sw(Math.max(0.7, 0.85 * sizeScale));
      const extra = Math.min(1.25, Math.max(0.55, fgWidth * 0.55));
      const underWidth = fgWidth + extra;
      const glyphFill = strokeRgba(presentation.glyphColor, a(0.96));
      items.push(
        createDescriptorPathItem({
          pathDescriptor,
          stroke: issGlyphUnderStrokeRgba(presentation.glyphColor, a(0.85)),
          strokeWidthPx: underWidth,
        }),
      );
      items.push(
        createDescriptorPathItem({
          pathDescriptor,
          fill: glyphFill,
          stroke: glyphFill,
          strokeWidthPx: fgWidth,
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
  }

  return { items };
}

function issGlyphUnderStrokeRgba(glyphCss: string, alpha: number): string {
  const kind =
    blackOrWhiteForegroundForBackgroundCss(glyphCss) === "#000000" ? "dark" : "light";
  return kind === "dark"
    ? `rgba(12, 28, 44, ${alpha})`
    : `rgba(236, 240, 246, ${alpha})`;
}

function pushFadedOrbitPolylines(
  items: RenderPlan["items"],
  points: readonly DynamicTrackSampleMarker[],
  w: number,
  h: number,
  camera: SceneCamera,
  frame: SceneReferenceFrame,
  colorCss: string,
  a: (alpha: number) => number,
  baseAlpha: number,
  strokeWidthPx: number,
  productUtcMs: number,
  orbitalPeriodMs: number | undefined,
): void {
  const runs = splitOrbitRuns(points, productUtcMs, orbitalPeriodMs);
  runs.sort((left, right) => right.orbitIndex - left.orbitIndex);
  for (const run of runs) {
    const fade = issOrbitFadeMultiplier(run.orbitIndex);
    pushSeamAwarePolyline(
      items,
      run.points,
      w,
      h,
      camera,
      frame,
      strokeRgba(colorCss, a(baseAlpha * fade)),
      strokeWidthPx,
    );
  }
}

function splitOrbitRuns(
  points: readonly DynamicTrackSampleMarker[],
  productUtcMs: number,
  orbitalPeriodMs: number | undefined,
): Array<{ orbitIndex: number; points: DynamicTrackSampleMarker[] }> {
  if (points.length === 0) {
    return [];
  }
  if (!(orbitalPeriodMs !== undefined && orbitalPeriodMs > 0)) {
    return [{ orbitIndex: 0, points: [...points] }];
  }
  const runs: Array<{ orbitIndex: number; points: DynamicTrackSampleMarker[] }> = [];
  for (let i = 0; i < points.length; i += 1) {
    const point = points[i]!;
    const orbitIndex = issOrbitDistanceIndex(
      Math.abs(point.timeMs - productUtcMs),
      orbitalPeriodMs,
    );
    const last = runs[runs.length - 1];
    if (last !== undefined && last.orbitIndex === orbitIndex) {
      last.points.push(point);
      continue;
    }
    const next: { orbitIndex: number; points: DynamicTrackSampleMarker[] } = {
      orbitIndex,
      points: [],
    };
    if (i > 0) {
      next.points.push(points[i - 1]!);
    }
    next.points.push(point);
    runs.push(next);
  }
  return runs;
}

function pushSeamAwarePolyline(
  items: RenderPlan["items"],
  points: readonly DynamicTrackSampleMarker[],
  w: number,
  h: number,
  camera: SceneCamera,
  frame: SceneReferenceFrame,
  stroke: string,
  strokeWidthPx: number,
): void {
  if (points.length < 2) {
    return;
  }
  const unwrapped = unwrappedLongitudes(sceneFrameLongitudesDeg(points.map((p) => p.lonDeg), frame));
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
  for (let i = 1; i < points.length; i += 1) {
    const y0 = mapLatToY(points[i - 1]!.latDeg, h, frame);
    const y1 = mapLatToY(points[i]!.latDeg, h, frame);
    const rawX0 = equirectXFromUnwrappedLon(unwrapped[i - 1]!, w);
    const rawX1 = equirectXFromUnwrappedLon(unwrapped[i]!, w);
    const { x0, x1 } = adjustPairToShortStripPath(rawX0, rawX1, w);
    for (const k of copies) {
      const line: RenderLineItem = {
        kind: "line",
        x1: sceneXFromIdentityX(x0 + k * w, w, camera),
        y1: sceneYFromIdentityY(y0, h, camera),
        x2: sceneXFromIdentityX(x1 + k * w, w, camera),
        y2: sceneYFromIdentityY(y1, h, camera),
        stroke,
        strokeWidthPx,
        lineCap: "round",
      };
      items.push(line);
    }
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
