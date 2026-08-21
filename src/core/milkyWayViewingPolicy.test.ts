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
  MAX_MOONLIGHT_01,
  MAX_SUN_ALTITUDE_DEG,
  MILKY_WAY_VIEWING_POLICY_VERSION,
  MIN_ALTITUDE_QUALITY,
  MIN_GC_ALTITUDE_DEG,
  milkyWayAltitudeQuality01,
  milkyWayViewingQualifies,
  nightlyMaximumGcAltitudeDeg,
} from "./milkyWayViewingPolicy";

describe("milky-way-viewing-v2 classification", () => {
  it("exposes a stable policy version", () => {
    expect(MILKY_WAY_VIEWING_POLICY_VERSION).toBe("milky-way-viewing-v2");
  });

  it("rejects daylight even with high GC altitude", () => {
    expect(
      milkyWayViewingQualifies({
        gcAltitudeDeg: 80,
        solarAltitudeDeg: 10,
        localMoonlight01: 0,
        nightlyMaximumAltitudeDeg: 84,
      }),
    ).toBe(false);
  });

  it("rejects nautical twilight even with low moonlight", () => {
    expect(
      milkyWayViewingQualifies({
        gcAltitudeDeg: 24,
        solarAltitudeDeg: -15,
        localMoonlight01: 0,
        nightlyMaximumAltitudeDeg: 25,
      }),
    ).toBe(false);
  });

  it("requires astronomical darkness, near-max GC, and low moonlight", () => {
    const knoxNearMax = {
      gcAltitudeDeg: 24,
      solarAltitudeDeg: -18,
      localMoonlight01: 0,
      nightlyMaximumAltitudeDeg: 25,
    };
    expect(milkyWayViewingQualifies(knoxNearMax)).toBe(true);
    expect(
      milkyWayViewingQualifies({ ...knoxNearMax, solarAltitudeDeg: -17.9 }),
    ).toBe(false);
    expect(
      milkyWayViewingQualifies({ ...knoxNearMax, gcAltitudeDeg: 16 }),
    ).toBe(false);
    expect(
      milkyWayViewingQualifies({ ...knoxNearMax, localMoonlight01: MAX_MOONLIGHT_01 + 0.01 }),
    ).toBe(false);
  });

  it("uses relative quality so Knoxville-like culmination can qualify", () => {
    const hMax = 25;
    expect(
      milkyWayViewingQualifies({
        gcAltitudeDeg: 0.9 * hMax,
        solarAltitudeDeg: -20,
        localMoonlight01: 0,
        nightlyMaximumAltitudeDeg: hMax,
      }),
    ).toBe(true);
  });

  it("does not fabricate a window when GC never reaches the useful floor", () => {
    expect(
      milkyWayViewingQualifies({
        gcAltitudeDeg: 8,
        solarAltitudeDeg: -20,
        localMoonlight01: 0,
        nightlyMaximumAltitudeDeg: 9,
      }),
    ).toBe(false);
  });

  it("rejects bright modeled moonlight even at high GC", () => {
    const base = {
      gcAltitudeDeg: 80,
      solarAltitudeDeg: -20,
      nightlyMaximumAltitudeDeg: 84,
    };
    expect(milkyWayViewingQualifies({ ...base, localMoonlight01: 0 })).toBe(true);
    expect(milkyWayViewingQualifies({ ...base, localMoonlight01: 0.4 })).toBe(false);
    expect(milkyWayViewingQualifies({ ...base, localMoonlight01: MAX_MOONLIGHT_01 })).toBe(true);
  });

  it("computes altitude quality as current / local max, not a hidden score", () => {
    expect(milkyWayAltitudeQuality01(22.5, 25)).toBeCloseTo(0.9, 5);
    expect(MIN_ALTITUDE_QUALITY).toBe(0.9);
    expect(MIN_GC_ALTITUDE_DEG).toBe(15);
    expect(MAX_SUN_ALTITUDE_DEG).toBe(-18);
  });

  it("matches the culmination identity h_max = 90 − |lat − Dec|", () => {
    expect(nightlyMaximumGcAltitudeDeg(35.9606, -29)).toBeCloseTo(25.0394, 3);
    expect(nightlyMaximumGcAltitudeDeg(-23, -29)).toBeCloseTo(84, 5);
    expect(nightlyMaximumGcAltitudeDeg(65, -29)).toBeLessThan(0);
  });
});
