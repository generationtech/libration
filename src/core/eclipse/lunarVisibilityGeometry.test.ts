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
import { sublunarPoint } from "../sublunarPoint";
import {
  isMoonGeometricallyAboveHorizon,
  lunarHorizonBoundary,
  lunarVisibilityPolarCloseLatDeg,
  lunarVisibilityRegionRing,
  sphericalMoonAltitudeCosine,
  sphericalSeparationDeg,
} from "./lunarVisibilityGeometry";
import { equirectRingToPathDescriptors } from "../../renderer/renderPlan/equirectSeamRegion";

const KNOXVILLE = { latDeg: 35.9606, lonDeg: -83.9207 };
const TOKYO = { latDeg: 35.6762, lonDeg: 139.6503 };
const UTC_2022 = Date.parse("2022-05-16T04:11:29.000Z");
const UTC_2008 = Date.parse("2008-08-16T21:10:06.000Z");
const UTC_2015 = Date.parse("2015-04-04T12:00:15.000Z");

function antipode(latDeg: number, lonDeg: number): { latDeg: number; lonDeg: number } {
  const lon = lonDeg + 180;
  return { latDeg: -latDeg, lonDeg: lon > 180 ? lon - 360 : lon };
}

describe("lunar visibility geometry", () => {
  it("places the sublunar point inside and the antipode outside", () => {
    const moon = sublunarPoint(UTC_2022);
    expect(isMoonGeometricallyAboveHorizon(moon.latDeg, moon.lonDeg, moon.latDeg, moon.lonDeg)).toBe(
      true,
    );
    expect(sphericalMoonAltitudeCosine(moon.latDeg, moon.lonDeg, moon.latDeg, moon.lonDeg)).toBeCloseTo(
      1,
      6,
    );
    const ap = antipode(moon.latDeg, moon.lonDeg);
    expect(isMoonGeometricallyAboveHorizon(ap.latDeg, ap.lonDeg, moon.latDeg, moon.lonDeg)).toBe(
      false,
    );
    expect(sphericalMoonAltitudeCosine(ap.latDeg, ap.lonDeg, moon.latDeg, moon.lonDeg)).toBeCloseTo(
      -1,
      5,
    );
  });

  it("has near-zero cosine on the geometric horizon contour", () => {
    const moon = sublunarPoint(UTC_2022);
    const ring = lunarHorizonBoundary(moon.latDeg, moon.lonDeg);
    expect(ring.length).toBeGreaterThan(8);
    let minAbs = Infinity;
    for (const p of ring) {
      const c = Math.abs(
        sphericalMoonAltitudeCosine(p.latDeg, p.lonDeg, moon.latDeg, moon.lonDeg),
      );
      minAbs = Math.min(minAbs, c);
      expect(c).toBeLessThan(0.08);
    }
    expect(minAbs).toBeLessThan(0.02);
  });

  it("classifies Knoxville inside and Tokyo outside at 2022-05-16 greatest eclipse", () => {
    const moon = sublunarPoint(UTC_2022);
    expect(
      isMoonGeometricallyAboveHorizon(KNOXVILLE.latDeg, KNOXVILLE.lonDeg, moon.latDeg, moon.lonDeg),
    ).toBe(true);
    expect(isMoonGeometricallyAboveHorizon(TOKYO.latDeg, TOKYO.lonDeg, moon.latDeg, moon.lonDeg)).toBe(
      false,
    );
  });

  it("still returns a hemisphere at the 2008 partial fixture", () => {
    const moon = sublunarPoint(UTC_2008);
    expect(isMoonGeometricallyAboveHorizon(moon.latDeg, moon.lonDeg, moon.latDeg, moon.lonDeg)).toBe(
      true,
    );
    const ap = antipode(moon.latDeg, moon.lonDeg);
    expect(isMoonGeometricallyAboveHorizon(ap.latDeg, ap.lonDeg, moon.latDeg, moon.lonDeg)).toBe(
      false,
    );
  });

  it("keeps a dateline-centered Moon-up hemisphere from inverting", () => {
    const moon = sublunarPoint(UTC_2015);
    expect(Math.abs(Math.abs(moon.lonDeg) - 180)).toBeLessThan(40);
    const ring = lunarVisibilityRegionRing(moon.latDeg, moon.lonDeg);
    const pole = lunarVisibilityPolarCloseLatDeg(moon.latDeg);
    expect(pole).toBe(moon.latDeg >= 0 ? 90 : -90);
    const descriptors = equirectRingToPathDescriptors(ring, 360, 180, {
      polarCloseLatDeg: pole,
    });
    expect(descriptors.length).toBeGreaterThan(0);
    const eqRing = lunarVisibilityRegionRing(0, 179);
    const eqDescriptors = equirectRingToPathDescriptors(eqRing, 360, 180, {
      polarCloseLatDeg: lunarVisibilityPolarCloseLatDeg(0),
    });
    expect(eqDescriptors.length).toBeGreaterThan(1);
    for (const d of eqDescriptors) {
      const xs: number[] = [];
      for (const c of d.commands) {
        if (c.kind === "moveTo" || c.kind === "lineTo") {
          xs.push(c.x);
        }
      }
      expect(Math.max(...xs) - Math.min(...xs)).toBeLessThan(200);
    }
  });

  it("closes a southern-hemisphere cap through the south pole, not the north", () => {
    const ring = lunarVisibilityRegionRing(-40, 0);
    const pole = lunarVisibilityPolarCloseLatDeg(-40);
    expect(pole).toBe(-90);
    const descriptors = equirectRingToPathDescriptors(ring, 360, 180, {
      polarCloseLatDeg: pole,
    });
    let sawSouth = false;
    for (const d of descriptors) {
      for (const c of d.commands) {
        if ((c.kind === "moveTo" || c.kind === "lineTo") && c.y >= 179) {
          sawSouth = true;
        }
      }
    }
    expect(sawSouth).toBe(true);
  });

  it("keeps 89° probes inside and 91° probes outside the Moon-up hemisphere", () => {
    const moon = { latDeg: -23, lonDeg: -50 };
    expect(isMoonGeometricallyAboveHorizon(moon.latDeg, moon.lonDeg, moon.latDeg, moon.lonDeg)).toBe(true);
    const ap = antipode(moon.latDeg, moon.lonDeg);
    expect(isMoonGeometricallyAboveHorizon(ap.latDeg, ap.lonDeg, moon.latDeg, moon.lonDeg)).toBe(false);
    for (const az of [0, 45, 90, 135, 180, 225, 270, 315]) {
      const inside = destinationPoint(moon, 89, az);
      const bound = destinationPoint(moon, 90, az);
      const outside = destinationPoint(moon, 91, az);
      expect(sphericalSeparationDeg(inside.latDeg, inside.lonDeg, moon.latDeg, moon.lonDeg)).toBeCloseTo(89, 0);
      expect(isMoonGeometricallyAboveHorizon(inside.latDeg, inside.lonDeg, moon.latDeg, moon.lonDeg)).toBe(true);
      expect(Math.abs(sphericalMoonAltitudeCosine(bound.latDeg, bound.lonDeg, moon.latDeg, moon.lonDeg))).toBeLessThan(
        0.02,
      );
      expect(isMoonGeometricallyAboveHorizon(outside.latDeg, outside.lonDeg, moon.latDeg, moon.lonDeg)).toBe(false);
    }
  });

  it("moves the 2029 visibility center continuously without a hemisphere flip", () => {
    const t0 = Date.parse("2029-06-26T00:34:32.000Z");
    const t1 = Date.parse("2029-06-26T06:09:38.000Z");
    let prev = sublunarPoint(t0);
    let prevLon = prev.lonDeg;
    for (let t = t0 + 3 * 60_000; t <= t1; t += 3 * 60_000) {
      const moon = sublunarPoint(t);
      expect(Number.isFinite(moon.latDeg)).toBe(true);
      expect(Number.isFinite(moon.lonDeg)).toBe(true);
      const dLat = Math.abs(moon.latDeg - prev.latDeg);
      let dLon = moon.lonDeg - prevLon;
      while (dLon > 180) dLon -= 360;
      while (dLon < -180) dLon += 360;
      expect(dLat).toBeLessThan(1.5);
      expect(Math.abs(dLon)).toBeLessThan(3);
      expect(isMoonGeometricallyAboveHorizon(moon.latDeg, moon.lonDeg, moon.latDeg, moon.lonDeg)).toBe(true);
      const ap = antipode(moon.latDeg, moon.lonDeg);
      expect(isMoonGeometricallyAboveHorizon(ap.latDeg, ap.lonDeg, moon.latDeg, moon.lonDeg)).toBe(false);
      prev = moon;
      prevLon = moon.lonDeg;
    }
  });

  it("keeps a polar Moon-up hemisphere finite and uninverted", () => {
    const moon = { latDeg: 82, lonDeg: 40 };
    const ring = lunarVisibilityRegionRing(moon.latDeg, moon.lonDeg);
    expect(ring.length).toBeGreaterThan(8);
    for (const p of ring) {
      expect(Number.isFinite(p.latDeg)).toBe(true);
      expect(Number.isFinite(p.lonDeg)).toBe(true);
      expect(Math.abs(p.latDeg)).toBeLessThanOrEqual(90);
    }
    expect(isMoonGeometricallyAboveHorizon(moon.latDeg, moon.lonDeg, moon.latDeg, moon.lonDeg)).toBe(true);
    const ap = antipode(moon.latDeg, moon.lonDeg);
    expect(isMoonGeometricallyAboveHorizon(ap.latDeg, ap.lonDeg, moon.latDeg, moon.lonDeg)).toBe(false);
    expect(lunarVisibilityPolarCloseLatDeg(moon.latDeg)).toBe(90);
    const descriptors = equirectRingToPathDescriptors(ring, 360, 180, {
      polarCloseLatDeg: 90,
    });
    expect(descriptors.length).toBeGreaterThan(0);
  });
});

function destinationPoint(
  origin: { latDeg: number; lonDeg: number },
  distanceDeg: number,
  bearingDeg: number,
): { latDeg: number; lonDeg: number } {
  const deg = Math.PI / 180;
  const phi1 = origin.latDeg * deg;
  const lam1 = origin.lonDeg * deg;
  const d = distanceDeg * deg;
  const br = bearingDeg * deg;
  const phi2 = Math.asin(Math.sin(phi1) * Math.cos(d) + Math.cos(phi1) * Math.sin(d) * Math.cos(br));
  const lam2 =
    lam1 +
    Math.atan2(Math.sin(br) * Math.sin(d) * Math.cos(phi1), Math.cos(d) - Math.sin(phi1) * Math.sin(phi2));
  let lon = (lam2 / deg) % 360;
  if (lon > 180) lon -= 360;
  if (lon <= -180) lon += 360;
  return { latDeg: phi2 / deg, lonDeg: lon };
}
