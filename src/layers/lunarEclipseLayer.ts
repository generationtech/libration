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

import { getOverlayReadabilityFrameOrCompute } from "../core/overlayReadabilityFrame";
import { resolveEclipseFrame } from "../core/eclipse/eclipseEventService";
import {
  LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_STROKE,
  LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_WIDTH_PX,
  LUNAR_ECLIPSE_VISIBILITY_REGION_FILL,
  normalizeLunarEclipsePresentation,
  type LunarEclipsePresentation,
} from "../core/eclipse/lunarEclipseAppearance";
import {
  lunarHorizonBoundaryPolylines,
  lunarVisibilityPolarCloseLatDeg,
  lunarVisibilityRegionRing,
} from "../core/eclipse/lunarVisibilityGeometry";
import { sublunarPoint } from "../core/sublunarPoint";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECT_REGION_OVERLAY_KIND,
  type EquirectRegionFill,
  type EquirectRegionOverlayPayload,
  type EquirectRegionStroke,
} from "./equirectRegionPayload";

export const LUNAR_ECLIPSE_LAYER_ID = "layer.lunarEclipse.visibility";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

export function createLunarEclipseLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    presentation?: Partial<LunarEclipsePresentation> | Readonly<Record<string, unknown>>;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const presentation = normalizeLunarEclipsePresentation(options.presentation);
  return {
    id: LUNAR_ECLIPSE_LAYER_ID,
    name: "Lunar eclipses",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const frame = time.eclipseFrame ?? resolveEclipseFrame(time.now, { horizonMs: 0 });
      const fills: EquirectRegionFill[] = [];
      const strokes: EquirectRegionStroke[] = [];
      if (frame.support.supported && frame.activeLunar && frame.lunarGeometry) {
        const moon = sublunarPoint(time.now);
        if (presentation.showVisibilityRegion) {
          const ring = lunarVisibilityRegionRing(moon.latDeg, moon.lonDeg);
          if (ring.length >= 4) {
            fills.push({
              ring,
              fill: LUNAR_ECLIPSE_VISIBILITY_REGION_FILL,
              polarCloseLatDeg: lunarVisibilityPolarCloseLatDeg(moon.latDeg),
            });
          }
        }
        if (presentation.showVisibilityBoundary) {
          for (const points of lunarHorizonBoundaryPolylines(moon.latDeg, moon.lonDeg)) {
            if (points.length >= 2) {
              strokes.push({
                points,
                stroke: LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_STROKE,
                strokeWidthPx: LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_WIDTH_PX,
              });
            }
          }
        }
      }
      const readabilityFrame = getOverlayReadabilityFrameOrCompute(time);
      const data: EquirectRegionOverlayPayload = {
        kind: EQUIRECT_REGION_OVERLAY_KIND,
        fills,
        strokes,
        readability: {
          nightVeil01: readabilityFrame.globalReadabilityVeil01,
          overlayReadabilityLiftScale01: readabilityFrame.substrateOverlayReadabilityLiftScale01,
        },
      };
      return { visible: true, opacity: op, data };
    },
  };
}
