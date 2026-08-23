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
import { continuousLongitudeFollowingCanonicalDeg } from "./longitudeContinuity";
import { subsolarPoint } from "./subsolarPoint";
import {
  canonicalLatitudeDegFromSceneY,
  canonicalLongitudeDegFromSceneX,
  IDENTITY_SCENE_CAMERA,
  sceneXFromIdentityX,
  sceneXFromLongitudeDeg,
  sceneXsFromLongitudeDeg,
  sceneYFromIdentityY,
  sceneYFromLatitudeDeg,
  type SceneCamera,
  zoomSceneCameraAboutScenePoint,
} from "./sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  canonicalLonLatToSceneFrame,
  isAnchoredSceneReferenceFrame,
  isIdentitySceneReferenceFrame,
  anchoredSceneReferenceFrame,
  isLatitudeLockedSceneReferenceFrame,
  isPositionLockedSceneReferenceFrame,
  isMoonAnchoredSceneReferenceFrame,
  isMoonLongitudeLockedSceneReferenceFrame,
  isMoonPositionLockedSceneReferenceFrame,
  isSunAnchoredSceneReferenceFrame,
  isSunLongitudeLockedSceneReferenceFrame,
  isSunPositionLockedSceneReferenceFrame,
  moonLongitudeLockedSceneReferenceFrame,
  moonPositionLockedSceneReferenceFrame,
  sceneFrameLatitudeDeg,
  sceneFrameLonLatToCanonical,
  sceneFrameRasterIdentityOriginX,
  sceneFrameRasterIdentityOriginY,
  sunLongitudeLockedSceneReferenceFrame,
  sunPositionLockedSceneReferenceFrame,
} from "./sceneReferenceFrame";

const W = 800;
const H = 400;

const SAMPLE_POINTS: readonly { lonDeg: number; latDeg: number; label: string }[] = [
  { lonDeg: -73.98, latDeg: 40.71, label: "ordinary negative longitude" },
  { lonDeg: 12.5, latDeg: -33.9, label: "ordinary positive longitude" },
  { lonDeg: 179, latDeg: 0, label: "near +180" },
  { lonDeg: 180, latDeg: 10, label: "+180" },
  { lonDeg: -179, latDeg: -10, label: "near −180" },
  { lonDeg: -180, latDeg: 45, label: "−180" },
  { lonDeg: 0, latDeg: 89.5, label: "high latitude" },
  { lonDeg: 90, latDeg: -89.5, label: "near south pole" },
];

describe("Earth-fixed identity frame", () => {
  it("is identity and remains a production frame", () => {
    expect(EARTH_FIXED_SCENE_REFERENCE_FRAME.kind).toBe("earthFixed");
    expect(isIdentitySceneReferenceFrame(EARTH_FIXED_SCENE_REFERENCE_FRAME)).toBe(true);
  });

  it("forwards canonical lon/lat as the same numbers (no wrap, no drift)", () => {
    for (const p of SAMPLE_POINTS) {
      const scene = canonicalLonLatToSceneFrame(p, EARTH_FIXED_SCENE_REFERENCE_FRAME);
      expect(scene.sceneLonDeg).toBe(p.lonDeg);
      expect(scene.sceneLatDeg).toBe(p.latDeg);
    }
  });

  it("inverts to the same canonical numbers", () => {
    for (const p of SAMPLE_POINTS) {
      const scene = canonicalLonLatToSceneFrame(p, EARTH_FIXED_SCENE_REFERENCE_FRAME);
      const back = sceneFrameLonLatToCanonical(scene, EARTH_FIXED_SCENE_REFERENCE_FRAME);
      expect(back.lonDeg).toBe(p.lonDeg);
      expect(back.latDeg).toBe(p.latDeg);
    }
  });
});

describe("Earth-fixed mapping equals LIB-081 projection+camera", () => {
  const cameras: readonly { label: string; camera: SceneCamera }[] = [
    { label: "identity camera", camera: IDENTITY_SCENE_CAMERA },
    { label: "zoomed", camera: { scale: 2, centerU: 0.5, centerV: 0.5 } },
    { label: "panned", camera: { scale: 1, centerU: 0.72, centerV: 0.5 } },
    { label: "unwrapped centerU", camera: { scale: 3, centerU: 1.15, centerV: 0.42 } },
  ];

  it("matches the pre-frame lon/lat → projection → camera path exactly", () => {
    for (const { camera } of cameras) {
      for (const p of SAMPLE_POINTS) {
        const withDefault = sceneXFromLongitudeDeg(p.lonDeg, W, camera);
        const withFrame = sceneXFromLongitudeDeg(
          p.lonDeg,
          W,
          camera,
          EARTH_FIXED_SCENE_REFERENCE_FRAME,
        );
        const expectedX = sceneXFromIdentityX(mapXFromLongitudeDeg(p.lonDeg, W), W, camera);
        const expectedY = sceneYFromIdentityY(mapYFromLatitudeDeg(p.latDeg, H), H, camera);
        expect(withDefault).toBe(withFrame);
        expect(withFrame).toBe(expectedX);
        expect(sceneYFromLatitudeDeg(p.latDeg, H, camera)).toBe(expectedY);
        expect(sceneYFromLatitudeDeg(p.latDeg, H, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME)).toBe(
          expectedY,
        );
      }
    }
  });

  it("identity camera places points on the current projection helpers", () => {
    for (const p of SAMPLE_POINTS) {
      expect(sceneXFromLongitudeDeg(p.lonDeg, W, IDENTITY_SCENE_CAMERA)).toBe(
        mapXFromLongitudeDeg(p.lonDeg, W),
      );
      expect(sceneYFromLatitudeDeg(p.latDeg, H, IDENTITY_SCENE_CAMERA)).toBe(
        mapYFromLatitudeDeg(p.latDeg, H),
      );
    }
  });

  it("round-trips forward then inverse to the projection inverse of the same numbers", () => {
    const camera: SceneCamera = { scale: 2.5, centerU: 0.4, centerV: 0.55 };
    const lon = 45;
    const lat = -12;
    const sx = sceneXFromLongitudeDeg(lon, W, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME);
    const sy = sceneYFromLatitudeDeg(lat, H, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME);
    expect(canonicalLongitudeDegFromSceneX(sx, W, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME)).toBeCloseTo(
      lon,
      10,
    );
    expect(canonicalLatitudeDegFromSceneY(sy, H, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME)).toBeCloseTo(
      lat,
      10,
    );
  });

  it("keeps wrapped display copies of a canonical point", () => {
    const camera: SceneCamera = { scale: 1, centerU: 1.05, centerV: 0.5 };
    const lon = 0;
    const xs = sceneXsFromLongitudeDeg(lon, W, camera, 0, EARTH_FIXED_SCENE_REFERENCE_FRAME);
    expect(xs.some((x) => x >= 0 && x <= W)).toBe(true);
    expect(xs).toEqual(sceneXsFromLongitudeDeg(lon, W, camera));
  });
});

describe("Moon longitude-locked production frame", () => {
  const moon = moonLongitudeLockedSceneReferenceFrame(40);

  it("is a production kind that is not identity", () => {
    expect(moon.kind).toBe("anchored");
    expect(moon.anchorKind).toBe("moon");
    expect(moon.lockMode).toBe("longitude");
    expect(isMoonLongitudeLockedSceneReferenceFrame(moon)).toBe(true);
    expect(isIdentitySceneReferenceFrame(moon)).toBe(false);
  });

  it("places the Moon at scene longitude 0 and keeps canonical latitude", () => {
    const scene = canonicalLonLatToSceneFrame({ lonDeg: 40, latDeg: -18.5 }, moon);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 12);
    expect(scene.sceneLatDeg).toBe(-18.5);
  });

  it("maps known geographic longitudes relative to the continuous lunar anchor", () => {
    expect(canonicalLonLatToSceneFrame({ lonDeg: 50, latDeg: 0 }, moon).sceneLonDeg).toBeCloseTo(
      10,
      12,
    );
    expect(canonicalLonLatToSceneFrame({ lonDeg: 10, latDeg: 0 }, moon).sceneLonDeg).toBeCloseTo(
      -30,
      12,
    );
  });

  it("inverts forward mapping back to canonical geography", () => {
    const canonical = { lonDeg: 12.5, latDeg: -33.9 };
    const scene = canonicalLonLatToSceneFrame(canonical, moon);
    const back = sceneFrameLonLatToCanonical(scene, moon);
    expect(back.lonDeg).toBeCloseTo(canonical.lonDeg, 10);
    expect(back.latDeg).toBe(canonical.latDeg);
  });

  it("keeps the Moon at scene longitude 0 through a canonical antimeridian sequence", () => {
    const canonicalAnchor = [178, 179, 180, -179, -178];
    let continuous = canonicalAnchor[0]!;
    const sceneLons: number[] = [];
    const anchors: number[] = [];
    for (const next of canonicalAnchor) {
      continuous = continuousLongitudeFollowingCanonicalDeg(continuous, next);
      anchors.push(continuous);
      const frame = moonLongitudeLockedSceneReferenceFrame(continuous);
      const scene = canonicalLonLatToSceneFrame({ lonDeg: next, latDeg: 12 }, frame);
      sceneLons.push(scene.sceneLonDeg);
      expect(scene.sceneLatDeg).toBe(12);
    }
    expect(anchors).toEqual([178, 179, 180, 181, 182]);
    for (const sceneLon of sceneLons) {
      expect(Math.abs(sceneLon)).toBeLessThan(1e-12);
    }
    for (let i = 1; i < anchors.length; i += 1) {
      expect(anchors[i]! - anchors[i - 1]!).toBe(1);
    }
  });
});

describe("Moon longitude-lock composed with camera", () => {
  const frame = moonLongitudeLockedSceneReferenceFrame(90);
  const cameras: readonly { label: string; camera: SceneCamera }[] = [
    { label: "identity camera", camera: IDENTITY_SCENE_CAMERA },
    { label: "zoomed", camera: { scale: 2, centerU: 0.5, centerV: 0.5 } },
    { label: "panned", camera: { scale: 1, centerU: 0.72, centerV: 0.5 } },
    { label: "unwrapped centerU", camera: { scale: 3, centerU: 1.15, centerV: 0.42 } },
  ];

  it("puts the Moon at the scene-frame origin for every camera", () => {
    for (const { camera } of cameras) {
      const x = sceneXFromLongitudeDeg(90, W, camera, frame);
      const originX = sceneXFromLongitudeDeg(0, W, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME);
      expect(x).toBeCloseTo(originX, 10);
    }
  });

  it("round-trips forward then inverse under zoom, pan, and unwrapped centerU", () => {
    for (const { camera } of cameras) {
      const lon = -120;
      const lat = 35;
      const sx = sceneXFromLongitudeDeg(lon, W, camera, frame);
      const sy = sceneYFromLatitudeDeg(lat, H, camera, frame);
      expect(canonicalLongitudeDegFromSceneX(sx, W, camera, frame)).toBeCloseTo(lon, 8);
      expect(canonicalLatitudeDegFromSceneY(sy, H, camera, frame)).toBeCloseTo(lat, 8);
    }
  });

  it("keeps pointer-stable zoom: the world point under the pointer stays put", () => {
    const camera: SceneCamera = { scale: 2, centerU: 0.4, centerV: 0.55 };
    const lon = 10;
    const lat = -12;
    const sx = sceneXFromLongitudeDeg(lon, W, camera, frame);
    const sy = sceneYFromLatitudeDeg(lat, H, camera, frame);
    const next = zoomSceneCameraAboutScenePoint({
      camera,
      nextScale: 4,
      sceneX: sx,
      sceneY: sy,
      widthPx: W,
      heightPx: H,
    });
    expect(sceneXFromLongitudeDeg(lon, W, next, frame)).toBeCloseTo(sx, 8);
    expect(sceneYFromLatitudeDeg(lat, H, next, frame)).toBeCloseTo(sy, 8);
  });

  it("represents geography 180° from the Moon as equivalent display copies, not a 360° jump", () => {
    const frame = moonLongitudeLockedSceneReferenceFrame(0);
    const camera: SceneCamera = { scale: 1, centerU: 0.5, centerV: 0.5 };
    const xs = sceneXsFromLongitudeDeg(180, W, camera, 0, frame);
    expect(xs.some((x) => Math.abs(x) < 1 || Math.abs(x - W) < 1)).toBe(true);
    const west = canonicalLonLatToSceneFrame({ lonDeg: -179, latDeg: 0 }, frame).sceneLonDeg;
    const east = canonicalLonLatToSceneFrame({ lonDeg: 179, latDeg: 0 }, frame).sceneLonDeg;
    expect(Math.abs(west - east)).toBeGreaterThan(350);
    expect(Math.abs(Math.abs(west) - 179)).toBeLessThan(1e-9);
    expect(Math.abs(Math.abs(east) - 179)).toBeLessThan(1e-9);
  });
});

describe("Moon position-locked production frame", () => {
  const moon = moonPositionLockedSceneReferenceFrame(40, 28);

  it("is a production kind distinct from longitude-lock and Earth-fixed", () => {
    expect(moon.kind).toBe("anchored");
    expect(moon.anchorKind).toBe("moon");
    expect(moon.lockMode).toBe("position");
    expect(isMoonPositionLockedSceneReferenceFrame(moon)).toBe(true);
    expect(isMoonLongitudeLockedSceneReferenceFrame(moon)).toBe(false);
    expect(isMoonAnchoredSceneReferenceFrame(moon)).toBe(true);
    expect(isIdentitySceneReferenceFrame(moon)).toBe(false);
    expect(
      isMoonLongitudeLockedSceneReferenceFrame(moonLongitudeLockedSceneReferenceFrame(40, 28)),
    ).toBe(true);
    expect(
      isMoonPositionLockedSceneReferenceFrame(moonLongitudeLockedSceneReferenceFrame(40, 28)),
    ).toBe(false);
  });

  it("places the Moon at scene origin (0°, 0°)", () => {
    const scene = canonicalLonLatToSceneFrame({ lonDeg: 40, latDeg: 28 }, moon);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 12);
    expect(scene.sceneLatDeg).toBeCloseTo(0, 12);
  });

  it("does not make longitude-lock behave like position-lock", () => {
    const lonOnly = moonLongitudeLockedSceneReferenceFrame(40, 28);
    const scene = canonicalLonLatToSceneFrame({ lonDeg: 40, latDeg: 28 }, lonOnly);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 12);
    expect(scene.sceneLatDeg).toBe(28);
  });

  it("subtracts Moon anchor latitude, including values outside geographic ±90°", () => {
    expect(sceneFrameLatitudeDeg(80, moonPositionLockedSceneReferenceFrame(0, -28))).toBeCloseTo(
      108,
      12,
    );
    expect(sceneFrameLatitudeDeg(-80, moonPositionLockedSceneReferenceFrame(0, 28))).toBeCloseTo(
      -108,
      12,
    );
    expect(canonicalLonLatToSceneFrame({ lonDeg: 0, latDeg: 80 }, moon).sceneLatDeg).toBeCloseTo(
      52,
      12,
    );
  });

  it("inverts forward mapping back to canonical geography", () => {
    const canonical = { lonDeg: 12.5, latDeg: -33.9 };
    const scene = canonicalLonLatToSceneFrame(canonical, moon);
    const back = sceneFrameLonLatToCanonical(scene, moon);
    expect(back.lonDeg).toBeCloseTo(canonical.lonDeg, 10);
    expect(back.latDeg).toBeCloseTo(canonical.latDeg, 10);
  });

  it("inverts out-of-range scene latitudes at the geographic boundary", () => {
    const frame = moonPositionLockedSceneReferenceFrame(0, 28);
    const south = sceneFrameLonLatToCanonical({ sceneLonDeg: 0, sceneLatDeg: -108 }, frame);
    expect(south.latDeg).toBeCloseTo(-80, 10);
    const beyond = sceneFrameLonLatToCanonical({ sceneLonDeg: 0, sceneLatDeg: -130 }, frame);
    expect(beyond.latDeg).toBe(-90);
  });

  it("keeps the Moon at scene origin as the longitude anchor follows the antimeridian", () => {
    const canonicalAnchor = [178, 179, 180, -179, -178];
    let continuous = canonicalAnchor[0]!;
    for (const next of canonicalAnchor) {
      continuous = continuousLongitudeFollowingCanonicalDeg(continuous, next);
      const frame = moonPositionLockedSceneReferenceFrame(continuous, 12);
      const scene = canonicalLonLatToSceneFrame({ lonDeg: next, latDeg: 12 }, frame);
      expect(Math.abs(scene.sceneLonDeg)).toBeLessThan(1e-12);
      expect(scene.sceneLatDeg).toBeCloseTo(0, 12);
    }
  });

  it("moves Earth scene coordinates when the Moon latitude anchor changes, while the Moon stays at origin", () => {
    const city = { lonDeg: 10, latDeg: 0 };
    const t1 = moonPositionLockedSceneReferenceFrame(20, 10);
    const t2 = moonPositionLockedSceneReferenceFrame(22, 16);
    const moon1 = canonicalLonLatToSceneFrame({ lonDeg: 20, latDeg: 10 }, t1);
    const moon2 = canonicalLonLatToSceneFrame({ lonDeg: 22, latDeg: 16 }, t2);
    expect(moon1.sceneLonDeg).toBeCloseTo(0, 12);
    expect(moon1.sceneLatDeg).toBeCloseTo(0, 12);
    expect(moon2.sceneLonDeg).toBeCloseTo(0, 12);
    expect(moon2.sceneLatDeg).toBeCloseTo(0, 12);
    const city1 = canonicalLonLatToSceneFrame(city, t1);
    const city2 = canonicalLonLatToSceneFrame(city, t2);
    expect(city1.sceneLatDeg).toBeCloseTo(-10, 12);
    expect(city2.sceneLatDeg).toBeCloseTo(-16, 12);
    expect(city1.sceneLonDeg).not.toBeCloseTo(city2.sceneLonDeg, 8);
  });
});

describe("Moon position-lock composed with camera", () => {
  const frame = moonPositionLockedSceneReferenceFrame(90, 28);
  const cameras: readonly { label: string; camera: SceneCamera }[] = [
    { label: "identity camera", camera: IDENTITY_SCENE_CAMERA },
    { label: "zoomed", camera: { scale: 2, centerU: 0.5, centerV: 0.5 } },
    { label: "panned", camera: { scale: 1, centerU: 0.72, centerV: 0.5 } },
    { label: "unwrapped centerU", camera: { scale: 3, centerU: 1.15, centerV: 0.42 } },
  ];

  it("puts the Moon at the scene-frame origin for every camera", () => {
    for (const { camera } of cameras) {
      const x = sceneXFromLongitudeDeg(90, W, camera, frame);
      const y = sceneYFromLatitudeDeg(28, H, camera, frame);
      const originX = sceneXFromLongitudeDeg(0, W, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME);
      const originY = sceneYFromLatitudeDeg(0, H, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME);
      expect(x).toBeCloseTo(originX, 10);
      expect(y).toBeCloseTo(originY, 10);
    }
  });

  it("round-trips forward then inverse under zoom, pan, and unwrapped centerU", () => {
    for (const { camera } of cameras) {
      const lon = -120;
      const lat = 35;
      const sx = sceneXFromLongitudeDeg(lon, W, camera, frame);
      const sy = sceneYFromLatitudeDeg(lat, H, camera, frame);
      expect(canonicalLongitudeDegFromSceneX(sx, W, camera, frame)).toBeCloseTo(lon, 8);
      expect(canonicalLatitudeDegFromSceneY(sy, H, camera, frame)).toBeCloseTo(lat, 8);
    }
  });

  it("registers a geographic point with the translated raster dest", () => {
    const originX = sceneFrameRasterIdentityOriginX(W, frame);
    const originY = sceneFrameRasterIdentityOriginY(H, frame);
    const lon = 0;
    const lat = 0;
    const scene = canonicalLonLatToSceneFrame({ lonDeg: lon, latDeg: lat }, frame);
    const expectedX = mapXFromLongitudeDeg(scene.sceneLonDeg, W);
    const expectedY = mapYFromLatitudeDeg(scene.sceneLatDeg, H);
    const rasterX = originX + mapXFromLongitudeDeg(lon, W);
    const rasterY = originY + mapYFromLatitudeDeg(lat, H);
    expect(rasterX).toBeCloseTo(expectedX, 10);
    expect(rasterY).toBeCloseTo(expectedY, 10);
  });
});

describe("Sun longitude-locked production frame", () => {
  const sun = sunLongitudeLockedSceneReferenceFrame(40);

  it("is a production kind distinct from Moon and Earth-fixed", () => {
    expect(sun.kind).toBe("anchored");
    expect(sun.anchorKind).toBe("sun");
    expect(sun.lockMode).toBe("longitude");
    expect(isSunLongitudeLockedSceneReferenceFrame(sun)).toBe(true);
    expect(isSunPositionLockedSceneReferenceFrame(sun)).toBe(false);
    expect(isSunAnchoredSceneReferenceFrame(sun)).toBe(true);
    expect(isAnchoredSceneReferenceFrame(sun)).toBe(true);
    expect(isMoonAnchoredSceneReferenceFrame(sun)).toBe(false);
    expect(isLatitudeLockedSceneReferenceFrame(sun)).toBe(false);
    expect(isIdentitySceneReferenceFrame(sun)).toBe(false);
  });

  it("places the Sun at scene longitude 0 and keeps canonical latitude", () => {
    const scene = canonicalLonLatToSceneFrame({ lonDeg: 40, latDeg: -18.5 }, sun);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 12);
    expect(scene.sceneLatDeg).toBe(-18.5);
  });

  it("maps known geographic longitudes relative to the continuous solar anchor", () => {
    expect(canonicalLonLatToSceneFrame({ lonDeg: 50, latDeg: 0 }, sun).sceneLonDeg).toBeCloseTo(
      10,
      12,
    );
    expect(canonicalLonLatToSceneFrame({ lonDeg: 10, latDeg: 0 }, sun).sceneLonDeg).toBeCloseTo(
      -30,
      12,
    );
  });

  it("inverts forward mapping back to canonical geography", () => {
    const canonical = { lonDeg: 12.5, latDeg: -33.9 };
    const scene = canonicalLonLatToSceneFrame(canonical, sun);
    const back = sceneFrameLonLatToCanonical(scene, sun);
    expect(back.lonDeg).toBeCloseTo(canonical.lonDeg, 10);
    expect(back.latDeg).toBe(canonical.latDeg);
  });

  it("keeps the Sun at scene longitude 0 through a canonical antimeridian sequence", () => {
    const canonicalAnchor = [178, 179, 180, -179, -178];
    let continuous = canonicalAnchor[0]!;
    const sceneLons: number[] = [];
    const anchors: number[] = [];
    for (const next of canonicalAnchor) {
      continuous = continuousLongitudeFollowingCanonicalDeg(continuous, next);
      anchors.push(continuous);
      const frame = sunLongitudeLockedSceneReferenceFrame(continuous);
      const scene = canonicalLonLatToSceneFrame({ lonDeg: next, latDeg: 12 }, frame);
      sceneLons.push(scene.sceneLonDeg);
      expect(scene.sceneLatDeg).toBe(12);
    }
    expect(anchors).toEqual([178, 179, 180, 181, 182]);
    for (const sceneLon of sceneLons) {
      expect(Math.abs(sceneLon)).toBeLessThan(1e-12);
    }
    for (let i = 1; i < anchors.length; i += 1) {
      expect(anchors[i]! - anchors[i - 1]!).toBe(1);
    }
  });

  it("treats the Moon as ordinary geography, not the frame origin", () => {
    const moon = { lonDeg: -120, latDeg: 18 };
    const scene = canonicalLonLatToSceneFrame(moon, sun);
    expect(scene.sceneLonDeg).not.toBeCloseTo(0, 8);
    expect(scene.sceneLatDeg).toBe(18);
  });
});

describe("Sun longitude-lock composed with camera", () => {
  const frame = sunLongitudeLockedSceneReferenceFrame(90);
  const cameras: readonly { label: string; camera: SceneCamera }[] = [
    { label: "identity camera", camera: IDENTITY_SCENE_CAMERA },
    { label: "zoomed", camera: { scale: 2, centerU: 0.5, centerV: 0.5 } },
    { label: "panned", camera: { scale: 1, centerU: 0.72, centerV: 0.5 } },
    { label: "unwrapped centerU", camera: { scale: 3, centerU: 1.15, centerV: 0.42 } },
  ];

  it("puts the Sun at the scene-frame origin meridian for every camera", () => {
    for (const { camera } of cameras) {
      const x = sceneXFromLongitudeDeg(90, W, camera, frame);
      const originX = sceneXFromLongitudeDeg(0, W, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME);
      expect(x).toBeCloseTo(originX, 10);
    }
  });

  it("round-trips forward then inverse under zoom, pan, and unwrapped centerU", () => {
    for (const { camera } of cameras) {
      const lon = -120;
      const lat = 35;
      const sx = sceneXFromLongitudeDeg(lon, W, camera, frame);
      const sy = sceneYFromLatitudeDeg(lat, H, camera, frame);
      expect(canonicalLongitudeDegFromSceneX(sx, W, camera, frame)).toBeCloseTo(lon, 8);
      expect(canonicalLatitudeDegFromSceneY(sy, H, camera, frame)).toBeCloseTo(lat, 8);
    }
  });

  it("keeps pointer-stable zoom: the world point under the pointer stays put", () => {
    const camera: SceneCamera = { scale: 2, centerU: 0.4, centerV: 0.55 };
    const lon = 10;
    const lat = -12;
    const sx = sceneXFromLongitudeDeg(lon, W, camera, frame);
    const sy = sceneYFromLatitudeDeg(lat, H, camera, frame);
    const next = zoomSceneCameraAboutScenePoint({
      camera,
      nextScale: 4,
      sceneX: sx,
      sceneY: sy,
      widthPx: W,
      heightPx: H,
    });
    expect(sceneXFromLongitudeDeg(lon, W, next, frame)).toBeCloseTo(sx, 8);
    expect(sceneYFromLatitudeDeg(lat, H, next, frame)).toBeCloseTo(sy, 8);
  });
});

describe("Sun position-locked production frame", () => {
  const sun = sunPositionLockedSceneReferenceFrame(40, 28);

  it("is a production kind distinct from longitude-lock, Moon, and Earth-fixed", () => {
    expect(sun.kind).toBe("anchored");
    expect(sun.anchorKind).toBe("sun");
    expect(sun.lockMode).toBe("position");
    expect(isSunPositionLockedSceneReferenceFrame(sun)).toBe(true);
    expect(isSunLongitudeLockedSceneReferenceFrame(sun)).toBe(false);
    expect(isSunAnchoredSceneReferenceFrame(sun)).toBe(true);
    expect(isLatitudeLockedSceneReferenceFrame(sun)).toBe(true);
    expect(isMoonPositionLockedSceneReferenceFrame(sun)).toBe(false);
    expect(isMoonLongitudeLockedSceneReferenceFrame(sun)).toBe(false);
    expect(isIdentitySceneReferenceFrame(sun)).toBe(false);
  });

  it("places the Sun at scene origin (0°, 0°)", () => {
    const scene = canonicalLonLatToSceneFrame({ lonDeg: 40, latDeg: 28 }, sun);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 12);
    expect(scene.sceneLatDeg).toBeCloseTo(0, 12);
  });

  it("does not make longitude-lock behave like position-lock", () => {
    const lonOnly = sunLongitudeLockedSceneReferenceFrame(40, 28);
    const scene = canonicalLonLatToSceneFrame({ lonDeg: 40, latDeg: 28 }, lonOnly);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 12);
    expect(scene.sceneLatDeg).toBe(28);
  });

  it("subtracts Sun anchor latitude, including values outside geographic ±90°", () => {
    expect(sceneFrameLatitudeDeg(80, sunPositionLockedSceneReferenceFrame(0, -23.4))).toBeCloseTo(
      103.4,
      12,
    );
    expect(sceneFrameLatitudeDeg(-80, sunPositionLockedSceneReferenceFrame(0, 23.4))).toBeCloseTo(
      -103.4,
      12,
    );
  });

  it("inverts forward mapping back to canonical geography", () => {
    const canonical = { lonDeg: 12.5, latDeg: -33.9 };
    const scene = canonicalLonLatToSceneFrame(canonical, sun);
    const back = sceneFrameLonLatToCanonical(scene, sun);
    expect(back.lonDeg).toBeCloseTo(canonical.lonDeg, 10);
    expect(back.latDeg).toBeCloseTo(canonical.latDeg, 10);
  });

  it("inverts out-of-range scene latitudes at the geographic boundary", () => {
    const frame = sunPositionLockedSceneReferenceFrame(0, 23.4);
    const south = sceneFrameLonLatToCanonical({ sceneLonDeg: 0, sceneLatDeg: -113.4 }, frame);
    expect(south.latDeg).toBeCloseTo(-90, 10);
    const recovered = sceneFrameLonLatToCanonical({ sceneLonDeg: 0, sceneLatDeg: -80 }, frame);
    expect(recovered.latDeg).toBeCloseTo(-56.6, 10);
  });

  it("keeps the Sun at scene origin as the longitude anchor follows the antimeridian", () => {
    const canonicalAnchor = [178, 179, 180, -179, -178];
    let continuous = canonicalAnchor[0]!;
    for (const next of canonicalAnchor) {
      continuous = continuousLongitudeFollowingCanonicalDeg(continuous, next);
      const frame = sunPositionLockedSceneReferenceFrame(continuous, 12);
      const scene = canonicalLonLatToSceneFrame({ lonDeg: next, latDeg: 12 }, frame);
      expect(Math.abs(scene.sceneLonDeg)).toBeLessThan(1e-12);
      expect(scene.sceneLatDeg).toBeCloseTo(0, 12);
    }
  });

  it("moves Earth scene coordinates when the Sun latitude anchor changes, while the Sun stays at origin", () => {
    const city = { lonDeg: 10, latDeg: 0 };
    const t1 = sunPositionLockedSceneReferenceFrame(20, 0);
    const t2 = sunPositionLockedSceneReferenceFrame(22, 23.4);
    const sun1 = canonicalLonLatToSceneFrame({ lonDeg: 20, latDeg: 0 }, t1);
    const sun2 = canonicalLonLatToSceneFrame({ lonDeg: 22, latDeg: 23.4 }, t2);
    expect(sun1.sceneLonDeg).toBeCloseTo(0, 12);
    expect(sun1.sceneLatDeg).toBeCloseTo(0, 12);
    expect(sun2.sceneLonDeg).toBeCloseTo(0, 12);
    expect(sun2.sceneLatDeg).toBeCloseTo(0, 12);
    const city1 = canonicalLonLatToSceneFrame(city, t1);
    const city2 = canonicalLonLatToSceneFrame(city, t2);
    expect(city1.sceneLatDeg).toBeCloseTo(0, 12);
    expect(city2.sceneLatDeg).toBeCloseTo(-23.4, 12);
    expect(city1.sceneLonDeg).not.toBeCloseTo(city2.sceneLonDeg, 8);
  });

  it("locks seasonal subsolar latitudes to the origin while Earth vertical placement changes", () => {
    const equinox = Date.UTC(2026, 2, 20, 12, 0, 0);
    const solstice = Date.UTC(2026, 5, 21, 12, 0, 0);
    const sunEq = subsolarPoint(equinox);
    const sunSol = subsolarPoint(solstice);
    expect(Math.abs(sunSol.latDeg - sunEq.latDeg)).toBeGreaterThan(15);
    const eqFrame = sunPositionLockedSceneReferenceFrame(sunEq.lonDeg, sunEq.latDeg);
    const solFrame = sunPositionLockedSceneReferenceFrame(sunSol.lonDeg, sunSol.latDeg);
    const originEq = canonicalLonLatToSceneFrame(sunEq, eqFrame);
    const originSol = canonicalLonLatToSceneFrame(sunSol, solFrame);
    expect(originEq.sceneLonDeg).toBeCloseTo(0, 10);
    expect(originEq.sceneLatDeg).toBeCloseTo(0, 10);
    expect(originSol.sceneLonDeg).toBeCloseTo(0, 10);
    expect(originSol.sceneLatDeg).toBeCloseTo(0, 10);
    const equatorEq = canonicalLonLatToSceneFrame({ lonDeg: 0, latDeg: 0 }, eqFrame);
    const equatorSol = canonicalLonLatToSceneFrame({ lonDeg: 0, latDeg: 0 }, solFrame);
    expect(equatorEq.sceneLatDeg).toBeCloseTo(-sunEq.latDeg, 10);
    expect(equatorSol.sceneLatDeg).toBeCloseTo(-sunSol.latDeg, 10);
    expect(equatorEq.sceneLatDeg).not.toBeCloseTo(equatorSol.sceneLatDeg, 4);
  });
});

describe("Sun position-lock composed with camera", () => {
  const frame = sunPositionLockedSceneReferenceFrame(90, 23.4);
  const cameras: readonly { label: string; camera: SceneCamera }[] = [
    { label: "identity camera", camera: IDENTITY_SCENE_CAMERA },
    { label: "zoomed", camera: { scale: 2, centerU: 0.5, centerV: 0.5 } },
    { label: "panned", camera: { scale: 1, centerU: 0.72, centerV: 0.5 } },
    { label: "unwrapped centerU", camera: { scale: 3, centerU: 1.15, centerV: 0.42 } },
  ];

  it("puts the Sun at the scene-frame origin for every camera", () => {
    for (const { camera } of cameras) {
      const x = sceneXFromLongitudeDeg(90, W, camera, frame);
      const y = sceneYFromLatitudeDeg(23.4, H, camera, frame);
      const originX = sceneXFromLongitudeDeg(0, W, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME);
      const originY = sceneYFromLatitudeDeg(0, H, camera, EARTH_FIXED_SCENE_REFERENCE_FRAME);
      expect(x).toBeCloseTo(originX, 10);
      expect(y).toBeCloseTo(originY, 10);
    }
  });

  it("round-trips forward then inverse under zoom, pan, and unwrapped centerU", () => {
    for (const { camera } of cameras) {
      const lon = -120;
      const lat = 35;
      const sx = sceneXFromLongitudeDeg(lon, W, camera, frame);
      const sy = sceneYFromLatitudeDeg(lat, H, camera, frame);
      expect(canonicalLongitudeDegFromSceneX(sx, W, camera, frame)).toBeCloseTo(lon, 8);
      expect(canonicalLatitudeDegFromSceneY(sy, H, camera, frame)).toBeCloseTo(lat, 8);
    }
  });

  it("registers a geographic point with the translated raster dest", () => {
    const originX = sceneFrameRasterIdentityOriginX(W, frame);
    const originY = sceneFrameRasterIdentityOriginY(H, frame);
    const lon = 0;
    const lat = 0;
    const scene = canonicalLonLatToSceneFrame({ lonDeg: lon, latDeg: lat }, frame);
    const expectedX = mapXFromLongitudeDeg(scene.sceneLonDeg, W);
    const expectedY = mapYFromLatitudeDeg(scene.sceneLatDeg, H);
    const rasterX = originX + mapXFromLongitudeDeg(lon, W);
    const rasterY = originY + mapYFromLatitudeDeg(lat, H);
    expect(rasterX).toBeCloseTo(expectedX, 10);
    expect(rasterY).toBeCloseTo(expectedY, 10);
  });

  it("does not vertically shift longitude-lock rasters", () => {
    const lonOnly = sunLongitudeLockedSceneReferenceFrame(90, 23.4);
    expect(sceneFrameRasterIdentityOriginY(H, lonOnly)).toBe(0);
    expect(sceneFrameRasterIdentityOriginY(H, EARTH_FIXED_SCENE_REFERENCE_FRAME)).toBe(0);
  });
});

describe("shared anchored production model", () => {
  const ANCHORS = ["moon", "sun"] as const;
  const LON = 40;
  const LAT = 28;
  const POINT = { lonDeg: 12.5, latDeg: -33.9 };

  it("gives Moon and Sun the same structural shape except identity, coordinates, and lock mode", () => {
    const moonLon = anchoredSceneReferenceFrame({
      anchorKind: "moon",
      lockMode: "longitude",
      continuousAnchorLonDeg: LON,
      anchorLatDeg: LAT,
    });
    const sunLon = anchoredSceneReferenceFrame({
      anchorKind: "sun",
      lockMode: "longitude",
      continuousAnchorLonDeg: LON,
      anchorLatDeg: LAT,
    });
    expect(moonLon).toMatchObject({
      kind: "anchored",
      lockMode: "longitude",
      continuousAnchorLonDeg: LON,
      anchorLatDeg: LAT,
    });
    expect(sunLon).toMatchObject({
      kind: "anchored",
      lockMode: "longitude",
      continuousAnchorLonDeg: LON,
      anchorLatDeg: LAT,
    });
    expect(moonLon.anchorKind).toBe("moon");
    expect(sunLon.anchorKind).toBe("sun");
    expect(moonLongitudeLockedSceneReferenceFrame(LON, LAT)).toEqual(moonLon);
    expect(sunLongitudeLockedSceneReferenceFrame(LON, LAT)).toEqual(sunLon);
    expect(moonPositionLockedSceneReferenceFrame(LON, LAT).lockMode).toBe("position");
    expect(sunPositionLockedSceneReferenceFrame(LON, LAT).lockMode).toBe("position");
  });

  it("applies longitude and position lock independently of anchor kind", () => {
    for (const anchorKind of ANCHORS) {
      const lonLock = anchoredSceneReferenceFrame({
        anchorKind,
        lockMode: "longitude",
        continuousAnchorLonDeg: LON,
        anchorLatDeg: LAT,
      });
      const posLock = anchoredSceneReferenceFrame({
        anchorKind,
        lockMode: "position",
        continuousAnchorLonDeg: LON,
        anchorLatDeg: LAT,
      });
      const lonScene = canonicalLonLatToSceneFrame({ lonDeg: LON, latDeg: LAT }, lonLock);
      const posScene = canonicalLonLatToSceneFrame({ lonDeg: LON, latDeg: LAT }, posLock);
      expect(lonScene.sceneLonDeg).toBeCloseTo(0, 12);
      expect(lonScene.sceneLatDeg).toBe(LAT);
      expect(posScene.sceneLonDeg).toBeCloseTo(0, 12);
      expect(posScene.sceneLatDeg).toBeCloseTo(0, 12);
      expect(isLatitudeLockedSceneReferenceFrame(lonLock)).toBe(false);
      expect(isPositionLockedSceneReferenceFrame(posLock)).toBe(true);
    }
  });

  it("transforms the same canonical point identically for Moon and Sun identity", () => {
    for (const lockMode of ["longitude", "position"] as const) {
      const moon = anchoredSceneReferenceFrame({
        anchorKind: "moon",
        lockMode,
        continuousAnchorLonDeg: LON,
        anchorLatDeg: LAT,
      });
      const sun = anchoredSceneReferenceFrame({
        anchorKind: "sun",
        lockMode,
        continuousAnchorLonDeg: LON,
        anchorLatDeg: LAT,
      });
      expect(canonicalLonLatToSceneFrame(POINT, moon)).toEqual(
        canonicalLonLatToSceneFrame(POINT, sun),
      );
    }
  });

  it("inverts identically for Moon and Sun identity", () => {
    for (const lockMode of ["longitude", "position"] as const) {
      const moon = anchoredSceneReferenceFrame({
        anchorKind: "moon",
        lockMode,
        continuousAnchorLonDeg: LON,
        anchorLatDeg: LAT,
      });
      const sun = anchoredSceneReferenceFrame({
        anchorKind: "sun",
        lockMode,
        continuousAnchorLonDeg: LON,
        anchorLatDeg: LAT,
      });
      const scene = canonicalLonLatToSceneFrame(POINT, moon);
      expect(sceneFrameLonLatToCanonical(scene, moon)).toEqual(
        sceneFrameLonLatToCanonical(scene, sun),
      );
    }
  });

  it("shifts rasters from numeric frame values, not anchor kind", () => {
    for (const lockMode of ["longitude", "position"] as const) {
      const moon = anchoredSceneReferenceFrame({
        anchorKind: "moon",
        lockMode,
        continuousAnchorLonDeg: LON,
        anchorLatDeg: LAT,
      });
      const sun = anchoredSceneReferenceFrame({
        anchorKind: "sun",
        lockMode,
        continuousAnchorLonDeg: LON,
        anchorLatDeg: LAT,
      });
      expect(sceneFrameRasterIdentityOriginX(W, moon)).toBe(sceneFrameRasterIdentityOriginX(W, sun));
      expect(sceneFrameRasterIdentityOriginY(H, moon)).toBe(sceneFrameRasterIdentityOriginY(H, sun));
    }
    expect(
      sceneFrameRasterIdentityOriginY(
        H,
        anchoredSceneReferenceFrame({
          anchorKind: "moon",
          lockMode: "longitude",
          continuousAnchorLonDeg: LON,
          anchorLatDeg: LAT,
        }),
      ),
    ).toBe(0);
  });
});
