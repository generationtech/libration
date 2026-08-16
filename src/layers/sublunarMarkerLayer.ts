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
import { opticalLunarLibration } from "../core/lunarOpticalLibration";
import {
  apparentLunarNorthPositionAngleDeg,
  unwrapAngleDeg,
} from "../core/lunarObserverOrientation";
import type { ReferenceCityObserverLocation } from "../core/referenceCityObserver";
import { sublunarPoint } from "../core/sublunarPoint";
import {
  applySceneOverlayReadabilityPresentationToFrame,
  getOverlayReadabilityFrameOrCompute,
} from "../core/overlayReadabilityFrame";
import type { SceneOverlayReadabilityPresentationConfig } from "../config/v2/sceneConfig";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import { SUBLUNAR_MARKER_KIND, type EarthShadowOverlayAppearance, type SublunarMarkerPayload } from "./sublunarMarkerPayload";
import {
  DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  normalizeSublunarMarkerAppearance,
  type SublunarMarkerAppearance,
} from "../core/sublunarMarkerAppearance";
import { resolveEclipseFrame } from "../core/eclipse/eclipseEventService";

const SUBLUNAR_MARKER_ID = "layer.points.sublunar";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

/**
 * Current sub-lunar point as a single equirectangular marker (no live data).
 * Uses {@link sublunarPoint} and {@link opticalLunarLibration} in core; shading remains solar-only.
 */
export function createSublunarMarkerLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    appearance?: SublunarMarkerAppearance;
    /** Catalog observer from chrome `fixedCity`; null → map-oriented fallback. */
    observer?: ReferenceCityObserverLocation | null;
    /** Optional pilot: extra veil/lift pass for this marker only (after global presentation). */
    sublunarMarkerReadabilityPresentation?: SceneOverlayReadabilityPresentationConfig;
    /** When true, attach Earth-shadow overlay numbers from the active lunar eclipse. */
    earthShadowEnabled?: boolean;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const appearance = normalizeSublunarMarkerAppearance(
    options.appearance ?? DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  );
  const observer = options.observer ?? null;
  const sublunarMarkerReadabilityPresentation = options.sublunarMarkerReadabilityPresentation;
  const earthShadowEnabled = options.earthShadowEnabled === true;
  let previousOrientationDeg: number | undefined;
  return {
    id: SUBLUNAR_MARKER_ID,
    name: "Sub-lunar point",
    enabled: true,
    /** Above subsolar (15) so both stay readable. */
    zIndex,
    type: "points",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const { latDeg, lonDeg } = sublunarPoint(time.now);
      const phase = approximateLunarPhase(time.now);
      const libration = opticalLunarLibration(time.now);
      const useObserver =
        appearance.librationOrientation === "observer" &&
        appearance.librationUseReferenceCity &&
        observer !== null;
      let librationOrientationDeg = 0;
      if (useObserver) {
        const raw = apparentLunarNorthPositionAngleDeg(
          time.now,
          observer.latitudeDeg,
          observer.longitudeDeg,
        );
        librationOrientationDeg = unwrapAngleDeg(previousOrientationDeg, raw);
        previousOrientationDeg = librationOrientationDeg;
      } else {
        previousOrientationDeg = undefined;
      }
      let frame = getOverlayReadabilityFrameOrCompute(time);
      if (sublunarMarkerReadabilityPresentation) {
        frame = applySceneOverlayReadabilityPresentationToFrame(frame, sublunarMarkerReadabilityPresentation);
      }
      const data: SublunarMarkerPayload = {
        kind: SUBLUNAR_MARKER_KIND,
        latDeg,
        lonDeg,
        illuminatedFraction: phase.illuminatedFraction,
        geocentricElongationDeg: phase.geocentricElongationDeg,
        waxing: phase.waxing,
        librationLongitudeDeg: libration.longitudeDeg,
        librationLatitudeDeg: libration.latitudeDeg,
        librationOrientationDeg,
        appearance,
        readability: {
          nightVeil01: frame.readabilityVeil01At(latDeg, lonDeg),
          overlayReadabilityLiftScale01: frame.substrateOverlayReadabilityLiftScale01,
        },
        ...(earthShadowEnabled ? earthShadowOverlayFromTime(time) : {}),
      };
      return {
        visible: true,
        opacity: op,
        data,
      };
    },
  };
}

function earthShadowOverlayFromTime(
  time: TimeContext,
): { earthShadowOverlay: EarthShadowOverlayAppearance } | Record<string, never> {
  const eclipseFrame = time.eclipseFrame ?? resolveEclipseFrame(time.now, { horizonMs: 0 });
  const geom = eclipseFrame.lunarGeometry;
  if (!eclipseFrame.support.supported || !eclipseFrame.activeLunar || !geom || geom.phase === "none") {
    return {};
  }
  return {
    earthShadowOverlay: {
      offsetEastMoonRadii: geom.shadowOffsetEastMoonRadii,
      offsetNorthMoonRadii: geom.shadowOffsetNorthMoonRadii,
      outerRadiusMoonRadii: geom.penumbraRadiusMoonRadii,
      innerRadiusMoonRadii: geom.phase === "penumbral" ? 0 : geom.umbraRadiusMoonRadii,
      innerCoversDisc: geom.phase === "total-umbral",
    },
  };
}
