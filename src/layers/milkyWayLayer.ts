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
import { isPlanetaryEphemerisSupportedUtc } from "../core/planetaryEphemeris";
import { sampleMilkyWayGeometry } from "../core/milkyWayGeometry";
import {
  DEFAULT_MILKY_WAY_PRESENTATION,
  milkyWayEnabledContourAltitudesDeg,
  normalizeMilkyWayPresentation,
  type MilkyWayPresentation,
} from "../core/milkyWayPresentation";
import { sampleMilkyWayVisibilityContours } from "../core/milkyWayVisibilityGeometry";
import { getOverlayReadabilityFrameOrCompute } from "../core/overlayReadabilityFrame";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { MILKY_WAY_KIND, type MilkyWayPayload } from "./milkyWayPayload";

export const MILKY_WAY_LAYER_ID = "layer.milkyWay.derived";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Extended celestial structure: Galactic plane / approximate Milky Way band as
 * terrestrial zenith projections at {@link TimeContext.now}. Not a point object.
 */
export function createMilkyWayLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    presentation?: MilkyWayPresentation;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const presentation = normalizeMilkyWayPresentation(
    options.presentation ?? DEFAULT_MILKY_WAY_PRESENTATION,
  );
  return {
    id: MILKY_WAY_LAYER_ID,
    name: "Milky Way",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const frame = getOverlayReadabilityFrameOrCompute(time);
      const supported = isPlanetaryEphemerisSupportedUtc(time.now);
      const contourAlts = milkyWayEnabledContourAltitudesDeg(presentation);
      const needsVisibility = presentation.visibilityContoursEnabled && contourAlts.length > 0;
      const needsRibbon =
        presentation.planeEnabled ||
        presentation.bandEnabled ||
        presentation.ribsEnabled ||
        presentation.galacticCenterEnabled ||
        presentation.galacticAnticenterEnabled;
      const geometry =
        supported && (needsRibbon || needsVisibility)
          ? sampleMilkyWayGeometry(time.now, presentation.bandWidth, {
              tagNight: presentation.emphasizeNightSide,
            })
          : null;
      const visibility =
        supported && needsVisibility && geometry?.galacticCenter
          ? sampleMilkyWayVisibilityContours(time.now, geometry.galacticCenter, contourAlts, {
              tagSun: presentation.emphasizeAstronomicalNight,
              tagMoon: presentation.deemphasizeMoonlight,
              lunarGeometry: time.eclipseFrame?.lunarGeometry,
            })
          : null;
      const data: MilkyWayPayload = {
        kind: MILKY_WAY_KIND,
        supported,
        presentation,
        geometry,
        visibility,
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
