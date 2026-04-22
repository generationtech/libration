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
import { SUBSOLAR_MARKER_KIND, type SubsolarMarkerPayload } from "./subsolarMarkerPayload";

const SUBSOLAR_MARKER_ID = "layer.points.subsolar";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Current subsolar point as a single equirectangular marker (no live data).
 * Uses the same {@link subsolarPoint} model as solar shading.
 */
export function createSubsolarMarkerLayer(
  options: { zIndex?: number; opacity?: number } = {},
): Layer {
  const zIndex = options.zIndex ?? 15;
  const op = options.opacity ?? 1;
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
      const data: SubsolarMarkerPayload = {
        kind: SUBSOLAR_MARKER_KIND,
        latDeg,
        lonDeg,
      };
      return {
        visible: true,
        opacity: op,
        data,
      };
    },
  };
}
