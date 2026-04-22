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
  daysInGregorianYear,
  isGregorianLeapYear,
  sampleSolarAnalemmaGroundTrack,
} from "./solarAnalemmaGroundTrack";

describe("solarAnalemmaGroundTrack", () => {
  it("detects leap years", () => {
    expect(isGregorianLeapYear(2020)).toBe(true);
    expect(isGregorianLeapYear(2021)).toBe(false);
    expect(daysInGregorianYear(2020)).toBe(366);
    expect(daysInGregorianYear(2021)).toBe(365);
  });

  it("samples one subsolar point per day for the year of the anchor instant", () => {
    const t = Date.UTC(2020, 5, 15, 0, 0, 0, 0);
    const pts = sampleSolarAnalemmaGroundTrack(t, 12);
    expect(pts).toHaveLength(366);
    for (const p of pts) {
      expect(p.latDeg).toBeGreaterThanOrEqual(-90);
      expect(p.latDeg).toBeLessThanOrEqual(90);
      expect(p.lonDeg).toBeGreaterThanOrEqual(-180);
      expect(p.lonDeg).toBeLessThanOrEqual(180);
    }
  });

  it("respects utcHour for the daily sample", () => {
    const t = Date.UTC(2019, 0, 1, 0, 0, 0, 0);
    const a = sampleSolarAnalemmaGroundTrack(t, 0);
    const b = sampleSolarAnalemmaGroundTrack(t, 12);
    expect(a[0]).not.toEqual(b[0]);
  });
});
