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
  nextMoonAnchorContinuousLonDeg,
  sceneCameraAfterReferenceFrameKindChange,
} from "./moonLongitudeLockedAnchor";

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
});
