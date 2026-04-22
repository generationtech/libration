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
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECT_GRID_KIND,
  type EquirectangularGridPayload,
} from "./equirectGridPayload";

const GRID_ID = "layer.grid.latLon";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Subtle latitude/longitude grid in equirectangular space (no live data).
 */
export function createLatLonGridLayer(
  options: { zIndex?: number; opacity?: number } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  return {
    id: GRID_ID,
    name: "Latitude / longitude grid",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(_time: TimeContext): LayerState {
      const data: EquirectangularGridPayload = {
        kind: EQUIRECT_GRID_KIND,
        meridianStepDeg: 30,
        parallelStepDeg: 30,
      };
      return {
        visible: true,
        opacity: op,
        data,
      };
    },
  };
}
