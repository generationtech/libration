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

import {
  IDENTITY_SCENE_CAMERA,
  sceneCameraHorizontalWorldCopyOffsets,
  sceneXFromIdentityX,
  sceneXFromLongitudeDeg,
  sceneXShiftForWorldCopy,
  sceneYFromIdentityY,
  type SceneCamera,
} from "../../core/sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  type SceneReferenceFrame,
} from "../../core/sceneReferenceFrame";
import {
  type OverlayReadabilityHints,
  effectiveOverlayReadabilityLiftVeil01,
} from "../../layers/overlayReadabilityHints";
import {
  meridianLongitudesDegForEquirectGrid,
  parallelLatitudesDegForEquirectGrid,
  parallelYFromLatitudeDeg,
} from "../../core/equirectangularGridSampling";
import type { RenderLineItem, RenderPlan } from "./renderPlanTypes";

export interface EquirectangularGridOverlayPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera?: SceneCamera;
  frame?: SceneReferenceFrame;
  meridianStepDeg: number;
  parallelStepDeg: number;
  /** Same factor baked into RGBA alphas as legacy grid draw (layer opacity). */
  layerOpacity: number;
  /** Optional terminator-aware legibility (upstream). */
  readability?: OverlayReadabilityHints | null;
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
  const camera = options.camera ?? IDENTITY_SCENE_CAMERA;
  const frame = options.frame ?? EARTH_FIXED_SCENE_REFERENCE_FRAME;

  const op = options.layerOpacity;
  const veil = effectiveOverlayReadabilityLiftVeil01(
    options.readability?.nightVeil01,
    options.readability?.overlayReadabilityLiftScale01,
  );
  const minorA = Math.min(0.38 * op, (0.07 + 0.2 * veil) * op);
  const majorA = Math.min(0.42 * op, (0.16 + 0.18 * veil) * op);
  const minorW = 1 + 0.75 * veil;
  const majorW = 1 + 1.1 * veil;

  const lineMinor = `rgba(220, 230, 255, ${minorA})`;
  const lineMajor = `rgba(235, 242, 255, ${majorA})`;

  const items: RenderLineItem[] = [];
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, w);
  const yNorth = sceneYFromIdentityY(0, h, camera);
  const ySouth = sceneYFromIdentityY(h, h, camera);

  for (const lon of meridianLongitudesDegForEquirectGrid(options.meridianStepDeg)) {
    const baseX = sceneXFromLongitudeDeg(lon, w, camera, frame);
    const major = lon === 0;
    for (const k of copies) {
      const x = baseX + sceneXShiftForWorldCopy(w, camera, k);
      items.push({
        kind: "line",
        x1: x,
        y1: yNorth,
        x2: x,
        y2: ySouth,
        stroke: major ? lineMajor : lineMinor,
        strokeWidthPx: major ? majorW : minorW,
      });
    }
  }

  for (const lat of parallelLatitudesDegForEquirectGrid(options.parallelStepDeg)) {
    const y = sceneYFromIdentityY(parallelYFromLatitudeDeg(lat, h), h, camera);
    const major = lat === 0;
    for (const k of copies) {
      items.push({
        kind: "line",
        x1: sceneXFromIdentityX(k * w, w, camera),
        y1: y,
        x2: sceneXFromIdentityX((k + 1) * w, w, camera),
        y2: y,
        stroke: major ? lineMajor : lineMinor,
        strokeWidthPx: major ? majorW : minorW,
      });
    }
  }

  return { items };
}
