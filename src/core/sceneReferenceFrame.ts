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
 * Production kinds:
 * - `earthFixed` — identity; default
 * - `moonAnchored` with longitude locked and latitude identity (LIB-083)
 * - `moonAnchored` with longitude and latitude locked (LIB-084 position-lock)
 *
 * Frame-relative coordinates are derived presentation state. Canonical
 * entity lon/lat must not be overwritten to fake a moving map.
 *
 * Sign convention for Moon longitude-lock:
 *   sceneLon = nearestEquivalent(canonicalLon, λMoon_continuous) − λMoon_continuous
 * Positive scene longitude is east of the Moon. The Moon itself maps to 0°.
 *
 * Latitude (LIB-083): identity, `sceneLat = canonicalLat`.
 * Latitude (LIB-084 position-lock): `sceneLat = canonicalLat − moonAnchorLat`.
 * Scene-frame latitude is not periodic and may leave geographic ±90°.
 */

import { mapXFromLongitudeDeg, mapYFromLatitudeDeg } from "./equirectangularProjection";
import {
  canonicalLongitudeDeg,
  relativeLongitudeFromContinuousAnchorDeg,
} from "./longitudeContinuity";

export type SceneReferenceFrameKind = "earthFixed" | "moonAnchored";

export type EarthFixedSceneReferenceFrame = {
  readonly kind: "earthFixed";
};

type MoonAnchoredSceneReferenceFrameBase = {
  readonly kind: "moonAnchored";
  readonly longitudeLocked: true;
  /**
   * Continuous / unwrapped lunar geographic longitude (degrees east).
   * May leave (−180, 180]. Do not canonicalize this value per frame.
   */
  readonly continuousAnchorLonDeg: number;
  /**
   * Geographic sublunar latitude (degrees) for the canonical frame instant.
   * Not wrapped. Used when {@link MoonPositionLockedSceneReferenceFrame.latitudeLocked}
   * is true; stored on longitude-lock as well so the shape stays one kind.
   */
  readonly anchorLatDeg: number;
};

/**
 * Moon-anchored scene frame with longitude locked and latitude identity (LIB-083).
 */
export type MoonLongitudeLockedSceneReferenceFrame = MoonAnchoredSceneReferenceFrameBase & {
  readonly latitudeLocked: false;
};

/**
 * Moon-anchored scene frame with both axes locked (LIB-084). The Moon maps to
 * scene-frame origin (0°, 0°).
 */
export type MoonPositionLockedSceneReferenceFrame = MoonAnchoredSceneReferenceFrameBase & {
  readonly latitudeLocked: true;
};

export type MoonAnchoredSceneReferenceFrame =
  | MoonLongitudeLockedSceneReferenceFrame
  | MoonPositionLockedSceneReferenceFrame;

export type SceneReferenceFrame = EarthFixedSceneReferenceFrame | MoonAnchoredSceneReferenceFrame;

export const EARTH_FIXED_SCENE_REFERENCE_FRAME: EarthFixedSceneReferenceFrame = {
  kind: "earthFixed",
};

function finiteLon(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function geographicLatitudeDeg(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(-90, Math.min(90, value));
}

export function moonLongitudeLockedSceneReferenceFrame(
  continuousAnchorLonDeg: number,
  anchorLatDeg = 0,
): MoonLongitudeLockedSceneReferenceFrame {
  return {
    kind: "moonAnchored",
    longitudeLocked: true,
    latitudeLocked: false,
    continuousAnchorLonDeg: finiteLon(continuousAnchorLonDeg),
    anchorLatDeg: geographicLatitudeDeg(anchorLatDeg),
  };
}

export function moonPositionLockedSceneReferenceFrame(
  continuousAnchorLonDeg: number,
  anchorLatDeg: number,
): MoonPositionLockedSceneReferenceFrame {
  return {
    kind: "moonAnchored",
    longitudeLocked: true,
    latitudeLocked: true,
    continuousAnchorLonDeg: finiteLon(continuousAnchorLonDeg),
    anchorLatDeg: geographicLatitudeDeg(anchorLatDeg),
  };
}

export function isEarthFixedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is EarthFixedSceneReferenceFrame {
  return frame.kind === "earthFixed";
}

export function isMoonAnchoredSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is MoonAnchoredSceneReferenceFrame {
  return frame.kind === "moonAnchored";
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

export function isMoonPositionLockedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is MoonPositionLockedSceneReferenceFrame {
  return (
    frame.kind === "moonAnchored" &&
    frame.longitudeLocked === true &&
    frame.latitudeLocked === true
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
 * `sceneLatDeg` is not required to lie in geographic ±90°.
 */
export type SceneFrameLonLat = {
  readonly sceneLonDeg: number;
  readonly sceneLatDeg: number;
};

function moonSceneLongitudeDeg(
  canonicalLonDeg: number,
  frame: MoonAnchoredSceneReferenceFrame,
): number {
  return relativeLongitudeFromContinuousAnchorDeg(
    canonicalLonDeg,
    frame.continuousAnchorLonDeg,
  );
}

function moonSceneLatitudeDeg(
  canonicalLatDeg: number,
  frame: MoonAnchoredSceneReferenceFrame,
): number {
  if (!frame.latitudeLocked) {
    return canonicalLatDeg;
  }
  return canonicalLatDeg - frame.anchorLatDeg;
}

/**
 * Canonical geographic coordinates → scene-frame coordinates.
 *
 * Earth-fixed is exact identity (same numbers, no canonical wrap) so LIB-081
 * mapping is unchanged. Moon longitude-lock subtracts the continuous lunar
 * anchor from longitude and leaves latitude unchanged. Position-lock also
 * subtracts Moon anchor latitude (no wrap, no clamp to ±90°).
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
        sceneLonDeg: moonSceneLongitudeDeg(canonical.lonDeg, frame),
        sceneLatDeg: moonSceneLatitudeDeg(canonical.latDeg, frame),
      };
  }
}

/**
 * Scene-frame coordinates → canonical geographic coordinates.
 * Earth-fixed is exact identity. Moon longitude-lock adds the continuous
 * anchor and canonicalizes longitude. Position-lock adds Moon anchor
 * latitude and clamps the result to geographic ±90°.
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
        latDeg: frame.latitudeLocked
          ? geographicLatitudeDeg(scene.sceneLatDeg + frame.anchorLatDeg)
          : scene.sceneLatDeg,
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
 * Scene-frame latitude of a canonical parallel. Earth-fixed and Moon
 * longitude-lock return the input unchanged. Position-lock subtracts
 * Moon anchor latitude and does not wrap or clamp.
 */
export function sceneFrameLatitudeDeg(
  canonicalLatDeg: number,
  frame: SceneReferenceFrame,
): number {
  if (isIdentitySceneReferenceFrame(frame) || !isMoonPositionLockedSceneReferenceFrame(frame)) {
    return canonicalLatDeg;
  }
  return canonicalLonLatToSceneFrame({ lonDeg: 0, latDeg: canonicalLatDeg }, frame)
    .sceneLatDeg;
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
 * Map a path of canonical latitudes into scene-frame latitudes. Latitude is
 * not unwrapped; there is no periodic copy in the vertical.
 */
export function sceneFrameLatitudesDeg(
  canonicalLats: readonly number[],
  frame: SceneReferenceFrame,
): number[] {
  if (isIdentitySceneReferenceFrame(frame) || !isMoonPositionLockedSceneReferenceFrame(frame)) {
    return canonicalLats.slice();
  }
  return canonicalLats.map((latDeg) => sceneFrameLatitudeDeg(latDeg, frame));
}

/**
 * Identity-world X origin of the canonical Earth raster under this frame.
 *
 * Longitude-locked Moon frames shift the equirectangular strip by
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
  if (!isMoonAnchoredSceneReferenceFrame(frame)) {
    return 0;
  }
  return (
    mapXFromLongitudeDeg(-frame.continuousAnchorLonDeg, widthPx) -
    mapXFromLongitudeDeg(0, widthPx)
  );
}

/**
 * Identity-world Y origin of the canonical Earth raster under this frame.
 *
 * Position-lock shifts the strip by `−moonAnchorLat / 180 × height` so
 * geographic +90° lands at scene-frame latitude `90 − moonAnchorLat`.
 * Longitude-lock and Earth-fixed are 0. Latitude is not periodic: do not
 * emit vertical copies of this dest.
 */
export function sceneFrameRasterIdentityOriginY(
  heightPx: number,
  frame: SceneReferenceFrame,
): number {
  if (!isMoonPositionLockedSceneReferenceFrame(frame)) {
    return 0;
  }
  return (
    mapYFromLatitudeDeg(90 - frame.anchorLatDeg, heightPx) - mapYFromLatitudeDeg(90, heightPx)
  );
}

/**
 * Test/future seam: longitude of a relative-longitude (entity-fixed) frame.
 * Prefer a production {@link SceneReferenceFrame} kind when one exists.
 *
 * `sceneLon = nearestEquivalent(canonicalLon, continuousAnchorLon) − continuousAnchorLon`
 *
 * Latitude is passed through unchanged. Subtracting anchor latitude is the
 * production {@link moonPositionLockedSceneReferenceFrame} path, not this helper.
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
