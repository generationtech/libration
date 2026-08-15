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
  LUNAR_LOCUS_FUTURE_TANGENT_SUPPORT,
  LUNAR_LOCUS_INTERP_SUBDIVISIONS,
  LUNAR_LOCUS_PAST_TANGENT_SUPPORT,
  LUNAR_LOCUS_SAMPLE_COUNT,
  interpolateLunarLocusPolyline,
  meanLunarDayMsFromModel,
  meanLunarDaysPerSiderealMonth,
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
    const steps = meanLunarDaysPerSiderealMonth();
    expect(steps).toBeGreaterThan(26.2);
    expect(steps).toBeLessThan(26.6);
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
    expect(line.length).toBeGreaterThan(26 * LUNAR_LOCUS_INTERP_SUBDIVISIONS);
    expect(line.length).toBeLessThan(LUNAR_LOCUS_SAMPLE_COUNT * LUNAR_LOCUS_INTERP_SUBDIVISIONS);
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
    expect(src).not.toMatch(/wrapIndex/);
  });
});

function residualOf(p: { latDeg: number; lonDeg: number }, lon0: number): { x: number; y: number } {
  return { x: residualLongitudeDeg(p.lonDeg, lon0), y: p.latDeg };
}

function segmentProgressCos(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
): number {
  const v1x = b.x - a.x;
  const v1y = b.y - a.y;
  const v2x = c.x - b.x;
  const v2y = c.y - b.y;
  const n1 = Math.hypot(v1x, v1y);
  const n2 = Math.hypot(v2x, v2y);
  if (n1 < 1e-9 || n2 < 1e-9) {
    return 1;
  }
  return (v1x * v2x + v1y * v2y) / (n1 * n2);
}

function polylineProgress(line: readonly { latDeg: number; lonDeg: number }[], lon0: number): number[] {
  const pts = line.map((p) => residualOf(p, lon0));
  const n = pts.length;
  const out: number[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(segmentProgressCos(pts[(i - 1 + n) % n]!, pts[i]!, pts[(i + 1) % n]!));
  }
  return out;
}

describe("lunarLocus interpolation continuity", () => {
  const epochs: { label: string; utcMs: number }[] = [
    { label: "recent", utcMs: RECENT_MS },
    { label: "recent+3d", utcMs: RECENT_MS + 3 * 86_400_000 },
    { label: "standstill", utcMs: STANDSTILL_MS },
    { label: "minor", utcMs: MINOR_MS },
    { label: "baseline", utcMs: BASELINE_MS },
  ];

  it("uses one past and one future Catmull-Rom neighbor beyond the rendered window", () => {
    expect(LUNAR_LOCUS_PAST_TANGENT_SUPPORT).toBeGreaterThanOrEqual(2);
    expect(LUNAR_LOCUS_FUTURE_TANGENT_SUPPORT).toBeGreaterThanOrEqual(1);
  });

  it("keeps rendered samples at k = −13 … +14", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    expect(geometry.samples[0]!.k).toBe(-13);
    expect(geometry.samples[geometry.samples.length - 1]!.k).toBe(14);
    expect(geometry.sampleCount).toBe(LUNAR_LOCUS_SAMPLE_COUNT);
  });

  for (const { label, utcMs } of epochs) {
    it(`has no backtracking cusp at the cycle join (${label})`, () => {
      resetLunarLocusCacheForTests();
      const geometry = sampleLunarLocus(utcMs);
      const lon0 = geometry.samples[geometry.currentIndex]!.geographic.lonDeg;
      const line = interpolateLunarLocusPolyline(geometry);
      const progress = polylineProgress(line, lon0);
      const minCos = Math.min(...progress);
      expect(minCos).toBeGreaterThan(0.5);
      const seam = [...progress.slice(-15), ...progress.slice(0, 15)];
      expect(Math.min(...seam)).toBeGreaterThan(0.7);
      const first = residualOf(line[0]!, lon0);
      const last = residualOf(line[line.length - 1]!, lon0);
      expect(Math.hypot(last.x - first.x, last.y - first.y)).toBeLessThan(0.05);
    });

    it(`keeps k = 0 on the rendered locus (${label})`, () => {
      resetLunarLocusCacheForTests();
      const geometry = sampleLunarLocus(utcMs);
      const moon = sublunarPoint(utcMs);
      const line = interpolateLunarLocusPolyline(geometry);
      const nearest = line.reduce((best, p) => {
        const d = Math.hypot(
          residualLongitudeDeg(p.lonDeg, moon.lonDeg),
          p.latDeg - moon.latDeg,
        );
        return Math.min(best, d);
      }, Infinity);
      expect(nearest).toBeLessThan(0.05);
    });
  }

  it("does not expand the rendered cycle to the future support sample", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    const cadence = geometry.cadenceMs;
    const moon = sublunarPoint(RECENT_MS);
    const kLast = geometry.samples[geometry.samples.length - 1]!.k;
    const supportFuture = sublunarPoint(RECENT_MS + (kLast + LUNAR_LOCUS_FUTURE_TANGENT_SUPPORT) * cadence);
    const line = interpolateLunarLocusPolyline(geometry);
    const distToSupport = line.reduce((best, p) => {
      const d = Math.hypot(
        residualLongitudeDeg(p.lonDeg, supportFuture.lonDeg),
        p.latDeg - supportFuture.latDeg,
      );
      return Math.min(best, d);
    }, Infinity);
    const distToMoon = line.reduce((best, p) => {
      const d = Math.hypot(
        residualLongitudeDeg(p.lonDeg, moon.lonDeg),
        p.latDeg - moon.latDeg,
      );
      return Math.min(best, d);
    }, Infinity);
    expect(distToMoon).toBeLessThan(0.05);
    expect(distToSupport).toBeGreaterThan(0.05);
    const start = geometry.samples[0]!;
    const first = line[0]!;
    const last = line[line.length - 1]!;
    expect(Math.hypot(
      residualLongitudeDeg(first.lonDeg, start.geographic.lonDeg),
      first.latDeg - start.geographic.latDeg,
    )).toBeLessThan(0.05);
    expect(Math.hypot(
      residualLongitudeDeg(last.lonDeg, start.geographic.lonDeg),
      last.latDeg - start.geographic.latDeg,
    )).toBeLessThan(0.05);
  });

  it("does not include the past support sample as a rendered vertex", () => {
    resetLunarLocusCacheForTests();
    const geometry = sampleLunarLocus(RECENT_MS);
    const cadence = geometry.cadenceMs;
    const kFirst = geometry.samples[0]!.k;
    const supportPast = sublunarPoint(RECENT_MS + (kFirst - LUNAR_LOCUS_PAST_TANGENT_SUPPORT) * cadence);
    const line = interpolateLunarLocusPolyline(geometry);
    const distToSupport = line.reduce((best, p) => {
      const d = Math.hypot(
        residualLongitudeDeg(p.lonDeg, supportPast.lonDeg),
        p.latDeg - supportPast.latDeg,
      );
      return Math.min(best, d);
    }, Infinity);
    expect(distToSupport).toBeGreaterThan(0.05);
  });

  it("stays free of a seam backtrack across a month of 6-hour steps", () => {
    const start = RECENT_MS;
    let worst = 1;
    for (let h = 0; h < 28 * 24; h += 6) {
      resetLunarLocusCacheForTests();
      const utcMs = start + h * 3_600_000;
      const geometry = sampleLunarLocus(utcMs);
      const lon0 = geometry.samples[geometry.currentIndex]!.geographic.lonDeg;
      const line = interpolateLunarLocusPolyline(geometry);
      const progress = polylineProgress(line, lon0);
      const minCos = Math.min(...progress);
      worst = Math.min(worst, minCos);
      expect(minCos).toBeGreaterThan(0.5);
    }
    expect(worst).toBeGreaterThan(0.5);
  });
});
