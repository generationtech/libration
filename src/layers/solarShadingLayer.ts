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

import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { MoonlightPresentationMode } from "../core/moonlightPolicy";
import { approximateLunarPhase } from "../core/lunarPhase";
import { sublunarPoint } from "../core/sublunarPoint";
import { subsolarPoint } from "../core/subsolarPoint";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { SOLAR_SHADING_KIND, type SolarShadingPayload } from "./solarShadingPayload";

const SOLAR_SHADING_ID = "layer.solarShading.dayNight";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Solar day/night shading over the equirectangular base map (no live data).
 * State uses current time from {@link TimeContext}.
 */
export function createSolarShadingLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    /** Defaults to illustrative when omitted (tests / legacy callers). */
    moonlightMode?: MoonlightPresentationMode;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const moonlightMode = options.moonlightMode ?? "illustrative";
  return {
    id: SOLAR_SHADING_ID,
    name: "Solar shading (day/night)",
    enabled: true,
    zIndex,
    type: "illumination",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const { latDeg, lonDeg } = subsolarPoint(time.now);
      const { latDeg: moonLatDeg, lonDeg: moonLonDeg } = sublunarPoint(time.now);
      const phase = approximateLunarPhase(time.now);
      const data: SolarShadingPayload = {
        kind: SOLAR_SHADING_KIND,
        subsolarLatDeg: latDeg,
        subsolarLonDeg: lonDeg,
        sublunarLatDeg: moonLatDeg,
        sublunarLonDeg: moonLonDeg,
        lunarIlluminatedFraction: phase.illuminatedFraction,
        moonlightMode,
      };
      return {
        visible: true,
        opacity: op,
        data,
      };
    },
  };
}
