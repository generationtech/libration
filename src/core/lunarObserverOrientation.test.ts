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
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  apparentLunarNorthPositionAngleDeg,
  lunarAxisPositionAngleDeg,
  moonLocalHourAngleDeg,
  parallacticAngleDeg,
  unwrapAngleDeg,
  wrapSigned180,
} from "./lunarObserverOrientation";
import { REFERENCE_CITIES } from "../data/referenceCities";

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);
const DIAGONAL_MS = Date.parse("2021-12-10T00:00:00.000Z");

function city(id: string) {
  const c = REFERENCE_CITIES.find((row) => row.id === id);
  if (!c) {
    throw new Error(`missing catalog city ${id}`);
  }
  return c;
}

describe("lunarObserverOrientation", () => {
  it("wraps to (−180, 180] and unwraps the short arc across ±180", () => {
    expect(wrapSigned180(181)).toBeCloseTo(-179, 10);
    expect(wrapSigned180(-181)).toBeCloseTo(179, 10);
    expect(unwrapAngleDeg(179, -179)).toBeCloseTo(181, 8);
    expect(unwrapAngleDeg(-179, 179)).toBeCloseTo(-181, 8);
    expect(unwrapAngleDeg(undefined, 20)).toBeCloseTo(20, 10);
  });

  it("is deterministic for a fixed UTC and location", () => {
    const knox = city("city.knoxville");
    const a = apparentLunarNorthPositionAngleDeg(J2000_MS, knox.latitude, knox.longitude);
    const b = apparentLunarNorthPositionAngleDeg(J2000_MS, knox.latitude, knox.longitude);
    expect(a).toBe(b);
    expect(Number.isFinite(a)).toBe(true);
  });

  it("returns finite angles for northern, southern, and longitude-separated cities", () => {
    const utcMs = DIAGONAL_MS;
    const ids = ["city.knoxville", "city.london", "city.sydney", "city.tokyo", "city.sao_paulo"] as const;
    const angles = ids.map((id) => {
      const c = city(id);
      return apparentLunarNorthPositionAngleDeg(utcMs, c.latitude, c.longitude);
    });
    for (const a of angles) {
      expect(Number.isFinite(a)).toBe(true);
    }
    const knox = angles[0]!;
    const london = angles[1]!;
    const sydney = angles[2]!;
    const tokyo = angles[3]!;
    expect(Math.abs(london - knox)).toBeGreaterThan(1);
    expect(Math.abs(sydney - knox)).toBeGreaterThan(1);
    expect(Math.abs(tokyo - knox)).toBeGreaterThan(1);
    expect(sydney).not.toBeCloseTo(london, 0);
  });

  it("keeps parallactic angle finite near zenith and at polar-ish latitudes", () => {
    expect(
      Number.isFinite(
        parallacticAngleDeg({ hourAngleDeg: 0, observerLatDeg: 35, declinationDeg: 35 }),
      ),
    ).toBe(true);
    expect(
      parallacticAngleDeg({ hourAngleDeg: 0, observerLatDeg: 89.9, declinationDeg: 89.5 }),
    ).toBe(0);
    expect(
      Number.isFinite(
        parallacticAngleDeg({ hourAngleDeg: 90, observerLatDeg: -33.87, declinationDeg: -20 }),
      ),
    ).toBe(true);
  });

  it("computes a finite lunar-axis position angle at J2000", () => {
    const c = lunarAxisPositionAngleDeg(J2000_MS);
    expect(Number.isFinite(c)).toBe(true);
    expect(Math.abs(c)).toBeLessThan(180);
  });

  it("varies hour angle with observer longitude", () => {
    const knox = city("city.knoxville");
    const tokyo = city("city.tokyo");
    const hK = moonLocalHourAngleDeg(DIAGONAL_MS, knox.longitude);
    const hT = moonLocalHourAngleDeg(DIAGONAL_MS, tokyo.longitude);
    expect(Math.abs(wrapSigned180(hT - hK))).toBeGreaterThan(90);
  });

  it("does not call Date.now", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "lunarObserverOrientation.ts"), "utf8");
    expect(src).not.toMatch(/Date\.now\s*\(/);
  });
});
