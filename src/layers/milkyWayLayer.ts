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
import { resolveMilkyWayEventMapLabel, resolvePresentedMilkyWayWindow } from "../core/milkyWayEventLabel";
import { milkyWayViewingFootprint } from "../core/milkyWayViewingFootprint";
import {
  DEFAULT_MILKY_WAY_PRESENTATION,
  milkyWayEnabledContourAltitudesDeg,
  normalizeMilkyWayPresentation,
  type MilkyWayPresentation,
} from "../core/milkyWayPresentation";
import { sampleMilkyWayVisibilityContours } from "../core/milkyWayVisibilityGeometry";
import type { MilkyWayViewingObserver } from "../core/milkyWayViewingWindows";
import { getOverlayReadabilityFrameOrCompute } from "../core/overlayReadabilityFrame";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { MILKY_WAY_KIND, type MilkyWayAvoidCityLabel, type MilkyWayPayload } from "./milkyWayPayload";

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
    observer?: MilkyWayViewingObserver | null;
    cityName?: string;
    timeZone?: string;
    cityLabelHints?: readonly MilkyWayAvoidCityLabel[];
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const presentation = normalizeMilkyWayPresentation(
    options.presentation ?? DEFAULT_MILKY_WAY_PRESENTATION,
  );
  const observer = options.observer ?? null;
  const cityName = options.cityName ?? "";
  const timeZone = options.timeZone ?? "UTC";
  const cityLabelHints = options.cityLabelHints ?? [];
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
      const eventLabel =
        supported
          ? resolveMilkyWayEventMapLabel({
              presentation,
              observer,
              cityName,
              productUtcMs: time.now,
              timeZone,
            })
          : null;
      const presentedWindow =
        supported && presentation.viewingEventsEnabled && presentation.showViewingFootprint
          ? resolvePresentedMilkyWayWindow({
              presentation,
              observer,
              productUtcMs: time.now,
            })
          : null;
      const viewingFootprintRings =
        presentedWindow !== null
          ? milkyWayViewingFootprint(presentedWindow.window).rings
          : null;
      const geometry =
        supported && (needsRibbon || needsVisibility || eventLabel !== null || (viewingFootprintRings?.length ?? 0) > 0)
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
        eventLabel,
        viewingFootprintRings,
        ...(cityLabelHints.length > 0 ? { labelAvoidCityLabels: cityLabelHints } : {}),
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
