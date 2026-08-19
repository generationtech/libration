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
import { PLANETARY_BODY_METADATA } from "./planetaryBodies";
import {
  resetPlanetaryLocusCacheForTests,
  samplePlanetaryLocus,
} from "./planetaryLocus";
import { planetarySubpoint } from "./planetarySubpoint";

const UTC = Date.UTC(2026, 7, 19, 15, 30, 0, 0);

describe("samplePlanetaryLocus", () => {
  it("samples about 365 daily same-clock points for a 1-year centered window", () => {
    resetPlanetaryLocusCacheForTests();
    const loc = samplePlanetaryLocus("mars", UTC, "1y");
    expect(loc).not.toBeNull();
    expect(loc!.sampleCount).toBe(365);
    expect(loc!.points).toHaveLength(365);
  });

  it("includes a vertex that coincides with the current subpoint at the sample clock", () => {
    resetPlanetaryLocusCacheForTests();
    const loc = samplePlanetaryLocus("venus", UTC, "1y")!;
    const now = planetarySubpoint("venus", UTC)!;
    const hit = loc.points.some(
      (p) => Math.abs(p.latDeg - now.latDeg) < 0.05 && Math.abs(p.lonDeg - now.lonDeg) < 0.35,
    );
    expect(hit).toBe(true);
  });

  it("uses a body-specific day count for the synodic-cycle duration", () => {
    resetPlanetaryLocusCacheForTests();
    const mercury = samplePlanetaryLocus("mercury", UTC, "synodic")!;
    const expected = Math.max(30, Math.round(PLANETARY_BODY_METADATA.mercury.meanSynodicPeriodDays));
    expect(mercury.sampleCount).toBe(expected);
  });

  it("does not rebuild from cache for the same date and hour", () => {
    resetPlanetaryLocusCacheForTests();
    const a = samplePlanetaryLocus("jupiter", UTC, "1y")!;
    const laterSameHour = UTC + 10 * 60 * 1000;
    const b = samplePlanetaryLocus("jupiter", laterSameHour, "1y")!;
    expect(b.sampleCount).toBe(a.sampleCount);
    expect(b.points[0]!.latDeg).toBeCloseTo(a.points[0]!.latDeg, 5);
  });

  it("returns null outside the authority span", () => {
    expect(samplePlanetaryLocus("pluto", Date.UTC(1400, 0, 1), "1y")).toBeNull();
  });
});
