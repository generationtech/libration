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
import { galacticZenithSubpoint } from "./milkyWayGalactic";
import {
  MILKY_WAY_LONGITUDE_STEP_DEG,
  MILKY_WAY_RIB_STEP_DEG,
  geographicPointIsNight,
  resetMilkyWayGeometryCacheForTests,
  sampleMilkyWayGeometry,
} from "./milkyWayGeometry";
import { wrapSigned180 } from "./planetarySubpoint";
import { subsolarPoint } from "./subsolarPoint";

const PINNED = Date.UTC(2026, 7, 19, 15, 30, 0, 0);

describe("sampleMilkyWayGeometry", () => {
  it("samples a closed Galactic plane and matching band edges", () => {
    resetMilkyWayGeometryCacheForTests();
    const g = sampleMilkyWayGeometry(PINNED, "normal");
    expect(g).not.toBeNull();
    const expected = 360 / MILKY_WAY_LONGITUDE_STEP_DEG + 1;
    expect(g!.plane.length).toBe(expected);
    expect(g!.northEdge.length).toBe(expected);
    expect(g!.southEdge.length).toBe(expected);
    expect(g!.ribs.length).toBe(360 / MILKY_WAY_RIB_STEP_DEG);
    expect(g!.galacticCenter).not.toBeNull();
    expect(g!.galacticAnticenter).not.toBeNull();
  });

  it("places the Galactic center at the l=0, b=0 zenith subpoint", () => {
    const g = sampleMilkyWayGeometry(PINNED, "normal")!;
    const direct = galacticZenithSubpoint(0, 0, PINNED)!;
    expect(g.galacticCenter!.latDeg).toBeCloseTo(direct.latDeg, 6);
    expect(g.galacticCenter!.lonDeg).toBeCloseTo(direct.lonDeg, 6);
  });

  it("uses a larger geographic span for wide than narrow band", () => {
    const narrow = sampleMilkyWayGeometry(PINNED, "narrow")!;
    const wide = sampleMilkyWayGeometry(PINNED, "wide")!;
    const nSpan = Math.max(...narrow.northEdge.map((p) => p.latDeg)) -
      Math.min(...narrow.southEdge.map((p) => p.latDeg));
    const wSpan = Math.max(...wide.northEdge.map((p) => p.latDeg)) -
      Math.min(...wide.southEdge.map((p) => p.latDeg));
    expect(wSpan).toBeGreaterThan(nSpan + 8);
  });

  it("keeps sequential plane unwrap steps short (no world-spanning jumps)", () => {
    const g = sampleMilkyWayGeometry(PINNED, "normal")!;
    const u = unwrappedLongitudes(g.plane.map((p) => p.lonDeg));
    for (let i = 1; i < u.length; i += 1) {
      expect(Math.abs(u[i]! - u[i - 1]!)).toBeLessThan(20);
    }
  });

  it("shifts the ribbon west with Earth rotation without rebuilding celestial identity", () => {
    resetMilkyWayGeometryCacheForTests();
    const a = sampleMilkyWayGeometry(PINNED, "normal")!;
    const later = PINNED + 15 * 60 * 1000;
    const b = sampleMilkyWayGeometry(later, "normal")!;
    const dLon = wrapSigned180(b.galacticCenter!.lonDeg - a.galacticCenter!.lonDeg);
    expect(dLon).toBeLessThan(-3);
    expect(dLon).toBeGreaterThan(-5);
    expect(b.galacticCenter!.latDeg).toBeCloseTo(a.galacticCenter!.latDeg, 2);
  });

  it("returns null outside the supported span", () => {
    expect(sampleMilkyWayGeometry(Date.UTC(1400, 0, 1), "normal")).toBeNull();
  });

  it("tags night using the subsolar geometric horizon", () => {
    const g = sampleMilkyWayGeometry(PINNED, "normal")!;
    const sub = subsolarPoint(PINNED);
    const center = g.galacticCenter!;
    expect(center.night).toBe(
      geographicPointIsNight(center.latDeg, center.lonDeg, sub.latDeg, sub.lonDeg),
    );
    expect(g.plane.some((p) => p.night) && g.plane.some((p) => !p.night)).toBe(true);
  });
});
