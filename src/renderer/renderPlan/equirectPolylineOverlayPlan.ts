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

import {
  IDENTITY_SCENE_CAMERA,
  identityYFromCanonicalLatitudeDeg,
  sceneCameraHorizontalWorldCopyOffsets,
  sceneXFromIdentityX,
  sceneYFromIdentityY,
  type SceneCamera,
} from "../../core/sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  sceneFrameLongitudesDeg,
  type SceneReferenceFrame,
} from "../../core/sceneReferenceFrame";
import {
  type OverlayReadabilityHints,
  effectiveOverlayReadabilityLiftVeil01,
} from "../../layers/overlayReadabilityHints";
import type { RenderLineItem, RenderPlan } from "./renderPlanTypes";
import {
  adjustPairToShortStripPath,
  equirectXFromUnwrappedLon,
  unwrappedLongitudes,
} from "./equirectSeamPath";
import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground";
import {
  astronomyPathStrokeWidthPx,
  DEFAULT_SOLAR_ANALEMMA_STROKE_RGB,
  type AstronomyPathThicknessId,
} from "../../core/astronomyOverlayStrokeAppearance";

export interface EquirectangularPolylineOverlayPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  frame?: SceneReferenceFrame;
  readonly points: readonly { latDeg: number; lonDeg: number }[];
  closed: boolean;
  layerOpacity: number;
  readability?: OverlayReadabilityHints | null;
  strokeColor?: string;
  strokeThickness?: AstronomyPathThicknessId;
}

export function buildEquirectangularPolylineOverlayRenderPlan(
  options: EquirectangularPolylineOverlayPlanOptions,
): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (w <= 0 || h <= 0) {
    return { items: [] };
  }
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  const frame = options.frame ?? EARTH_FIXED_SCENE_REFERENCE_FRAME;
  const pts = options.points;
  if (pts.length < 2) {
    return { items: [] };
  }
  const op = options.layerOpacity;
  const veil = effectiveOverlayReadabilityLiftVeil01(
    options.readability?.nightVeil01,
    options.readability?.overlayReadabilityLiftScale01,
  );
  const baseStrokeA = 0.5 * op;
  const strokeA = Math.min(0.92 * op, baseStrokeA + 0.32 * veil * op);
  const stroke = strokeRgba(options.strokeColor ?? DEFAULT_SOLAR_ANALEMMA_STROKE_RGB, strokeA);
  const strokeW = astronomyPathStrokeWidthPx(veil, options.strokeThickness);
  const lons = unwrappedLongitudes(sceneFrameLongitudesDeg(pts.map((p) => p.lonDeg), frame));
  const items: RenderLineItem[] = [];
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);

  const pushLine = (i0: number, i1: number) => {
    const u0 = lons[i0]!;
    const u1 = lons[i1]!;
    const raw0 = equirectXFromUnwrappedLon(u0, w);
    const raw1 = equirectXFromUnwrappedLon(u1, w);
    const { x0, x1 } = adjustPairToShortStripPath(raw0, raw1, w);
    const y0 = identityYFromCanonicalLatitudeDeg(pts[i0]!.latDeg, h, frame);
    const y1 = identityYFromCanonicalLatitudeDeg(pts[i1]!.latDeg, h, frame);
    if (!Number.isFinite(x0) || !Number.isFinite(x1)) {
      return;
    }
    for (const k of copies) {
      items.push({
        kind: "line",
        x1: sceneXFromIdentityX(x0 + k * w, w, camera),
        y1: sceneYFromIdentityY(y0, h, camera),
        x2: sceneXFromIdentityX(x1 + k * w, w, camera),
        y2: sceneYFromIdentityY(y1, h, camera),
        stroke,
        strokeWidthPx: strokeW,
      });
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

function strokeRgba(css: string, alpha: number): string {
  const px = parseCssColorToRgba8888(css);
  if (!px) {
    return `rgba(255, 200, 120, ${alpha})`;
  }
  return `rgba(${px.r}, ${px.g}, ${px.b}, ${alpha})`;
}
