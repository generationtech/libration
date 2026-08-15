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

export const LUNAR_LOCUS_LAYER_ID = "layer.lunarLocus.sublunar";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Compact lunar locus. Sampling uses {@link sampleLunarLocus} and {@link TimeContext.now} only.
 */
export function createLunarLocusLayer(
  options: {
    zIndex?: number;
    opacity?: number;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
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
