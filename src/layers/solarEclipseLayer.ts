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
  normalizeSolarEclipsePresentation,
  SOLAR_ECLIPSE_ANTUMBRA_FILL,
  SOLAR_ECLIPSE_CENTERLINE_STROKE,
  SOLAR_ECLIPSE_CENTERLINE_WIDTH_PX,
  SOLAR_ECLIPSE_PARTIAL_FILL,
  SOLAR_ECLIPSE_UMBRA_FILL,
  type SolarEclipsePresentation,
} from "../core/eclipse/solarEclipseAppearance";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECT_REGION_OVERLAY_KIND,
  type EquirectRegionFill,
  type EquirectRegionOverlayPayload,
  type EquirectRegionStroke,
} from "./equirectRegionPayload";

export const SOLAR_ECLIPSE_LAYER_ID = "layer.solarEclipse.liveFootprint";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

export function createSolarEclipseLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    presentation?: Partial<SolarEclipsePresentation> | Readonly<Record<string, unknown>>;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const presentation = normalizeSolarEclipsePresentation(options.presentation);
  return {
    id: SOLAR_ECLIPSE_LAYER_ID,
    name: "Solar eclipses",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const frame = time.eclipseFrame ?? resolveEclipseFrame(time.now);
      const geom = frame.solarGeometry;
      const fills: EquirectRegionFill[] = [];
      const strokes: EquirectRegionStroke[] = [];
      if (geom && frame.support.supported) {
        if (presentation.showPartialRegion && geom.partialRegion.length >= 4) {
          fills.push({ ring: geom.partialRegion, fill: SOLAR_ECLIPSE_PARTIAL_FILL });
        }
        if (presentation.showCentralBand && geom.centralBand.length >= 4) {
          fills.push({
            ring: geom.centralBand,
            fill: geom.centralShadowKind === "antumbra" ? SOLAR_ECLIPSE_ANTUMBRA_FILL : SOLAR_ECLIPSE_UMBRA_FILL,
          });
        }
        if (presentation.showCentralLine && geom.centerline.length >= 2) {
          strokes.push({
            points: geom.centerline,
            stroke: SOLAR_ECLIPSE_CENTERLINE_STROKE,
            strokeWidthPx: SOLAR_ECLIPSE_CENTERLINE_WIDTH_PX,
          });
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
