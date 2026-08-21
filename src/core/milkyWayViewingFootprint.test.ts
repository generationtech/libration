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
import { REFERENCE_CITIES } from "../data/referenceCities";
import {
  MILKY_WAY_VIEWING_FOOTPRINT_ALGORITHM_ID,
  MILKY_WAY_VIEWING_FOOTPRINT_GRID_STEP_DEG,
  milkyWayViewingFootprint,
  milkyWayViewingFootprintContains,
  resetMilkyWayViewingFootprintCacheForTests,
} from "./milkyWayViewingFootprint";
import { MILKY_WAY_VIEWING_POLICY_VERSION } from "./milkyWayViewingPolicy";
import {
  evaluateMilkyWayViewingAt,
  findNextMilkyWayViewingWindow,
  listMilkyWayViewingWindows,
  milkyWayViewingInstantFieldAt,
  resetMilkyWayViewingWindowCacheForTests,
  type MilkyWayViewingObserver,
} from "./milkyWayViewingWindows";

const knoxvilleCity = REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!;
const KNOXVILLE: MilkyWayViewingObserver = {
  cityId: knoxvilleCity.id,
  latitudeDeg: knoxvilleCity.latitude,
  longitudeDeg: knoxvilleCity.longitude,
};
const ATACAMA: MilkyWayViewingObserver = {
  cityId: "test.atacama",
  latitudeDeg: -23,
  longitudeDeg: -68,
};

function knoxvilleWindow() {
  resetMilkyWayViewingWindowCacheForTests();
  const next = findNextMilkyWayViewingWindow({
    observer: KNOXVILLE,
    afterUtcMs: Date.UTC(2026, 7, 19, 6, 0, 0, 0),
    horizonMs: 4 * 86_400_000,
  });
  expect(next).not.toBeNull();
  return next!;
}

describe("milkyWayViewingFootprint", () => {
  it("is a static peak-UTC snapshot keyed by event identity, not product time", () => {
    const w = knoxvilleWindow();
    resetMilkyWayViewingFootprintCacheForTests();
    const t0 = Date.now();
    const a = milkyWayViewingFootprint(w);
    const coldMs = Date.now() - t0;
    const t1 = Date.now();
    const b = milkyWayViewingFootprint(w);
    const hitMs = Date.now() - t1;
    expect(b).toBe(a);
    expect(a.eventId).toBe(w.id);
    expect(a.peakUtcMs).toBe(w.peakUtcMs);
    expect(a.policyVersion).toBe(MILKY_WAY_VIEWING_POLICY_VERSION);
    expect(a.algorithmId).toBe(MILKY_WAY_VIEWING_FOOTPRINT_ALGORITHM_ID);
    expect(a.geometryHash).toMatch(/^[0-9a-f]{8}$/);
    expect(a.rings.length).toBeGreaterThan(0);
    expect(MILKY_WAY_VIEWING_FOOTPRINT_GRID_STEP_DEG).toBe(1);
    expect(coldMs).toBeLessThan(8_000);
    expect(hitMs).toBeLessThan(50);
  }, 20_000);

  it("includes Knoxville in its own event footprint by definition", () => {
    const w = knoxvilleWindow();
    expect(milkyWayViewingFootprintContains(w, KNOXVILLE.latitudeDeg, KNOXVILLE.longitudeDeg)).toBe(true);
    const field = milkyWayViewingInstantFieldAt(w.peakUtcMs)!;
    const local = evaluateMilkyWayViewingAt(field, KNOXVILLE.latitudeDeg, KNOXVILLE.longitudeDeg);
    expect(local.qualifies).toBe(true);
    expect(local.solarAltitudeDeg).toBeLessThanOrEqual(-18);
    expect(local.localMoonlight01).toBeLessThanOrEqual(0.08);
  });

  it("agrees with direct field probes inside, just outside, and far outside", () => {
    const w = knoxvilleWindow();
    const field = milkyWayViewingInstantFieldAt(w.peakUtcMs)!;
    const probes: Array<{ lat: number; lon: number }> = [
      { lat: KNOXVILLE.latitudeDeg, lon: KNOXVILLE.longitudeDeg },
      { lat: KNOXVILLE.latitudeDeg + 1, lon: KNOXVILLE.longitudeDeg },
      { lat: KNOXVILLE.latitudeDeg - 1, lon: KNOXVILLE.longitudeDeg },
      { lat: 65, lon: 0 },
      { lat: -80, lon: 0 },
      { lat: 0, lon: 0 },
      { lat: ATACAMA.latitudeDeg, lon: ATACAMA.longitudeDeg },
    ];
    for (const p of probes) {
      const direct = evaluateMilkyWayViewingAt(field, p.lat, p.lon).qualifies;
      expect(milkyWayViewingFootprintContains(w, p.lat, p.lon)).toBe(direct);
    }
    expect(milkyWayViewingFootprintContains(w, 65, 0)).toBe(false);
  });

  it("includes Atacama-latitude land when a southern event peak qualifies there", () => {
    resetMilkyWayViewingWindowCacheForTests();
    const listed = listMilkyWayViewingWindows({
      observer: ATACAMA,
      startUtcMs: Date.UTC(2026, 7, 1),
      endUtcMs: Date.UTC(2026, 8, 1),
    });
    expect(listed.windows.length).toBeGreaterThan(0);
    const w = listed.windows.reduce((best, cur) =>
      cur.peakAltitudeDeg > best.peakAltitudeDeg ? cur : best,
    );
    const field = milkyWayViewingInstantFieldAt(w.peakUtcMs)!;
    const local = evaluateMilkyWayViewingAt(field, ATACAMA.latitudeDeg, ATACAMA.longitudeDeg);
    expect(local.qualifies).toBe(true);
    expect(local.gcAltitudeDeg).toBeGreaterThan(70);
    expect(milkyWayViewingFootprintContains(w, ATACAMA.latitudeDeg, ATACAMA.longitudeDeg)).toBe(true);
  });

  it("excludes high-moonlight geography at the same peak UTC", () => {
    const w = knoxvilleWindow();
    const field = milkyWayViewingInstantFieldAt(w.peakUtcMs)!;
    let bright: { lat: number; lon: number; moon: number } | null = null;
    for (let lat = -60; lat <= 60; lat += 10) {
      for (let lon = -180; lon < 180; lon += 20) {
        const c = evaluateMilkyWayViewingAt(field, lat, lon);
        if (c.gcAltitudeDeg >= 15 && c.solarAltitudeDeg <= -18 && c.localMoonlight01 > 0.22) {
          bright = { lat, lon, moon: c.localMoonlight01 };
          break;
        }
      }
      if (bright) {
        break;
      }
    }
    if (bright) {
      expect(milkyWayViewingFootprintContains(w, bright.lat, bright.lon)).toBe(false);
    }
  });

  it("does not exclude moon-down geography when other gates pass", () => {
    const w = knoxvilleWindow();
    const field = milkyWayViewingInstantFieldAt(w.peakUtcMs)!;
    const local = evaluateMilkyWayViewingAt(field, KNOXVILLE.latitudeDeg, KNOXVILLE.longitudeDeg);
    if (!local.moonAboveHorizon) {
      expect(local.localMoonlight01).toBe(0);
      expect(local.qualifies).toBe(true);
    }
    let moonDown: { lat: number; lon: number } | null = null;
    for (let lat = -40; lat <= 40; lat += 5) {
      for (let lon = -180; lon < 180; lon += 15) {
        const c = evaluateMilkyWayViewingAt(field, lat, lon);
        if (c.qualifies && !c.moonAboveHorizon) {
          moonDown = { lat, lon };
          break;
        }
      }
      if (moonDown) {
        break;
      }
    }
    if (moonDown) {
      expect(milkyWayViewingFootprintContains(w, moonDown.lat, moonDown.lon)).toBe(true);
    }
  });

  it("emits finite closed rings and handles dateline longitudes", () => {
    const w = knoxvilleWindow();
    const fp = milkyWayViewingFootprint(w);
    expect(fp.rings.length).toBeGreaterThan(0);
    for (const ring of fp.rings) {
      expect(ring.length).toBeGreaterThan(8);
      const a = ring[0]!;
      const z = ring[ring.length - 1]!;
      expect(a.latDeg).toBeCloseTo(z.latDeg, 4);
      expect(a.lonDeg).toBeCloseTo(z.lonDeg, 4);
      for (const p of ring) {
        expect(Number.isFinite(p.latDeg)).toBe(true);
        expect(Number.isFinite(p.lonDeg)).toBe(true);
        expect(Math.abs(p.latDeg)).toBeLessThanOrEqual(90.001);
      }
    }
  });

  it("does not import illumination, clouds, or light pollution", () => {
    const src = `${milkyWayViewingFootprint.toString()} ${milkyWayViewingFootprintContains.toString()}`;
    expect(src).not.toMatch(/cloud/i);
    expect(src).not.toMatch(/bortle/i);
    expect(src).not.toMatch(/nightVeil/i);
    expect(src).not.toMatch(/rasterPatch/i);
  });
});
