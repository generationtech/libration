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
  applySceneOverlayReadabilityPresentationToFrame,
  getOverlayReadabilityFrameOrCompute,
} from "../core/overlayReadabilityFrame";
import type { SceneOverlayReadabilityPresentationConfig } from "../config/v2/sceneConfig";
import { sampleSolarAnalemmaGroundTrack } from "../core/solarAnalemmaGroundTrack";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECT_POLYLINE_KIND,
  type EquirectangularPolylinePayload,
} from "./equirectPolylinePayload";

const SOLAR_ANALEMMA_LAYER_ID = "layer.solarAnalemma.groundTrack";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

function parseUtcHour(options: { utcHour?: number }): number {
  const h = options.utcHour;
  if (typeof h !== "number" || !Number.isFinite(h)) {
    return 12;
  }
  return Math.max(0, Math.min(23, Math.floor(h)));
}

/**
 * Year-long locus of the subsolar point at a fixed UTC hour each day (ground-track / equation-of-time
 * geometry on the equirect map), using the same sun model as solar shading.
 */
export function createSolarAnalemmaLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    utcHour?: number;
    /** Optional pilot: extra veil/lift pass for the solar analemma only (after global presentation). */
    solarAnalemmaReadabilityPresentation?: SceneOverlayReadabilityPresentationConfig;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const utcHour = parseUtcHour(options);
  const solarAnalemmaReadabilityPresentation = options.solarAnalemmaReadabilityPresentation;
  return {
    id: SOLAR_ANALEMMA_LAYER_ID,
    name: "Solar analemma (ground track)",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const pts = sampleSolarAnalemmaGroundTrack(time.now, utcHour);
      let frame = getOverlayReadabilityFrameOrCompute(time);
      if (solarAnalemmaReadabilityPresentation) {
        frame = applySceneOverlayReadabilityPresentationToFrame(
          frame,
          solarAnalemmaReadabilityPresentation,
        );
      }
      const data: EquirectangularPolylinePayload = {
        kind: EQUIRECT_POLYLINE_KIND,
        points: pts,
        closed: true,
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
