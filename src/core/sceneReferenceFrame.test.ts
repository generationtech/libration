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
  isIdentitySceneReferenceFrame,
  isMoonLongitudeLockedSceneReferenceFrame,
  moonLongitudeLockedSceneReferenceFrame,
  sceneFrameLonLatToCanonical,
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
    expect(moon.kind).toBe("moonAnchored");
    expect(moon.longitudeLocked).toBe(true);
    expect(moon.latitudeLocked).toBe(false);
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
