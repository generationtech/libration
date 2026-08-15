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
import { haversineKm } from "./besselianGeographic";
import {
  resetSolarEclipseCorridorCacheForTests,
  solarEclipseCorridorCacheSizeForTests,
  solarEclipseEventForecastGeometry,
  SOLAR_ECLIPSE_CORRIDOR_ALGORITHM_ID,
  SOLAR_ECLIPSE_CORRIDOR_SAMPLE_MS,
} from "./solarEclipseCorridor";
import { unwrappedLongitudes } from "../../renderer/renderPlan/equirectSeamPath";

function requireEvent(id: string) {
  const e = getSolarEclipseEventById(id);
  if (!e) {
    throw new Error(`missing fixture ${id}`);
  }
  return e;
}

function nearestKm(
  lat: number,
  lon: number,
  pts: readonly { latDeg: number; lonDeg: number }[],
): number {
  let best = Infinity;
  for (const p of pts) {
    best = Math.min(best, haversineKm(lat, lon, p.latDeg, p.lonDeg));
  }
  return best;
}

function ringContains(ring: readonly { latDeg: number; lonDeg: number }[], lat: number, lon: number): boolean {
  if (ring.length < 4) {
    return false;
  }
  const lats = ring.map((p) => p.latDeg);
  const lons = unwrappedLongitudes(ring.map((p) => p.lonDeg));
  let x = lon;
  const mid = (Math.min(...lons) + Math.max(...lons)) / 2;
  while (x < mid - 180) x += 360;
  while (x > mid + 180) x -= 360;
  let inside = false;
  for (let i = 0, j = lats.length - 1; i < lats.length; j = i, i += 1) {
    const yi = lats[i]!;
    const yj = lats[j]!;
    const xi = lons[i]!;
    const xj = lons[j]!;
    const intersect = yi > lat !== yj > lat && x < ((xj - xi) * (lat - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) {
      inside = !inside;
    }
  }
  return inside;
}

describe("solar eclipse event corridor", () => {
  it("builds a 2024 total corridor along Mexico → US → Canada and caches it", () => {
    resetSolarEclipseCorridorCacheForTests();
    const e = requireEvent("nasa-5mcse-solar-9561");
    const t0 = performance.now();
    const geom = solarEclipseEventForecastGeometry(e);
    const buildMs = performance.now() - t0;
    expect(buildMs).toBeLessThan(500);
    expect(geom.subtype).toBe("total");
    expect(geom.algorithmId).toBe(SOLAR_ECLIPSE_CORRIDOR_ALGORITHM_ID);
    expect(geom.sampleStepMs).toBe(SOLAR_ECLIPSE_CORRIDOR_SAMPLE_MS);
    expect(geom.centerline.length).toBeGreaterThan(20);
    expect(geom.corridorBands.length).toBeGreaterThan(0);
    expect(geom.corridorBands[0]!.length).toBeGreaterThan(8);
    expect(nearestKm(e.geLatDeg, e.geLonDeg, geom.centerline)).toBeLessThan(15);
    expect(geom.corridorBands.some((ring) => ringContains(ring, e.geLatDeg, e.geLonDeg))).toBe(true);
    expect(geom.widthAtGreatestEclipseKm).not.toBeNull();
    expect(Math.abs(geom.widthAtGreatestEclipseKm! - e.pathWidthKm)).toBeLessThan(15);

    const mexico = geom.centerline.some((p) => p.latDeg > 18 && p.latDeg < 28 && p.lonDeg > -110 && p.lonDeg < -97);
    const us = geom.centerline.some((p) => p.latDeg > 30 && p.latDeg < 38 && p.lonDeg > -102 && p.lonDeg < -88);
    const canada = geom.centerline.some((p) => p.latDeg > 42 && p.latDeg < 50 && p.lonDeg > -85 && p.lonDeg < -65);
    expect(mexico).toBe(true);
    expect(us).toBe(true);
    expect(canada).toBe(true);

    const t1 = performance.now();
    const again = solarEclipseEventForecastGeometry(e);
    expect(performance.now() - t1).toBeLessThan(5);
    expect(again).toBe(geom);
    expect(solarEclipseCorridorCacheSizeForTests()).toBe(1);
    const bytes = JSON.stringify(geom).length;
    expect(bytes).toBeLessThan(400_000);
  });

  it("keeps 60 s sampling close to a 30 s centerline", () => {
    resetSolarEclipseCorridorCacheForTests();
    const e = requireEvent("nasa-5mcse-solar-9561");
    const coarse = solarEclipseEventForecastGeometry(e, 60_000);
    const fine = solarEclipseEventForecastGeometry(e, 30_000);
    let maxErr = 0;
    for (const p of coarse.centerline) {
      maxErr = Math.max(maxErr, nearestKm(p.latDeg, p.lonDeg, fine.centerline));
    }
    expect(maxErr).toBeLessThan(25);
  });

  it("builds an annular corridor for 2023-10-14 without totality semantics", () => {
    resetSolarEclipseCorridorCacheForTests();
    const e = requireEvent("nasa-5mcse-solar-9560");
    const geom = solarEclipseEventForecastGeometry(e);
    expect(geom.subtype).toBe("annular");
    expect(geom.corridorBands.length).toBeGreaterThan(0);
    expect(nearestKm(e.geLatDeg, e.geLonDeg, geom.centerline)).toBeLessThan(15);
    expect(Math.abs(geom.widthAtGreatestEclipseKm! - e.pathWidthKm)).toBeLessThan(15);
  });

  it("does not fabricate a central corridor for the 2022-10-25 partial-only event", () => {
    resetSolarEclipseCorridorCacheForTests();
    const e = requireEvent("nasa-5mcse-solar-9558");
    const geom = solarEclipseEventForecastGeometry(e);
    expect(geom.subtype).toBe("partial");
    expect(geom.centerline).toEqual([]);
    expect(geom.corridorBands).toEqual([]);
    expect(geom.partialForecastRegion.length).toBeGreaterThan(4);
    expect(geom.widthAtGreatestEclipseKm).toBeNull();
    const lats = geom.partialForecastRegion.map((p) => p.latDeg);
    const lons = geom.partialForecastRegion.map((p) => p.lonDeg);
    expect(Math.min(...lats)).toBeLessThan(30);
    expect(Math.max(...lats)).toBeGreaterThan(50);
    expect(Math.min(...lons)).toBeLessThan(20);
    expect(Math.max(...lons)).toBeGreaterThan(50);
    expect(nearestKm(-41, 174, geom.partialForecastRegion)).toBeGreaterThan(2000);
  });

  it("keeps a dateline-adjacent Pacific corridor geographically local", () => {
    resetSolarEclipseCorridorCacheForTests();
    const e = requireEvent("nasa-5mcse-solar-9543");
    const geom = solarEclipseEventForecastGeometry(e);
    expect(geom.centerline.length).toBeGreaterThan(10);
    expect(geom.corridorBands.length).toBeGreaterThan(0);
    const lons = unwrappedLongitudes(geom.centerline.map((p) => p.lonDeg));
    expect(Math.max(...lons) - Math.min(...lons)).toBeLessThan(200);
  });

  it("builds a polar 2021-12-04 corridor without a map-spanning ring", () => {
    resetSolarEclipseCorridorCacheForTests();
    const e = requireEvent("nasa-5mcse-solar-9556");
    const geom = solarEclipseEventForecastGeometry(e);
    expect(geom.subtype).toBe("total");
    expect(geom.centerline.length).toBeGreaterThan(5);
    expect(geom.corridorBands.length).toBeGreaterThan(0);
    for (const ring of geom.corridorBands) {
      const lons = unwrappedLongitudes(ring.map((p) => p.lonDeg));
      expect(Math.max(...lons) - Math.min(...lons)).toBeLessThan(270);
    }
  });
});
