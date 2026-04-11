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
import { sublunarPoint } from "../core/sublunarPoint";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { SUBLUNAR_MARKER_KIND, type SublunarMarkerPayload } from "./sublunarMarkerPayload";

const SUBLUNAR_MARKER_ID = "layer.points.sublunar";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Current sub-lunar point as a single equirectangular marker (no live data).
 * Uses {@link sublunarPoint} in core; shading remains solar-only.
 */
export function createSublunarMarkerLayer(): Layer {
  return {
    id: SUBLUNAR_MARKER_ID,
    name: "Sub-lunar point",
    enabled: true,
    /** Above subsolar (15) so both stay readable; below UTC/local clock overlays (20+). */
    zIndex: 16,
    type: "points",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const { latDeg, lonDeg } = sublunarPoint(time.now);
      const phase = approximateLunarPhase(time.now);
      const data: SublunarMarkerPayload = {
        kind: SUBLUNAR_MARKER_KIND,
        latDeg,
        lonDeg,
        illuminatedFraction: phase.illuminatedFraction,
        geocentricElongationDeg: phase.geocentricElongationDeg,
        waxing: phase.waxing,
      };
      return {
        visible: true,
        opacity: 1,
        data,
      };
    },
  };
}
