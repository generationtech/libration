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

import {
  IDENTITY_SCENE_CAMERA,
  identityYFromCanonicalLatitudeDeg,
  sceneCameraHorizontalWorldCopyOffsets,
  sceneCameraVectorWrapSlopPx,
  sceneXFromIdentityX,
  sceneYFromIdentityY,
  type SceneCamera,
} from "../../core/sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  sceneFrameLongitudeDeg,
  type SceneReferenceFrame,
} from "../../core/sceneReferenceFrame";
import { DEFAULT_LUNAR_LOCUS_STROKE_RGB } from "../../core/lunarLocus";
import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground";
import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import {
  lunarLocusMoonSizeFromPayload,
  type LunarLocusPayload,
} from "../../layers/lunarLocusPayload";
import type { RenderLineItem, RenderPlan } from "./renderPlanTypes";
import { equirectXFromUnwrappedLon } from "./equirectSeamPath";
import { astronomyPathStrokeWidthPx } from "../../core/astronomyOverlayStrokeAppearance";
import { sublunarMarkerRadiusPx } from "../../core/sublunarMarkerAppearance";

export interface LunarLocusRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  frame?: SceneReferenceFrame;
  layerOpacity: number;
  payload: LunarLocusPayload;
}

function longitudeOffsetsForCameraWorldCopies(
  camera: SceneCamera,
  widthPx: number,
): readonly number[] {
  return sceneCameraHorizontalWorldCopyOffsets(
    camera,
    widthPx,
    sceneCameraVectorWrapSlopPx(widthPx),
  ).map((k) => k * 360);
}

function dist2(x0: number, y0: number, x1: number, y1: number): number {
  return Math.hypot(x1 - x0, y1 - y0);
}

/**
 * Move an endpoint that lies inside the Moon disc onto the circle along the segment,
 * slightly inside the visible radius. Fully interior segments are dropped.
 */
function clipSegmentToMoonFootprint(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  cx: number,
  cy: number,
  r: number,
): { x0: number; y0: number; x1: number; y1: number } | null {
  const d0 = dist2(x0, y0, cx, cy);
  const d1 = dist2(x1, y1, cx, cy);
  if (d0 < r && d1 < r) {
    return null;
  }
  if (d0 >= r && d1 >= r) {
    return { x0, y0, x1, y1 };
  }
  const dx = x1 - x0;
  const dy = y1 - y0;
  const fx = x0 - cx;
  const fy = y0 - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (!(a > 0) || disc < 0) {
    return { x0, y0, x1, y1 };
  }
  const s = Math.sqrt(disc);
  const tA = (-b - s) / (2 * a);
  const tB = (-b + s) / (2 * a);
  const t = tA >= 0 && tA <= 1 ? tA : tB >= 0 && tB <= 1 ? tB : null;
  if (t === null) {
    return { x0, y0, x1, y1 };
  }
  const xi = x0 + t * dx;
  const yi = y0 + t * dy;
  if (d0 < r) {
    return { x0: xi, y0: yi, x1, y1 };
  }
  return { x0, y0, x1: xi, y1: yi };
}

function pushWrappedOpenPolyline(
  items: RenderPlan["items"],
  points: LunarLocusPayload["points"],
  w: number,
  h: number,
  stroke: string,
  strokeWidthPx: number,
  moonRadiusPx: number,
  camera: SceneCamera,
  frame: SceneReferenceFrame,
): void {
  if (points.length < 2) {
    return;
  }
  const n = points.length;
  const moonLon = sceneFrameLongitudeDeg(points[0]!.lonDeg, frame);
  const moonR = moonRadiusPx * 0.75;
  for (const offset of longitudeOffsetsForCameraWorldCopies(camera, w)) {
    const moonX = sceneXFromIdentityX(
      equirectXFromUnwrappedLon(moonLon + offset, w),
      w,
      camera,
    );
    const moonY = sceneYFromIdentityY(
      identityYFromCanonicalLatitudeDeg(points[0]!.latDeg, h, frame),
      h,
      camera,
    );
    const moonOnScreen =
      Number.isFinite(moonX) &&
      Number.isFinite(moonY) &&
      moonX > -moonR * 2 &&
      moonX < w + moonR * 2 &&
      moonY > -moonR * 2 &&
      moonY < h + moonR * 2;
    for (let i = 0; i < n - 1; i += 1) {
      const ix0 = equirectXFromUnwrappedLon(
        sceneFrameLongitudeDeg(points[i]!.lonDeg, frame) + offset,
        w,
      );
      const ix1 = equirectXFromUnwrappedLon(
        sceneFrameLongitudeDeg(points[i + 1]!.lonDeg, frame) + offset,
        w,
      );
      const iy0 = identityYFromCanonicalLatitudeDeg(points[i]!.latDeg, h, frame);
      const iy1 = identityYFromCanonicalLatitudeDeg(points[i + 1]!.latDeg, h, frame);
      if (!Number.isFinite(ix0) || !Number.isFinite(ix1)) {
        continue;
      }
      if (Math.abs(ix1 - ix0) >= w * 0.5) {
        continue;
      }
      const x0 = sceneXFromIdentityX(ix0, w, camera);
      const x1 = sceneXFromIdentityX(ix1, w, camera);
      const y0 = sceneYFromIdentityY(iy0, h, camera);
      const y1 = sceneYFromIdentityY(iy1, h, camera);
      let sx0 = x0;
      let sy0 = y0;
      let sx1 = x1;
      let sy1 = y1;
      if (moonOnScreen) {
        const clipped = clipSegmentToMoonFootprint(x0, y0, x1, y1, moonX, moonY, moonR);
        if (clipped === null) {
          continue;
        }
        sx0 = clipped.x0;
        sy0 = clipped.y0;
        sx1 = clipped.x1;
        sy1 = clipped.y1;
      }
      const bothLeft = sx0 < 0 && sx1 < 0;
      const bothRight = sx0 > w && sx1 > w;
      if (bothLeft || bothRight) {
        continue;
      }
      const line: RenderLineItem = {
        kind: "line",
        x1: sx0,
        y1: sy0,
        x2: sx1,
        y2: sy1,
        stroke,
        strokeWidthPx,
      };
      items.push(line);
    }
  }
}

function strokeRgba(css: string, alpha: number): string {
  const px = parseCssColorToRgba8888(css);
  if (!px) {
    return `rgba(28, 38, 56, ${alpha})`;
  }
  return `rgba(${px.r}, ${px.g}, ${px.b}, ${alpha})`;
}

/**
 * Builds a {@link RenderPlan} for the lunar locus: open one-cycle line only, no sample markers.
 * Stroke width matches the solar analemma construction; color is lunar, not solar-warm.
 * The two cycle ends terminate inside the Moon glyph footprint (presentation trim).
 */
export function buildLunarLocusRenderPlan(options: LunarLocusRenderPlanOptions): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  const frame = options.frame ?? EARTH_FIXED_SCENE_REFERENCE_FRAME;
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
  const strokeW = astronomyPathStrokeWidthPx(veil, options.payload.strokeThickness);
  const stroke = strokeRgba(options.payload.strokeColor ?? DEFAULT_LUNAR_LOCUS_STROKE_RGB, strokeA);
  const moonRadiusPx = sublunarMarkerRadiusPx(w, lunarLocusMoonSizeFromPayload(options.payload));
  const items: RenderPlan["items"] = [];
  pushWrappedOpenPolyline(
    items,
    options.payload.points,
    w,
    h,
    stroke,
    strokeW,
    moonRadiusPx,
    camera,
    frame,
  );
  return { items };
}
