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
  moonAltitudeStrength,
  moonIncidenceStrength,
  moonlightNightEligibilityFromSolarAltitude,
  moonlightStrength,
  moonPhaseStrengthFromIlluminatedFraction,
} from "./lunarIllumination";

describe("moonPhaseStrengthFromIlluminatedFraction", () => {
  it("is near zero for new moon and stronger near full moon", () => {
    expect(moonPhaseStrengthFromIlluminatedFraction(0)).toBe(0);
    expect(moonPhaseStrengthFromIlluminatedFraction(0.08)).toBeLessThan(0.01);
    expect(moonPhaseStrengthFromIlluminatedFraction(0.5)).toBeGreaterThan(0.1);
    expect(moonPhaseStrengthFromIlluminatedFraction(1)).toBe(1);
  });
});

describe("moonAltitudeStrength", () => {
  it("is zero below horizon and rises with altitude", () => {
    expect(moonAltitudeStrength(-10)).toBe(0);
    expect(moonAltitudeStrength(0)).toBe(0);
    expect(moonAltitudeStrength(10)).toBeGreaterThan(0);
    expect(moonAltitudeStrength(30)).toBe(1);
    expect(moonAltitudeStrength(60)).toBe(1);
  });
});

describe("moonlightNightEligibilityFromSolarAltitude", () => {
  it("suppresses daylight and prefers deep twilight/night", () => {
    expect(moonlightNightEligibilityFromSolarAltitude(10)).toBe(0);
    expect(moonlightNightEligibilityFromSolarAltitude(-4)).toBe(0);
    expect(moonlightNightEligibilityFromSolarAltitude(-8)).toBeGreaterThan(0);
    expect(moonlightNightEligibilityFromSolarAltitude(-12)).toBe(1);
    expect(moonlightNightEligibilityFromSolarAltitude(-30)).toBe(1);
  });
});

describe("moonlightStrength", () => {
  it("returns bounded values with expected model behavior", () => {
    const fullMoonHighNight = moonlightStrength({
      lunarIlluminatedFraction: 1,
      solarAltitudeDeg: -20,
      surfaceMoonDot: 0.9,
    });
    const fullMoonLowIncidenceNight = moonlightStrength({
      lunarIlluminatedFraction: 1,
      solarAltitudeDeg: -20,
      surfaceMoonDot: 0.2,
    });
    const newMoonHighNight = moonlightStrength({
      lunarIlluminatedFraction: 0.01,
      solarAltitudeDeg: -20,
      surfaceMoonDot: 0.9,
    });
    const fullMoonBelowHorizon = moonlightStrength({
      lunarIlluminatedFraction: 1,
      solarAltitudeDeg: -20,
      surfaceMoonDot: 0,
    });
    const fullMoonDaylight = moonlightStrength({
      lunarIlluminatedFraction: 1,
      solarAltitudeDeg: 10,
      surfaceMoonDot: 0.9,
    });

    expect(fullMoonHighNight).toBeLessThan(1);
    expect(fullMoonHighNight).toBeGreaterThan(0.6);
    expect(fullMoonLowIncidenceNight).toBeLessThan(fullMoonHighNight * 0.02);
    expect(newMoonHighNight).toBeLessThan(0.01);
    expect(fullMoonBelowHorizon).toBe(0);
    expect(fullMoonDaylight).toBe(0);
  });
});

describe("moonIncidenceStrength", () => {
  it("focuses strongly near the sublunar region", () => {
    expect(moonIncidenceStrength(-0.5)).toBe(0);
    expect(moonIncidenceStrength(0)).toBe(0);
    expect(moonIncidenceStrength(0.2)).toBeLessThan(0.01);
    expect(moonIncidenceStrength(0.6)).toBeGreaterThan(0.1);
    expect(moonIncidenceStrength(1)).toBe(1);
  });
});
