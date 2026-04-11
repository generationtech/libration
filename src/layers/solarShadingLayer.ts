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
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { SOLAR_SHADING_KIND, type SolarShadingPayload } from "./solarShadingPayload";

const SOLAR_SHADING_ID = "layer.solarShading.dayNight";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Solar day/night shading over the equirectangular base map (no live data).
 * State uses current time from {@link TimeContext}.
 */
export function createSolarShadingLayer(): Layer {
  return {
    id: SOLAR_SHADING_ID,
    name: "Solar shading (day/night)",
    enabled: true,
    zIndex: 5,
    type: "illumination",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const { latDeg, lonDeg } = subsolarPoint(time.now);
      const data: SolarShadingPayload = {
        kind: SOLAR_SHADING_KIND,
        subsolarLatDeg: latDeg,
        subsolarLonDeg: lonDeg,
      };
      return {
        visible: true,
        opacity: 1,
        data,
      };
    },
  };
}
