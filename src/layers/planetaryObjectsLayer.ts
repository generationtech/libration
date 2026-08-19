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
import { PLANETARY_BODY_IDS, PLANETARY_BODY_METADATA } from "../core/planetaryBodies";
import { isPlanetaryEphemerisSupportedUtc } from "../core/planetaryEphemeris";
import { samplePlanetaryGroundTrack } from "../core/planetaryGroundTrack";
import { samplePlanetaryLocus } from "../core/planetaryLocus";
import {
  DEFAULT_PLANETARY_OBJECTS_PRESENTATION,
  normalizePlanetaryObjectsPresentation,
  planetaryGroundTrackHorizonHours,
  type PlanetaryObjectsPresentation,
} from "../core/planetaryObjectsPresentation";
import { planetarySubpoint } from "../core/planetarySubpoint";
import { getOverlayReadabilityFrameOrCompute } from "../core/overlayReadabilityFrame";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  PLANETARY_OBJECTS_KIND,
  type PlanetaryBodyRuntime,
  type PlanetaryObjectsPayload,
} from "./planetaryObjectsPayload";

export const PLANETARY_OBJECTS_LAYER_ID = "layer.planetaryObjects.derived";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Mercury–Neptune plus Pluto as terrestrial sub-object points, optional ground
 * tracks, and daily same-time loci. Uses {@link TimeContext.now} only.
 */
export function createPlanetaryObjectsLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    presentation?: PlanetaryObjectsPresentation;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const presentation = normalizePlanetaryObjectsPresentation(
    options.presentation ?? DEFAULT_PLANETARY_OBJECTS_PRESENTATION,
  );
  return {
    id: PLANETARY_OBJECTS_LAYER_ID,
    name: "Planets",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const frame = getOverlayReadabilityFrameOrCompute(time);
      const supported = isPlanetaryEphemerisSupportedUtc(time.now);
      const bodies: PlanetaryBodyRuntime[] = [];
      if (supported) {
        const pastHours = presentation.groundTracks.pastEnabled
          ? planetaryGroundTrackHorizonHours(presentation.groundTracks.pastHorizon)
          : 0;
        const futureHours = presentation.groundTracks.futureEnabled
          ? planetaryGroundTrackHorizonHours(presentation.groundTracks.futureHorizon)
          : 0;
        for (const id of PLANETARY_BODY_IDS) {
          const bodyPres = presentation.bodies[id];
          if (!bodyPres.enabled) {
            continue;
          }
          const showTrack = presentation.groundTracks.enabled;
          const showLocus = bodyPres.locusEnabled;
          const current = planetarySubpoint(id, time.now);
          const track = showTrack
            ? samplePlanetaryGroundTrack(id, time.now, pastHours, futureHours)
            : null;
          const locus = showLocus
            ? samplePlanetaryLocus(id, time.now, presentation.loci.duration)
            : null;
          bodies.push({
            id,
            displayName: PLANETARY_BODY_METADATA[id].displayName,
            color: bodyPres.color,
            current: current ?? track?.current ?? null,
            trackPast: showTrack && track ? track.past : [],
            trackFuture: showTrack && track ? track.future : [],
            locus: showLocus && locus ? locus.points : [],
            showCurrent: presentation.currentSubpointsEnabled && current !== null,
            showLabel:
              presentation.labelsEnabled &&
              presentation.currentSubpointsEnabled &&
              current !== null,
            showTrack,
            showLocus,
          });
        }
      }
      const data: PlanetaryObjectsPayload = {
        kind: PLANETARY_OBJECTS_KIND,
        supported,
        presentation,
        bodies,
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
