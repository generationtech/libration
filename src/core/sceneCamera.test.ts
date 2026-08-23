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
  SCENE_CAMERA_PAN_DRAG_THRESHOLD_PX,
  clampSceneCamera,
  identityXFromSceneX,
  identityYFromSceneY,
  isIdentitySceneCamera,
  panSceneCameraBySceneDelta,
  sceneCameraFromWheelDelta,
  sceneCameraHorizontalWorldCopyOffsets,
  sceneDestRectFromIdentityWorld,
  sceneDestRectsFromIdentityWorldWrapped,
  sceneCameraVerticalExtentFromFrame,
  sceneXFromIdentityX,
  sceneXFromLongitudeDeg,
  sceneXsFromLongitudeDeg,
  sceneYFromIdentityY,
  sceneYFromLatitudeDeg,
  zoomSceneCameraAboutScenePoint,
  type SceneCamera,
} from "./sceneCamera";
import {
  anchoredSceneReferenceFrame,
  moonLongitudeLockedSceneReferenceFrame,
  moonPositionLockedSceneReferenceFrame,
  sunLongitudeLockedSceneReferenceFrame,
  sunPositionLockedSceneReferenceFrame,
} from "./sceneReferenceFrame";

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

  it("forces vertical centre to identity at scale 1 and leaves horizontal pan free", () => {
    const cam = clampSceneCamera({ scale: 1, centerU: 0.1, centerV: 0.9 });
    expect(cam.scale).toBe(1);
    expect(cam.centerU).toBeCloseTo(0.1, 10);
    expect(cam.centerV).toBeCloseTo(0.5, 10);
    expect(isIdentitySceneCamera(cam)).toBe(false);
  });

  it("keeps the visible vertical window inside the identity world", () => {
    const cam = clampSceneCamera({ scale: 4, centerU: 0.5, centerV: 1 });
    expect(cam.centerV).toBeCloseTo(0.875, 10);
    expect(sceneYFromIdentityY(H, H, cam)).toBeCloseTo(H, 8);
  });

  it("does not clamp horizontal centre into [0, 1]", () => {
    const west = clampSceneCamera({ scale: 2, centerU: -0.25, centerV: 0.5 });
    const east = clampSceneCamera({ scale: 2, centerU: 1.35, centerV: 0.5 });
    expect(west.centerU).toBeCloseTo(-0.25, 10);
    expect(east.centerU).toBeCloseTo(1.35, 10);
  });
});

describe("scene camera pan", () => {
  it("moves the camera centre opposite a known scene-space drag at several scales", () => {
    const deltaX = 80;
    const deltaY = -40;
    for (const scale of [1, 2, 4, 8]) {
      const cam = camera({ scale, centerU: 0.4, centerV: 0.55 });
      const next = panSceneCameraBySceneDelta({
        camera: cam,
        deltaSceneX: deltaX,
        deltaSceneY: deltaY,
        widthPx: W,
        heightPx: H,
      });
      expect(next.centerU).toBeCloseTo(cam.centerU - deltaX / (scale * W), 10);
      const half = 0.5 / scale;
      const expectedV = Math.min(1 - half, Math.max(half, cam.centerV - deltaY / (scale * H)));
      expect(next.centerV).toBeCloseTo(expectedV, 10);
    }
  });

  it("lets centerU pass both canonical boundaries continuously", () => {
    let cam: SceneCamera = IDENTITY_SCENE_CAMERA;
    cam = panSceneCameraBySceneDelta({
      camera: cam,
      deltaSceneX: -W * 0.6,
      deltaSceneY: 0,
      widthPx: W,
      heightPx: H,
    });
    expect(cam.centerU).toBeGreaterThan(1);
    cam = panSceneCameraBySceneDelta({
      camera: cam,
      deltaSceneX: W * 2.2,
      deltaSceneY: 0,
      widthPx: W,
      heightPx: H,
    });
    expect(cam.centerU).toBeLessThan(0);
  });

  it("clamps vertical pan at 1×, intermediate zoom, and 8×", () => {
    const at1 = clampSceneCamera({ scale: 1, centerU: 0.5, centerV: 0 });
    expect(at1.centerV).toBeCloseTo(0.5, 10);
    const at2 = clampSceneCamera({ scale: 2, centerU: 0.5, centerV: 0 });
    expect(at2.centerV).toBeCloseTo(0.25, 10);
    const at2n = clampSceneCamera({ scale: 2, centerU: 0.5, centerV: 1 });
    expect(at2n.centerV).toBeCloseTo(0.75, 10);
    const at8 = clampSceneCamera({ scale: 8, centerU: 0.5, centerV: 0 });
    expect(at8.centerV).toBeCloseTo(0.0625, 10);
    const at8n = clampSceneCamera({ scale: 8, centerU: 0.5, centerV: 1 });
    expect(at8n.centerV).toBeCloseTo(0.9375, 10);
  });

  it("treats identity as scale 1 and centre 0.5, 0.5, not merely scale 1", () => {
    expect(isIdentitySceneCamera(IDENTITY_SCENE_CAMERA)).toBe(true);
    expect(isIdentitySceneCamera({ scale: 1, centerU: 0.6, centerV: 0.5 })).toBe(false);
    expect(SCENE_CAMERA_PAN_DRAG_THRESHOLD_PX).toBe(4);
  });
});

describe("scene camera world wrapping", () => {
  it("needs only the identity copy when the camera is identity", () => {
    expect(sceneCameraHorizontalWorldCopyOffsets(IDENTITY_SCENE_CAMERA, W, 0)).toEqual([0]);
  });

  it("selects the copies that cover an antimeridian-straddling pan", () => {
    const cam = { scale: 1, centerU: 0.85, centerV: 0.5 } as const;
    const copies = sceneCameraHorizontalWorldCopyOffsets(cam, W, 0);
    expect(copies).toEqual([0, 1]);
    const rects = sceneDestRectsFromIdentityWorldWrapped(W, H, cam);
    expect(rects).toHaveLength(2);
    const coverage = rects.map((r) => [r.x, r.x + r.width] as const);
    expect(coverage[0]![0]).toBeLessThan(0);
    expect(coverage[0]![1]).toBeGreaterThan(0);
    expect(coverage[1]![0]).toBeLessThan(W);
    expect(coverage[1]![1]).toBeGreaterThan(W);
  });

  it("places a canonical geographic point on the visible wrapped instance", () => {
    const cam = { scale: 1, centerU: 1.05, centerV: 0.5 } as const;
    const lon = 0;
    const xs = sceneXsFromLongitudeDeg(lon, W, cam);
    expect(xs.some((x) => x >= 0 && x <= W)).toBe(true);
    const onScreen = xs.filter((x) => x >= -1 && x <= W + 1);
    expect(onScreen.length).toBeGreaterThanOrEqual(1);
    const identityX = mapXFromLongitudeDeg(lon, W);
    for (const x of xs) {
      const recovered = identityXFromSceneX(x, W, cam);
      const deltaWorld = (recovered - identityX) / W;
      expect(Math.abs(deltaWorld - Math.round(deltaWorld))).toBeLessThan(1e-8);
    }
  });

  it("keeps pointer-stable zoom after an unwrapped horizontal pan", () => {
    const before = { scale: 2, centerU: 1.15, centerV: 0.4 } as const;
    const sceneX = 220;
    const sceneY = 90;
    const worldX = identityXFromSceneX(sceneX, W, before);
    const worldY = identityYFromSceneY(sceneY, H, before);
    const after = zoomSceneCameraAboutScenePoint({
      camera: before,
      nextScale: 4,
      sceneX,
      sceneY,
      widthPx: W,
      heightPx: H,
    });
    expect(after.centerU).toBeGreaterThan(1);
    expect(identityXFromSceneX(sceneX, W, after)).toBeCloseTo(worldX, 8);
    expect(identityYFromSceneY(sceneY, H, after)).toBeCloseTo(worldY, 8);
    expect(sceneXFromIdentityX(worldX, W, after)).toBeCloseTo(sceneX, 8);
    expect(sceneYFromIdentityY(worldY, H, after)).toBeCloseTo(sceneY, 8);
  });

  it("round-trips forward/inverse mapping at a wrapped centre", () => {
    const cam = { scale: 3, centerU: 1.2, centerV: 0.45 } as const;
    const ix = 120.5;
    const iy = 77.2;
    const sx = sceneXFromIdentityX(ix, W, cam);
    const sy = sceneYFromIdentityY(iy, H, cam);
    expect(identityXFromSceneX(sx, W, cam)).toBeCloseTo(ix, 8);
    expect(identityYFromSceneY(sy, H, cam)).toBeCloseTo(iy, 8);
  });

  it("reset identity is exactly 1, 0.5, 0.5 from a wrapped zoomed camera", () => {
    const panned = clampSceneCamera({ scale: 5, centerU: -0.4, centerV: 0.2 });
    expect(isIdentitySceneCamera(panned)).toBe(false);
    expect(IDENTITY_SCENE_CAMERA).toEqual({ scale: 1, centerU: 0.5, centerV: 0.5 });
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

describe("Moon position-lock camera vertical extent", () => {
  const frame = moonPositionLockedSceneReferenceFrame(0, 28);
  const extent = sceneCameraVerticalExtentFromFrame(frame);

  it("translates Earth extent by Moon anchor latitude / 180", () => {
    expect(extent.vMin).toBeCloseTo(28 / 180, 12);
    expect(extent.vMax).toBeCloseTo(1 + 28 / 180, 12);
    expect(sceneCameraVerticalExtentFromFrame(moonLongitudeLockedSceneReferenceFrame(0, 28))).toEqual(
      { vMin: 0, vMax: 1 },
    );
  });

  it("keeps identity centerV at scale 1 even when Earth is translated", () => {
    const cam = clampSceneCamera({ scale: 1, centerU: 0.5, centerV: 0.9 }, extent);
    expect(cam.centerV).toBeCloseTo(0.5, 10);
  });

  it("clamps zoomed pan to the translated Earth, not hard-coded [0, 1]", () => {
    const north = clampSceneCamera({ scale: 2, centerU: 0.5, centerV: 0 }, extent);
    expect(north.centerV).toBeCloseTo(extent.vMin + 0.25, 10);
    const south = clampSceneCamera({ scale: 2, centerU: 0.5, centerV: 2 }, extent);
    expect(south.centerV).toBeCloseTo(extent.vMax - 0.25, 10);
  });

  it("does not vertically wrap raster dest copies", () => {
    const rects = sceneDestRectsFromIdentityWorldWrapped(W, H, IDENTITY_SCENE_CAMERA, frame);
    expect(rects.length).toBeGreaterThan(0);
    const ys = new Set(rects.map((r) => r.y));
    expect(ys.size).toBe(1);
    expect(rects[0]!.y).toBeCloseTo((28 / 180) * H, 8);
    expect(rects[0]!.height).toBeCloseTo(H, 8);
  });
});

describe("Sun position-lock camera vertical extent", () => {
  const frame = sunPositionLockedSceneReferenceFrame(0, 23.4);
  const extent = sceneCameraVerticalExtentFromFrame(frame);

  it("reuses the same translated-Earth formula as Moon position-lock", () => {
    expect(extent.vMin).toBeCloseTo(23.4 / 180, 12);
    expect(extent.vMax).toBeCloseTo(1 + 23.4 / 180, 12);
    expect(sceneCameraVerticalExtentFromFrame(sunLongitudeLockedSceneReferenceFrame(0, 23.4))).toEqual(
      { vMin: 0, vMax: 1 },
    );
  });

  it("keeps identity centerV at scale 1 even when Earth is translated", () => {
    const cam = clampSceneCamera({ scale: 1, centerU: 0.5, centerV: 0.9 }, extent);
    expect(cam.centerV).toBeCloseTo(0.5, 10);
  });

  it("clamps zoomed pan to the translated Earth, not hard-coded [0, 1]", () => {
    const north = clampSceneCamera({ scale: 2, centerU: 0.5, centerV: 0 }, extent);
    expect(north.centerV).toBeCloseTo(extent.vMin + 0.25, 10);
    const south = clampSceneCamera({ scale: 2, centerU: 0.5, centerV: 2 }, extent);
    expect(south.centerV).toBeCloseTo(extent.vMax - 0.25, 10);
  });

  it("does not vertically wrap raster dest copies", () => {
    const rects = sceneDestRectsFromIdentityWorldWrapped(W, H, IDENTITY_SCENE_CAMERA, frame);
    expect(rects.length).toBeGreaterThan(0);
    const ys = new Set(rects.map((r) => r.y));
    expect(ys.size).toBe(1);
    expect(rects[0]!.y).toBeCloseTo((23.4 / 180) * H, 8);
    expect(rects[0]!.height).toBeCloseTo(H, 8);
  });
});

describe("camera vertical extent depends on lock semantics, not anchor kind", () => {
  it("matches for Moon and Sun given the same numeric position-lock values", () => {
    const moon = anchoredSceneReferenceFrame({
      anchorKind: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 20,
    });
    const sun = anchoredSceneReferenceFrame({
      anchorKind: "sun",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 20,
    });
    expect(sceneCameraVerticalExtentFromFrame(moon)).toEqual(
      sceneCameraVerticalExtentFromFrame(sun),
    );
    expect(sceneCameraVerticalExtentFromFrame(moon)).toEqual({
      vMin: 20 / 180,
      vMax: 1 + 20 / 180,
    });
    expect(
      sceneCameraVerticalExtentFromFrame(
        anchoredSceneReferenceFrame({
          anchorKind: "sun",
          lockMode: "longitude",
          continuousAnchorLonDeg: 10,
          anchorLatDeg: 20,
        }),
      ),
    ).toEqual({ vMin: 0, vMax: 1 });
  });
});
