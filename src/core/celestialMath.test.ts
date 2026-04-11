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
import { approximateLunarPhase } from "./lunarPhase";
import { subsolarPoint } from "./subsolarPoint";
import { sublunarPoint } from "./sublunarPoint";

function assertLatLon(p: { latDeg: number; lonDeg: number }): void {
  expect(Number.isFinite(p.latDeg)).toBe(true);
  expect(Number.isFinite(p.lonDeg)).toBe(true);
  expect(p.latDeg).toBeGreaterThanOrEqual(-90);
  expect(p.latDeg).toBeLessThanOrEqual(90);
  expect(p.lonDeg).toBeGreaterThanOrEqual(-180);
  expect(p.lonDeg).toBeLessThanOrEqual(180);
}

describe("subsolarPoint", () => {
  it("returns finite latitude/longitude in valid ranges for varied timestamps", () => {
    const times = [
      Date.UTC(1970, 0, 1, 0, 0, 0),
      Date.UTC(2000, 0, 1, 12, 0, 0),
      Date.UTC(2026, 5, 15, 18, 30, 0),
    ];
    for (const t of times) {
      assertLatLon(subsolarPoint(t));
    }
  });
});

describe("sublunarPoint", () => {
  it("returns finite latitude/longitude in valid ranges for varied timestamps", () => {
    const times = [
      Date.UTC(1970, 0, 1, 0, 0, 0),
      Date.UTC(2000, 0, 1, 12, 0, 0),
      Date.UTC(2026, 5, 15, 18, 30, 0),
    ];
    for (const t of times) {
      assertLatLon(sublunarPoint(t));
    }
  });
});

describe("approximateLunarPhase", () => {
  it("keeps illuminated fraction in [0, 1] and elongation in [-180, 180]", () => {
    const steps = 40;
    const t0 = Date.UTC(1999, 0, 1, 0, 0, 0);
    for (let i = 0; i < steps; i++) {
      const t = t0 + i * 86400000 * 13;
      const p = approximateLunarPhase(t);
      expect(p.illuminatedFraction).toBeGreaterThanOrEqual(0);
      expect(p.illuminatedFraction).toBeLessThanOrEqual(1);
      expect(Number.isFinite(p.geocentricElongationDeg)).toBe(true);
      expect(p.geocentricElongationDeg).toBeGreaterThanOrEqual(-180);
      expect(p.geocentricElongationDeg).toBeLessThanOrEqual(180);
    }
  });

  it("sets waxing from elongation: true only when elongation is in [0, 180)", () => {
    for (let i = 0; i < 400; i++) {
      const t = Date.UTC(1995, 0, 1) + i * 3600000 * 8;
      const p = approximateLunarPhase(t);
      const e = p.geocentricElongationDeg;
      const expectWaxing = e >= 0 && e < 180;
      expect(p.waxing).toBe(expectWaxing);
    }
  });

  it("is strongly illuminated near a known full moon instant (approximate ephemeris)", () => {
    // Full Moon 2000-01-21 ~04:40 UTC (almanac; this model is low precision)
    const t = Date.UTC(2000, 0, 21, 4, 41, 0);
    const p = approximateLunarPhase(t);
    expect(p.illuminatedFraction).toBeGreaterThan(0.85);
    expect(Math.abs(p.geocentricElongationDeg)).toBeGreaterThan(150);
  });

  it("is weakly illuminated near a known new moon instant (approximate ephemeris)", () => {
    // New Moon 2000-02-05 ~19:05 UTC
    const t = Date.UTC(2000, 1, 5, 19, 5, 0);
    const p = approximateLunarPhase(t);
    expect(p.illuminatedFraction).toBeLessThan(0.2);
  });
});
