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
} from "./sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  canonicalLonLatToSceneFrame,
  isIdentitySceneReferenceFrame,
  relativeLongitudeSceneFrameLonLat,
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
  it("is the only active production frame and is identity", () => {
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

describe("future relative-longitude frame seam (not a production mode)", () => {
  it("keeps relative longitude continuous while a canonical anchor wraps the antimeridian", () => {
    const canonicalAnchor = [179, 180, -179, -178];
    let continuousAnchor = canonicalAnchor[0]!;
    const pointLon = 179;
    const relatives: number[] = [];
    for (const next of canonicalAnchor) {
      continuousAnchor = continuousLongitudeFollowingCanonicalDeg(continuousAnchor, next);
      const scene = relativeLongitudeSceneFrameLonLat(
        { lonDeg: pointLon, latDeg: 12 },
        continuousAnchor,
      );
      relatives.push(scene.sceneLonDeg);
      expect(scene.sceneLatDeg).toBe(12);
    }
    expect(relatives).toEqual([0, -1, -2, -3]);
    for (let i = 1; i < relatives.length; i += 1) {
      expect(Math.abs(relatives[i]! - relatives[i - 1]!)).toBeLessThan(2);
    }
  });
});
