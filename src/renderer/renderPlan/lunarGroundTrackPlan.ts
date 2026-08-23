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
 * Lunar ground track in equirectangular scene space.
 * Past/future polylines and unlabeled 6-hour ticks are resolved here; the backend executes primitives.
 */

import { parallelYFromLatitudeDeg } from "../../core/equirectangularGridSampling";
import {
  IDENTITY_SCENE_CAMERA,
  sceneCameraHorizontalWorldCopyOffsets,
  sceneXFromIdentityX,
  sceneXFromLongitudeDeg,
  sceneXShiftForWorldCopy,
  sceneYFromIdentityY,
  sceneYFromLatitudeDeg,
  type SceneCamera,
} from "../../core/sceneCamera";
import type { LunarGroundTrackSample } from "../../core/lunarGroundTrack";
import {
  DEFAULT_LUNAR_GROUND_TRACK_FUTURE_COLOR,
  DEFAULT_LUNAR_GROUND_TRACK_PAST_COLOR,
  normalizeLunarGroundTrackStrokeCss,
} from "../../core/lunarGroundTrackAppearance";
import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground";
import {
  effectiveOverlayReadabilityLiftVeil01,
} from "../../layers/overlayReadabilityHints";
import type { LunarGroundTrackPayload } from "../../layers/lunarGroundTrackPayload";
import type { RenderLineItem, RenderPlan } from "./renderPlanTypes";
import { circlePath2D } from "./circlePath2D";
import {
  adjustPairToShortStripPath,
  equirectXFromUnwrappedLon,
  unwrappedLongitudes,
} from "./equirectSeamPath";

function strokeRgba(css: string, alpha: number): string {
  const px = parseCssColorToRgba8888(css);
  if (!px) {
    return `rgba(170, 205, 240, ${alpha})`;
  }
  return `rgba(${px.r}, ${px.g}, ${px.b}, ${alpha})`;
}

export interface LunarGroundTrackRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  layerOpacity: number;
  payload: LunarGroundTrackPayload;
}

function pushSeamAwarePolyline(
  items: RenderPlan["items"],
  points: readonly LunarGroundTrackSample[],
  w: number,
  h: number,
  stroke: string,
  strokeWidthPx: number,
  camera: SceneCamera,
): void {
  if (points.length < 2) {
    return;
  }
  const lons = unwrappedLongitudes(points.map((p) => p.lonDeg));
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
  for (let i = 0; i < lons.length - 1; i += 1) {
    const raw0 = equirectXFromUnwrappedLon(lons[i]!, w);
    const raw1 = equirectXFromUnwrappedLon(lons[i + 1]!, w);
    const { x0, x1 } = adjustPairToShortStripPath(raw0, raw1, w);
    const y0 = parallelYFromLatitudeDeg(points[i]!.latDeg, h);
    const y1 = parallelYFromLatitudeDeg(points[i + 1]!.latDeg, h);
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
      continue;
    }
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

/**
 * Builds a {@link RenderPlan} for the sublunar ground track: quieter past, full future, unlabeled ticks.
 * Cool stroke, distinct from the solar analemma's warm polyline.
 */
export function buildLunarGroundTrackRenderPlan(
  options: LunarGroundTrackRenderPlanOptions,
): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  const op = Math.max(0, Math.min(1, options.layerOpacity));
  if (op <= 0) {
    return { items: [] };
  }
  const veil = effectiveOverlayReadabilityLiftVeil01(
    options.payload.readability?.nightVeil01,
    options.payload.readability?.overlayReadabilityLiftScale01,
  );
  const sw = (base: number) => Math.max(base, base * (1 + 0.45 * veil));
  const a = (alpha: number) => Math.min(0.92 * op, alpha * op * (1 + 0.28 * veil));

  const futureCss = normalizeLunarGroundTrackStrokeCss(
    options.payload.futureColor || DEFAULT_LUNAR_GROUND_TRACK_FUTURE_COLOR,
  );
  const pastCss = normalizeLunarGroundTrackStrokeCss(
    options.payload.pastColor || DEFAULT_LUNAR_GROUND_TRACK_PAST_COLOR,
  );
  const futureStroke = strokeRgba(futureCss, a(0.78));
  const pastStroke = strokeRgba(pastCss, a(0.34));
  const items: RenderPlan["items"] = [];

  const pastPts = [...options.payload.past, options.payload.current];
  const futurePts = [options.payload.current, ...options.payload.future];
  pushSeamAwarePolyline(items, pastPts, w, h, pastStroke, sw(1.15), camera);
  pushSeamAwarePolyline(items, futurePts, w, h, futureStroke, sw(1.55), camera);

  const tickR = Math.min(3.2, Math.max(1.8, w * 0.0016));
  const tickFill = `rgba(200, 220, 245, ${a(0.72)})`;
  const tickStroke = `rgba(28, 40, 58, ${a(0.55)})`;
  const tickCopies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
  for (const tick of options.payload.ticks) {
    const cy = sceneYFromLatitudeDeg(tick.latDeg, h, camera);
    const baseX = sceneXFromLongitudeDeg(tick.lonDeg, w, camera);
    for (const k of tickCopies) {
      const cx = baseX + sceneXShiftForWorldCopy(w, camera, k);
      if (!Number.isFinite(cx) || !Number.isFinite(cy)) {
        continue;
      }
      if (cx < -tickR * 4 || cx > w + tickR * 4) {
        continue;
      }
      items.push({
        kind: "path2d",
        pathKind: "path2d",
        path: circlePath2D(cx, cy, tickR),
        fill: tickFill,
        stroke: tickStroke,
        strokeWidthPx: sw(0.8),
      });
    }
  }

  return { items };
}
