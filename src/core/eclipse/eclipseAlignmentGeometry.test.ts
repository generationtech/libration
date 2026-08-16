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
import {
  angularDistanceDeg,
  antiSolarPoint,
  circleAlignmentRing,
  midpointGreatCircle,
  ringLongitudeJumpsAreShortArc,
  taperedAlignmentRibbon,
} from "./eclipseAlignmentGeometry";

describe("eclipse alignment geometry", () => {
  it("places the anti-solar point opposite the subsolar point", () => {
    const anti = antiSolarPoint({ latDeg: 20, lonDeg: 40 });
    expect(anti.latDeg).toBeCloseTo(-20, 8);
    expect(anti.lonDeg).toBeCloseTo(-140, 8);
    expect(angularDistanceDeg({ latDeg: 20, lonDeg: 40 }, anti)).toBeCloseTo(180, 5);
  });

  it("builds a tapered ribbon whose consecutive vertices stay short-arc", () => {
    const origin = { latDeg: 8, lonDeg: 170 };
    const target = { latDeg: 12, lonDeg: -170 };
    const ring = taperedAlignmentRibbon(origin, target, 8, 1.2, 16);
    expect(ring.length).toBeGreaterThan(10);
    expect(ringLongitudeJumpsAreShortArc(ring, 50)).toBe(true);
  });

  it("keeps a local bloom ring closed and short-arc", () => {
    const ring = circleAlignmentRing({ latDeg: -15, lonDeg: 179 }, 5, 24);
    expect(ring.length).toBeGreaterThan(8);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    expect(ringLongitudeJumpsAreShortArc(ring, 40)).toBe(true);
  });

  it("midpoint lies between two nearby points", () => {
    const mid = midpointGreatCircle({ latDeg: 10, lonDeg: -90 }, { latDeg: 12, lonDeg: -88 });
    expect(mid.latDeg).toBeGreaterThan(10);
    expect(mid.latDeg).toBeLessThan(12);
  });
});
