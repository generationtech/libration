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

import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECTANGULAR_RASTER_KIND,
  type EquirectangularRasterPayload,
} from "./rasterPayload";

const BASE_MAP_ID = "layer.baseMap.world";

/** Served from `public/maps/` (Vite root URL). */
export const WORLD_EQUIRECTANGULAR_SRC = "/maps/world-equirectangular.jpg";

const updatePolicy: UpdatePolicy = { type: "onDemand" };

/**
 * Static equirectangular world map base layer (no live data).
 */
export function createBaseMapLayer(): Layer {
  return {
    id: BASE_MAP_ID,
    name: "World map (base)",
    enabled: true,
    zIndex: 0,
    type: "raster",
    updatePolicy,
    getState(_time: TimeContext): LayerState {
      const data: EquirectangularRasterPayload = {
        kind: EQUIRECTANGULAR_RASTER_KIND,
        src: WORLD_EQUIRECTANGULAR_SRC,
      };
      return {
        visible: true,
        opacity: 1,
        data,
      };
    },
  };
}
