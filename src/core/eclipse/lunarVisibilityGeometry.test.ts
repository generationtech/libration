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
});
