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
  classifyMilkyWayViewingLevel,
  milkyWayAltitudeQuality01,
  MILKY_WAY_VIEWING_POLICY_VERSION,
  nightlyMaximumGcAltitudeDeg,
  PRIME_MAX_MOONLIGHT_01,
  PRIME_MIN_ALTITUDE_QUALITY,
  STRONG_MAX_MOONLIGHT_01,
  STRONG_MIN_GC_ALTITUDE_DEG,
  VIEWING_MIN_GC_ALTITUDE_DEG,
} from "./milkyWayViewingPolicy";

describe("milky-way-viewing-v1 classification", () => {
  it("exposes a stable policy version", () => {
    expect(MILKY_WAY_VIEWING_POLICY_VERSION).toBe("milky-way-viewing-v1");
  });

  it("rejects daylight even with high GC altitude", () => {
    expect(
      classifyMilkyWayViewingLevel({
        gcAltitudeDeg: 80,
        solarAltitudeDeg: 10,
        localMoonlight01: 0,
        nightlyMaximumAltitudeDeg: 84,
      }),
    ).toBeNull();
  });

  it("opens Viewing at nautical twilight without a moonlight gate", () => {
    expect(
      classifyMilkyWayViewingLevel({
        gcAltitudeDeg: 22,
        solarAltitudeDeg: -13,
        localMoonlight01: 0.9,
        nightlyMaximumAltitudeDeg: 25,
      }),
    ).toBe("viewing");
  });

  it("requires astronomical darkness for Strong and Prime", () => {
    const knoxNearMax = {
      gcAltitudeDeg: 24,
      solarAltitudeDeg: -15,
      localMoonlight01: 0,
      nightlyMaximumAltitudeDeg: 25,
    };
    expect(classifyMilkyWayViewingLevel(knoxNearMax)).toBe("viewing");
    expect(
      classifyMilkyWayViewingLevel({ ...knoxNearMax, solarAltitudeDeg: -18 }),
    ).toBe("prime");
  });

  it("uses relative Prime so Knoxville-like culmination can qualify", () => {
    const hMax = 25;
    expect(hMax).toBeLessThan(STRONG_MIN_GC_ALTITUDE_DEG + 10);
    expect(
      classifyMilkyWayViewingLevel({
        gcAltitudeDeg: 0.9 * hMax,
        solarAltitudeDeg: -20,
        localMoonlight01: 0,
        nightlyMaximumAltitudeDeg: hMax,
      }),
    ).toBe("prime");
  });

  it("keeps Strong below Prime and above Viewing for Knoxville-like geometry", () => {
    const hMax = 25;
    expect(
      classifyMilkyWayViewingLevel({
        gcAltitudeDeg: 21,
        solarAltitudeDeg: -20,
        localMoonlight01: 0,
        nightlyMaximumAltitudeDeg: hMax,
      }),
    ).toBe("strong");
    expect(
      classifyMilkyWayViewingLevel({
        gcAltitudeDeg: 16,
        solarAltitudeDeg: -20,
        localMoonlight01: 0,
        nightlyMaximumAltitudeDeg: hMax,
      }),
    ).toBe("viewing");
  });

  it("does not fabricate Prime when GC never reaches the useful floor", () => {
    expect(
      classifyMilkyWayViewingLevel({
        gcAltitudeDeg: 8,
        solarAltitudeDeg: -20,
        localMoonlight01: 0,
        nightlyMaximumAltitudeDeg: 9,
      }),
    ).toBeNull();
  });

  it("rejects Strong/Prime under bright modeled moonlight but keeps Viewing", () => {
    const base = {
      gcAltitudeDeg: 80,
      solarAltitudeDeg: -20,
      nightlyMaximumAltitudeDeg: 84,
    };
    expect(classifyMilkyWayViewingLevel({ ...base, localMoonlight01: 0 })).toBe("prime");
    expect(
      classifyMilkyWayViewingLevel({ ...base, localMoonlight01: STRONG_MAX_MOONLIGHT_01 + 0.05 }),
    ).toBe("viewing");
    expect(
      classifyMilkyWayViewingLevel({
        ...base,
        localMoonlight01: PRIME_MAX_MOONLIGHT_01 + 0.05,
      }),
    ).toBe("strong");
  });

  it("computes altitude quality as current / local max, not a hidden score", () => {
    expect(milkyWayAltitudeQuality01(22.5, 25)).toBeCloseTo(0.9, 5);
    expect(PRIME_MIN_ALTITUDE_QUALITY).toBe(0.9);
    expect(VIEWING_MIN_GC_ALTITUDE_DEG).toBe(15);
  });

  it("matches the culmination identity h_max = 90 − |lat − Dec|", () => {
    expect(nightlyMaximumGcAltitudeDeg(35.9606, -29)).toBeCloseTo(25.0394, 3);
    expect(nightlyMaximumGcAltitudeDeg(-23, -29)).toBeCloseTo(84, 5);
    expect(nightlyMaximumGcAltitudeDeg(65, -29)).toBeLessThan(0);
  });
});
