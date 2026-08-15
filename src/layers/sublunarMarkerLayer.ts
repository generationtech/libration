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

import { approximateLunarPhase } from "../core/lunarPhase";
import { opticalLunarLibration } from "../core/lunarOpticalLibration";
import { sublunarPoint } from "../core/sublunarPoint";
import {
  applySceneOverlayReadabilityPresentationToFrame,
  getOverlayReadabilityFrameOrCompute,
} from "../core/overlayReadabilityFrame";
import type { SceneOverlayReadabilityPresentationConfig } from "../config/v2/sceneConfig";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { SUBLUNAR_MARKER_KIND, type SublunarMarkerPayload } from "./sublunarMarkerPayload";
import {
  DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  normalizeSublunarMarkerAppearance,
  type SublunarMarkerAppearance,
} from "../core/sublunarMarkerAppearance";

const SUBLUNAR_MARKER_ID = "layer.points.sublunar";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Current sub-lunar point as a single equirectangular marker (no live data).
 * Uses {@link sublunarPoint} and {@link opticalLunarLibration} in core; shading remains solar-only.
 */
export function createSublunarMarkerLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    appearance?: SublunarMarkerAppearance;
    /** Optional pilot: extra veil/lift pass for this marker only (after global presentation). */
    sublunarMarkerReadabilityPresentation?: SceneOverlayReadabilityPresentationConfig;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const appearance = normalizeSublunarMarkerAppearance(
    options.appearance ?? DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  );
  const sublunarMarkerReadabilityPresentation = options.sublunarMarkerReadabilityPresentation;
  return {
    id: SUBLUNAR_MARKER_ID,
    name: "Sub-lunar point",
    enabled: true,
    /** Above subsolar (15) so both stay readable. */
    zIndex,
    type: "points",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const { latDeg, lonDeg } = sublunarPoint(time.now);
      const phase = approximateLunarPhase(time.now);
      const libration = opticalLunarLibration(time.now);
      let frame = getOverlayReadabilityFrameOrCompute(time);
      if (sublunarMarkerReadabilityPresentation) {
        frame = applySceneOverlayReadabilityPresentationToFrame(frame, sublunarMarkerReadabilityPresentation);
      }
      const data: SublunarMarkerPayload = {
        kind: SUBLUNAR_MARKER_KIND,
        latDeg,
        lonDeg,
        illuminatedFraction: phase.illuminatedFraction,
        geocentricElongationDeg: phase.geocentricElongationDeg,
        waxing: phase.waxing,
        librationLongitudeDeg: libration.longitudeDeg,
        librationLatitudeDeg: libration.latitudeDeg,
        appearance,
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
