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
  canonicalLongitudeDeg,
  continuousLongitudeFollowingCanonicalDeg,
  nearestEquivalentLongitudeDeg,
  relativeLongitudeFromContinuousAnchorDeg,
  wrappedLongitudeDeltaDeg,
} from "./longitudeContinuity";

describe("canonicalLongitudeDeg", () => {
  it("keeps ordinary longitudes in (−180, 180]", () => {
    expect(canonicalLongitudeDeg(0)).toBe(0);
    expect(canonicalLongitudeDeg(45)).toBe(45);
    expect(canonicalLongitudeDeg(-73.98)).toBe(-73.98);
    expect(canonicalLongitudeDeg(179)).toBe(179);
    expect(canonicalLongitudeDeg(-179)).toBe(-179);
  });

  it("maps the antimeridian to +180, not −180", () => {
    expect(canonicalLongitudeDeg(180)).toBe(180);
    expect(canonicalLongitudeDeg(-180)).toBe(180);
  });

  it("folds multi-turn equivalents onto the canonical meridian", () => {
    expect(canonicalLongitudeDeg(181)).toBe(-179);
    expect(canonicalLongitudeDeg(541)).toBe(-179);
    expect(canonicalLongitudeDeg(-181)).toBe(179);
    expect(canonicalLongitudeDeg(360)).toBe(0);
    expect(canonicalLongitudeDeg(-540)).toBe(180);
  });
});

describe("wrappedLongitudeDeltaDeg", () => {
  it("is the shortest signed eastward delta in (−180, 180]", () => {
    expect(wrappedLongitudeDeltaDeg(0, 10)).toBe(10);
    expect(wrappedLongitudeDeltaDeg(10, 0)).toBe(-10);
    expect(wrappedLongitudeDeltaDeg(179, 180)).toBe(1);
    expect(wrappedLongitudeDeltaDeg(180, -179)).toBe(1);
    expect(wrappedLongitudeDeltaDeg(-179, -178)).toBe(1);
  });

  it("treats ±180 as the same meridian (delta 0)", () => {
    expect(wrappedLongitudeDeltaDeg(180, -180)).toBe(0);
    expect(wrappedLongitudeDeltaDeg(-180, 180)).toBe(0);
  });

  it("represents a 180° difference as +180 (eastward tie)", () => {
    expect(wrappedLongitudeDeltaDeg(0, 180)).toBe(180);
    expect(wrappedLongitudeDeltaDeg(0, -180)).toBe(180);
  });

  it("does not return a multi-turn remainder", () => {
    expect(wrappedLongitudeDeltaDeg(0, 541)).toBe(-179);
    expect(wrappedLongitudeDeltaDeg(179, -179)).toBe(2);
  });
});

describe("nearestEquivalentLongitudeDeg", () => {
  it("returns a continuous equivalent, not a canonical wrap", () => {
    expect(nearestEquivalentLongitudeDeg(-179, 181)).toBe(181);
    expect(nearestEquivalentLongitudeDeg(181, 181)).toBe(181);
    expect(nearestEquivalentLongitudeDeg(541, 181)).toBe(181);
    expect(nearestEquivalentLongitudeDeg(-179, 541)).toBe(541);
  });

  it("keeps values already nearest to the reference", () => {
    expect(nearestEquivalentLongitudeDeg(179, 180)).toBe(179);
    expect(nearestEquivalentLongitudeDeg(0, 0)).toBe(0);
    expect(nearestEquivalentLongitudeDeg(45, 40)).toBe(45);
  });

  it("does not silently canonicalize a continuous near-value", () => {
    const nearest = nearestEquivalentLongitudeDeg(-179, 181);
    expect(nearest).toBe(181);
    expect(canonicalLongitudeDeg(nearest)).toBe(-179);
    expect(nearest).not.toBe(canonicalLongitudeDeg(nearest));
  });
});

describe("continuousLongitudeFollowingCanonicalDeg", () => {
  it("unwraps an antimeridian crossing instead of jumping 360°", () => {
    const canonical = [179, 180, -179, -178];
    let continuous = canonical[0]!;
    const seen = [continuous];
    for (let i = 1; i < canonical.length; i += 1) {
      continuous = continuousLongitudeFollowingCanonicalDeg(continuous, canonical[i]!);
      seen.push(continuous);
    }
    expect(seen).toEqual([179, 180, 181, 182]);
    for (let i = 1; i < seen.length; i += 1) {
      expect(seen[i]! - seen[i - 1]!).toBe(1);
    }
  });

  it("also follows westward across the antimeridian", () => {
    const canonical = [-178, -179, 180, 179];
    let continuous = canonical[0]!;
    const seen = [continuous];
    for (let i = 1; i < canonical.length; i += 1) {
      continuous = continuousLongitudeFollowingCanonicalDeg(continuous, canonical[i]!);
      seen.push(continuous);
    }
    expect(seen).toEqual([-178, -179, -180, -181]);
  });
});

describe("relativeLongitudeFromContinuousAnchorDeg", () => {
  it("treats canonical −179° and continuous 181° as the same meridian", () => {
    expect(relativeLongitudeFromContinuousAnchorDeg(-179, 181)).toBe(0);
    expect(relativeLongitudeFromContinuousAnchorDeg(181, 181)).toBe(0);
  });

  it("keeps a near-anchor remainder continuous rather than wrapping to ±180", () => {
    expect(relativeLongitudeFromContinuousAnchorDeg(0, 2)).toBe(-2);
    expect(relativeLongitudeFromContinuousAnchorDeg(179, 182)).toBe(-3);
  });

  it("resolves a ~180° nearest-equivalent tie eastward (not antimeridian continuity)", () => {
    expect(relativeLongitudeFromContinuousAnchorDeg(0, 181)).toBe(179);
    expect(canonicalLongitudeDeg(179)).toBe(179);
  });
});
