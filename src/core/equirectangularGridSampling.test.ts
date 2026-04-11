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
import { mapXFromLongitudeDeg } from "./equirectangularProjection";
import {
  meridianLongitudesDegForEquirectGrid,
  parallelLatitudesDegForEquirectGrid,
  parallelYFromLatitudeDeg,
} from "./equirectangularGridSampling";

describe("meridianLongitudesDegForEquirectGrid", () => {
  it("omits +180° when −180° is included (no seam-longitude duplicate for 30° steps)", () => {
    const lons = meridianLongitudesDegForEquirectGrid(30);
    expect(lons).toContain(-180);
    expect(lons).not.toContain(180);
    expect(lons[lons.length - 1]).toBe(150);
  });

  it("does not emit two rim longitudes that map to the same seam (half-open [−180°, +180°))", () => {
    const w = 1200;
    const lons = meridianLongitudesDegForEquirectGrid(30);
    const xs = lons.map((lon) => mapXFromLongitudeDeg(lon, w));
    const rimXs = xs.filter((x) => x === 0 || x === w);
    expect(rimXs).toEqual([0]);
  });

  it("returns empty for non-positive or non-finite step", () => {
    expect(meridianLongitudesDegForEquirectGrid(0)).toEqual([]);
    expect(meridianLongitudesDegForEquirectGrid(-10)).toEqual([]);
    expect(meridianLongitudesDegForEquirectGrid(Number.NaN)).toEqual([]);
  });

  it("still covers interior meridians for steps that do not land on +180°", () => {
    const lons = meridianLongitudesDegForEquirectGrid(25);
    expect(lons[0]).toBe(-180);
    expect(lons).not.toContain(180);
    expect(lons[lons.length - 1]).toBe(170);
  });
});

describe("parallelLatitudesDegForEquirectGrid", () => {
  it("includes both poles and equator once for 30° spacing", () => {
    const lats = parallelLatitudesDegForEquirectGrid(30);
    expect(lats.filter((lat) => lat === 0)).toHaveLength(1);
    expect(lats.filter((lat) => lat === 90)).toHaveLength(1);
    expect(lats.filter((lat) => lat === -90)).toHaveLength(1);
  });

  it("produces unique y positions per latitude for a fixed height", () => {
    const h = 900;
    const lats = parallelLatitudesDegForEquirectGrid(30);
    const ys = lats.map((lat) => parallelYFromLatitudeDeg(lat, h));
    expect(new Set(ys).size).toBe(ys.length);
  });

  it("returns empty for non-positive or non-finite step", () => {
    expect(parallelLatitudesDegForEquirectGrid(0)).toEqual([]);
    expect(parallelLatitudesDegForEquirectGrid(Number.NaN)).toEqual([]);
  });
});

describe("parallelYFromLatitudeDeg", () => {
  it("matches grid convention (north at top, south at bottom)", () => {
    const h = 360;
    expect(parallelYFromLatitudeDeg(90, h)).toBe(0);
    expect(parallelYFromLatitudeDeg(-90, h)).toBe(h);
    expect(parallelYFromLatitudeDeg(0, h)).toBe(h / 2);
  });
});
