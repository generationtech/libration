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
  IDENTITY_SCENE_CAMERA,
  SCENE_CAMERA_COVER_SCALE_EPS,
  SCENE_CAMERA_MAX_SCALE,
  applyAutomaticSceneCoverScale,
  coverScaleFitsCameraMaximum,
  defaultSceneCameraForCover,
  isIdentitySceneCamera,
  isSceneCameraAtCoverDefault,
  isSceneCameraAtFrameDefault,
  minimumScaleToCoverSceneFrameEarth,
  sceneCameraCoverPolicyAfterFrameKindChange,
  sceneCameraCoverPolicyAfterManualZoom,
  sceneCameraCoverPolicyForFrame,
  sceneCameraVerticalExtentFromFrame,
  sceneCameraVisibleNormalizedVInterval,
  sceneYFromIdentityY,
  zoomSceneCameraAboutScenePoint,
} from "./sceneCamera";
import {
  EARTH_FIXED_SCENE_REFERENCE_FRAME,
  anchoredSceneReferenceFrame,
  moonLongitudeLockedSceneReferenceFrame,
  moonPositionLockedSceneReferenceFrame,
  sunLongitudeLockedSceneReferenceFrame,
  sunPositionLockedSceneReferenceFrame,
} from "./sceneReferenceFrame";

const COVER_CHECK_EPS = 1e-9;
/** Representative major-lunar-standstill latitude (degrees). */
const LUNAR_EXTREME_LAT_DEG = 28.58;
/** Approximate tropic / solstice solar declination (degrees). */
const SOLAR_SOLSTICE_LAT_DEG = 23.44;

function coversEarth(
  scale: number,
  extent: ReturnType<typeof sceneCameraVerticalExtentFromFrame>,
  centerV = 0.5,
): boolean {
  const vis = sceneCameraVisibleNormalizedVInterval({
    scale,
    centerU: 0.5,
    centerV,
  });
  return vis.v0 >= extent.vMin - COVER_CHECK_EPS && vis.v1 <= extent.vMax + COVER_CHECK_EPS;
}

describe("minimumScaleToCoverSceneFrameEarth", () => {
  it("is identity scale for Earth-fixed and longitude-lock extents", () => {
    expect(
      minimumScaleToCoverSceneFrameEarth(
        sceneCameraVerticalExtentFromFrame(EARTH_FIXED_SCENE_REFERENCE_FRAME),
      ),
    ).toBe(1);
    expect(
      minimumScaleToCoverSceneFrameEarth(
        sceneCameraVerticalExtentFromFrame(moonLongitudeLockedSceneReferenceFrame(10, 28)),
      ),
    ).toBe(1);
    expect(
      minimumScaleToCoverSceneFrameEarth(
        sceneCameraVerticalExtentFromFrame(sunLongitudeLockedSceneReferenceFrame(10, 23.4)),
      ),
    ).toBe(1);
  });

  it("is approximately 1 at zero position-lock anchor latitude", () => {
    const moon = moonPositionLockedSceneReferenceFrame(0, 0);
    const sun = sunPositionLockedSceneReferenceFrame(0, 0);
    expect(minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(moon))).toBeCloseTo(
      1,
      12,
    );
    expect(minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(sun))).toBeCloseTo(
      1,
      12,
    );
  });

  it("is a shared position-lock formula, independent of target identity", () => {
    const moon = anchoredSceneReferenceFrame({
      target: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: 40,
      anchorLatDeg: 18,
    });
    const sun = anchoredSceneReferenceFrame({
      target: "sun",
      lockMode: "position",
      continuousAnchorLonDeg: 40,
      anchorLatDeg: 18,
    });
    const iss = anchoredSceneReferenceFrame({
      target: "iss",
      lockMode: "position",
      continuousAnchorLonDeg: 40,
      anchorLatDeg: 18,
    });
    const moonScale = minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(moon));
    const sunScale = minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(sun));
    const issScale = minimumScaleToCoverSceneFrameEarth(sceneCameraVerticalExtentFromFrame(iss));
    expect(moonScale).toBe(sunScale);
    expect(moonScale).toBe(issScale);
    expect(moonScale).toBeCloseTo(1 / (1 - 18 / 90), 12);
  });

  it("covers the scene for positive and negative anchor latitudes and is the minimum such scale", () => {
    for (const lat of [12, -12, LUNAR_EXTREME_LAT_DEG, -LUNAR_EXTREME_LAT_DEG, SOLAR_SOLSTICE_LAT_DEG, -SOLAR_SOLSTICE_LAT_DEG]) {
      const extent = sceneCameraVerticalExtentFromFrame(
        moonPositionLockedSceneReferenceFrame(0, lat),
      );
      const required = minimumScaleToCoverSceneFrameEarth(extent);
      expect(coversEarth(required, extent)).toBe(true);
      expect(coversEarth(required * (1 - 1e-6), extent)).toBe(false);
    }
  });

  it("does not depend on viewport pixel height under the normalized camera model", () => {
    const extent = sceneCameraVerticalExtentFromFrame(
      moonPositionLockedSceneReferenceFrame(0, 20),
    );
    const cam = defaultSceneCameraForCover(extent);
    const vis = sceneCameraVisibleNormalizedVInterval(cam);
    for (const h of [400, 720, 1080]) {
      const top = sceneYFromIdentityY(vis.v0 * h, h, cam);
      const bottom = sceneYFromIdentityY(vis.v1 * h, h, cam);
      expect(top).toBeCloseTo(0, 8);
      expect(bottom).toBeCloseTo(h, 8);
    }
  });

  it("keeps supported Moon and Sun latitudes inside camera max scale", () => {
    for (const lat of [LUNAR_EXTREME_LAT_DEG, -LUNAR_EXTREME_LAT_DEG, SOLAR_SOLSTICE_LAT_DEG, -SOLAR_SOLSTICE_LAT_DEG, 28.7, 23.5]) {
      const required = minimumScaleToCoverSceneFrameEarth(
        sceneCameraVerticalExtentFromFrame(moonPositionLockedSceneReferenceFrame(0, lat)),
      );
      expect(coverScaleFitsCameraMaximum(required)).toBe(true);
      expect(required).toBeLessThanOrEqual(SCENE_CAMERA_MAX_SCALE);
    }
    const atMax = minimumScaleToCoverSceneFrameEarth(
      sceneCameraVerticalExtentFromFrame(moonPositionLockedSceneReferenceFrame(0, 78.75)),
    );
    expect(atMax).toBeCloseTo(SCENE_CAMERA_MAX_SCALE, 10);
    const beyond = minimumScaleToCoverSceneFrameEarth(
      sceneCameraVerticalExtentFromFrame(moonPositionLockedSceneReferenceFrame(0, 80)),
    );
    expect(coverScaleFitsCameraMaximum(beyond)).toBe(false);
  });
});

describe("automatic cover camera policy", () => {
  it("does not write anchor latitude into centerV", () => {
    const extent = sceneCameraVerticalExtentFromFrame(
      moonPositionLockedSceneReferenceFrame(90, 28),
    );
    const cam = applyAutomaticSceneCoverScale(IDENTITY_SCENE_CAMERA, extent);
    expect(cam.centerV).toBeCloseTo(0.5, 12);
    expect(cam.centerU).toBeCloseTo(0.5, 12);
    expect(cam.scale).toBeGreaterThan(1);
    expect(isIdentitySceneCamera(cam)).toBe(false);
  });

  it("preserves a manual horizontal pan while updating scale", () => {
    const extent = sceneCameraVerticalExtentFromFrame(
      sunPositionLockedSceneReferenceFrame(0, 20),
    );
    const panned = { scale: 1.2, centerU: 0.71, centerV: 0.5 };
    const next = applyAutomaticSceneCoverScale(panned, extent);
    expect(next.centerU).toBeCloseTo(0.71, 12);
    expect(next.centerV).toBeCloseTo(0.5, 12);
    expect(next.scale).toBeCloseTo(minimumScaleToCoverSceneFrameEarth(extent), 8);
  });

  it("skips microscopic scale rewrites", () => {
    const extent = sceneCameraVerticalExtentFromFrame(
      moonPositionLockedSceneReferenceFrame(0, 15),
    );
    const exact = defaultSceneCameraForCover(extent);
    const nudged = {
      ...exact,
      scale: exact.scale + SCENE_CAMERA_COVER_SCALE_EPS * 0.25,
    };
    expect(applyAutomaticSceneCoverScale(nudged, extent)).toBe(nudged);
  });

  it("treats longitude-lock and Earth-fixed as off / identity default", () => {
    expect(sceneCameraCoverPolicyForFrame(EARTH_FIXED_SCENE_REFERENCE_FRAME)).toBe("off");
    expect(
      sceneCameraCoverPolicyForFrame(moonLongitudeLockedSceneReferenceFrame(0, 20)),
    ).toBe("off");
    expect(
      sceneCameraCoverPolicyForFrame(sunLongitudeLockedSceneReferenceFrame(0, 20)),
    ).toBe("off");
    expect(
      isSceneCameraAtFrameDefault(
        IDENTITY_SCENE_CAMERA,
        moonLongitudeLockedSceneReferenceFrame(0, 20),
        "off",
      ),
    ).toBe(true);
  });

  it("arms auto on position-lock frame switch and does not carry manual override", () => {
    expect(sceneCameraCoverPolicyAfterFrameKindChange(true)).toBe("auto");
    expect(sceneCameraCoverPolicyAfterFrameKindChange(false)).toBe("off");
    expect(sceneCameraCoverPolicyAfterManualZoom("auto")).toBe("manual");
    expect(sceneCameraCoverPolicyAfterManualZoom("off")).toBe("off");
    expect(sceneCameraCoverPolicyAfterFrameKindChange(true)).toBe("auto");
  });

  it("does not rewrite scale after a manual zoom override", () => {
    const frame = moonPositionLockedSceneReferenceFrame(0, 20);
    const extent = sceneCameraVerticalExtentFromFrame(frame);
    const autoCam = defaultSceneCameraForCover(extent);
    const manual = zoomSceneCameraAboutScenePoint({
      camera: autoCam,
      nextScale: autoCam.scale * 1.4,
      sceneX: 400,
      sceneY: 200,
      widthPx: 800,
      heightPx: 400,
      verticalExtent: extent,
    });
    const policy = sceneCameraCoverPolicyAfterManualZoom("auto");
    expect(policy).toBe("manual");
    expect(isSceneCameraAtFrameDefault(manual, frame, policy)).toBe(false);
    const laterExtent = sceneCameraVerticalExtentFromFrame(
      moonPositionLockedSceneReferenceFrame(0, 28),
    );
    expect(manual.scale).not.toBeCloseTo(
      minimumScaleToCoverSceneFrameEarth(laterExtent),
      5,
    );
  });

  it("Reset semantics: cover default is satisfied even when scale > 1", () => {
    const frame = sunPositionLockedSceneReferenceFrame(0, SOLAR_SOLSTICE_LAT_DEG);
    const extent = sceneCameraVerticalExtentFromFrame(frame);
    const cam = defaultSceneCameraForCover(extent);
    expect(cam.scale).toBeGreaterThan(1);
    expect(isSceneCameraAtCoverDefault(cam, extent)).toBe(true);
    expect(isSceneCameraAtFrameDefault(cam, frame, "auto")).toBe(true);
    expect(isIdentitySceneCamera(cam)).toBe(false);
  });

  it("resize while auto-cover is a no-op on required scale and still covers", () => {
    const extent = sceneCameraVerticalExtentFromFrame(
      moonPositionLockedSceneReferenceFrame(0, 22),
    );
    const cam = defaultSceneCameraForCover(extent);
    const again = applyAutomaticSceneCoverScale(cam, extent);
    expect(again.scale).toBeCloseTo(cam.scale, 12);
    expect(coversEarth(again.scale, extent)).toBe(true);
  });
});
