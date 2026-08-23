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
 * Geographic lon/lat still project through {@link mapXFromLongitudeDeg} /
 * {@link mapYFromLatitudeDeg} onto the identity world strip; the camera then
 * maps that strip into scene CSS. A later Earth-fixed/entity-fixed transform
 * belongs *before* projection and must not overwrite camera centre.
 *
 * Centre is normalized projected space (u,v ∈ [0,1]), not CSS pixels, so resize
 * reapplies the same camera to the new scene rect. Not persisted in LIB-080.
 */

import {
  mapXFromLongitudeDeg,
  mapYFromLatitudeDeg,
} from "./equirectangularProjection";

export const SCENE_CAMERA_MIN_SCALE = 1;
export const SCENE_CAMERA_MAX_SCALE = 8;

/** Multiplicative wheel zoom: `scale *= exp(-deltaYPx * this)`. */
export const SCENE_CAMERA_WHEEL_ZOOM_INTENSITY = 0.00175;

export type SceneCamera = {
  readonly scale: number;
  /** Normalized projected-world centre (0.5 = identity strip centre). */
  readonly centerU: number;
  readonly centerV: number;
};

export const IDENTITY_SCENE_CAMERA: SceneCamera = {
  scale: SCENE_CAMERA_MIN_SCALE,
  centerU: 0.5,
  centerV: 0.5,
};

export function isIdentitySceneCamera(camera: SceneCamera): boolean {
  return camera.scale <= SCENE_CAMERA_MIN_SCALE + 1e-12;
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

/**
 * Clamp scale to [1, 8] and keep the visible window inside the identity world
 * so zoom does not expose blank space outside the supported strip. Horizontal
 * wrap copies remain the existing ±360° overlay behaviour; they are not a
 * repeating tiled map. Crossing the dateline by translating centre is LIB-081.
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
    centerU: Math.min(hi, Math.max(lo, finiteOr(camera.centerU, 0.5))),
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

export function sceneXFromLongitudeDeg(
  lonDeg: number,
  widthPx: number,
  camera: SceneCamera,
): number {
  return sceneXFromIdentityX(mapXFromLongitudeDeg(lonDeg, widthPx), widthPx, camera);
}

export function sceneYFromLatitudeDeg(
  latDeg: number,
  heightPx: number,
  camera: SceneCamera,
): number {
  return sceneYFromIdentityY(mapYFromLatitudeDeg(latDeg, heightPx), heightPx, camera);
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
