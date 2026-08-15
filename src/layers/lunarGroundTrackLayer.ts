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
  getOverlayReadabilityFrameOrCompute,
} from "../core/overlayReadabilityFrame";
import {
  DEFAULT_LUNAR_GROUND_TRACK_FUTURE_HOURS,
  DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS,
  normalizeLunarGroundTrackExtentHours,
  sampleLunarGroundTrack,
} from "../core/lunarGroundTrack";
import {
  DEFAULT_LUNAR_GROUND_TRACK_FUTURE_COLOR,
  DEFAULT_LUNAR_GROUND_TRACK_PAST_COLOR,
  normalizeLunarGroundTrackStrokeCss,
} from "../core/lunarGroundTrackAppearance";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { LUNAR_GROUND_TRACK_KIND, type LunarGroundTrackPayload } from "./lunarGroundTrackPayload";

export const LUNAR_GROUND_TRACK_LAYER_ID = "layer.lunarGroundTrack.sublunar";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Time-windowed sublunar ground track. Sampling uses {@link sampleLunarGroundTrack}
 * and {@link TimeContext.now} only — no wall clock.
 */
export function createLunarGroundTrackLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    pastHours?: number;
    futureHours?: number;
    pastColor?: string;
    futureColor?: string;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const pastHours = normalizeLunarGroundTrackExtentHours(
    options.pastHours ?? DEFAULT_LUNAR_GROUND_TRACK_PAST_HOURS,
  );
  const futureHours = normalizeLunarGroundTrackExtentHours(
    options.futureHours ?? DEFAULT_LUNAR_GROUND_TRACK_FUTURE_HOURS,
  );
  const pastColor = normalizeLunarGroundTrackStrokeCss(
    options.pastColor ?? DEFAULT_LUNAR_GROUND_TRACK_PAST_COLOR,
  );
  const futureColor = normalizeLunarGroundTrackStrokeCss(
    options.futureColor ?? DEFAULT_LUNAR_GROUND_TRACK_FUTURE_COLOR,
  );
  return {
    id: LUNAR_GROUND_TRACK_LAYER_ID,
    name: "Lunar ground track",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const geom = sampleLunarGroundTrack(time.now, pastHours, futureHours);
      const frame = getOverlayReadabilityFrameOrCompute(time);
      const data: LunarGroundTrackPayload = {
        kind: LUNAR_GROUND_TRACK_KIND,
        past: geom.past,
        current: geom.current,
        future: geom.future,
        ticks: geom.ticks,
        pastColor,
        futureColor,
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
