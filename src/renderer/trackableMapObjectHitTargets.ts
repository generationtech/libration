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

/**
 * Per-frame trackable hit targets from the same layer payloads the Canvas
 * backend paints. Application code owns the selection transition; this module
 * only exposes rendered glyph geometry as semantic hit targets.
 */

import type { SceneCamera } from "../core/sceneCamera";
import type { SceneReferenceFrame } from "../core/sceneReferenceFrame";
import {
  collectWrappedPointGlyphCopies,
  hitTargetsFromGlyphCopies,
  type TrackableMapObjectHitTarget,
} from "../core/trackableMapObjectHit";
import { DEFAULT_SUBLUNAR_MARKER_APPEARANCE, sublunarMarkerRadiusPx } from "../core/sublunarMarkerAppearance";
import { isDynamicTracksPayload } from "../layers/dynamicTracksPayload";
import { isSubsolarMarkerPayload } from "../layers/subsolarMarkerPayload";
import { isSublunarMarkerPayload } from "../layers/sublunarMarkerPayload";
import { cityTrackableMapObjectId, milkyWayPointTrackableMapObjectId, planetTrackableMapObjectId } from "../core/trackableMapObject";
import { cityPinDiscRadiusPx } from "../layers/cityPinsPayload";
import { isCityPinsPayload } from "../layers/cityPinsPayload";
import { isMilkyWayPayload } from "../layers/milkyWayPayload";
import { isPlanetaryObjectsPayload } from "../layers/planetaryObjectsPayload";
import { planetaryCurrentGlyphRadiusPx } from "../core/planetaryObjectsPresentation";
import type { RenderableLayerState } from "./types";
import {
  collectIssCurrentGlyphCopies,
} from "./renderPlan/sceneDynamicTracksPlan";
import { milkyWayPointGlyphRadiusPx } from "./renderPlan/milkyWayPlan";
import { subsolarMarkerRadiusPx } from "./renderPlan/sceneSubsolarSublunarMarkersPlan";

export function collectTrackableMapObjectHitTargets(options: {
  layers: readonly RenderableLayerState[];
  viewportWidthPx: number;
  viewportHeightPx: number;
  camera: SceneCamera;
  frame: SceneReferenceFrame;
}): TrackableMapObjectHitTarget[] {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return [];
  }
  const hits: TrackableMapObjectHitTarget[] = [];
  for (const layer of options.layers) {
    if (layer.visible === false) {
      continue;
    }
    const data = layer.data;
    if (isSublunarMarkerPayload(data)) {
      const r = sublunarMarkerRadiusPx(
        w,
        data.appearance?.size ?? DEFAULT_SUBLUNAR_MARKER_APPEARANCE.size,
      );
      hits.push(
        ...hitTargetsFromGlyphCopies(
          "moon",
          collectWrappedPointGlyphCopies({
            lonDeg: data.lonDeg,
            latDeg: data.latDeg,
            viewportWidthPx: w,
            viewportHeightPx: h,
            camera: options.camera,
            frame: options.frame,
            renderedRadiusPx: r,
            xClipRadiusMultiple: 4,
          }),
          w,
          h,
        ),
      );
      continue;
    }
    if (isSubsolarMarkerPayload(data)) {
      const r = subsolarMarkerRadiusPx(w);
      hits.push(
        ...hitTargetsFromGlyphCopies(
          "sun",
          collectWrappedPointGlyphCopies({
            lonDeg: data.lonDeg,
            latDeg: data.latDeg,
            viewportWidthPx: w,
            viewportHeightPx: h,
            camera: options.camera,
            frame: options.frame,
            renderedRadiusPx: r,
            xClipRadiusMultiple: 4,
          }),
          w,
          h,
        ),
      );
      continue;
    }
    if (isDynamicTracksPayload(data)) {
      hits.push(
        ...hitTargetsFromGlyphCopies(
          "iss",
          collectIssCurrentGlyphCopies({
            viewportWidthPx: w,
            viewportHeightPx: h,
            camera: options.camera,
            frame: options.frame,
            payload: data,
          }),
          w,
          h,
        ),
      );
      continue;
    }
    if (isCityPinsPayload(data)) {
      const r = cityPinDiscRadiusPx(w, data.scale);
      for (const city of data.cities) {
        if (city.id.length === 0 || !Number.isFinite(city.lonDeg) || !Number.isFinite(city.latDeg)) {
          continue;
        }
        hits.push(
          ...hitTargetsFromGlyphCopies(
            cityTrackableMapObjectId(city.id),
            collectWrappedPointGlyphCopies({
              lonDeg: city.lonDeg,
              latDeg: city.latDeg,
              viewportWidthPx: w,
              viewportHeightPx: h,
              camera: options.camera,
              frame: options.frame,
              renderedRadiusPx: r,
              xClipRadiusMultiple: 8,
            }),
            w,
            h,
          ),
        );
      }
      continue;
    }
    if (isPlanetaryObjectsPayload(data)) {
      const r = planetaryCurrentGlyphRadiusPx(w, data.presentation.glyphSize);
      for (const body of data.bodies) {
        if (!body.showCurrent || body.current === null) {
          continue;
        }
        if (!Number.isFinite(body.current.lonDeg) || !Number.isFinite(body.current.latDeg)) {
          continue;
        }
        hits.push(
          ...hitTargetsFromGlyphCopies(
            planetTrackableMapObjectId(body.id),
            collectWrappedPointGlyphCopies({
              lonDeg: body.current.lonDeg,
              latDeg: body.current.latDeg,
              viewportWidthPx: w,
              viewportHeightPx: h,
              camera: options.camera,
              frame: options.frame,
              renderedRadiusPx: r,
              xClipRadiusMultiple: 4,
            }),
            w,
            h,
          ),
        );
      }
      continue;
    }
    if (!isMilkyWayPayload(data) || !data.supported || data.geometry === null) {
      continue;
    }
    const geom = data.geometry;
    const pres = data.presentation;
    if (
      pres.galacticCenterEnabled &&
      geom.galacticCenter &&
      Number.isFinite(geom.galacticCenter.lonDeg) &&
      Number.isFinite(geom.galacticCenter.latDeg)
    ) {
      hits.push(
        ...hitTargetsFromGlyphCopies(
          milkyWayPointTrackableMapObjectId("galacticCenter"),
          collectWrappedPointGlyphCopies({
            lonDeg: geom.galacticCenter.lonDeg,
            latDeg: geom.galacticCenter.latDeg,
            viewportWidthPx: w,
            viewportHeightPx: h,
            camera: options.camera,
            frame: options.frame,
            renderedRadiusPx: milkyWayPointGlyphRadiusPx(w, "center"),
            xClipRadiusMultiple: 4,
          }),
          w,
          h,
        ),
      );
    }
    if (
      pres.galacticAnticenterEnabled &&
      geom.galacticAnticenter &&
      Number.isFinite(geom.galacticAnticenter.lonDeg) &&
      Number.isFinite(geom.galacticAnticenter.latDeg)
    ) {
      hits.push(
        ...hitTargetsFromGlyphCopies(
          milkyWayPointTrackableMapObjectId("galacticAnticenter"),
          collectWrappedPointGlyphCopies({
            lonDeg: geom.galacticAnticenter.lonDeg,
            latDeg: geom.galacticAnticenter.latDeg,
            viewportWidthPx: w,
            viewportHeightPx: h,
            camera: options.camera,
            frame: options.frame,
            renderedRadiusPx: milkyWayPointGlyphRadiusPx(w, "anticenter"),
            xClipRadiusMultiple: 4,
          }),
          w,
          h,
        ),
      );
    }
  }
  return hits;
}
