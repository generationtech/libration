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
import { EquatorFromVector } from "astronomy-engine";
import {
  galacticDirectionEqj,
  galacticEquatorOfDate,
  galacticZenithSubpoint,
} from "./milkyWayGalactic";
import { wrapSigned180 } from "./planetarySubpoint";
import { planetaryGastDeg } from "./planetaryEphemeris";

const J2000 = Date.UTC(2000, 0, 1, 12, 0, 0, 0);
const PINNED = Date.UTC(2026, 7, 19, 15, 30, 0, 0);

/**
 * Independent J2000 IAU Galactic landmarks (Hipparcos / common IAU 1958→J2000 values).
 * astronomy-engine GAL is IAU 1958 in EQJ; agreement to a few arcminutes is the claim.
 */
const PUBLISHED_J2000 = {
  galacticCenter: { raDeg: 266.4051, decDeg: -28.9362 },
  northGalacticPole: { raDeg: 192.85948, decDeg: 27.12825 },
};

function eqjRaDec(lDeg: number, bDeg: number): { raDeg: number; decDeg: number } {
  const v = galacticDirectionEqj(lDeg, bDeg);
  const eq = EquatorFromVector(v);
  return { raDeg: ((eq.ra * 15) % 360 + 360) % 360, decDeg: eq.dec };
}

describe("galacticDirectionEqj (IAU 1958 / EQJ)", () => {
  it("places the Galactic center near published J2000 RA/Dec", () => {
    const eq = eqjRaDec(0, 0);
    expect(eq.raDeg).toBeCloseTo(PUBLISHED_J2000.galacticCenter.raDeg, 1);
    expect(eq.decDeg).toBeCloseTo(PUBLISHED_J2000.galacticCenter.decDeg, 1);
  });

  it("places the north Galactic pole near published J2000 RA/Dec", () => {
    const eq = eqjRaDec(0, 90);
    expect(eq.raDeg).toBeCloseTo(PUBLISHED_J2000.northGalacticPole.raDeg, 1);
    expect(eq.decDeg).toBeCloseTo(PUBLISHED_J2000.northGalacticPole.decDeg, 1);
  });

  it("places the anticenter 180° from the center in EQJ", () => {
    const c = galacticDirectionEqj(0, 0);
    const a = galacticDirectionEqj(180, 0);
    const dot = c.x * a.x + c.y * a.y + c.z * a.z;
    expect(dot).toBeCloseTo(-1, 5);
  });
});

describe("galacticEquatorOfDate", () => {
  it("at J2000.0 matches EQJ to nutation scale", () => {
    const ofDate = galacticEquatorOfDate(0, 0, J2000);
    const eqj = eqjRaDec(0, 0);
    expect(ofDate).not.toBeNull();
    expect(ofDate!.raDeg).toBeCloseTo(eqj.raDeg, 1);
    expect(ofDate!.decDeg).toBeCloseTo(eqj.decDeg, 1);
  });

  it("precesses between 1600 and 2500", () => {
    const a = galacticEquatorOfDate(0, 0, Date.UTC(1600, 0, 1, 12));
    const b = galacticEquatorOfDate(0, 0, Date.UTC(2499, 11, 31, 12));
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    const dRa = Math.abs(wrapSigned180(b!.raDeg - a!.raDeg));
    expect(dRa).toBeGreaterThan(8);
    expect(dRa).toBeLessThan(20);
  });

  it("returns null outside 1600–2500", () => {
    expect(galacticEquatorOfDate(0, 0, Date.UTC(1500, 0, 1))).toBeNull();
    expect(galacticEquatorOfDate(0, 0, Date.UTC(2500, 0, 1))).toBeNull();
  });

  it("is deterministic at a pinned UTC", () => {
    expect(galacticEquatorOfDate(0, 0, PINNED)).toEqual(galacticEquatorOfDate(0, 0, PINNED));
  });
});

describe("galacticZenithSubpoint", () => {
  it("uses lat = Dec and lon = wrap180(RA − GAST)", () => {
    const eq = galacticEquatorOfDate(0, 0, PINNED)!;
    const p = galacticZenithSubpoint(0, 0, PINNED)!;
    expect(p.latDeg).toBeCloseTo(eq.decDeg, 8);
    expect(p.lonDeg).toBeCloseTo(wrapSigned180(eq.raDeg - eq.gastDeg), 8);
  });

  it("moves ~90° west after six hours of Earth rotation", () => {
    const a = galacticZenithSubpoint(0, 0, PINNED)!;
    const sixH = PINNED + 6 * 3600 * 1000;
    const b = galacticZenithSubpoint(0, 0, sixH)!;
    const dLon = wrapSigned180(b.lonDeg - a.lonDeg);
    const dGast = wrapSigned180(planetaryGastDeg(sixH)! - planetaryGastDeg(PINNED)!);
    expect(dLon).toBeCloseTo(-dGast, 1);
    expect(Math.abs(dLon)).toBeGreaterThan(85);
    expect(Math.abs(dLon)).toBeLessThan(95);
  });
});
