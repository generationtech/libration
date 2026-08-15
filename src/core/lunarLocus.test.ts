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

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { sublunarPoint } from "./sublunarPoint";
import {
  LUNAR_LOCUS_EPOCH_UTC,
  LUNAR_LOCUS_INTERP_SUBDIVISIONS,
  LUNAR_LOCUS_SAMPLE_COUNT,
  interpolateLunarLocusPolyline,
  meanLunarDayMsFromModel,
  monthlyAbsLatitudeMaxDeg,
  residualLongitudeDeg,
  resetLunarLocusCacheForTests,
  sampleLunarLocus,
  summarizeLunarLocus,
  wrapLongitudeDeg,
} from "./lunarLocus";

const RECENT_MS = Date.parse(LUNAR_LOCUS_EPOCH_UTC.recent);
const STANDSTILL_MS = Date.parse(LUNAR_LOCUS_EPOCH_UTC.standstill);
const MINOR_MS = Date.parse(LUNAR_LOCUS_EPOCH_UTC.minor);
const BASELINE_MS = Date.parse(LUNAR_LOCUS_EPOCH_UTC.baseline);

describe("lunarLocus", () => {
  it("derives a mean lunar day near 24 h 50 m from the model rates", () => {
    const ms = meanLunarDayMsFromModel();
    const hours = ms / 3_600_000;
    expect(hours).toBeGreaterThan(24.8);
    expect(hours).toBeLessThan(24.9);
    const publicApproxMs = (24 * 3600 + 50 * 60) * 1000;
    expect(Math.abs(ms - publicApproxMs)).toBeLessThan(60_000);
    expect(ms).toBeCloseTo(89_428_328.66, 1);
  });

  it("samples N points centered on sublunarPoint(now)", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    expect(geometry.sampleCount).toBe(LUNAR_LOCUS_SAMPLE_COUNT);
    expect(geometry.samples).toHaveLength(LUNAR_LOCUS_SAMPLE_COUNT);
    const current = geometry.samples[geometry.currentIndex]!;
    const moon = sublunarPoint(RECENT_MS);
    expect(current.k).toBe(0);
    expect(current.geographic.latDeg).toBe(moon.latDeg);
    expect(current.geographic.lonDeg).toBe(moon.lonDeg);
    expect(current.residualLonDeg).toBe(0);
    expect(current.utcMs).toBe(RECENT_MS);
    expect(geometry.samples[0]!.k).toBe(-13);
    expect(geometry.samples[geometry.samples.length - 1]!.k).toBe(14);
  });

  it("uses sublunarPoint at each sampled instant", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    const dt = geometry.cadenceMs;
    for (const sample of geometry.samples) {
      const expected = sublunarPoint(RECENT_MS + sample.k * dt);
      expect(sample.geographic).toEqual(expected);
      expect(sample.utcMs).toBe(RECENT_MS + sample.k * dt);
    }
  });

  it("is deterministic for a fixed epoch", () => {
    resetLunarLocusCacheForTests();
    expect(sampleLunarLocus(RECENT_MS)).toEqual(sampleLunarLocus(RECENT_MS));
  });

  it("keeps residual longitude in (−180, 180] and matches the short-arc wrap", () => {
    expect(residualLongitudeDeg(-170, 170)).toBeCloseTo(20, 10);
    expect(residualLongitudeDeg(170, -170)).toBeCloseTo(-20, 10);
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    for (const sample of geometry.samples) {
      expect(sample.residualLonDeg).toBeGreaterThan(-180);
      expect(sample.residualLonDeg).toBeLessThanOrEqual(180);
    }
  });

  it("does not show a secular longitude march at the model lunar-day cadence", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    const summary = summarizeLunarLocus(geometry);
    expect(Math.abs(summary.residualLonMaxDeg - summary.residualLonMinDeg)).toBeLessThan(40);
    const neighbor = geometry.samples.find((s) => s.k === 1)!;
    expect(Math.abs(neighbor.residualLonDeg)).toBeLessThan(25);
    const moon = sublunarPoint(RECENT_MS);
    const day24 = sublunarPoint(RECENT_MS + 86_400_000);
    const residual24h = Math.abs(residualLongitudeDeg(day24.lonDeg, moon.lonDeg));
    expect(Math.abs(neighbor.residualLonDeg)).toBeLessThan(residual24h);
  });

  it("spans approximately one lunar orbital cycle", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    const spanDays = (geometry.samples[geometry.samples.length - 1]!.utcMs - geometry.samples[0]!.utcMs) / 86_400_000;
    expect(spanDays).toBeGreaterThan(26.5);
    expect(spanDays).toBeLessThan(28.5);
    expect(summarizeLunarLocus(geometry).closesApproximately).toBe(true);
  });

  it("places the current Moon on the interpolated polyline", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    const moon = sublunarPoint(RECENT_MS);
    const line = interpolateLunarLocusPolyline(geometry);
    expect(line.length).toBe(LUNAR_LOCUS_SAMPLE_COUNT * LUNAR_LOCUS_INTERP_SUBDIVISIONS);
    const nearest = line.reduce((best, p) => {
      const d = Math.hypot(
        residualLongitudeDeg(p.lonDeg, moon.lonDeg),
        p.latDeg - moon.latDeg,
      );
      return d < best.d ? { d, p } : best;
    }, { d: Infinity, p: line[0]! });
    expect(nearest.d).toBeLessThan(0.05);
  });

  it("does not invent latitude extrema far beyond the samples", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    const summary = summarizeLunarLocus(geometry);
    const line = interpolateLunarLocusPolyline(geometry);
    let latMin = line[0]!.latDeg;
    let latMax = line[0]!.latDeg;
    for (const p of line) {
      latMin = Math.min(latMin, p.latDeg);
      latMax = Math.max(latMax, p.latDeg);
    }
    expect(latMin).toBeGreaterThan(summary.latMinDeg - 1.5);
    expect(latMax).toBeLessThan(summary.latMaxDeg + 1.5);
  });

  it("produces a materially taller locus at a major-standstill-era epoch than at minor standstill", () => {
    resetLunarLocusCacheForTests();
    const major = summarizeLunarLocus(sampleLunarLocus(STANDSTILL_MS));
    resetLunarLocusCacheForTests();
    const minor = summarizeLunarLocus(sampleLunarLocus(MINOR_MS));
    const majorExtent = major.latMaxDeg - major.latMinDeg;
    const minorExtent = minor.latMaxDeg - minor.latMinDeg;
    expect(majorExtent).toBeGreaterThan(minorExtent + 8);
    expect(Math.max(Math.abs(major.latMinDeg), Math.abs(major.latMaxDeg))).toBeGreaterThan(26);
    expect(Math.max(Math.abs(minor.latMinDeg), Math.abs(minor.latMaxDeg))).toBeLessThan(22);
    expect(monthlyAbsLatitudeMaxDeg(STANDSTILL_MS)).toBeGreaterThan(monthlyAbsLatitudeMaxDeg(MINOR_MS) + 4);
  });

  it("changes when product time advances and is stable when paused", () => {
    resetLunarLocusCacheForTests();
    const pausedA = interpolateLunarLocusPolyline(sampleLunarLocus(RECENT_MS));
    const pausedB = interpolateLunarLocusPolyline(sampleLunarLocus(RECENT_MS));
    expect(pausedA).toEqual(pausedB);
    resetLunarLocusCacheForTests();
    const later = interpolateLunarLocusPolyline(sampleLunarLocus(RECENT_MS + 3_600_000));
    expect(later).not.toEqual(pausedA);
    expect(BASELINE_MS).not.toBe(RECENT_MS);
  });

  it("plots residual longitudes as wrap(lon0 + δlon)", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    const lon0 = geometry.samples[geometry.currentIndex]!.geographic.lonDeg;
    for (const sample of geometry.samples) {
      expect(wrapLongitudeDeg(lon0 + sample.residualLonDeg)).toBeCloseTo(
        wrapLongitudeDeg(sample.geographic.lonDeg),
        10,
      );
    }
  });

  it("does not call Date.now in the sampler module", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "lunarLocus.ts"), "utf8");
    expect(src).not.toMatch(/Date\.now\s*\(/);
    expect(src).not.toMatch(/major.?standstill/i);
    expect(src).not.toMatch(/if\s*\(.*standstill/);
  });
});
