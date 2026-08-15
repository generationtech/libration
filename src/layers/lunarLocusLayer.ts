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
import { interpolateLunarLocusPolyline, sampleLunarLocus } from "../core/lunarLocus";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { LUNAR_LOCUS_KIND, type LunarLocusPayload } from "./lunarLocusPayload";
import {
  DEFAULT_ASTRONOMY_PATH_THICKNESS,
  normalizeAstronomyPathColorCss,
  normalizeAstronomyPathThicknessId,
  type AstronomyPathThicknessId,
} from "../core/astronomyOverlayStrokeAppearance";
import { DEFAULT_LUNAR_LOCUS_STROKE_RGB } from "../core/lunarLocus";
import {
  DEFAULT_SUBLUNAR_MARKER_SIZE,
  normalizeSublunarMarkerSizeId,
  type SublunarMarkerSizeId,
} from "../core/sublunarMarkerAppearance";

export const LUNAR_LOCUS_LAYER_ID = "layer.lunarLocus.sublunar";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Compact lunar locus. Sampling uses {@link sampleLunarLocus} and {@link TimeContext.now} only.
 */
export function createLunarLocusLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    strokeColor?: string;
    strokeThickness?: AstronomyPathThicknessId;
    moonSize?: SublunarMarkerSizeId;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const strokeColor = normalizeAstronomyPathColorCss(options.strokeColor, DEFAULT_LUNAR_LOCUS_STROKE_RGB);
  const strokeThickness = normalizeAstronomyPathThicknessId(
    options.strokeThickness ?? DEFAULT_ASTRONOMY_PATH_THICKNESS,
  );
  const moonSize = normalizeSublunarMarkerSizeId(options.moonSize ?? DEFAULT_SUBLUNAR_MARKER_SIZE);
  return {
    id: LUNAR_LOCUS_LAYER_ID,
    name: "Lunar locus",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const geom = sampleLunarLocus(time.now);
      const frame = getOverlayReadabilityFrameOrCompute(time);
      const data: LunarLocusPayload = {
        kind: LUNAR_LOCUS_KIND,
        points: interpolateLunarLocusPolyline(geom),
        strokeColor,
        strokeThickness,
        moonSize,
        readability: {
          nightVeil01: frame.globalReadabilityVeil01,
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
