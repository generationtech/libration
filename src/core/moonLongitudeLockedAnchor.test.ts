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
import { IDENTITY_SCENE_CAMERA } from "./sceneCamera";
import {
  isAnchoredSceneReferenceFrameUiKind,
  isMoonAnchoredSceneReferenceFrameUiKind,
  isSunAnchoredSceneReferenceFrameUiKind,
  nextAnchorContinuousLonDeg,
  nextMoonAnchorContinuousLonDeg,
  sceneCameraAfterReferenceFrameKindChange,
  sceneReferenceFrameFromUiKind,
} from "./moonLongitudeLockedAnchor";
import { EARTH_FIXED_SCENE_REFERENCE_FRAME } from "./sceneReferenceFrame";

describe("nextMoonAnchorContinuousLonDeg", () => {
  it("reinitializes from canonical longitude when there is no prior epoch", () => {
    expect(
      nextMoonAnchorContinuousLonDeg({
        previousContinuousLonDeg: null,
        nextCanonicalLonDeg: -179,
        policy: "follow",
      }),
    ).toBe(-179);
  });

  it("follows the nearest equivalent across a discontinuous time jump", () => {
    expect(
      nextMoonAnchorContinuousLonDeg({
        previousContinuousLonDeg: 181,
        nextCanonicalLonDeg: -178,
        policy: "follow",
      }),
    ).toBe(182);
  });

  it("drops multi-turn history on an explicit new frame epoch", () => {
    expect(
      nextMoonAnchorContinuousLonDeg({
        previousContinuousLonDeg: 541,
        nextCanonicalLonDeg: 10,
        policy: "reinitialize",
      }),
    ).toBe(10);
  });
});

describe("scene camera after reference-frame kind change", () => {
  it("recenters to identity so a leftover pan is not re-interpreted", () => {
    expect(sceneCameraAfterReferenceFrameKindChange()).toEqual(IDENTITY_SCENE_CAMERA);
  });

  it("treats Earth-fixed, Moon, and Sun axis-lock modes as distinct UI kinds", () => {
    expect(isMoonAnchoredSceneReferenceFrameUiKind("earthFixed")).toBe(false);
    expect(isMoonAnchoredSceneReferenceFrameUiKind("moonLongitudeLocked")).toBe(true);
    expect(isMoonAnchoredSceneReferenceFrameUiKind("moonPositionLocked")).toBe(true);
    expect(isMoonAnchoredSceneReferenceFrameUiKind("sunLongitudeLocked")).toBe(false);
    expect(isSunAnchoredSceneReferenceFrameUiKind("sunLongitudeLocked")).toBe(true);
    expect(isSunAnchoredSceneReferenceFrameUiKind("sunPositionLocked")).toBe(true);
    expect(isSunAnchoredSceneReferenceFrameUiKind("moonLongitudeLocked")).toBe(false);
    expect(isAnchoredSceneReferenceFrameUiKind("earthFixed")).toBe(false);
    expect(isAnchoredSceneReferenceFrameUiKind("sunPositionLocked")).toBe(true);
  });
});

describe("nextAnchorContinuousLonDeg", () => {
  it("is the same primitive Moon and Sun continuity use", () => {
    expect(
      nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: 181,
        nextCanonicalLonDeg: -178,
        policy: "follow",
      }),
    ).toBe(182);
    expect(
      nextMoonAnchorContinuousLonDeg({
        previousContinuousLonDeg: 181,
        nextCanonicalLonDeg: -178,
        policy: "follow",
      }),
    ).toBe(182);
  });
});

describe("sceneReferenceFrameFromUiKind", () => {
  it("builds all five production configurations", () => {
    expect(sceneReferenceFrameFromUiKind("earthFixed", 10, 5).kind).toBe("earthFixed");
    expect(sceneReferenceFrameFromUiKind("moonLongitudeLocked", 10, 5)).toMatchObject({
      kind: "moonAnchored",
      latitudeLocked: false,
    });
    expect(sceneReferenceFrameFromUiKind("moonPositionLocked", 10, 5)).toMatchObject({
      kind: "moonAnchored",
      latitudeLocked: true,
    });
    expect(sceneReferenceFrameFromUiKind("sunLongitudeLocked", 10, 5)).toMatchObject({
      kind: "sunAnchored",
      latitudeLocked: false,
    });
    expect(sceneReferenceFrameFromUiKind("sunPositionLocked", 10, 5)).toMatchObject({
      kind: "sunAnchored",
      latitudeLocked: true,
    });
  });

  it("does not reuse leftover camera when switching kinds", () => {
    expect(sceneCameraAfterReferenceFrameKindChange()).toEqual(IDENTITY_SCENE_CAMERA);
    expect(EARTH_FIXED_SCENE_REFERENCE_FRAME.kind).toBe("earthFixed");
  });
});
