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
      lunarAltitudeDeg: 50,
      solarAltitudeDeg: -20,
    });
    const newMoonHighNight = moonlightStrength({
      lunarIlluminatedFraction: 0.01,
      lunarAltitudeDeg: 50,
      solarAltitudeDeg: -20,
    });
    const fullMoonBelowHorizon = moonlightStrength({
      lunarIlluminatedFraction: 1,
      lunarAltitudeDeg: -2,
      solarAltitudeDeg: -20,
    });
    const fullMoonDaylight = moonlightStrength({
      lunarIlluminatedFraction: 1,
      lunarAltitudeDeg: 60,
      solarAltitudeDeg: 10,
    });

    expect(fullMoonHighNight).toBeGreaterThan(0.9);
    expect(newMoonHighNight).toBeLessThan(0.01);
    expect(fullMoonBelowHorizon).toBe(0);
    expect(fullMoonDaylight).toBe(0);
  });
});
