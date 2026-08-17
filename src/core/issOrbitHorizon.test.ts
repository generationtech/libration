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
  issOrbitDistanceIndex,
  issOrbitFadeMultiplier,
  issOrbitalPeriodMsFromMeanMotionRevPerDay,
  issOrbitalPeriodMsFromSatrecNoRadPerMin,
  issOrbitalPeriodMsFromTleLine2,
  issTleMeanMotionRevPerDayFromLine2,
  resolveIssOrbitHorizonMs,
} from "./issOrbitHorizon";

/** Recorded ISS TLE line 2 from the iss-presentation DEV fixture. */
const FIXTURE_TLE_LINE2 =
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487";

describe("issOrbitHorizon", () => {
  it("reads TLE mean motion in rev/day and period via 1440/n", () => {
    const n = issTleMeanMotionRevPerDayFromLine2(FIXTURE_TLE_LINE2);
    expect(n).toBeCloseTo(15.49359774, 8);
    const periodMs = issOrbitalPeriodMsFromMeanMotionRevPerDay(n!);
    expect(periodMs).not.toBeNull();
    const periodMin = periodMs! / 60_000;
    expect(periodMin).toBeCloseTo(1440 / 15.49359774, 8);
    expect(periodMin).toBeGreaterThan(90);
    expect(periodMin).toBeLessThan(95);
    expect(issOrbitalPeriodMsFromTleLine2(FIXTURE_TLE_LINE2)).toBe(periodMs);
  });

  it("treats satrec.no as radians per minute, not TLE n", () => {
    const tlePeriod = issOrbitalPeriodMsFromTleLine2(FIXTURE_TLE_LINE2)!;
    const noRadPerMin = (2 * Math.PI) / (tlePeriod / 60_000);
    expect(issOrbitalPeriodMsFromSatrecNoRadPerMin(noRadPerMin)).toBeCloseTo(tlePeriod, 6);
    expect(issOrbitalPeriodMsFromSatrecNoRadPerMin(15.49359774)).not.toBeCloseTo(tlePeriod, 0);
  });

  it("resolves minute horizons exactly and orbit horizons as N periods", () => {
    const periodMs = 92.9416152506874 * 60_000;
    expect(resolveIssOrbitHorizonMs("15m", periodMs)).toBe(15 * 60_000);
    expect(resolveIssOrbitHorizonMs("30m", periodMs)).toBe(30 * 60_000);
    expect(resolveIssOrbitHorizonMs("45m", periodMs)).toBe(45 * 60_000);
    expect(resolveIssOrbitHorizonMs("60m", periodMs)).toBe(60 * 60_000);
    expect(resolveIssOrbitHorizonMs("1orbit", periodMs)).toBeCloseTo(periodMs, 6);
    expect(resolveIssOrbitHorizonMs("2orbits", periodMs)).toBeCloseTo(2 * periodMs, 6);
    expect(resolveIssOrbitHorizonMs("3orbits", periodMs)).toBeCloseTo(3 * periodMs, 6);
    expect(resolveIssOrbitHorizonMs("6orbits", periodMs)).toBeCloseTo(6 * periodMs, 6);
  });

  it("fades monotonically by orbit distance from current", () => {
    const m0 = issOrbitFadeMultiplier(0);
    const m1 = issOrbitFadeMultiplier(1);
    const m2 = issOrbitFadeMultiplier(2);
    const m3 = issOrbitFadeMultiplier(3);
    const m6 = issOrbitFadeMultiplier(6);
    expect(m0).toBe(1);
    expect(m1).toBeLessThan(m0);
    expect(m2).toBeLessThan(m1);
    expect(m3).toBeLessThan(m2);
    expect(m6).toBeLessThanOrEqual(m3);
    expect(m6).toBeGreaterThanOrEqual(0.4);
    expect(issOrbitDistanceIndex(0, periodOrThrow())).toBe(0);
    expect(issOrbitDistanceIndex(periodOrThrow() * 0.5, periodOrThrow())).toBe(0);
    expect(issOrbitDistanceIndex(periodOrThrow() * 1.01, periodOrThrow())).toBe(1);
    expect(issOrbitDistanceIndex(periodOrThrow() * 3.2, periodOrThrow())).toBe(3);
  });
});

function periodOrThrow(): number {
  const periodMs = issOrbitalPeriodMsFromTleLine2(FIXTURE_TLE_LINE2);
  if (periodMs === null) {
    throw new Error("expected fixture period");
  }
  return periodMs;
}
