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
 * LIB-089 — ISS as a trackable map object on the existing anchored frame.
 */

import { describe, expect, it } from "vitest";
import {
  IDENTITY_SCENE_CAMERA,
  SCENE_CAMERA_MAX_SCALE,
  applyAutomaticSceneCoverScale,
  defaultSceneCameraForCover,
  isIdentitySceneCamera,
  minimumScaleToCoverSceneFrameEarth,
  sceneCameraCoverPolicyAfterFrameKindChange,
  sceneCameraCoverPolicyAfterManualZoom,
  sceneCameraCoverPolicyForFrame,
  sceneCameraVerticalExtentFromFrame,
  sceneXFromLongitudeDeg,
  sceneYFromLatitudeDeg,
} from "./sceneCamera";
import {
  SCENE_REFERENCE_FRAME_UI_KINDS,
  anchoredSceneFrameLockModeFromUiKind,
  isAnchoredSceneReferenceFrameUiKind,
  isIssAnchoredSceneReferenceFrameUiKind,
  isPositionLockedSceneReferenceFrameUiKind,
  nextAnchorContinuousLonDeg,
  sceneCameraAfterReferenceFrameKindChange,
  sceneReferenceFrameFromUiKind,
  sceneReferenceFrameUiKindWhenTargetUnavailable,
  trackableMapObjectIdFromUiKind,
} from "./sceneFrameAnchor";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  anchoredSceneReferenceFrame,
  canonicalLonLatToSceneFrame,
  issLongitudeLockedSceneReferenceFrame,
  issPositionLockedSceneReferenceFrame,
  sceneFrameLatitudeDeg,
  sceneFrameLonLatToCanonical,
  sceneFrameLongitudeDeg,
  sceneFrameRasterIdentityOriginX,
  sceneFrameRasterIdentityOriginY,
} from "./sceneReferenceFrame";
import { mapXFromLongitudeDeg, mapYFromLatitudeDeg } from "./equirectangularProjection";
import { resolveTrackableMapObject } from "./trackableMapObject";

const ISS = { lonDeg: 179.2, latDeg: 51.6 };
const MOON = { lonDeg: 40, latDeg: 18 };
const SUN = { lonDeg: -80, latDeg: -12 };
const STATE = { moon: MOON, sun: SUN, iss: ISS };
const W = 1800;
const H = 900;

describe("LIB-089 ISS tracking target", () => {
  it("maps seven UI choices onto Earth-fixed or target + lockMode", () => {
    expect(SCENE_REFERENCE_FRAME_UI_KINDS).toEqual([
      "earthFixed",
      "moonLongitudeLocked",
      "moonPositionLocked",
      "sunLongitudeLocked",
      "sunPositionLocked",
      "issLongitudeLocked",
      "issPositionLocked",
    ]);
    expect(trackableMapObjectIdFromUiKind("earthFixed")).toBeNull();
    expect(anchoredSceneFrameLockModeFromUiKind("earthFixed")).toBeNull();
    expect(trackableMapObjectIdFromUiKind("issLongitudeLocked")).toBe("iss");
    expect(anchoredSceneFrameLockModeFromUiKind("issLongitudeLocked")).toBe("longitude");
    expect(trackableMapObjectIdFromUiKind("issPositionLocked")).toBe("iss");
    expect(anchoredSceneFrameLockModeFromUiKind("issPositionLocked")).toBe("position");
    expect(isIssAnchoredSceneReferenceFrameUiKind("issLongitudeLocked")).toBe(true);
    expect(isIssAnchoredSceneReferenceFrameUiKind("moonPositionLocked")).toBe(false);
    expect(isAnchoredSceneReferenceFrameUiKind("issPositionLocked")).toBe(true);
    expect(isPositionLockedSceneReferenceFrameUiKind("issPositionLocked")).toBe(true);
    expect(isPositionLockedSceneReferenceFrameUiKind("issLongitudeLocked")).toBe(false);
  });

  it("builds ISS anchored frames from the shared production type", () => {
    expect(sceneReferenceFrameFromUiKind("issLongitudeLocked", ISS.lonDeg, ISS.latDeg)).toEqual({
      kind: "anchored",
      target: "iss",
      lockMode: "longitude",
      continuousAnchorLonDeg: ISS.lonDeg,
      anchorLatDeg: ISS.latDeg,
    });
    expect(sceneReferenceFrameFromUiKind("issPositionLocked", ISS.lonDeg, ISS.latDeg)).toEqual({
      kind: "anchored",
      target: "iss",
      lockMode: "position",
      continuousAnchorLonDeg: ISS.lonDeg,
      anchorLatDeg: ISS.latDeg,
    });
    expect(issLongitudeLockedSceneReferenceFrame(ISS.lonDeg, ISS.latDeg).target).toBe("iss");
    expect(issPositionLockedSceneReferenceFrame(ISS.lonDeg, ISS.latDeg).lockMode).toBe("position");
  });

  it("cannot construct an ISS-anchored UI kind when ISS is unavailable", () => {
    const available = { moon: true, sun: true, iss: false };
    expect(
      sceneReferenceFrameUiKindWhenTargetUnavailable("issLongitudeLocked", available),
    ).toBe("earthFixed");
    expect(
      sceneReferenceFrameUiKindWhenTargetUnavailable("issPositionLocked", available),
    ).toBe("earthFixed");
    expect(
      sceneReferenceFrameUiKindWhenTargetUnavailable("moonPositionLocked", available),
    ).toBe("moonPositionLocked");
    expect(
      sceneReferenceFrameUiKindWhenTargetUnavailable("earthFixed", available),
    ).toBe("earthFixed");
    expect(resolveTrackableMapObject("iss", { ...STATE, iss: null })).toBeNull();
  });

  it("maps ISS longitude-lock to scene longitude 0 at the ISS latitude", () => {
    const resolved = resolveTrackableMapObject("iss", STATE)!;
    const frame = anchoredSceneReferenceFrame({
      target: "iss",
      lockMode: "longitude",
      continuousAnchorLonDeg: resolved.lonDeg,
      anchorLatDeg: resolved.latDeg,
    });
    const scene = canonicalLonLatToSceneFrame(resolved, frame);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 12);
    expect(scene.sceneLatDeg).toBe(resolved.latDeg);
    expect(sceneFrameLongitudeDeg(resolved.lonDeg, frame)).toBeCloseTo(0, 12);
    expect(sceneFrameLatitudeDeg(resolved.latDeg, frame)).toBe(resolved.latDeg);
  });

  it("maps ISS position-lock to the scene-frame origin", () => {
    const resolved = resolveTrackableMapObject("iss", STATE)!;
    const frame = anchoredSceneReferenceFrame({
      target: "iss",
      lockMode: "position",
      continuousAnchorLonDeg: resolved.lonDeg,
      anchorLatDeg: resolved.latDeg,
    });
    const scene = canonicalLonLatToSceneFrame(resolved, frame);
    expect(scene.sceneLonDeg).toBeCloseTo(0, 12);
    expect(scene.sceneLatDeg).toBeCloseTo(0, 12);
  });

  it("uses the same canonical ISS position as both tracking anchor and rendered point", () => {
    const tracking = resolveTrackableMapObject("iss", STATE)!;
    const rendered = { lonDeg: ISS.lonDeg, latDeg: ISS.latDeg };
    expect(tracking).toEqual(rendered);
    const lonFrame = issLongitudeLockedSceneReferenceFrame(tracking.lonDeg, tracking.latDeg);
    const posFrame = issPositionLockedSceneReferenceFrame(tracking.lonDeg, tracking.latDeg);
    expect(canonicalLonLatToSceneFrame(rendered, lonFrame)).toEqual(
      canonicalLonLatToSceneFrame(tracking, lonFrame),
    );
    const posScene = canonicalLonLatToSceneFrame(rendered, posFrame);
    expect(posScene.sceneLonDeg).toBeCloseTo(0, 12);
    expect(posScene.sceneLatDeg).toBeCloseTo(0, 12);
  });

  it("follows ISS antimeridian crossings without a 360° frame jump", () => {
    const canonical = [178, 179, 180, -179, -178];
    let continuous: number | null = null;
    const followed: number[] = [];
    for (const next of canonical) {
      continuous = nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: continuous,
        nextCanonicalLonDeg: next,
        policy: "follow",
      });
      followed.push(continuous);
      const frame = issLongitudeLockedSceneReferenceFrame(continuous, 12);
      expect(sceneFrameLongitudeDeg(next, frame)).toBeCloseTo(0, 10);
    }
    expect(followed).toEqual([178, 179, 180, 181, 182]);
    for (let i = 1; i < followed.length; i += 1) {
      expect(Math.abs(followed[i]! - followed[i - 1]!)).toBeLessThan(2);
    }
  });

  it("keeps continuity across more than one world turn and rebases without a jump", () => {
    let continuous: number | null = 170;
    const steps: number[] = [];
    for (let k = 0; k < 8; k += 1) {
      const canonical = ((170 + k * 50 + 180) % 360) - 180;
      continuous = nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: continuous,
        nextCanonicalLonDeg: canonical === -180 ? 180 : canonical,
        policy: "follow",
      });
      steps.push(continuous);
    }
    for (let i = 1; i < steps.length; i += 1) {
      expect(Math.abs(steps[i]! - steps[i - 1]!)).toBeLessThan(60);
    }
    expect(Math.max(...steps.map(Math.abs))).toBeLessThanOrEqual(540);
  });

  it("reinitializes continuous longitude on target switch instead of inheriting Moon history", () => {
    const moonHistory = 541;
    const issCanonical = -179;
    expect(
      nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: moonHistory,
        nextCanonicalLonDeg: issCanonical,
        policy: "reinitialize",
      }),
    ).toBe(-179);
    expect(
      nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: null,
        nextCanonicalLonDeg: issCanonical,
        policy: "follow",
      }),
    ).toBe(-179);
  });

  it("reuses generic auto-cover from actual ISS latitude, including equator and orbital extreme", () => {
    const equator = issPositionLockedSceneReferenceFrame(10, 0);
    const mid = issPositionLockedSceneReferenceFrame(10, 30);
    const extreme = issPositionLockedSceneReferenceFrame(10, 51.6);
    const equatorScale = minimumScaleToCoverSceneFrameEarth(
      sceneCameraVerticalExtentFromFrame(equator),
    );
    const midScale = minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(mid));
    const extremeScale = minimumScaleToCoverSceneFrameEarth(
      sceneCameraVerticalExtentFromFrame(extreme),
    );
    expect(equatorScale).toBeCloseTo(1, 8);
    expect(midScale).toBeCloseTo(1 / (1 - 30 / 90), 8);
    expect(extremeScale).toBeCloseTo(1 / (1 - 51.6 / 90), 6);
    expect(extremeScale).toBeCloseTo(2.34375, 5);
    expect(extremeScale).toBeLessThan(SCENE_CAMERA_MAX_SCALE);
    const moonSame = anchoredSceneReferenceFrame({
      target: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 51.6,
    });
    expect(
      minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(moonSame)),
    ).toBe(extremeScale);
    expect(sceneCameraCoverPolicyForFrame(issLongitudeLockedSceneReferenceFrame(10, 51.6))).toBe(
      "off",
    );
    expect(sceneCameraCoverPolicyForFrame(extreme)).toBe("auto");
  });

  it("keeps manual zoom override while ISS latitude changes, and Reset re-arms current cover", () => {
    const first = issPositionLockedSceneReferenceFrame(0, 10);
    const later = issPositionLockedSceneReferenceFrame(40, 51.6);
    const firstExtent = sceneCameraVerticalExtentFromFrame(first);
    let camera = defaultSceneCameraForCover(firstExtent);
    const policy = sceneCameraCoverPolicyAfterManualZoom("auto");
    expect(policy).toBe("manual");
    camera = { ...camera, scale: 4 };
    const laterExtent = sceneCameraVerticalExtentFromFrame(later);
    expect(applyAutomaticSceneCoverScale(camera, laterExtent).scale).not.toBe(camera.scale);
    expect(camera.scale).toBe(4);
    const resetPolicy = sceneCameraCoverPolicyAfterFrameKindChange(true);
    expect(resetPolicy).toBe("auto");
    const restored = defaultSceneCameraForCover(laterExtent);
    expect(restored.scale).toBeCloseTo(
      minimumScaleToCoverSceneFrameEarth(laterExtent),
      8,
    );
    expect(restored.centerU).toBe(0.5);
    expect(restored.centerV).toBe(0.5);
  });

  it("does not write ISS coordinates into camera centre", () => {
    const frame = issPositionLockedSceneReferenceFrame(ISS.lonDeg, ISS.latDeg);
    const cam = applyAutomaticSceneCoverScale(
      IDENTITY_SCENE_CAMERA,
      sceneCameraVerticalExtentFromFrame(frame),
    );
    expect(cam.centerU).toBe(0.5);
    expect(cam.centerV).toBe(0.5);
    expect(cam.centerU).not.toBeCloseTo((ISS.lonDeg + 180) / 360, 2);
  });

  it("agrees raster origin with the ISS vector transform under both lock modes", () => {
    for (const lockMode of ["longitude", "position"] as const) {
      const frame = anchoredSceneReferenceFrame({
        target: "iss",
        lockMode,
        continuousAnchorLonDeg: ISS.lonDeg,
        anchorLatDeg: ISS.latDeg,
      });
      const scene = canonicalLonLatToSceneFrame(ISS, frame);
      const originX = sceneFrameRasterIdentityOriginX(W, frame);
      const originY = sceneFrameRasterIdentityOriginY(H, frame);
      const rasterX = originX + mapXFromLongitudeDeg(ISS.lonDeg, W);
      const rasterY = originY + mapYFromLatitudeDeg(ISS.latDeg, H);
      expect(rasterX).toBeCloseTo(mapXFromLongitudeDeg(scene.sceneLonDeg, W), 10);
      expect(rasterY).toBeCloseTo(mapYFromLatitudeDeg(scene.sceneLatDeg, H), 10);
      expect(sceneXFromLongitudeDeg(ISS.lonDeg, W, IDENTITY_SCENE_CAMERA, frame)).toBeCloseTo(
        mapXFromLongitudeDeg(scene.sceneLonDeg, W),
        10,
      );
      expect(sceneYFromLatitudeDeg(ISS.latDeg, H, IDENTITY_SCENE_CAMERA, frame)).toBeCloseTo(
        mapYFromLatitudeDeg(scene.sceneLatDeg, H),
        10,
      );
      if (lockMode === "longitude") {
        expect(originY).toBe(0);
      } else {
        expect(originY).not.toBe(0);
      }
    }
  });

  it("round-trips inverse mapping under an ISS-anchored frame", () => {
    const frame = issPositionLockedSceneReferenceFrame(ISS.lonDeg, ISS.latDeg);
    const scene = canonicalLonLatToSceneFrame({ lonDeg: -20, latDeg: 10 }, frame);
    const back = sceneFrameLonLatToCanonical(scene, frame);
    expect(back.lonDeg).toBeCloseTo(-20, 10);
    expect(back.latDeg).toBeCloseTo(10, 10);
  });

  it("resets camera policy on frame switch including ISS kinds", () => {
    expect(sceneCameraAfterReferenceFrameKindChange()).toEqual(IDENTITY_SCENE_CAMERA);
    expect(isIdentitySceneCamera(sceneCameraAfterReferenceFrameKindChange())).toBe(true);
    expect(EARTH_FIXED_SCENE_REFERENCE_FRAME.kind).toBe("earthFixed");
  });
});
