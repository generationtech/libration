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
import { sublunarPoint } from "../core/sublunarPoint";
import { shortLonDeltaDeg } from "../renderer/renderPlan/equirectSeamPath";
import {
  LUNAR_LOCUS_EPOCH_UTC,
  LUNAR_LOCUS_SAMPLE_COUNT,
  meanLunarDayMsFromModel,
  monthlyAbsLatitudeMaxDeg,
  plottedPointDeg,
  residualLongitudeDeg,
  sampleLunarLocus,
  summarizeLunarLocus,
  wrapLongitudeDeg,
} from "./lunarLocusExperiment";

const RECENT_MS = Date.parse(LUNAR_LOCUS_EPOCH_UTC.recent);

describe("lunarLocusExperiment", () => {
  it("derives a mean lunar day near 24 h 50 m from the model rates", () => {
    const ms = meanLunarDayMsFromModel();
    const hours = ms / 3_600_000;
    expect(hours).toBeGreaterThan(24.8);
    expect(hours).toBeLessThan(24.9);
    const publicApproxMs = (24 * 3600 + 50 * 60) * 1000;
    expect(Math.abs(ms - publicApproxMs)).toBeLessThan(60_000);
  });

  it("samples exactly N points and places k=0 on sublunarPoint(now)", () => {
    const geometry = sampleLunarLocus(RECENT_MS);
    expect(geometry.sampleCount).toBe(LUNAR_LOCUS_SAMPLE_COUNT);
    expect(geometry.samples).toHaveLength(LUNAR_LOCUS_SAMPLE_COUNT);
    const moon = sublunarPoint(RECENT_MS);
    expect(geometry.samples[0]!.geographic.latDeg).toBe(moon.latDeg);
    expect(geometry.samples[0]!.geographic.lonDeg).toBe(moon.lonDeg);
    expect(geometry.samples[0]!.residualLonDeg).toBe(0);
    expect(geometry.samples[0]!.utcMs).toBe(RECENT_MS);
  });

  it("uses sublunarPoint at each sampled instant", () => {
    const geometry = sampleLunarLocus(RECENT_MS);
    const dt = geometry.cadenceMs;
    for (const sample of geometry.samples) {
      const expected = sublunarPoint(RECENT_MS + sample.index * dt);
      expect(sample.geographic).toEqual(expected);
      expect(sample.utcMs).toBe(RECENT_MS + sample.index * dt);
    }
  });

  it("is deterministic for a fixed epoch", () => {
    expect(sampleLunarLocus(RECENT_MS)).toEqual(sampleLunarLocus(RECENT_MS));
  });

  it("keeps residual longitude in (−180, 180] and matches shortLonDeltaDeg", () => {
    expect(residualLongitudeDeg(-170, 170)).toBeCloseTo(shortLonDeltaDeg(170, -170), 12);
    expect(residualLongitudeDeg(-170, 170)).toBeCloseTo(20, 10);
    expect(residualLongitudeDeg(170, -170)).toBeCloseTo(-20, 10);
    const geometry = sampleLunarLocus(RECENT_MS);
    for (const sample of geometry.samples) {
      expect(sample.residualLonDeg).toBeGreaterThan(-180);
      expect(sample.residualLonDeg).toBeLessThanOrEqual(180);
    }
  });

  it("does not show a secular longitude march at the model lunar-day cadence", () => {
    const geometry = sampleLunarLocus(RECENT_MS);
    const summary = summarizeLunarLocus(geometry);
    expect(Math.abs(summary.residualLonMaxDeg - summary.residualLonMinDeg)).toBeLessThan(40);
    const last = geometry.samples[geometry.samples.length - 1]!;
    expect(Math.abs(last.residualLonDeg)).toBeLessThan(25);
    const day24 = sublunarPoint(RECENT_MS + 86_400_000);
    const moon = sublunarPoint(RECENT_MS);
    const residual24h = Math.abs(residualLongitudeDeg(day24.lonDeg, moon.lonDeg));
    const residualLunarDay = Math.abs(geometry.samples[1]!.residualLonDeg);
    expect(residualLunarDay).toBeLessThan(residual24h);
  });

  it("plots residual/glyph longitudes as wrap(lon0 + δlon), coinciding with geographic when wrap is consistent", () => {
    const geometry = sampleLunarLocus(RECENT_MS);
    const lon0 = geometry.samples[0]!.geographic.lonDeg;
    for (const sample of geometry.samples) {
      const geo = plottedPointDeg(sample, lon0, "geographic");
      const residual = plottedPointDeg(sample, lon0, "residual");
      const glyph = plottedPointDeg(sample, lon0, "glyph");
      expect(residual.latDeg).toBe(geo.latDeg);
      expect(glyph.latDeg).toBe(geo.latDeg);
      expect(wrapLongitudeDeg(residual.lonDeg)).toBeCloseTo(wrapLongitudeDeg(geo.lonDeg), 10);
      expect(wrapLongitudeDeg(glyph.lonDeg)).toBeCloseTo(wrapLongitudeDeg(geo.lonDeg), 10);
    }
  });

  it("confirms standstill candidates against this model's monthly |lat| envelope", () => {
    const recent = monthlyAbsLatitudeMaxDeg(Date.parse(LUNAR_LOCUS_EPOCH_UTC.recent));
    const standstill = monthlyAbsLatitudeMaxDeg(Date.parse(LUNAR_LOCUS_EPOCH_UTC.standstill));
    const minor = monthlyAbsLatitudeMaxDeg(Date.parse(LUNAR_LOCUS_EPOCH_UTC.minor));
    const baseline = monthlyAbsLatitudeMaxDeg(Date.parse(LUNAR_LOCUS_EPOCH_UTC.baseline));
    expect(standstill).toBeGreaterThan(minor + 4);
    expect(standstill).toBeGreaterThan(26);
    expect(minor).toBeLessThan(22);
    expect(recent).toBeGreaterThan(minor);
    expect(baseline).toBeGreaterThan(0);
  });

  it("does not call Date.now in the sampler module", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "lunarLocusExperiment.ts"), "utf8");
    expect(src).not.toMatch(/Date\.now\s*\(/);
  });
});
