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
 * Runtime scene camera: a uniform scale + translation over already-projected
 * equirectangular world space. Identity reproduces the 2.0.0 full-world view.
 *
 * This is a view, not a projection and not a scene/map reference frame.
 * Canonical lon/lat pass through the scene/map reference frame (Earth-fixed
 * identity today), then {@link mapXFromLongitudeDeg} /
 * {@link mapYFromLatitudeDeg} onto the identity world strip; the camera then
 * maps that strip into scene CSS. Do not encode a frame by writing Moon/Sun
 * coordinates into `centerU` / `centerV`.
 *
 * Centre is normalized projected space, not CSS pixels, so resize reapplies
 * the same camera to the new scene rect. `centerU` is continuous / unwrapped
 * (horizontal world is periodic). `centerV` is clamped so the viewport stays
 * inside the supported latitude extent. Not persisted.
 */

import {
  latitudeDegFromMapY,
  longitudeDegFromMapX,
  mapXFromLongitudeDeg,
  mapYFromLatitudeDeg,
} from "./equirectangularProjection";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  canonicalLonLatToSceneFrame,
  isIdentitySceneReferenceFrame,
  sceneFrameLonLatToCanonical,
  type SceneReferenceFrame,
} from "./sceneReferenceFrame";

export const SCENE_CAMERA_MIN_SCALE = 1;
export const SCENE_CAMERA_MAX_SCALE = 8;

/** Multiplicative wheel zoom: `scale *= exp(-deltaYPx * this)`. */
export const SCENE_CAMERA_WHEEL_ZOOM_INTENSITY = 0.00175;

/**
 * Pointer movement (CSS px) before a scene-strip sequence becomes an active pan.
 * Below this, the sequence remains a point/click so hover is not stolen by jitter.
 */
export const SCENE_CAMERA_PAN_DRAG_THRESHOLD_PX = 4;

/**
 * Extra viewport slop, as a fraction of scene width, when choosing wrapped
 * copies of seam-unwrapped vector geometry that can extend slightly outside
 * the identity `[0,1]` strip (dateline remnants). Rasters use slop 0.
 */
export const SCENE_CAMERA_VECTOR_WRAP_SLOP_RATIO = 0.05;

const IDENTITY_EPS = 1e-9;
const MAX_WORLD_COPIES = 4;

export type SceneCamera = {
  readonly scale: number;
  /**
   * Horizontal centre in normalized projected space. Identity is 0.5.
   * Not wrapped to `[0,1]`; values such as 1.05 are valid pan positions.
   */
  readonly centerU: number;
  /** Vertical centre in normalized projected space. Identity is 0.5. */
  readonly centerV: number;
};

export const IDENTITY_SCENE_CAMERA: SceneCamera = {
  scale: SCENE_CAMERA_MIN_SCALE,
  centerU: 0.5,
  centerV: 0.5,
};

export function isIdentitySceneCamera(camera: SceneCamera): boolean {
  return (
    camera.scale <= SCENE_CAMERA_MIN_SCALE + IDENTITY_EPS &&
    Math.abs(camera.centerU - 0.5) <= IDENTITY_EPS &&
    Math.abs(camera.centerV - 0.5) <= IDENTITY_EPS
  );
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Clamp scale to [1, 8] and keep the visible vertical window inside the
 * identity world. Horizontal centre is not clamped: the projected world is
 * periodic in longitude.
 */
export function clampSceneCamera(camera: SceneCamera): SceneCamera {
  const scale = Math.min(
    SCENE_CAMERA_MAX_SCALE,
    Math.max(SCENE_CAMERA_MIN_SCALE, finiteOr(camera.scale, SCENE_CAMERA_MIN_SCALE)),
  );
  const half = 0.5 / scale;
  const lo = half;
  const hi = 1 - half;
  return {
    scale,
    centerU: finiteOr(camera.centerU, 0.5),
    centerV: Math.min(hi, Math.max(lo, finiteOr(camera.centerV, 0.5))),
  };
}

export function sceneXFromIdentityX(
  identityX: number,
  widthPx: number,
  camera: SceneCamera,
): number {
  if (isIdentitySceneCamera(camera)) {
    return identityX;
  }
  const w = Math.max(0, widthPx);
  if (!(w > 0) || !(camera.scale > 0)) {
    return 0;
  }
  return (identityX / w - camera.centerU) * camera.scale * w + w * 0.5;
}

export function sceneYFromIdentityY(
  identityY: number,
  heightPx: number,
  camera: SceneCamera,
): number {
  if (isIdentitySceneCamera(camera)) {
    return identityY;
  }
  const h = Math.max(0, heightPx);
  if (!(h > 0) || !(camera.scale > 0)) {
    return 0;
  }
  return (identityY / h - camera.centerV) * camera.scale * h + h * 0.5;
}

export function identityXFromSceneX(
  sceneX: number,
  widthPx: number,
  camera: SceneCamera,
): number {
  if (isIdentitySceneCamera(camera)) {
    return sceneX;
  }
  const w = Math.max(0, widthPx);
  if (!(w > 0) || !(camera.scale > 0)) {
    return 0;
  }
  return ((sceneX - w * 0.5) / (camera.scale * w) + camera.centerU) * w;
}

export function identityYFromSceneY(
  sceneY: number,
  heightPx: number,
  camera: SceneCamera,
): number {
  if (isIdentitySceneCamera(camera)) {
    return sceneY;
  }
  const h = Math.max(0, heightPx);
  if (!(h > 0) || !(camera.scale > 0)) {
    return 0;
  }
  return ((sceneY - h * 0.5) / (camera.scale * h) + camera.centerV) * h;
}

/**
 * Canonical geographic longitude → scene CSS x.
 *
 * Order: scene reference frame → equirectangular projection → camera.
 * Earth-fixed identity short-circuits to the LIB-081 mapping.
 */
export function sceneXFromLongitudeDeg(
  lonDeg: number,
  widthPx: number,
  camera: SceneCamera,
  frame: SceneReferenceFrame = EARTH_FIXED_SCENE_REFERENCE_FRAME,
): number {
  const sceneLon = isIdentitySceneReferenceFrame(frame)
    ? lonDeg
    : canonicalLonLatToSceneFrame({ lonDeg, latDeg: 0 }, frame).sceneLonDeg;
  return sceneXFromIdentityX(mapXFromLongitudeDeg(sceneLon, widthPx), widthPx, camera);
}

/**
 * Canonical geographic latitude → scene CSS y.
 * Earth-fixed identity short-circuits. Latitude is not wrapped.
 */
export function sceneYFromLatitudeDeg(
  latDeg: number,
  heightPx: number,
  camera: SceneCamera,
  frame: SceneReferenceFrame = EARTH_FIXED_SCENE_REFERENCE_FRAME,
): number {
  const sceneLat = isIdentitySceneReferenceFrame(frame)
    ? latDeg
    : canonicalLonLatToSceneFrame({ lonDeg: 0, latDeg }, frame).sceneLatDeg;
  return sceneYFromIdentityY(mapYFromLatitudeDeg(sceneLat, heightPx), heightPx, camera);
}

/**
 * Inverse of {@link sceneXFromLongitudeDeg}: scene CSS x → canonical longitude.
 * Order: inverse camera → inverse projection → inverse scene reference frame.
 */
export function canonicalLongitudeDegFromSceneX(
  sceneX: number,
  widthPx: number,
  camera: SceneCamera,
  frame: SceneReferenceFrame = EARTH_FIXED_SCENE_REFERENCE_FRAME,
): number {
  const sceneLon = longitudeDegFromMapX(identityXFromSceneX(sceneX, widthPx, camera), widthPx);
  if (isIdentitySceneReferenceFrame(frame)) {
    return sceneLon;
  }
  return sceneFrameLonLatToCanonical(
    { sceneLonDeg: sceneLon, sceneLatDeg: 0 },
    frame,
  ).lonDeg;
}

/**
 * Inverse of {@link sceneYFromLatitudeDeg}: scene CSS y → canonical latitude.
 */
export function canonicalLatitudeDegFromSceneY(
  sceneY: number,
  heightPx: number,
  camera: SceneCamera,
  frame: SceneReferenceFrame = EARTH_FIXED_SCENE_REFERENCE_FRAME,
): number {
  const sceneLat = latitudeDegFromMapY(identityYFromSceneY(sceneY, heightPx, camera), heightPx);
  if (isIdentitySceneReferenceFrame(frame)) {
    return sceneLat;
  }
  return sceneFrameLonLatToCanonical(
    { sceneLonDeg: 0, sceneLatDeg: sceneLat },
    frame,
  ).latDeg;
}

/** Full-world raster dest rect in scene CSS (same similarity as vector mapping). */
export function sceneDestRectFromIdentityWorld(
  widthPx: number,
  heightPx: number,
  camera: SceneCamera,
): { x: number; y: number; width: number; height: number } {
  if (isIdentitySceneCamera(camera)) {
    return { x: 0, y: 0, width: Math.max(0, widthPx), height: Math.max(0, heightPx) };
  }
  return {
    x: sceneXFromIdentityX(0, widthPx, camera),
    y: sceneYFromIdentityY(0, heightPx, camera),
    width: Math.max(0, widthPx) * camera.scale,
    height: Math.max(0, heightPx) * camera.scale,
  };
}

/**
 * Horizontal period of one identity world in scene CSS pixels (`widthPx * scale`).
 */
export function sceneCameraWorldPeriodPx(widthPx: number, camera: SceneCamera): number {
  return Math.max(0, widthPx) * camera.scale;
}

export function sceneXShiftForWorldCopy(
  widthPx: number,
  camera: SceneCamera,
  copyIndex: number,
): number {
  return copyIndex * sceneCameraWorldPeriodPx(widthPx, camera);
}

export function sceneCameraVectorWrapSlopPx(widthPx: number): number {
  return Math.max(0, widthPx) * SCENE_CAMERA_VECTOR_WRAP_SLOP_RATIO;
}

/**
 * Integer world-copy indices `k` whose identity world, shifted by `k` world-widths,
 * intersects the scene viewport (optionally expanded by `slopPx`).
 *
 * At scale ≥ 1 the visible window is at most one world wide, so this is at most
 * two copies with slop 0. Vector slop restores the identity-camera `{-1,0,1}`
 * dateline remnants used by seam-unwrapped geometry.
 */
export function sceneCameraHorizontalWorldCopyOffsets(
  camera: SceneCamera,
  widthPx: number,
  slopPx = 0,
): readonly number[] {
  const w = Math.max(0, widthPx);
  if (!(w > 0) || !(camera.scale > 0)) {
    return [0];
  }
  const destX = sceneXFromIdentityX(0, w, camera);
  const period = sceneCameraWorldPeriodPx(w, camera);
  if (!(period > 0) || !Number.isFinite(destX)) {
    return [0];
  }
  const slop = Number.isFinite(slopPx) ? Math.max(0, slopPx) : 0;
  const viewLo = -slop;
  const viewHi = w + slop;
  const kMin = Math.floor((viewLo - destX) / period);
  const kMax = Math.ceil((viewHi - destX) / period) - 1;
  if (!Number.isFinite(kMin) || !Number.isFinite(kMax) || kMax < kMin) {
    return [0];
  }
  let lo = kMin;
  let hi = kMax;
  if (hi - lo + 1 > MAX_WORLD_COPIES) {
    const mid = Math.round((lo + hi) / 2);
    lo = mid - 1;
    hi = mid + 2;
  }
  const out: number[] = [];
  for (let k = lo; k <= hi; k += 1) {
    out.push(k === 0 ? 0 : k);
  }
  return out.length > 0 ? out : [0];
}

export function sceneDestRectsFromIdentityWorldWrapped(
  widthPx: number,
  heightPx: number,
  camera: SceneCamera,
): readonly { x: number; y: number; width: number; height: number }[] {
  const base = sceneDestRectFromIdentityWorld(widthPx, heightPx, camera);
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, widthPx, 0);
  if (copies.length === 1 && copies[0] === 0) {
    return [base];
  }
  return copies.map((k) => ({
    x: base.x + k * base.width,
    y: base.y,
    width: base.width,
    height: base.height,
  }));
}

export function sceneXsFromIdentityX(
  identityX: number,
  widthPx: number,
  camera: SceneCamera,
  slopPx = 0,
): readonly number[] {
  const copies = sceneCameraHorizontalWorldCopyOffsets(camera, widthPx, slopPx);
  const w = Math.max(0, widthPx);
  return copies.map((k) => sceneXFromIdentityX(identityX + k * w, w, camera));
}

export function sceneXsFromLongitudeDeg(
  lonDeg: number,
  widthPx: number,
  camera: SceneCamera,
  slopPx = 0,
  frame: SceneReferenceFrame = EARTH_FIXED_SCENE_REFERENCE_FRAME,
): readonly number[] {
  const sceneLon = isIdentitySceneReferenceFrame(frame)
    ? lonDeg
    : canonicalLonLatToSceneFrame({ lonDeg, latDeg: 0 }, frame).sceneLonDeg;
  return sceneXsFromIdentityX(mapXFromLongitudeDeg(sceneLon, widthPx), widthPx, camera, slopPx);
}

/**
 * Drag the map: geography follows the pointer. Positive `deltaSceneX` (pointer
 * moved right) decreases `centerU`.
 */
export function panSceneCameraBySceneDelta(args: {
  camera: SceneCamera;
  deltaSceneX: number;
  deltaSceneY: number;
  widthPx: number;
  heightPx: number;
}): SceneCamera {
  const w = Math.max(0, args.widthPx);
  const h = Math.max(0, args.heightPx);
  const scale = args.camera.scale;
  if (!(w > 0) || !(h > 0) || !(scale > 0)) {
    return clampSceneCamera(args.camera);
  }
  return clampSceneCamera({
    scale,
    centerU: args.camera.centerU - args.deltaSceneX / (scale * w),
    centerV: args.camera.centerV - args.deltaSceneY / (scale * h),
  });
}

export function sceneCameraFromWheelDelta(
  currentScale: number,
  deltaYPx: number,
): number {
  return currentScale * Math.exp(-deltaYPx * SCENE_CAMERA_WHEEL_ZOOM_INTENSITY);
}

export function wheelDeltaYToPixels(event: {
  deltaY: number;
  deltaMode: number;
}): number {
  if (event.deltaMode === 1) {
    return event.deltaY * 16;
  }
  if (event.deltaMode === 2) {
    return event.deltaY * 800;
  }
  return event.deltaY;
}

/**
 * Pointer-stable zoom: keep the projected-world point under `sceneX/Y` fixed,
 * then clamp. Adjusting centre here is camera math, not pan navigation.
 * `centerU` is left unwrapped so zoom after pan does not jump at the dateline.
 */
export function zoomSceneCameraAboutScenePoint(args: {
  camera: SceneCamera;
  nextScale: number;
  sceneX: number;
  sceneY: number;
  widthPx: number;
  heightPx: number;
}): SceneCamera {
  const { camera, sceneX, sceneY, widthPx, heightPx } = args;
  const w = Math.max(0, widthPx);
  const h = Math.max(0, heightPx);
  if (!(w > 0) || !(h > 0)) {
    return clampSceneCamera({ ...camera, scale: args.nextScale });
  }
  const u = identityXFromSceneX(sceneX, w, camera) / w;
  const v = identityYFromSceneY(sceneY, h, camera) / h;
  const nextScale = Math.min(
    SCENE_CAMERA_MAX_SCALE,
    Math.max(SCENE_CAMERA_MIN_SCALE, finiteOr(args.nextScale, camera.scale)),
  );
  return clampSceneCamera({
    scale: nextScale,
    centerU: u - (sceneX - w * 0.5) / (nextScale * w),
    centerV: v - (sceneY - h * 0.5) / (nextScale * h),
  });
}
