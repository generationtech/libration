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
 * - `anchored` — Moon or Sun (`anchorKind`) with a proven lock mode
 *
 * Lock modes currently shipped:
 * - `longitude` — longitude locked, latitude identity
 * - `position` — longitude and latitude locked
 *
 * Moon and Sun are configuration of the same anchored architecture. Forward
 * and inverse math, raster dest, and camera extent branch on Earth-fixed vs
 * anchored and on lock mode — not on which body is the anchor. Anchor
 * physical-state derivation stays at the application boundary.
 *
 * Frame-relative coordinates are derived presentation state. Canonical
 * entity lon/lat must not be overwritten to fake a moving map.
 *
 * Sign convention for longitude-lock:
 *   sceneLon = nearestEquivalent(canonicalLon, λAnchor_continuous) − λAnchor_continuous
 * Positive scene longitude is east of the anchor. The anchor itself maps to 0°.
 *
 * Latitude (`longitude` lock): identity, `sceneLat = canonicalLat`.
 * Latitude (`position` lock): `sceneLat = canonicalLat − anchorLat`.
 * Scene-frame latitude is not periodic and may leave geographic ±90°.
 */

import { mapXFromLongitudeDeg, mapYFromLatitudeDeg } from "./equirectangularProjection";
import {
  canonicalLongitudeDeg,
  relativeLongitudeFromContinuousAnchorDeg,
} from "./longitudeContinuity";

export type SceneReferenceFrameKind = "earthFixed" | "anchored";

/** Production anchors proven by LIB-083–085. Future kinds may extend this union. */
export type SceneFrameAnchorKind = "moon" | "sun";

/**
 * Proven axis combinations for an anchored frame.
 *
 * `longitude` ≡ longitude locked, latitude identity.
 * `position` ≡ both axes locked.
 *
 * Latitude-only lock and fully unlocked anchored frames are not represented:
 * they are not shipped and would be invalid at this construction boundary.
 */
export type AnchoredSceneFrameLockMode = "longitude" | "position";

export type EarthFixedSceneReferenceFrame = {
  readonly kind: "earthFixed";
};

export type AnchoredSceneReferenceFrame = {
  readonly kind: "anchored";
  readonly anchorKind: SceneFrameAnchorKind;
  readonly lockMode: AnchoredSceneFrameLockMode;
  readonly continuousAnchorLonDeg: number;
  readonly anchorLatDeg: number;
};

export type MoonLongitudeLockedSceneReferenceFrame = AnchoredSceneReferenceFrame & {
  readonly anchorKind: "moon";
  readonly lockMode: "longitude";
};

export type MoonPositionLockedSceneReferenceFrame = AnchoredSceneReferenceFrame & {
  readonly anchorKind: "moon";
  readonly lockMode: "position";
};

export type MoonAnchoredSceneReferenceFrame =
  | MoonLongitudeLockedSceneReferenceFrame
  | MoonPositionLockedSceneReferenceFrame;

export type SunLongitudeLockedSceneReferenceFrame = AnchoredSceneReferenceFrame & {
  readonly anchorKind: "sun";
  readonly lockMode: "longitude";
};

export type SunPositionLockedSceneReferenceFrame = AnchoredSceneReferenceFrame & {
  readonly anchorKind: "sun";
  readonly lockMode: "position";
};

export type SunAnchoredSceneReferenceFrame =
  | SunLongitudeLockedSceneReferenceFrame
  | SunPositionLockedSceneReferenceFrame;

export type SceneReferenceFrame = EarthFixedSceneReferenceFrame | AnchoredSceneReferenceFrame;

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

function buildAnchoredSceneReferenceFrame<
  K extends SceneFrameAnchorKind,
  M extends AnchoredSceneFrameLockMode,
>(
  anchorKind: K,
  lockMode: M,
  continuousAnchorLonDeg: number,
  anchorLatDeg: number,
): AnchoredSceneReferenceFrame & { readonly anchorKind: K; readonly lockMode: M } {
  return {
    kind: "anchored",
    anchorKind,
    lockMode,
    continuousAnchorLonDeg: finiteLon(continuousAnchorLonDeg),
    anchorLatDeg: geographicLatitudeDeg(anchorLatDeg),
  };
}

export function anchoredSceneReferenceFrame(args: {
  readonly anchorKind: SceneFrameAnchorKind;
  readonly lockMode: AnchoredSceneFrameLockMode;
  readonly continuousAnchorLonDeg: number;
  readonly anchorLatDeg?: number;
}): AnchoredSceneReferenceFrame {
  return buildAnchoredSceneReferenceFrame(
    args.anchorKind,
    args.lockMode,
    args.continuousAnchorLonDeg,
    args.anchorLatDeg ?? 0,
  );
}

export function moonLongitudeLockedSceneReferenceFrame(
  continuousAnchorLonDeg: number,
  anchorLatDeg = 0,
): MoonLongitudeLockedSceneReferenceFrame {
  return buildAnchoredSceneReferenceFrame(
    "moon",
    "longitude",
    continuousAnchorLonDeg,
    anchorLatDeg,
  );
}

export function moonPositionLockedSceneReferenceFrame(
  continuousAnchorLonDeg: number,
  anchorLatDeg: number,
): MoonPositionLockedSceneReferenceFrame {
  return buildAnchoredSceneReferenceFrame(
    "moon",
    "position",
    continuousAnchorLonDeg,
    anchorLatDeg,
  );
}

export function sunLongitudeLockedSceneReferenceFrame(
  continuousAnchorLonDeg: number,
  anchorLatDeg = 0,
): SunLongitudeLockedSceneReferenceFrame {
  return buildAnchoredSceneReferenceFrame(
    "sun",
    "longitude",
    continuousAnchorLonDeg,
    anchorLatDeg,
  );
}

export function sunPositionLockedSceneReferenceFrame(
  continuousAnchorLonDeg: number,
  anchorLatDeg: number,
): SunPositionLockedSceneReferenceFrame {
  return buildAnchoredSceneReferenceFrame(
    "sun",
    "position",
    continuousAnchorLonDeg,
    anchorLatDeg,
  );
}

export function isEarthFixedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is EarthFixedSceneReferenceFrame {
  return frame.kind === "earthFixed";
}

export function isMoonAnchoredSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is MoonAnchoredSceneReferenceFrame {
  return frame.kind === "anchored" && frame.anchorKind === "moon";
}

export function isSunAnchoredSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is SunAnchoredSceneReferenceFrame {
  return frame.kind === "anchored" && frame.anchorKind === "sun";
}

export function isAnchoredSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is AnchoredSceneReferenceFrame {
  return frame.kind === "anchored";
}

export function isMoonLongitudeLockedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is MoonLongitudeLockedSceneReferenceFrame {
  return (
    frame.kind === "anchored" &&
    frame.anchorKind === "moon" &&
    frame.lockMode === "longitude"
  );
}

export function isMoonPositionLockedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is MoonPositionLockedSceneReferenceFrame {
  return (
    frame.kind === "anchored" &&
    frame.anchorKind === "moon" &&
    frame.lockMode === "position"
  );
}

export function isSunLongitudeLockedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is SunLongitudeLockedSceneReferenceFrame {
  return (
    frame.kind === "anchored" &&
    frame.anchorKind === "sun" &&
    frame.lockMode === "longitude"
  );
}

export function isSunPositionLockedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is SunPositionLockedSceneReferenceFrame {
  return (
    frame.kind === "anchored" &&
    frame.anchorKind === "sun" &&
    frame.lockMode === "position"
  );
}

/**
 * Position-lock (latitude translated). Shared by raster Y and camera vertical
 * extent so lock semantics, not anchor identity, drive those systems.
 */
export function isPositionLockedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is AnchoredSceneReferenceFrame & { readonly lockMode: "position" } {
  return isAnchoredSceneReferenceFrame(frame) && frame.lockMode === "position";
}

/** @deprecated Prefer {@link isPositionLockedSceneReferenceFrame}; same predicate. */
export function isLatitudeLockedSceneReferenceFrame(
  frame: SceneReferenceFrame,
): frame is AnchoredSceneReferenceFrame & { readonly lockMode: "position" } {
  return isPositionLockedSceneReferenceFrame(frame);
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

function anchoredSceneLongitudeDeg(
  canonicalLonDeg: number,
  frame: AnchoredSceneReferenceFrame,
): number {
  return relativeLongitudeFromContinuousAnchorDeg(
    canonicalLonDeg,
    frame.continuousAnchorLonDeg,
  );
}

function anchoredSceneLatitudeDeg(
  canonicalLatDeg: number,
  frame: AnchoredSceneReferenceFrame,
): number {
  if (frame.lockMode === "longitude") {
    return canonicalLatDeg;
  }
  return canonicalLatDeg - frame.anchorLatDeg;
}

function anchoredCanonicalFromScene(
  scene: SceneFrameLonLat,
  frame: AnchoredSceneReferenceFrame,
): CanonicalLonLat {
  return {
    lonDeg: canonicalLongitudeDeg(scene.sceneLonDeg + frame.continuousAnchorLonDeg),
    latDeg:
      frame.lockMode === "position"
        ? geographicLatitudeDeg(scene.sceneLatDeg + frame.anchorLatDeg)
        : scene.sceneLatDeg,
  };
}

/**
 * Canonical geographic coordinates → scene-frame coordinates.
 *
 * Earth-fixed is exact identity (same numbers, no canonical wrap) so LIB-081
 * mapping is unchanged. Anchored longitude-lock subtracts the continuous
 * anchor from longitude and leaves latitude unchanged. Position-lock also
 * subtracts anchor latitude (no wrap, no clamp to ±90°).
 *
 * Branch is Earth-fixed vs anchored, then lock mode. Anchor identity is not
 * a transform input.
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
    case "anchored":
      return {
        sceneLonDeg: anchoredSceneLongitudeDeg(canonical.lonDeg, frame),
        sceneLatDeg: anchoredSceneLatitudeDeg(canonical.latDeg, frame),
      };
  }
}

/**
 * Scene-frame coordinates → canonical geographic coordinates.
 * Earth-fixed is exact identity. Anchored longitude-lock adds the continuous
 * anchor and canonicalizes longitude. Position-lock adds anchor latitude
 * and clamps the result to geographic ±90°.
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
    case "anchored":
      return anchoredCanonicalFromScene(scene, frame);
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
 * Scene-frame latitude of a canonical parallel. Earth-fixed and longitude-lock
 * return the input unchanged. Position-lock subtracts anchor latitude and
 * does not wrap or clamp.
 */
export function sceneFrameLatitudeDeg(
  canonicalLatDeg: number,
  frame: SceneReferenceFrame,
): number {
  if (isIdentitySceneReferenceFrame(frame) || !isPositionLockedSceneReferenceFrame(frame)) {
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
  if (isIdentitySceneReferenceFrame(frame) || !isPositionLockedSceneReferenceFrame(frame)) {
    return canonicalLats.slice();
  }
  return canonicalLats.map((latDeg) => sceneFrameLatitudeDeg(latDeg, frame));
}

/**
 * Identity-world X origin of the canonical Earth raster under this frame.
 *
 * Longitude-locked anchored frames shift the equirectangular strip by
 * `−continuousAnchorLon / 360 × width` so the image stays registered with
 * vector geography without resampling. Earth-fixed is 0.
 *
 * Uses the continuous anchor, not nearest-equivalent of a sample meridian,
 * so the dest does not jump 360° at the anchor antimeridian.
 */
export function sceneFrameRasterIdentityOriginX(
  widthPx: number,
  frame: SceneReferenceFrame,
): number {
  if (!isAnchoredSceneReferenceFrame(frame)) {
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
 * Position-lock shifts the strip by `−anchorLat / 180 × height` so
 * geographic +90° lands at scene-frame latitude `90 − anchorLat`.
 * Longitude-lock and Earth-fixed are 0. Latitude is not periodic: do not
 * emit vertical copies of this dest.
 */
export function sceneFrameRasterIdentityOriginY(
  heightPx: number,
  frame: SceneReferenceFrame,
): number {
  if (!isPositionLockedSceneReferenceFrame(frame)) {
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
 * production position-lock path, not this helper.
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
