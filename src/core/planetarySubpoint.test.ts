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
import { planetaryApparentEquator } from "./planetaryEphemeris";
import {
  planetarySubpoint,
  subpointFromApparentEquator,
  wrapSigned180,
} from "./planetarySubpoint";

const UTC = Date.UTC(2026, 7, 19, 15, 30, 0, 0);

describe("subpointFromApparentEquator", () => {
  it("sets latitude from declination", () => {
    expect(subpointFromApparentEquator({ raDeg: 10, decDeg: 23.5, gastDeg: 0 }).latDeg).toBe(23.5);
    expect(subpointFromApparentEquator({ raDeg: 10, decDeg: -12, gastDeg: 40 }).latDeg).toBe(-12);
  });

  it("sets longitude from RA minus GAST with east-positive wrap", () => {
    expect(subpointFromApparentEquator({ raDeg: 90, decDeg: 0, gastDeg: 0 }).lonDeg).toBe(90);
    expect(subpointFromApparentEquator({ raDeg: 0, decDeg: 0, gastDeg: 10 }).lonDeg).toBe(-10);
    expect(subpointFromApparentEquator({ raDeg: 10, decDeg: 0, gastDeg: 350 }).lonDeg).toBe(20);
  });

  it("wraps longitude to ±180", () => {
    expect(wrapSigned180(190)).toBe(-170);
    expect(wrapSigned180(-190)).toBe(170);
    expect(subpointFromApparentEquator({ raDeg: 0, decDeg: 0, gastDeg: 180 }).lonDeg).toBe(-180);
    const east = subpointFromApparentEquator({ raDeg: 179.5, decDeg: 0, gastDeg: 0 });
    expect(east.lonDeg).toBeCloseTo(179.5, 10);
    const west = subpointFromApparentEquator({ raDeg: 180.5, decDeg: 0, gastDeg: 0 });
    expect(west.lonDeg).toBeCloseTo(-179.5, 10);
  });
});

describe("planetarySubpoint", () => {
  it("matches the RA/GAST transform for every body", () => {
    for (const id of PLANETARY_BODY_IDS) {
      const eq = planetaryApparentEquator(id, UTC)!;
      const sub = planetarySubpoint(id, UTC)!;
      const expected = subpointFromApparentEquator(eq);
      expect(sub.latDeg).toBeCloseTo(expected.latDeg, 10);
      expect(sub.lonDeg).toBeCloseTo(expected.lonDeg, 10);
      expect(sub.latDeg).toBeGreaterThanOrEqual(-90);
      expect(sub.latDeg).toBeLessThanOrEqual(90);
      expect(sub.lonDeg).toBeGreaterThanOrEqual(-180);
      expect(sub.lonDeg).toBeLessThanOrEqual(180);
    }
  });

  it("is deterministic", () => {
    expect(planetarySubpoint("venus", UTC)).toEqual(planetarySubpoint("venus", UTC));
  });

  it("returns null outside the authority span", () => {
    expect(planetarySubpoint("mars", Date.UTC(1400, 0, 1))).toBeNull();
  });
});
