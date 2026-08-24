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
  isIssAnchoredSceneReferenceFrameUiKind,
  isMoonAnchoredSceneReferenceFrameUiKind,
  isPositionLockedSceneReferenceFrameUiKind,
  isSunAnchoredSceneReferenceFrameUiKind,
  nextAnchorContinuousLonDeg,
  nextMoonAnchorContinuousLonDeg,
  anchoredSceneFrameLockModeFromUiKind,
  sceneCameraAfterReferenceFrameKindChange,
  sceneFrameAnchorKindFromUiKind,
  sceneReferenceFrameFromUiKind,
  sceneReferenceFrameUiKindWhenTargetUnavailable,
  trackableMapObjectIdFromUiKind,
  trackingSelectionFromUiKind,
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
    expect(isIssAnchoredSceneReferenceFrameUiKind("issLongitudeLocked")).toBe(true);
    expect(isIssAnchoredSceneReferenceFrameUiKind("issPositionLocked")).toBe(true);
    expect(isIssAnchoredSceneReferenceFrameUiKind("sunPositionLocked")).toBe(false);
    expect(isAnchoredSceneReferenceFrameUiKind("issPositionLocked")).toBe(true);
    expect(isPositionLockedSceneReferenceFrameUiKind("issPositionLocked")).toBe(true);
    expect(isPositionLockedSceneReferenceFrameUiKind("issLongitudeLocked")).toBe(false);
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
  it("maps all seven UI choices onto Earth-fixed or the shared anchored model", () => {
    expect(sceneReferenceFrameFromUiKind("earthFixed", 10, 5)).toEqual(
      EARTH_FIXED_SCENE_REFERENCE_FRAME,
    );
    expect(sceneReferenceFrameFromUiKind("moonLongitudeLocked", 10, 5)).toEqual({
      kind: "anchored",
      target: "moon",
      lockMode: "longitude",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromUiKind("moonPositionLocked", 10, 5)).toEqual({
      kind: "anchored",
      target: "moon",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromUiKind("sunLongitudeLocked", 10, 5)).toEqual({
      kind: "anchored",
      target: "sun",
      lockMode: "longitude",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromUiKind("sunPositionLocked", 10, 5)).toEqual({
      kind: "anchored",
      target: "sun",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromUiKind("issLongitudeLocked", 10, 5)).toEqual({
      kind: "anchored",
      target: "iss",
      lockMode: "longitude",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
    expect(sceneReferenceFrameFromUiKind("issPositionLocked", 10, 5)).toEqual({
      kind: "anchored",
      target: "iss",
      lockMode: "position",
      continuousAnchorLonDeg: 10,
      anchorLatDeg: 5,
    });
  });

  it("does not reuse leftover camera when switching kinds", () => {
    expect(sceneCameraAfterReferenceFrameKindChange()).toEqual(IDENTITY_SCENE_CAMERA);
    expect(EARTH_FIXED_SCENE_REFERENCE_FRAME.kind).toBe("earthFixed");
  });

  it("maps the seven UI choices onto Earth-fixed or target + lockMode", () => {
    expect(trackableMapObjectIdFromUiKind("earthFixed")).toBeNull();
    expect(anchoredSceneFrameLockModeFromUiKind("earthFixed")).toBeNull();
    expect(trackableMapObjectIdFromUiKind("moonLongitudeLocked")).toBe("moon");
    expect(anchoredSceneFrameLockModeFromUiKind("moonLongitudeLocked")).toBe("longitude");
    expect(trackableMapObjectIdFromUiKind("moonPositionLocked")).toBe("moon");
    expect(anchoredSceneFrameLockModeFromUiKind("moonPositionLocked")).toBe("position");
    expect(trackableMapObjectIdFromUiKind("sunLongitudeLocked")).toBe("sun");
    expect(anchoredSceneFrameLockModeFromUiKind("sunLongitudeLocked")).toBe("longitude");
    expect(trackableMapObjectIdFromUiKind("sunPositionLocked")).toBe("sun");
    expect(anchoredSceneFrameLockModeFromUiKind("sunPositionLocked")).toBe("position");
    expect(trackableMapObjectIdFromUiKind("issLongitudeLocked")).toBe("iss");
    expect(anchoredSceneFrameLockModeFromUiKind("issLongitudeLocked")).toBe("longitude");
    expect(trackableMapObjectIdFromUiKind("issPositionLocked")).toBe("iss");
    expect(anchoredSceneFrameLockModeFromUiKind("issPositionLocked")).toBe("position");
    expect(sceneFrameAnchorKindFromUiKind("moonLongitudeLocked")).toBe("moon");
    expect(sceneFrameAnchorKindFromUiKind("issPositionLocked")).toBe("iss");
  });

  it("falls back to Earth-fixed when ISS tracking is unavailable", () => {
    const available = { moon: true, sun: true, iss: false };
    expect(
      sceneReferenceFrameUiKindWhenTargetUnavailable("issLongitudeLocked", available),
    ).toBe("earthFixed");
    expect(
      sceneReferenceFrameUiKindWhenTargetUnavailable("issPositionLocked", available),
    ).toBe("earthFixed");
    expect(
      sceneReferenceFrameUiKindWhenTargetUnavailable("sunLongitudeLocked", {
        moon: true,
        sun: true,
        iss: true,
      }),
    ).toBe("sunLongitudeLocked");
  });

  it("maps combined UI kinds through orthogonal tracking selection", () => {
    expect(trackingSelectionFromUiKind("earthFixed")).toEqual({
      target: null,
      rememberedMode: "position",
    });
    expect(trackingSelectionFromUiKind("moonLongitudeLocked")).toEqual({
      target: "moon",
      rememberedMode: "longitude",
    });
    expect(trackingSelectionFromUiKind("moonPositionLocked")).toEqual({
      target: "moon",
      rememberedMode: "position",
    });
    expect(trackingSelectionFromUiKind("sunLongitudeLocked")).toEqual({
      target: "sun",
      rememberedMode: "longitude",
    });
    expect(trackingSelectionFromUiKind("sunPositionLocked")).toEqual({
      target: "sun",
      rememberedMode: "position",
    });
    expect(trackingSelectionFromUiKind("issLongitudeLocked")).toEqual({
      target: "iss",
      rememberedMode: "longitude",
    });
    expect(trackingSelectionFromUiKind("issPositionLocked")).toEqual({
      target: "iss",
      rememberedMode: "position",
    });
  });
});
