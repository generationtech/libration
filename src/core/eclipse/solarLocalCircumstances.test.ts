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
import { getSolarEclipseEventById } from "./eclipseAuthority";
import { solveSolarLocalCircumstances } from "./solarLocalCircumstances";

const TOTAL_2024 = "nasa-5mcse-solar-9561";

/** USNO Solar Eclipse Computer, Dallas TX, ΔT 72.8 s, height 100 m (independent of this solver). */
const DALLAS = { latDeg: 32.783, lonDeg: -96.8 };
const USNO_DALLAS = {
  c1: Date.parse("2024-04-08T17:23:15.000Z"),
  c2: Date.parse("2024-04-08T18:40:38.000Z"),
  max: Date.parse("2024-04-08T18:42:33.000Z"),
  c3: Date.parse("2024-04-08T18:44:30.000Z"),
  c4: Date.parse("2024-04-08T20:02:36.000Z"),
  magnitude: 1.015,
};

/** USNO Solar Eclipse Computer, Knoxville catalog coordinates, height 0 m. */
const KNOXVILLE = { latDeg: 35.9606, lonDeg: -83.9207 };
const USNO_KNOXVILLE = {
  c1: Date.parse("2024-04-08T17:49:13.000Z"),
  max: Date.parse("2024-04-08T19:07:40.000Z"),
  c4: Date.parse("2024-04-08T20:23:32.000Z"),
  magnitude: 0.9,
  obscuration: 0.886,
};

const TOKYO = { latDeg: 35.6762, lonDeg: 139.6503 };
const SAO_PAULO = { latDeg: -23.5505, lonDeg: -46.6333 };

function event2024() {
  const e = getSolarEclipseEventById(TOTAL_2024);
  if (!e) {
    throw new Error("missing 2024 total solar fixture");
  }
  return e;
}

function absSec(a: number, b: number): number {
  return Math.abs(a - b) / 1000;
}

describe("solar local circumstances", () => {
  it("classifies Dallas as local total with C1–C4 within 15 s of USNO", () => {
    const loc = solveSolarLocalCircumstances(event2024(), DALLAS.latDeg, DALLAS.lonDeg);
    expect(loc.globalSubtype).toBe("total");
    expect(loc.geographicKind).toBe("total");
    expect(loc.observableKind).toBe("total");
    expect(loc.locallyVisible).toBe(true);
    expect(loc.c1).not.toBeNull();
    expect(loc.c2).not.toBeNull();
    expect(loc.maximum).not.toBeNull();
    expect(loc.c3).not.toBeNull();
    expect(loc.c4).not.toBeNull();
    expect(loc.c1!.utcMs).toBeLessThan(loc.c2!.utcMs);
    expect(loc.c2!.utcMs).toBeLessThan(loc.maximum!.utcMs);
    expect(loc.maximum!.utcMs).toBeLessThan(loc.c3!.utcMs);
    expect(loc.c3!.utcMs).toBeLessThan(loc.c4!.utcMs);
    expect(absSec(loc.c1!.utcMs, USNO_DALLAS.c1)).toBeLessThanOrEqual(15);
    expect(absSec(loc.c2!.utcMs, USNO_DALLAS.c2)).toBeLessThanOrEqual(15);
    expect(absSec(loc.maximum!.utcMs, USNO_DALLAS.max)).toBeLessThanOrEqual(15);
    expect(absSec(loc.c3!.utcMs, USNO_DALLAS.c3)).toBeLessThanOrEqual(15);
    expect(absSec(loc.c4!.utcMs, USNO_DALLAS.c4)).toBeLessThanOrEqual(15);
    expect(loc.magnitude).not.toBeNull();
    expect(loc.magnitude!).toBeGreaterThanOrEqual(1);
    expect(Math.abs(loc.magnitude! - USNO_DALLAS.magnitude)).toBeLessThan(0.01);
    expect(loc.obscuration).toBeCloseTo(1, 3);
    expect(loc.c1!.aboveHorizon).toBe(true);
    expect(loc.maximum!.aboveHorizon).toBe(true);
    expect(loc.maximum!.altitudeDeg).toBeGreaterThan(50);
  });

  it("classifies Knoxville as local partial: no C2/C3, global type remains total", () => {
    const loc = solveSolarLocalCircumstances(event2024(), KNOXVILLE.latDeg, KNOXVILLE.lonDeg);
    expect(loc.globalSubtype).toBe("total");
    expect(loc.geographicKind).toBe("partial");
    expect(loc.observableKind).toBe("partial");
    expect(loc.locallyVisible).toBe(true);
    expect(loc.c2).toBeNull();
    expect(loc.c3).toBeNull();
    expect(loc.c1).not.toBeNull();
    expect(loc.maximum).not.toBeNull();
    expect(loc.c4).not.toBeNull();
    expect(loc.c1!.utcMs).toBeLessThan(loc.maximum!.utcMs);
    expect(loc.maximum!.utcMs).toBeLessThan(loc.c4!.utcMs);
    expect(absSec(loc.c1!.utcMs, USNO_KNOXVILLE.c1)).toBeLessThanOrEqual(15);
    expect(absSec(loc.maximum!.utcMs, USNO_KNOXVILLE.max)).toBeLessThanOrEqual(15);
    expect(absSec(loc.c4!.utcMs, USNO_KNOXVILLE.c4)).toBeLessThanOrEqual(15);
    expect(loc.magnitude).not.toBeNull();
    expect(loc.magnitude!).toBeGreaterThan(0);
    expect(loc.magnitude!).toBeLessThan(1);
    expect(Math.abs(loc.magnitude! - USNO_KNOXVILLE.magnitude)).toBeLessThan(0.02);
    expect(loc.obscuration).not.toBeNull();
    expect(loc.obscuration!).toBeGreaterThan(0.7);
    expect(loc.obscuration!).toBeLessThan(1);
    expect(Math.abs(loc.obscuration! - USNO_KNOXVILLE.obscuration)).toBeLessThan(0.05);
    expect(loc.maximum!.aboveHorizon).toBe(true);
  });

  it("reports Tokyo as not visible while the global event remains total", () => {
    const loc = solveSolarLocalCircumstances(event2024(), TOKYO.latDeg, TOKYO.lonDeg);
    expect(loc.globalSubtype).toBe("total");
    expect(loc.locallyVisible).toBe(false);
    expect(loc.observableKind).toBe("none");
    expect(loc.c2).toBeNull();
    expect(loc.c3).toBeNull();
    expect(loc.notVisibleReason).toBe("outside_footprint");
  });

  it("reports São Paulo as outside the 2024 footprint", () => {
    const loc = solveSolarLocalCircumstances(event2024(), SAO_PAULO.latDeg, SAO_PAULO.lonDeg);
    expect(loc.globalSubtype).toBe("total");
    expect(loc.geographicKind).toBe("none");
    expect(loc.locallyVisible).toBe(false);
    expect(loc.notVisibleReason).toBe("outside_footprint");
    expect(loc.c1).toBeNull();
    expect(loc.c2).toBeNull();
    expect(loc.c3).toBeNull();
    expect(loc.c4).toBeNull();
  });

  it("solves a first Dallas pass in low milliseconds", () => {
    const t0 = performance.now();
    solveSolarLocalCircumstances(event2024(), DALLAS.latDeg, DALLAS.lonDeg);
    const ms = performance.now() - t0;
    expect(ms).toBeLessThan(50);
  });
});
