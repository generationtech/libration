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
import { diskIntersectionFractionOfFirst } from "./circleOverlap";

describe("diskIntersectionFractionOfFirst", () => {
  it("returns 0 when disks do not overlap", () => {
    expect(diskIntersectionFractionOfFirst(1, 1, 3)).toBe(0);
    expect(diskIntersectionFractionOfFirst(1, 0.5, 1.6)).toBe(0);
  });

  it("returns 0 at external grazing", () => {
    expect(diskIntersectionFractionOfFirst(1, 1, 2)).toBeCloseTo(0, 12);
  });

  it("returns 1 when the second disk covers the first (total)", () => {
    expect(diskIntersectionFractionOfFirst(1, 1.2, 0)).toBe(1);
    expect(diskIntersectionFractionOfFirst(1, 1, 0)).toBe(1);
    expect(diskIntersectionFractionOfFirst(0.5, 1, 0.2)).toBe(1);
  });

  it("returns (r2/r1)² when the second disk is contained (annular central)", () => {
    expect(diskIntersectionFractionOfFirst(1, 0.5, 0)).toBeCloseTo(0.25, 12);
  });

  it("returns a partial fraction between 0 and 1 for partial overlap", () => {
    const f = diskIntersectionFractionOfFirst(1, 1, 1);
    expect(f).toBeGreaterThan(0.3);
    expect(f).toBeLessThan(0.5);
    expect(f).toBeCloseTo(0.391, 3);
  });

  it("does not treat magnitude-like diameter ratio as area fraction", () => {
    const magLike = 0.5;
    const area = diskIntersectionFractionOfFirst(1, 0.5, 0.5);
    expect(area).not.toBeCloseTo(magLike, 2);
  });
});
