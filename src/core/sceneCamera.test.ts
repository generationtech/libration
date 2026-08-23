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

import { describe, expect, it } from "vitest";
import {
  mapXFromLongitudeDeg,
  mapYFromLatitudeDeg,
} from "./equirectangularProjection";
import {
  IDENTITY_SCENE_CAMERA,
  SCENE_CAMERA_MAX_SCALE,
  SCENE_CAMERA_MIN_SCALE,
  clampSceneCamera,
  identityXFromSceneX,
  identityYFromSceneY,
  isIdentitySceneCamera,
  sceneCameraFromWheelDelta,
  sceneDestRectFromIdentityWorld,
  sceneXFromIdentityX,
  sceneXFromLongitudeDeg,
  sceneYFromIdentityY,
  sceneYFromLatitudeDeg,
  zoomSceneCameraAboutScenePoint,
  type SceneCamera,
} from "./sceneCamera";

const W = 800;
const H = 400;

function camera(partial: Partial<SceneCamera>): SceneCamera {
  return clampSceneCamera({ ...IDENTITY_SCENE_CAMERA, ...partial });
}

describe("scene camera identity", () => {
  it("maps geographic points to the current equirectangular scene coordinates", () => {
    const lon = -73.98;
    const lat = 40.71;
    expect(sceneXFromLongitudeDeg(lon, W, IDENTITY_SCENE_CAMERA)).toBeCloseTo(
      mapXFromLongitudeDeg(lon, W),
      10,
    );
    expect(sceneYFromLatitudeDeg(lat, H, IDENTITY_SCENE_CAMERA)).toBeCloseTo(
      mapYFromLatitudeDeg(lat, H),
      10,
    );
  });

  it("maps identity-world corners onto the scene rect", () => {
    expect(sceneXFromIdentityX(0, W, IDENTITY_SCENE_CAMERA)).toBeCloseTo(0, 10);
    expect(sceneXFromIdentityX(W, W, IDENTITY_SCENE_CAMERA)).toBeCloseTo(W, 10);
    expect(sceneYFromIdentityY(0, H, IDENTITY_SCENE_CAMERA)).toBeCloseTo(0, 10);
    expect(sceneYFromIdentityY(H, H, IDENTITY_SCENE_CAMERA)).toBeCloseTo(H, 10);
  });
});

describe("scene camera forward transform", () => {
  it("places the camera centre at the scene midpoint", () => {
    const cam = camera({ scale: 2, centerU: 0.25, centerV: 0.4 });
    expect(sceneXFromIdentityX(cam.centerU * W, W, cam)).toBeCloseTo(W / 2, 10);
    expect(sceneYFromIdentityY(cam.centerV * H, H, cam)).toBeCloseTo(H / 2, 10);
  });

  it("scales identity offsets about the camera centre", () => {
    const cam = camera({ scale: 4, centerU: 0.5, centerV: 0.5 });
    const west = sceneXFromIdentityX(0, W, cam);
    const east = sceneXFromIdentityX(W, W, cam);
    expect(east - west).toBeCloseTo(W * 4, 10);
    expect(west).toBeCloseTo(-1.5 * W, 10);
  });
});

describe("scene camera pointer-stable zoom", () => {
  it("keeps the projected-world point under a scene pixel after zoom", () => {
    const before = IDENTITY_SCENE_CAMERA;
    const sceneX = 120;
    const sceneY = 80;
    const worldX = identityXFromSceneX(sceneX, W, before);
    const worldY = identityYFromSceneY(sceneY, H, before);
    const after = zoomSceneCameraAboutScenePoint({
      camera: before,
      nextScale: 3,
      sceneX,
      sceneY,
      widthPx: W,
      heightPx: H,
    });
    expect(identityXFromSceneX(sceneX, W, after)).toBeCloseTo(worldX, 8);
    expect(identityYFromSceneY(sceneY, H, after)).toBeCloseTo(worldY, 8);
    expect(sceneXFromIdentityX(worldX, W, after)).toBeCloseTo(sceneX, 8);
    expect(sceneYFromIdentityY(worldY, H, after)).toBeCloseTo(sceneY, 8);
  });
});

describe("scene camera clamp", () => {
  it("does not allow scale below 1 or above 8", () => {
    expect(clampSceneCamera({ scale: 0.2, centerU: 0.5, centerV: 0.5 }).scale).toBe(
      SCENE_CAMERA_MIN_SCALE,
    );
    expect(clampSceneCamera({ scale: 99, centerU: 0.5, centerV: 0.5 }).scale).toBe(
      SCENE_CAMERA_MAX_SCALE,
    );
  });

  it("forces identity centre at scale 1", () => {
    const cam = clampSceneCamera({ scale: 1, centerU: 0.1, centerV: 0.9 });
    expect(cam).toEqual(IDENTITY_SCENE_CAMERA);
    expect(isIdentitySceneCamera(cam)).toBe(true);
  });

  it("keeps the visible window inside the identity world", () => {
    const cam = clampSceneCamera({ scale: 4, centerU: 0, centerV: 1 });
    expect(cam.centerU).toBeCloseTo(0.125, 10);
    expect(cam.centerV).toBeCloseTo(0.875, 10);
    expect(sceneXFromIdentityX(0, W, cam)).toBeCloseTo(0, 8);
    expect(sceneYFromIdentityY(H, H, cam)).toBeCloseTo(H, 8);
  });
});

describe("scene camera inverse and resize-normalized centre", () => {
  it("round-trips identity projected coordinates", () => {
    const cam = camera({ scale: 2.5, centerU: 0.4, centerV: 0.55 });
    const ix = 317.2;
    const iy = 88.4;
    const sx = sceneXFromIdentityX(ix, W, cam);
    const sy = sceneYFromIdentityY(iy, H, cam);
    expect(identityXFromSceneX(sx, W, cam)).toBeCloseTo(ix, 8);
    expect(identityYFromSceneY(sy, H, cam)).toBeCloseTo(iy, 8);
  });

  it("keeps the same normalized centre across viewport sizes", () => {
    const cam = camera({ scale: 2, centerU: 0.3, centerV: 0.6 });
    const lon = 15;
    const lat = -20;
    const u = mapXFromLongitudeDeg(lon, W) / W;
    const v = mapYFromLatitudeDeg(lat, H) / H;
    expect(mapXFromLongitudeDeg(lon, 1920) / 1920).toBeCloseTo(u, 10);
    expect(mapYFromLatitudeDeg(lat, 800) / 800).toBeCloseTo(v, 10);
    const a = sceneXFromLongitudeDeg(lon, W, cam) / W;
    const b = sceneXFromLongitudeDeg(lon, 1920, cam) / 1920;
    expect(a).toBeCloseTo(b, 10);
    expect(sceneYFromLatitudeDeg(lat, H, cam) / H).toBeCloseTo(
      sceneYFromLatitudeDeg(lat, 800, cam) / 800,
      10,
    );
  });
});

describe("scene camera raster dest and wheel", () => {
  it("maps the full identity world to a scaled dest rect", () => {
    const cam = camera({ scale: 2, centerU: 0.5, centerV: 0.5 });
    const dest = sceneDestRectFromIdentityWorld(W, H, cam);
    expect(dest.x).toBeCloseTo(-W / 2, 10);
    expect(dest.y).toBeCloseTo(-H / 2, 10);
    expect(dest.width).toBeCloseTo(W * 2, 10);
    expect(dest.height).toBeCloseTo(H * 2, 10);
  });

  it("uses multiplicative wheel scaling", () => {
    const up = sceneCameraFromWheelDelta(2, -100);
    const down = sceneCameraFromWheelDelta(2, 100);
    expect(up).toBeGreaterThan(2);
    expect(down).toBeLessThan(2);
    expect(up * down).toBeCloseTo(4, 8);
  });
});
