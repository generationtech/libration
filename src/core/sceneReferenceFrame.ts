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
 * Production kinds (LIB-083):
 * - `earthFixed` — identity; default
 * - `moonAnchored` with longitude locked and latitude identity
 *
 * Frame-relative coordinates are derived presentation state. Canonical
 * entity lon/lat must not be overwritten to fake a moving map.
 *
 * Sign convention for Moon longitude-lock:
 *   sceneLon = nearestEquivalent(canonicalLon, λMoon_continuous) − λMoon_continuous
 * Positive scene longitude is east of the Moon. The Moon itself maps to 0°.
 * Latitude is identity: sceneLat = canonicalLat.
 */

import { mapXFromLongitudeDeg } from "./equirectangularProjection";
import {
  canonicalLongitudeDeg,
  relativeLongitudeFromContinuousAnchorDeg,
} from "./longitudeContinuity";

export type SceneReferenceFrameKind = "earthFixed" | "moonAnchored";

export type EarthFixedSceneReferenceFrame = {
  readonly kind: "earthFixed";
};

/**
 * Moon-anchored scene frame (LIB-083). Longitude is locked to a continuous
 * lunar subpoint; latitude remains physical. `latitudeLocked` is reserved for
 * a later position-lock slice and is `false` here.
 */
export type MoonLongitudeLockedSceneReferenceFrame = {
  readonly kind: "moonAnchored";
  readonly longitudeLocked: true;
  readonly latitudeLocked: false;
  /**
   * Continuous / unwrapped lunar geographic longitude (degrees east).
   * May leave (−180, 180]. Do not canonicalize this value per frame.
   */
  readonly continuousAnchorLonDeg: number;
};

export type SceneReferenceFrame =
  | EarthFixedSceneReferenceFrame
  | MoonLongitudeLockedSceneReferenceFrame;

export const EARTH_FIXED_SCENE_REFERENCE_FRAME: EarthFixedSceneReferenceFrame = {
  kind: "earthFixed",
};

export function moonLongitudeLockedSceneReferenceFrame(
  continuousAnchorLonDeg: number,
): MoonLongitudeLockedSceneReferenceFrame {
  return {
    kind: "moonAnchored",
    longitudeLocked: true,
    latitudeLocked: false,
    continuousAnchorLonDeg: Number.isFinite(continuousAnchorLonDeg)
      ? continuousAnchorLonDeg
      : 0,
  };
}

export function isEarthFixedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is EarthFixedSceneReferenceFrame {
  return frame.kind === "earthFixed";
}

export function isMoonLongitudeLockedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is MoonLongitudeLockedSceneReferenceFrame {
  return (
    frame.kind === "moonAnchored" &&
    frame.longitudeLocked === true &&
    frame.latitudeLocked === false
  );
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
 * mapping is unchanged. Moon longitude-lock subtracts the continuous lunar
 * anchor from longitude and leaves latitude unchanged.
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
    case "moonAnchored":
      return {
        sceneLonDeg: relativeLongitudeFromContinuousAnchorDeg(
          canonical.lonDeg,
          frame.continuousAnchorLonDeg,
        ),
        sceneLatDeg: canonical.latDeg,
      };
  }
}

/**
 * Scene-frame coordinates → canonical geographic coordinates.
 * Earth-fixed is exact identity. Moon longitude-lock adds the continuous
 * anchor and canonicalizes longitude for geographic use. Latitude is identity.
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
    case "moonAnchored":
      return {
        lonDeg: canonicalLongitudeDeg(scene.sceneLonDeg + frame.continuousAnchorLonDeg),
        latDeg: scene.sceneLatDeg,
      };
  }
}

/**
 * Scene-frame longitude of a canonical meridian. Earth-fixed returns the
 * input unchanged (no wrap).
 */
export function sceneFrameLongitudeDeg(
  canonicalLonDeg: number,
  frame: SceneReferenceFrame,
): number {
  if (isIdentitySceneReferenceFrame(frame)) {
    return canonicalLonDeg;
  }
  return canonicalLonLatToSceneFrame({ lonDeg: canonicalLonDeg, latDeg: 0 }, frame)
    .sceneLonDeg;
}

/**
 * Map a path of canonical longitudes into scene-frame longitudes, preserving
 * order. Callers then unwrap with the existing short-arc seam helpers.
 */
export function sceneFrameLongitudesDeg(
  canonicalLons: readonly number[],
  frame: SceneReferenceFrame,
): number[] {
  if (isIdentitySceneReferenceFrame(frame)) {
    return canonicalLons.slice();
  }
  return canonicalLons.map((lonDeg) => sceneFrameLongitudeDeg(lonDeg, frame));
}

/**
 * Identity-world X origin of the canonical Earth raster under this frame.
 *
 * Longitude-only frames shift the equirectangular strip by
 * `−continuousAnchorLon / 360 × width` so the image stays registered with
 * vector geography without resampling. Earth-fixed is 0.
 *
 * Uses the continuous anchor, not nearest-equivalent of a sample meridian,
 * so the dest does not jump 360° at the lunar antimeridian.
 */
export function sceneFrameRasterIdentityOriginX(
  widthPx: number,
  frame: SceneReferenceFrame,
): number {
  if (isEarthFixedSceneReferenceFrame(frame)) {
    return 0;
  }
  if (isMoonLongitudeLockedSceneReferenceFrame(frame)) {
    return (
      mapXFromLongitudeDeg(-frame.continuousAnchorLonDeg, widthPx) -
      mapXFromLongitudeDeg(0, widthPx)
    );
  }
  return 0;
}

/**
 * Test/future seam: longitude of a relative-longitude (entity-fixed) frame.
 * Prefer a production {@link SceneReferenceFrame} kind when one exists.
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
