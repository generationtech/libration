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
import { subsolarPoint } from "./subsolarPoint";
import {
  daysInGregorianYear,
  isGregorianLeapYear,
  sampleSolarAnalemmaGroundTrack,
} from "./solarAnalemmaGroundTrack";

function utcDayOfYearIndex0(utcMs: number): number {
  const d = new Date(utcMs);
  const yearStart = Date.UTC(d.getUTCFullYear(), 0, 1);
  const dayStart = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  return Math.round((dayStart - yearStart) / 86400000);
}

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

  it("places today's vertex on the live subsolar point when utcHour is omitted", () => {
    const now = Date.UTC(2026, 5, 21, 6, 34, 12, 345);
    const pts = sampleSolarAnalemmaGroundTrack(now);
    const sun = subsolarPoint(now);
    const today = pts[utcDayOfYearIndex0(now)]!;
    expect(today.latDeg).toBeCloseTo(sun.latDeg, 10);
    expect(today.lonDeg).toBeCloseTo(sun.lonDeg, 10);
  });

  it("translates off the frozen 12:00 UTC locus at a non-noon instant when utcHour is omitted", () => {
    const now = Date.UTC(2026, 11, 21, 6, 0, 0, 0);
    const live = sampleSolarAnalemmaGroundTrack(now);
    const noon = sampleSolarAnalemmaGroundTrack(now, 12);
    const i = utcDayOfYearIndex0(now);
    expect(live[i]!.lonDeg).not.toBeCloseTo(noon[i]!.lonDeg, 1);
    expect(live[i]!.latDeg).toBeCloseTo(subsolarPoint(now).latDeg, 10);
    expect(live[i]!.lonDeg).toBeCloseTo(subsolarPoint(now).lonDeg, 10);
  });

  it("samples an explicit utcHour at that integer hour and :00:00.000", () => {
    const now = Date.UTC(2019, 5, 15, 14, 30, 45, 123);
    const pts = sampleSolarAnalemmaGroundTrack(now, 14);
    const frozen = subsolarPoint(Date.UTC(2019, 5, 15, 14, 0, 0, 0));
    const today = pts[utcDayOfYearIndex0(now)]!;
    expect(today.latDeg).toBeCloseTo(frozen.latDeg, 10);
    expect(today.lonDeg).toBeCloseTo(frozen.lonDeg, 10);
    expect(today.lonDeg).not.toBeCloseTo(subsolarPoint(now).lonDeg, 5);
  });
});
