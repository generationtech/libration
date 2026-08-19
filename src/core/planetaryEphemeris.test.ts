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
import { PLANETARY_BODY_IDS } from "./planetaryBodies";
import {
  PLANETARY_EPHEMERIS_RANGE_END_MS,
  PLANETARY_EPHEMERIS_RANGE_START_MS,
  isPlanetaryEphemerisSupportedUtc,
  planetaryApparentEquator,
} from "./planetaryEphemeris";

const UTC = Date.UTC(2026, 7, 19, 15, 30, 0, 0);

/** astronomy-engine 2.1.19 apparent equator-of-date at UTC, regression gold. */
const GOLD: Record<string, { raDeg: number; decDeg: number }> = {
  mercury: { raDeg: 141.249, decDeg: 16.785 },
  venus: { raDeg: 190.725, decDeg: -6.668 },
  mars: { raDeg: 95.952, decDeg: 23.678 },
  jupiter: { raDeg: 133.659, decDeg: 17.94 },
  saturn: { raDeg: 14.147, decDeg: 3.224 },
  uranus: { raDeg: 63.603, decDeg: 21.067 },
  neptune: { raDeg: 4.181, decDeg: 0.282 },
  pluto: { raDeg: 307.166, decDeg: -23.484 },
};

describe("planetaryApparentEquator", () => {
  it("returns finite apparent RA/Dec and GAST for every supported body at a pinned UTC", () => {
    for (const id of PLANETARY_BODY_IDS) {
      const eq = planetaryApparentEquator(id, UTC);
      expect(eq).not.toBeNull();
      expect(eq!.raDeg).toBeGreaterThanOrEqual(0);
      expect(eq!.raDeg).toBeLessThan(360);
      expect(eq!.decDeg).toBeGreaterThanOrEqual(-90);
      expect(eq!.decDeg).toBeLessThanOrEqual(90);
      expect(eq!.gastDeg).toBeGreaterThanOrEqual(0);
      expect(eq!.gastDeg).toBeLessThan(360);
      expect(eq!.distAu).toBeGreaterThan(0);
    }
  });

  it("matches astronomy-engine 2.1.19 gold RA/Dec at 2026-08-19T15:30Z", () => {
    for (const id of PLANETARY_BODY_IDS) {
      const eq = planetaryApparentEquator(id, UTC)!;
      const gold = GOLD[id]!;
      expect(eq.raDeg).toBeCloseTo(gold.raDeg, 2);
      expect(eq.decDeg).toBeCloseTo(gold.decDeg, 2);
    }
  });

  it("is deterministic for the same UTC", () => {
    const a = planetaryApparentEquator("mars", UTC);
    const b = planetaryApparentEquator("mars", UTC);
    expect(a).toEqual(b);
  });

  it("returns null outside the product-supported span", () => {
    expect(isPlanetaryEphemerisSupportedUtc(PLANETARY_EPHEMERIS_RANGE_START_MS - 1)).toBe(false);
    expect(isPlanetaryEphemerisSupportedUtc(PLANETARY_EPHEMERIS_RANGE_END_MS)).toBe(false);
    expect(planetaryApparentEquator("mars", PLANETARY_EPHEMERIS_RANGE_START_MS - 1)).toBeNull();
    expect(planetaryApparentEquator("pluto", PLANETARY_EPHEMERIS_RANGE_END_MS)).toBeNull();
    expect(planetaryApparentEquator("venus", Date.UTC(1500, 0, 1))).toBeNull();
  });

  it("supports 1950 and 2050 inside the product span", () => {
    expect(planetaryApparentEquator("jupiter", Date.UTC(1950, 0, 1))).not.toBeNull();
    expect(planetaryApparentEquator("neptune", Date.UTC(2050, 5, 15, 12))).not.toBeNull();
  });
});
