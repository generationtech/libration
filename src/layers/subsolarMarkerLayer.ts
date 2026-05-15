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

import { subsolarPoint } from "../core/subsolarPoint";
import {
  applySceneOverlayReadabilityPresentationToFrame,
  getOverlayReadabilityFrameOrCompute,
} from "../core/overlayReadabilityFrame";
import type { SceneOverlayReadabilityPresentationConfig } from "../config/v2/sceneConfig";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { SUBSOLAR_MARKER_KIND, type SubsolarMarkerPayload } from "./subsolarMarkerPayload";

const SUBSOLAR_MARKER_ID = "layer.points.subsolar";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Current subsolar point as a single equirectangular marker (no live data).
 * Uses the same {@link subsolarPoint} model as solar shading.
 */
export function createSubsolarMarkerLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    /** Optional pilot: extra veil/lift pass for this marker only (after global presentation). */
    subsolarMarkerReadabilityPresentation?: SceneOverlayReadabilityPresentationConfig;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const subsolarMarkerReadabilityPresentation = options.subsolarMarkerReadabilityPresentation;
  return {
    id: SUBSOLAR_MARKER_ID,
    name: "Subsolar point",
    enabled: true,
    /** Above base map, shading, grid, and city pins. */
    zIndex,
    type: "points",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const { latDeg, lonDeg } = subsolarPoint(time.now);
      let frame = getOverlayReadabilityFrameOrCompute(time);
      if (subsolarMarkerReadabilityPresentation) {
        frame = applySceneOverlayReadabilityPresentationToFrame(frame, subsolarMarkerReadabilityPresentation);
      }
      const data: SubsolarMarkerPayload = {
        kind: SUBSOLAR_MARKER_KIND,
        latDeg,
        lonDeg,
        readability: {
          nightVeil01: frame.readabilityVeil01At(latDeg, lonDeg),
          overlayReadabilityLiftScale01: frame.substrateOverlayReadabilityLiftScale01,
        },
      };
      return {
        visible: true,
        opacity: op,
        data,
      };
    },
  };
}
