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
import { unwrappedLongitudes } from "../renderer/renderPlan/equirectSeamPath";
import { galacticEquatorOfDate, galacticZenithSubpoint } from "./milkyWayGalactic";
import { sampleMilkyWayGeometry } from "./milkyWayGeometry";
import {
  altitudeDegFromSubpoint,
  angularDistanceDeg,
  culminationAltitudeDeg,
  localMoonlightContribution01,
  milkyWayVisibilityMoonFactor,
  milkyWayVisibilityMoonStateAt,
  milkyWayVisibilityNightFactor,
  sampleMilkyWayVisibilityContours,
  sampleSmallCircle,
  solarAltitudeDegAt,
  MILKY_WAY_VISIBILITY_CONTOUR_STEP_DEG,
  MILKY_WAY_VISIBILITY_DAY_NIGHT_FACTOR,
  MILKY_WAY_VISIBILITY_MOON_FACTOR_MIN,
  MILKY_WAY_VISIBILITY_NIGHT_NIGHT_FACTOR,
} from "./milkyWayVisibilityGeometry";
import { wrapSigned180 } from "./planetarySubpoint";
import { subsolarPoint } from "./subsolarPoint";

const PINNED = Date.UTC(2026, 7, 19, 6, 0, 0, 0);
const DATELINE = Date.UTC(2026, 7, 19, 15, 30, 0, 0);

function directAltitudeFromEquatorOfDate(
  observerLatDeg: number,
  observerLonDeg: number,
  raDeg: number,
  decDeg: number,
  gastDeg: number,
): number {
  const haDeg = wrapSigned180(gastDeg + observerLonDeg - raDeg);
  const lat = (observerLatDeg * Math.PI) / 180;
  const dec = (decDeg * Math.PI) / 180;
  const ha = (haDeg * Math.PI) / 180;
  const sinH =
    Math.sin(lat) * Math.sin(dec) + Math.cos(lat) * Math.cos(dec) * Math.cos(ha);
  return (Math.asin(Math.max(-1, Math.min(1, sinH))) * 180) / Math.PI;
}

describe("altitudeDegFromSubpoint vs direct equator-of-date altitude", () => {
  it("matches the spherical-altitude identity at scattered observers", () => {
    const eq = galacticEquatorOfDate(0, 0, PINNED)!;
    const sub = galacticZenithSubpoint(0, 0, PINNED)!;
    const observers = [
      { latDeg: 40, lonDeg: -90 },
      { latDeg: 20, lonDeg: 10 },
      { latDeg: 0, lonDeg: sub.lonDeg },
      { latDeg: -20, lonDeg: 120 },
      { latDeg: -29, lonDeg: sub.lonDeg },
      { latDeg: -40, lonDeg: wrapSigned180(sub.lonDeg + 40) },
    ];
    for (const o of observers) {
      const fromSub = altitudeDegFromSubpoint(o, sub);
      const direct = directAltitudeFromEquatorOfDate(
        o.latDeg,
        o.lonDeg,
        eq.raDeg,
        eq.decDeg,
        eq.gastDeg,
      );
      expect(fromSub).toBeCloseTo(direct, 5);
    }
  });
});

describe("southern-hemisphere Galactic-center culmination", () => {
  it("matches h_max = 90° − |lat − Dec| at the current GC declination of date", () => {
    const sub = galacticZenithSubpoint(0, 0, PINNED)!;
    const dec = sub.latDeg;
    const latitudes = [40, 20, 0, -20, -29, -40];
    const expected = latitudes.map((lat) => culminationAltitudeDeg(lat, dec));
    for (let i = 0; i < latitudes.length; i += 1) {
      const lat = latitudes[i]!;
      const observer = { latDeg: lat, lonDeg: sub.lonDeg };
      expect(altitudeDegFromSubpoint(observer, sub)).toBeCloseTo(expected[i]!, 5);
    }
    expect(dec).toBeCloseTo(-28.99, 1);
    expect(expected[0]).toBeCloseTo(21.01, 1);
    expect(expected[1]).toBeCloseTo(41.01, 1);
    expect(expected[2]).toBeCloseTo(61.01, 1);
    expect(expected[3]).toBeCloseTo(81.01, 1);
    expect(expected[4]).toBeGreaterThan(88);
    expect(expected[5]).toBeCloseTo(78.99, 1);
    expect(expected[4]).toBeGreaterThan(expected[0]!);
    expect(expected[3]).toBeGreaterThan(expected[1]!);
  });
});

describe("sampleSmallCircle", () => {
  it("keeps angular radius 90° − h for each altitude contour around the GC subpoint", () => {
    const center = galacticZenithSubpoint(0, 0, PINNED)!;
    for (const h of [30, 45, 60, 75] as const) {
      const ring = sampleSmallCircle(center, 90 - h);
      expect(ring.length).toBe(360 / MILKY_WAY_VISIBILITY_CONTOUR_STEP_DEG + 1);
      for (const p of ring) {
        expect(Number.isFinite(p.latDeg)).toBe(true);
        expect(Number.isFinite(p.lonDeg)).toBe(true);
        expect(angularDistanceDeg(p, center)).toBeCloseTo(90 - h, 4);
        expect(altitudeDegFromSubpoint(p, center)).toBeCloseTo(h, 4);
      }
    }
  });

  it("nests higher-altitude contours closer to the center", () => {
    const center = galacticZenithSubpoint(0, 0, PINNED)!;
    const r75 = angularDistanceDeg(sampleSmallCircle(center, 15)[0]!, center);
    const r60 = angularDistanceDeg(sampleSmallCircle(center, 30)[0]!, center);
    const r30 = angularDistanceDeg(sampleSmallCircle(center, 60)[0]!, center);
    expect(r75).toBeLessThan(r60);
    expect(r60).toBeLessThan(r30);
  });

  it("stays finite for a polar-enclosing horizon ring", () => {
    const center = { latDeg: -29, lonDeg: 0 };
    const ring = sampleSmallCircle(center, 90);
    expect(ring.every((p) => Number.isFinite(p.latDeg) && Number.isFinite(p.lonDeg))).toBe(true);
    expect(ring.every((p) => p.latDeg >= -90 && p.latDeg <= 90)).toBe(true);
  });
});

describe("sampleMilkyWayVisibilityContours", () => {
  it("reuses the LIB-049 Galactic-center subpoint", () => {
    const ribbon = sampleMilkyWayGeometry(PINNED, "normal")!;
    const vis = sampleMilkyWayVisibilityContours(PINNED, ribbon.galacticCenter!, [30, 60]);
    expect(vis.galacticCenter.latDeg).toBeCloseTo(ribbon.galacticCenter!.latDeg, 8);
    expect(vis.galacticCenter.lonDeg).toBeCloseTo(ribbon.galacticCenter!.lonDeg, 8);
  });

  it("classifies inside / on / outside a 60° contour", () => {
    const center = galacticZenithSubpoint(0, 0, PINNED)!;
    const vis = sampleMilkyWayVisibilityContours(PINNED, center, [60]);
    const on = vis.contours[0]!.points[10]!;
    expect(altitudeDegFromSubpoint(on, center)).toBeCloseTo(60, 3);
    const inside = sampleSmallCircle(center, 10)[0]!;
    expect(altitudeDegFromSubpoint(inside, center)).toBeGreaterThan(60);
    const outside = sampleSmallCircle(center, 50)[0]!;
    expect(altitudeDegFromSubpoint(outside, center)).toBeLessThan(60);
  });

  it("translates ~90° west after six hours without changing contour radii", () => {
    const aCenter = galacticZenithSubpoint(0, 0, PINNED)!;
    const later = PINNED + 6 * 3600 * 1000;
    const bCenter = galacticZenithSubpoint(0, 0, later)!;
    const a = sampleMilkyWayVisibilityContours(PINNED, aCenter, [45, 60]);
    const b = sampleMilkyWayVisibilityContours(later, bCenter, [45, 60]);
    const dLon = wrapSigned180(bCenter.lonDeg - aCenter.lonDeg);
    expect(Math.abs(dLon)).toBeGreaterThan(85);
    expect(Math.abs(dLon)).toBeLessThan(95);
    expect(bCenter.latDeg).toBeCloseTo(aCenter.latDeg, 2);
    for (let c = 0; c < a.contours.length; c += 1) {
      const rA = angularDistanceDeg(a.contours[c]!.points[0]!, aCenter);
      const rB = angularDistanceDeg(b.contours[c]!.points[0]!, bCenter);
      expect(rB).toBeCloseTo(rA, 4);
    }
  });

  it("unwraps a compact dateline-crossing ring without a 360° jump", () => {
    const center = { latDeg: -29, lonDeg: 179 };
    const vis = sampleMilkyWayVisibilityContours(DATELINE, center, [60]);
    const u = unwrappedLongitudes(vis.contours[0]!.points.map((p) => p.lonDeg));
    for (let i = 1; i < u.length; i += 1) {
      expect(Math.abs(u[i]! - u[i - 1]!)).toBeLessThan(20);
    }
    expect(vis.contours[0]!.points.some((p) => p.lonDeg > 150)).toBe(true);
    expect(vis.contours[0]!.points.some((p) => p.lonDeg < -150)).toBe(true);
  });

  it("samples default contours quickly at a pinned instant", () => {
    const center = galacticZenithSubpoint(0, 0, PINNED)!;
    const sub = subsolarPoint(PINNED);
    const t0 = performance.now();
    const vis = sampleMilkyWayVisibilityContours(PINNED, center, [30, 45, 60, 75], {
      tagSun: true,
      tagMoon: true,
    });
    const ms = performance.now() - t0;
    expect(vis.contours).toHaveLength(4);
    expect(ms).toBeLessThan(40);
    const p = vis.contours[0]!.points[0]!;
    expect(p.solarAltitudeDeg).toBeCloseTo(solarAltitudeDegAt(p.latDeg, p.lonDeg, sub), 5);
  });
});

describe("milkyWayVisibilityNightFactor", () => {
  it("is monotonic from day through twilight to astronomical night", () => {
    const samples = [10, 0, -9, -18, -30].map((alt) => ({
      alt,
      f: milkyWayVisibilityNightFactor(alt),
    }));
    expect(samples[0]!.f).toBeCloseTo(MILKY_WAY_VISIBILITY_DAY_NIGHT_FACTOR, 5);
    expect(samples[1]!.f).toBeCloseTo(MILKY_WAY_VISIBILITY_DAY_NIGHT_FACTOR, 5);
    expect(samples[2]!.f).toBeGreaterThan(samples[1]!.f);
    expect(samples[2]!.f).toBeLessThan(samples[3]!.f);
    expect(samples[3]!.f).toBeCloseTo(MILKY_WAY_VISIBILITY_NIGHT_NIGHT_FACTOR, 5);
    expect(samples[4]!.f).toBeCloseTo(MILKY_WAY_VISIBILITY_NIGHT_NIGHT_FACTOR, 5);
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]!.f).toBeGreaterThanOrEqual(samples[i - 1]!.f - 1e-9);
    }
  });
});

describe("milkyWayVisibilityMoonFactor", () => {
  it("is 1 below the horizon and nonincreasing with local moonlight", () => {
    expect(milkyWayVisibilityMoonFactor(0)).toBe(1);
    expect(milkyWayVisibilityMoonFactor(1)).toBeCloseTo(MILKY_WAY_VISIBILITY_MOON_FACTOR_MIN, 5);
    expect(milkyWayVisibilityMoonFactor(0.2)).toBeGreaterThan(milkyWayVisibilityMoonFactor(0.8));
    expect(localMoonlightContribution01(-0.4, 1, 1)).toBe(0);
    const moon = milkyWayVisibilityMoonStateAt(PINNED);
    const below = localMoonlightContribution01(
      -0.2,
      moon.lunarIlluminatedFraction,
      moon.moonlightTransmission01,
    );
    expect(below).toBe(0);
    expect(milkyWayVisibilityMoonFactor(below)).toBe(1);
  });
});
