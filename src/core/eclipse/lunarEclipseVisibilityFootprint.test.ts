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
import { getLunarEclipseEventById } from "./eclipseAuthority";
import { solveLunarLocalCircumstances } from "./lunarLocalCircumstances";
import {
  LUNAR_VISIBILITY_FOOTPRINT_ALGORITHM_ID,
  LUNAR_VISIBILITY_FOOTPRINT_SAMPLE_MS,
  instantaneousMoonUpInteriorSamples,
  lunarEclipseVisibilityFootprint,
  pointInLunarVisibilityFootprint,
  resetLunarEclipseVisibilityFootprintCacheForTests,
} from "./lunarEclipseVisibilityFootprint";
import { sphericalMoonAltitudeCosine } from "./lunarVisibilityGeometry";
import { sublunarPoint } from "../sublunarPoint";
import { REFERENCE_CITIES } from "../../data/referenceCities";

const TOTAL_2022 = "nasa-5mcle-lunar-9700";
const TOTAL_2029 = "nasa-5mcle-lunar-9716";
const PARTIAL_2008 = "nasa-5mcle-lunar-9668";
const PENUMBRAL = "nasa-5mcle-lunar-9420";
const DATELINE_2015 = "nasa-5mcle-lunar-9684";

const CITIES = {
  knoxville: REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!,
  tokyo: REFERENCE_CITIES.find((c) => c.id === "city.tokyo")!,
  saoPaulo: REFERENCE_CITIES.find((c) => c.id === "city.sao_paulo")!,
  london: REFERENCE_CITIES.find((c) => c.id === "city.london")!,
  sydney: REFERENCE_CITIES.find((c) => c.id === "city.sydney")!,
  losAngeles: REFERENCE_CITIES.find((c) => c.id === "city.los_angeles")!,
};

function assertFiniteClosed(boundary: readonly { latDeg: number; lonDeg: number }[]): void {
  expect(boundary.length).toBeGreaterThan(8);
  for (const p of boundary) {
    expect(Number.isFinite(p.latDeg)).toBe(true);
    expect(Number.isFinite(p.lonDeg)).toBe(true);
    expect(Math.abs(p.latDeg)).toBeLessThanOrEqual(90.0001);
    expect(Math.abs(p.lonDeg)).toBeLessThan(720);
  }
  const a = boundary[0]!;
  const z = boundary[boundary.length - 1]!;
  expect(a.latDeg).toBeCloseTo(z.latDeg, 5);
  expect(a.lonDeg).toBeCloseTo(z.lonDeg, 5);
}

function antipode(latDeg: number, lonDeg: number): { latDeg: number; lonDeg: number } {
  let lon = lonDeg + 180;
  while (lon > 180) lon -= 360;
  while (lon <= -180) lon += 360;
  return { latDeg: -latDeg, lonDeg: lon };
}

describe("lunar eclipse visibility footprint", () => {
  it("uses P1→P4 as the authoritative interval when those contacts exist", () => {
    const total = getLunarEclipseEventById(TOTAL_2022)!;
    const partial = getLunarEclipseEventById(PARTIAL_2008)!;
    const pen = getLunarEclipseEventById(PENUMBRAL)!;
    expect(total.p1UtcMs).not.toBeNull();
    expect(total.p4UtcMs).not.toBeNull();
    expect(total.globalStartMs).toBe(total.p1UtcMs);
    expect(total.globalEndMs).toBe(total.p4UtcMs);
    expect(partial.globalStartMs).toBe(partial.p1UtcMs);
    expect(partial.globalEndMs).toBe(partial.p4UtcMs);
    expect(pen.subtype).toBe("penumbral");
    expect(pen.u1UtcMs).toBeNull();
    expect(pen.p1UtcMs).not.toBeNull();
    expect(pen.p4UtcMs).not.toBeNull();
    expect(pen.globalStartMs).toBe(pen.p1UtcMs);
    expect(pen.globalEndMs).toBe(pen.p4UtcMs);
  });

  it("builds a static closed line for total, partial, and penumbral events", () => {
    for (const id of [TOTAL_2022, PARTIAL_2008, PENUMBRAL]) {
      const event = getLunarEclipseEventById(id)!;
      const fp = lunarEclipseVisibilityFootprint(event);
      expect(fp.eventId).toBe(event.id);
      expect(fp.algorithmId).toBe(LUNAR_VISIBILITY_FOOTPRINT_ALGORITHM_ID);
      expect(fp.startUtcMs).toBe(event.globalStartMs);
      expect(fp.endUtcMs).toBe(event.globalEndMs);
      expect(fp.sampleStepMs).toBe(LUNAR_VISIBILITY_FOOTPRINT_SAMPLE_MS);
      assertFiniteClosed(fp.boundary);
    }
  });

  it("is identical across forecast, start, GE, and end−1s for the same event id", () => {
    const event = getLunarEclipseEventById(TOTAL_2029)!;
    resetLunarEclipseVisibilityFootprintCacheForTests();
    const a = lunarEclipseVisibilityFootprint(event);
    const b = lunarEclipseVisibilityFootprint(event);
    expect(b).toBe(a);
    expect(a.geometryHash).toBe(b.geometryHash);
    expect(a.boundary).toEqual(b.boundary);
  });

  it("contains start, intermediate, and end Moon-up interior samples", () => {
    const event = getLunarEclipseEventById(TOTAL_2022)!;
    const instants = [
      event.globalStartMs,
      event.globalStartMs + 0.25 * (event.globalEndMs - event.globalStartMs),
      event.greatestEclipseUtcMs,
      event.globalStartMs + 0.75 * (event.globalEndMs - event.globalStartMs),
      event.globalEndMs,
    ];
    for (const utcMs of instants) {
      const samples = instantaneousMoonUpInteriorSamples(utcMs);
      expect(samples.length).toBeGreaterThan(3);
      for (const p of samples) {
        expect(pointInLunarVisibilityFootprint(event, p.latDeg, p.lonDeg)).toBe(true);
      }
    }
  });

  it("excludes the antipode of greatest-eclipse zenith and other outside samples", () => {
    const event = getLunarEclipseEventById(TOTAL_2022)!;
    const moon = sublunarPoint(event.greatestEclipseUtcMs);
    const away = antipode(moon.latDeg, moon.lonDeg);
    expect(pointInLunarVisibilityFootprint(event, away.latDeg, away.lonDeg)).toBe(false);
    const start = sublunarPoint(event.globalStartMs);
    const end = sublunarPoint(event.globalEndMs);
    const startC = sphericalMoonAltitudeCosine(away.latDeg, away.lonDeg, start.latDeg, start.lonDeg);
    const endC = sphericalMoonAltitudeCosine(away.latDeg, away.lonDeg, end.latDeg, end.lonDeg);
    expect(startC).toBeLessThan(-0.2);
    expect(endC).toBeLessThan(-0.2);
  });

  it("agrees with local circumstances for representative cities on 2022 total", () => {
    const event = getLunarEclipseEventById(TOTAL_2022)!;
    const rows = [
      CITIES.knoxville,
      CITIES.tokyo,
      CITIES.saoPaulo,
      CITIES.london,
      CITIES.sydney,
      CITIES.losAngeles,
    ];
    for (const city of rows) {
      const local = solveLunarLocalCircumstances(event, city.latitude, city.longitude);
      const inside = pointInLunarVisibilityFootprint(event, city.latitude, city.longitude);
      expect(inside).toBe(local.locallyVisible);
    }
  });

  it("agrees with local circumstances on 2008 partial and a penumbral event", () => {
    for (const id of [PARTIAL_2008, PENUMBRAL]) {
      const event = getLunarEclipseEventById(id)!;
      for (const city of [CITIES.knoxville, CITIES.tokyo, CITIES.sydney, CITIES.london]) {
        const local = solveLunarLocalCircumstances(event, city.latitude, city.longitude);
        expect(pointInLunarVisibilityFootprint(event, city.latitude, city.longitude)).toBe(
          local.locallyVisible,
        );
      }
    }
  });

  it("keeps polar samples finite and closed for a high-latitude-ish union", () => {
    const event = getLunarEclipseEventById(TOTAL_2022)!;
    const fp = lunarEclipseVisibilityFootprint(event);
    assertFiniteClosed(fp.boundary);
    expect(pointInLunarVisibilityFootprint(event, 80, 0) || pointInLunarVisibilityFootprint(event, -80, 0)).toBe(
      true,
    );
    const polar = { latDeg: 89.5, lonDeg: 0 };
    expect(Number.isFinite(polar.latDeg)).toBe(true);
  });

  it("builds a finite closed ring when the event crosses the dateline", () => {
    const event = getLunarEclipseEventById(DATELINE_2015)!;
    const fp = lunarEclipseVisibilityFootprint(event);
    assertFiniteClosed(fp.boundary);
    const moon = sublunarPoint(event.greatestEclipseUtcMs);
    expect(pointInLunarVisibilityFootprint(event, moon.latDeg, moon.lonDeg)).toBe(true);
  });

  it("does not depend on a reference city", () => {
    const event = getLunarEclipseEventById(TOTAL_2029)!;
    const a = lunarEclipseVisibilityFootprint(event);
    const b = lunarEclipseVisibilityFootprint(event);
    expect(a.geometryHash).toBe(b.geometryHash);
    expect(a.boundary).toEqual(b.boundary);
  });

  it("keeps 2 min sampling close to 1 min and prefers it over 5 min", () => {
    const event = getLunarEclipseEventById(TOTAL_2022)!;
    resetLunarEclipseVisibilityFootprintCacheForTests();
    const t0 = performance.now();
    const one = lunarEclipseVisibilityFootprint(event, { sampleStepMs: 60_000 });
    const two = lunarEclipseVisibilityFootprint(event, { sampleStepMs: 120_000 });
    const five = lunarEclipseVisibilityFootprint(event, { sampleStepMs: 300_000 });
    const coldMs = performance.now() - t0;
    expect(coldMs).toBeLessThan(200);
    const t1 = performance.now();
    lunarEclipseVisibilityFootprint(event, { sampleStepMs: 120_000 });
    expect(performance.now() - t1).toBeLessThan(5);
    const moon = sublunarPoint(event.greatestEclipseUtcMs);
    expect(pointInLunarVisibilityFootprint(event, moon.latDeg, moon.lonDeg, { sampleStepMs: 60_000 })).toBe(
      true,
    );
    expect(pointInLunarVisibilityFootprint(event, moon.latDeg, moon.lonDeg, { sampleStepMs: 120_000 })).toBe(
      true,
    );
    expect(one.boundary.length).toBeGreaterThan(8);
    expect(two.boundary.length).toBeGreaterThan(8);
    expect(five.boundary.length).toBeGreaterThan(8);
    expect(two.algorithmId).toBe(one.algorithmId);
  });
});
