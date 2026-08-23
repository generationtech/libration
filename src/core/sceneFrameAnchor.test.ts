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
  isPositionLockedSceneReferenceFrameUiKind,
  isSunAnchoredSceneReferenceFrameUiKind,
  nextAnchorContinuousLonDeg,
  nextMoonAnchorContinuousLonDeg,
  sceneCameraAfterReferenceFrameKindChange,
  sceneFrameAnchorKindFromUiKind,
  sceneReferenceFrameFromUiKind,
} from "./sceneFrameAnchor";
import { EARTH_FIXED_SCENE_REFERENCE_FRAME } from "./sceneReferenceFrame";

describe("nextAnchorContinuousLonDeg", () => {
  it("reinitializes from canonical longitude when there is no prior epoch", () => {
    expect(
      nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: null,
        nextCanonicalLonDeg: -179,
        policy: "follow",
      }),
    ).toBe(-179);
  });

  it("follows the nearest equivalent across a discontinuous time jump", () => {
    expect(
      nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: 181,
        nextCanonicalLonDeg: -178,
        policy: "follow",
      }),
    ).toBe(182);
  });

  it("drops multi-turn history on an explicit new frame epoch", () => {
    expect(
      nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: 541,
        nextCanonicalLonDeg: 10,
        policy: "reinitialize",
      }),
    ).toBe(10);
  });

  it("does not depend on which body supplied the canonical longitude", () => {
    const moonFollow = nextAnchorContinuousLonDeg({
      previousContinuousLonDeg: 181,
      nextCanonicalLonDeg: -178,
      policy: "follow",
    });
    const sunFollow = nextAnchorContinuousLonDeg({
      previousContinuousLonDeg: 181,
      nextCanonicalLonDeg: -178,
      policy: "follow",
    });
    expect(moonFollow).toBe(sunFollow);
    expect(moonFollow).toBe(182);
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
    expect(isPositionLockedSceneReferenceFrameUiKind("earthFixed")).toBe(false);
    expect(isPositionLockedSceneReferenceFrameUiKind("moonLongitudeLocked")).toBe(false);
    expect(isPositionLockedSceneReferenceFrameUiKind("moonPositionLocked")).toBe(true);
    expect(isPositionLockedSceneReferenceFrameUiKind("sunPositionLocked")).toBe(true);
    expect(isPositionLockedSceneReferenceFrameUiKind("sunLongitudeLocked")).toBe(false);
  });
});

describe("nextMoonAnchorContinuousLonDeg", () => {
  it("delegates to the shared continuity primitive", () => {
    expect(
      nextMoonAnchorContinuousLonDeg({
        previousContinuousLonDeg: 181,
        nextCanonicalLonDeg: -178,
        policy: "follow",
      }),
    ).toBe(
      nextAnchorContinuousLonDeg({
        previousContinuousLonDeg: 181,
        nextCanonicalLonDeg: -178,
        policy: "follow",
      }),
    );
  });
});

describe("sceneReferenceFrameFromUiKind", () => {
  it("maps all five UI choices onto Earth-fixed or the shared anchored model", () => {
    expect(sceneReferenceFrameFromUiKind("earthFixed", 10, 5)).toEqual(
      EARTH_FIXED_SCENE_REFERENCE_FRAME,
    );
    expect(sceneReferenceFrameFromUiKind("moonLongitudeLocked", 10, 5)).toEqual({
      kind: "anchored",
      anchorKind: "moon",
      lockMode: "longitude",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromUiKind("moonPositionLocked", 10, 5)).toEqual({
      kind: "anchored",
      anchorKind: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromUiKind("sunLongitudeLocked", 10, 5)).toEqual({
      kind: "anchored",
      anchorKind: "sun",
      lockMode: "longitude",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromUiKind("sunPositionLocked", 10, 5)).toEqual({
      kind: "anchored",
      anchorKind: "sun",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
  });

  it("does not reuse leftover camera when switching kinds", () => {
    expect(sceneCameraAfterReferenceFrameKindChange()).toEqual(IDENTITY_SCENE_CAMERA);
    expect(EARTH_FIXED_SCENE_REFERENCE_FRAME.kind).toBe("earthFixed");
  });

  it("exposes Moon and Sun as UI-to-anchorKind mapping, not transform kinds", () => {
    expect(sceneFrameAnchorKindFromUiKind("earthFixed")).toBeNull();
    expect(sceneFrameAnchorKindFromUiKind("moonLongitudeLocked")).toBe("moon");
    expect(sceneFrameAnchorKindFromUiKind("moonPositionLocked")).toBe("moon");
    expect(sceneFrameAnchorKindFromUiKind("sunLongitudeLocked")).toBe("sun");
    expect(sceneFrameAnchorKindFromUiKind("sunPositionLocked")).toBe("sun");
  });
});
