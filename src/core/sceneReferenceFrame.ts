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
 * Scene/map reference frame: the coordinate frame in which world state is
 * presented to projection.
 *
 * Distinct from:
 * - canonical physical/geographic coordinates (entity state, astronomy)
 * - projected coordinates (`equirectangularProjection`)
 * - camera/view coordinates (`SceneCamera`)
 * - civil/display time reference (IANA zone, reference city)
 *
 * Earth-fixed identity is the only active production frame (LIB-082).
 * Moon-fixed / Sun-fixed / generic entity-fixed are not implemented here.
 * Latitude-relative frame behaviour is intentionally deferred.
 *
 * Frame-relative coordinates are derived presentation state. Canonical
 * entity lon/lat must not be overwritten to fake a moving map.
 */

import { relativeLongitudeFromContinuousAnchorDeg } from "./longitudeContinuity";

export type SceneReferenceFrameKind = "earthFixed";

export type EarthFixedSceneReferenceFrame = {
  readonly kind: "earthFixed";
};

/**
 * Active production frames. Additional kinds belong to a later work item;
 * do not add Moon/Sun cases here.
 */
export type SceneReferenceFrame = EarthFixedSceneReferenceFrame;

export const EARTH_FIXED_SCENE_REFERENCE_FRAME: EarthFixedSceneReferenceFrame = {
  kind: "earthFixed",
};

export function isEarthFixedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is EarthFixedSceneReferenceFrame {
  return frame.kind === "earthFixed";
}

export function isIdentitySceneReferenceFrame(frame: SceneReferenceFrame): boolean {
  return isEarthFixedSceneReferenceFrame(frame);
}

/** Canonical geographic position. Authoritative physical/astronomical state. */
export type CanonicalLonLat = {
  readonly lonDeg: number;
  readonly latDeg: number;
};

/**
 * Scene-frame geographic position consumed by projection.
 * Derived presentation state — not a mutation of {@link CanonicalLonLat}.
 */
export type SceneFrameLonLat = {
  readonly sceneLonDeg: number;
  readonly sceneLatDeg: number;
};

/**
 * Canonical geographic coordinates → scene-frame coordinates.
 *
 * Earth-fixed is exact identity (same numbers, no canonical wrap) so LIB-081
 * mapping is unchanged. Future frames may depend on time and an anchor
 * without changing {@link SceneCamera}.
 */
export function canonicalLonLatToSceneFrame(
  canonical: CanonicalLonLat,
  frame: SceneReferenceFrame,
): SceneFrameLonLat {
  switch (frame.kind) {
    case "earthFixed":
      return {
        sceneLonDeg: canonical.lonDeg,
        sceneLatDeg: canonical.latDeg,
      };
  }
}

/**
 * Scene-frame coordinates → canonical geographic coordinates.
 * Earth-fixed is exact identity.
 */
export function sceneFrameLonLatToCanonical(
  scene: SceneFrameLonLat,
  frame: SceneReferenceFrame,
): CanonicalLonLat {
  switch (frame.kind) {
    case "earthFixed":
      return {
        lonDeg: scene.sceneLonDeg,
        latDeg: scene.sceneLatDeg,
      };
  }
}

/**
 * Test/future seam: longitude of a relative-longitude (entity-fixed) frame.
 * Not a production {@link SceneReferenceFrame} kind.
 *
 * `sceneLon = nearestEquivalent(canonicalLon, continuousAnchorLon) − continuousAnchorLon`
 *
 * Latitude is passed through unchanged. Subtracting anchor latitude is
 * intentionally not decided here.
 */
export function relativeLongitudeSceneFrameLonLat(
  canonical: CanonicalLonLat,
  continuousAnchorLonDeg: number,
): SceneFrameLonLat {
  return {
    sceneLonDeg: relativeLongitudeFromContinuousAnchorDeg(
      canonical.lonDeg,
      continuousAnchorLonDeg,
    ),
    sceneLatDeg: canonical.latDeg,
  };
}
