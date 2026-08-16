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
import { getSolarEclipseEventById } from "./eclipseAuthority";
import { solarEclipseGeometryAt } from "./solarEclipseGeometry";
import { solarEclipseObscurationAt } from "./solarEclipseObscuration";
import {
  buildSolarEclipseObscurationField,
  sampleSolarEclipseObscurationField,
  solarEclipseObscurationFieldAt,
  SOLAR_ECLIPSE_OBSCURATION_FIELD_LAT_SAMPLES,
  SOLAR_ECLIPSE_OBSCURATION_FIELD_LON_SAMPLES,
} from "./solarEclipseObscurationField";
import { solarEclipseVisualTransmission01 } from "./solarEclipseDaylightTransmission";
import { solveSolarLocalCircumstances } from "./solarLocalCircumstances";

const TOTAL_2017 = "nasa-5mcse-solar-9546";
const TOTAL_2024 = "nasa-5mcse-solar-9561";
const ANNULAR_2023 = "nasa-5mcse-solar-9560";
const DATELINE_2016 = "nasa-5mcse-solar-9543";
const POLAR_2021 = "nasa-5mcse-solar-9556";
const HYBRID_2023 = "nasa-5mcse-solar-9559";
const PARTIAL_2022 = "nasa-5mcse-solar-9558";

const PROBES_2017 = {
  oregon: { latDeg: 44.6339, lonDeg: -121.1284 },
  nebraska: { latDeg: 40.925, lonDeg: -98.342 },
  kentucky: { latDeg: 36.8656, lonDeg: -87.4886 },
  knoxville: { latDeg: 35.9606, lonDeg: -83.9207 },
  newYork: { latDeg: 40.7128, lonDeg: -74.006 },
  control: { latDeg: 0, lonDeg: 20 },
} as const;

function requireEvent(id: string) {
  const event = getSolarEclipseEventById(id);
  if (!event) {
    throw new Error(`missing ${id}`);
  }
  return event;
}

describe("solar eclipse obscuration field", () => {
  it("is identically zero when there is no active eclipse window", () => {
    const event = requireEvent(TOTAL_2017);
    const field = buildSolarEclipseObscurationField(event.globalStartMs - 60_000, event);
    expect(field.obscuration01.every((v) => v === 0)).toBe(true);
  });

  it("is deterministic at the same UTC", () => {
    const event = requireEvent(TOTAL_2017);
    const a = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const b = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    expect(a.obscuration01).toEqual(b.obscuration01);
  });

  it("spans the full world at the canonical 288×145 topology", () => {
    const event = requireEvent(TOTAL_2017);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    expect(field.lonSamples).toBe(SOLAR_ECLIPSE_OBSCURATION_FIELD_LON_SAMPLES);
    expect(field.latSamples).toBe(SOLAR_ECLIPSE_OBSCURATION_FIELD_LAT_SAMPLES);
    expect(field.obscuration01.length).toBe(288 * 145);
    expect(field.lonSamples).toBe(288);
    expect(field.latSamples).toBe(145);
  });

  it("stays in [0, 1] and interpolates smoothly at 2017 GE", () => {
    const event = requireEvent(TOTAL_2017);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    for (const v of field.obscuration01) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    const center = sampleSolarEclipseObscurationField(field, event.geLonDeg, event.geLatDeg);
    expect(center).toBeGreaterThan(0.9);
  });

  it("has a monotonic 2017 GE north-south transect through the central axis", () => {
    const event = requireEvent(TOTAL_2017);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const lon = event.geLonDeg;
    const samples: { lat: number; o: number }[] = [];
    for (let lat = event.geLatDeg - 18; lat <= event.geLatDeg + 18; lat += 0.75) {
      samples.push({
        lat,
        o: sampleSolarEclipseObscurationField(field, lon, lat),
      });
    }
    const peak = samples.reduce((best, s) => (s.o > best.o ? s : best));
    expect(Math.abs(peak.lat - event.geLatDeg)).toBeLessThan(2.5);
    expect(peak.o).toBeGreaterThan(0.9);
    const north = samples.filter((s) => s.lat >= peak.lat);
    const south = samples.filter((s) => s.lat <= peak.lat);
    for (let i = 1; i < north.length; i += 1) {
      expect(north[i]!.o).toBeLessThanOrEqual(north[i - 1]!.o + 0.02);
    }
    for (let i = 1; i < south.length; i += 1) {
      expect(south[i]!.o).toBeGreaterThanOrEqual(south[i - 1]!.o - 0.02);
    }
    expect(samples[0]!.o).toBeLessThan(peak.o * 0.45);
    expect(samples[samples.length - 1]!.o).toBeLessThan(peak.o * 0.45);
  });

  it("rises and falls smoothly at 2017 geographic probes every 2 minutes", () => {
    const event = requireEvent(TOTAL_2017);
    const start = event.globalStartMs;
    const end = event.globalEndMs;
    const series: Record<string, number[]> = {};
    for (const name of Object.keys(PROBES_2017)) {
      series[name] = [];
    }
    for (let t = start; t <= end; t += 120_000) {
      for (const [name, probe] of Object.entries(PROBES_2017)) {
        series[name]!.push(
          solarEclipseObscurationAt(t, event, probe.latDeg, probe.lonDeg).obscuration01,
        );
      }
    }
    expect(Math.max(...series.control!)).toBeLessThan(0.02);
    expect(Math.max(...series.oregon!)).toBeGreaterThan(0.95);
    expect(Math.max(...series.kentucky!)).toBeGreaterThan(0.95);
    expect(Math.max(...series.knoxville!)).toBeGreaterThan(0.7);
    expect(Math.max(...series.knoxville!)).toBeLessThan(1);
    expect(Math.max(...series.newYork!)).toBeGreaterThan(0.5);
    expect(Math.max(...series.newYork!)).toBeLessThan(0.9);
    for (const [name, values] of Object.entries(series)) {
      if (name === "control") {
        continue;
      }
      const peakAt = values.indexOf(Math.max(...values));
      expect(peakAt).toBeGreaterThan(2);
      expect(peakAt).toBeLessThan(values.length - 3);
      for (let i = 1; i < values.length; i += 1) {
        const delta = Math.abs(values[i]! - values[i - 1]!);
        const nearTotal = values[i]! > 0.92 || values[i - 1]! > 0.92;
        expect(delta).toBeLessThan(nearTotal ? 0.55 : 0.28);
      }
    }
  });

  it("agrees with E4 at city coordinates within grid interpolation tolerance", () => {
    const event = requireEvent(TOTAL_2024);
    const knox = solveSolarLocalCircumstances(event, 35.9606, -83.9207);
    const field = buildSolarEclipseObscurationField(knox.maximum!.utcMs, event);
    const sampled = sampleSolarEclipseObscurationField(field, -83.9207, 35.9606);
    expect(Math.abs(sampled - knox.obscuration!)).toBeLessThan(0.08);

    const dallas = solveSolarLocalCircumstances(event, 32.783, -96.8);
    const dallasField = buildSolarEclipseObscurationField(dallas.maximum!.utcMs, event);
    const dallasSampled = sampleSolarEclipseObscurationField(dallasField, -96.8, 32.783);
    expect(dallasSampled).toBeGreaterThan(0.85);

    const tokyoField = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    expect(sampleSolarEclipseObscurationField(tokyoField, 139.6503, 35.6762)).toBeLessThan(0.02);

    const annular = requireEvent(ANNULAR_2023);
    const exact = solarEclipseObscurationAt(
      annular.greatestEclipseUtcMs,
      annular,
      annular.geLatDeg,
      annular.geLonDeg,
    );
    const annularField = buildSolarEclipseObscurationField(annular.greatestEclipseUtcMs, annular);
    const annularSampled = sampleSolarEclipseObscurationField(
      annularField,
      annular.geLonDeg,
      annular.geLatDeg,
    );
    expect(Math.abs(annularSampled - exact.obscuration01)).toBeLessThan(0.08);
    expect(annularSampled).toBeLessThan(0.995);
  });

  it("does not duplicate across the 2016 dateline", () => {
    const event = requireEvent(DATELINE_2016);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const west = sampleSolarEclipseObscurationField(field, 170, event.geLatDeg);
    const east = sampleSolarEclipseObscurationField(field, -170, event.geLatDeg);
    const wrap = sampleSolarEclipseObscurationField(field, 179.5, event.geLatDeg);
    const wrap2 = sampleSolarEclipseObscurationField(field, -179.5, event.geLatDeg);
    expect(Math.abs(wrap - wrap2)).toBeLessThan(0.08);
    expect(west + east).toBeLessThan(1.6);
    const a = sampleSolarEclipseObscurationField(field, 179.75, event.geLatDeg);
    const b = sampleSolarEclipseObscurationField(field, -179.75, event.geLatDeg);
    expect(Math.abs(a - b)).toBeLessThan(0.08);
    const exactA = solarEclipseObscurationAt(
      event.greatestEclipseUtcMs,
      event,
      event.geLatDeg,
      179.75,
    ).obscuration01;
    const exactB = solarEclipseObscurationAt(
      event.greatestEclipseUtcMs,
      event,
      event.geLatDeg,
      -179.75,
    ).obscuration01;
    expect(Math.abs(a - exactA)).toBeLessThan(0.08);
    expect(Math.abs(b - exactB)).toBeLessThan(0.08);
  });

  it("remains finite near the 2021 polar eclipse", () => {
    const event = requireEvent(POLAR_2021);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const pole = sampleSolarEclipseObscurationField(field, event.geLonDeg, event.geLatDeg);
    expect(pole).toBeGreaterThanOrEqual(0);
    expect(pole).toBeLessThanOrEqual(1);
    expect(Number.isFinite(pole)).toBe(true);
    const towardPole = Math.min(90, event.geLatDeg + 8);
    const polarSample = sampleSolarEclipseObscurationField(field, event.geLonDeg, towardPole);
    const polarExact = solarEclipseObscurationAt(
      event.greatestEclipseUtcMs,
      event,
      towardPole,
      event.geLonDeg,
    ).obscuration01;
    expect(Number.isFinite(polarSample)).toBe(true);
    expect(Math.abs(polarSample - polarExact)).toBeLessThan(0.12);
  });

  it("covers the 2022 partial-only event without a clipped domain", () => {
    const event = requireEvent(PARTIAL_2022);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const center = sampleSolarEclipseObscurationField(field, event.geLonDeg, event.geLatDeg);
    expect(center).toBeGreaterThan(0.2);
    expect(field.lonSamples).toBe(288);
    expect(field.latSamples).toBe(145);
    expect(field.obscuration01.some((v) => v > 0.2)).toBe(true);
    const far = sampleSolarEclipseObscurationField(field, event.geLonDeg + 40, event.geLatDeg);
    expect(far).toBeLessThan(center * 0.5);
  });

  it("stays continuous across the 2023 hybrid central subtype change", () => {
    const event = requireEvent(HYBRID_2023);
    let prev: number | null = null;
    for (let t = event.globalStartMs; t <= event.globalEndMs; t += 120_000) {
      const geom = solarEclipseGeometryAt(event, t);
      if (!geom?.centralPoint) {
        continue;
      }
      const sample = solarEclipseObscurationAt(
        t,
        event,
        geom.centralPoint.latDeg,
        geom.centralPoint.lonDeg,
      );
      expect(sample.obscuration01).toBeGreaterThan(0.7);
      if (prev !== null) {
        expect(Math.abs(sample.obscuration01 - prev)).toBeLessThan(0.2);
      }
      prev = sample.obscuration01;
    }
    expect(prev).not.toBeNull();
  });

  it("reuses the time-bucket cache for nearby UTC samples", () => {
    const event = requireEvent(TOTAL_2017);
    const a = solarEclipseObscurationFieldAt(event.greatestEclipseUtcMs, event);
    const b = solarEclipseObscurationFieldAt(event.greatestEclipseUtcMs + 40, event);
    expect(a.obscuration01).toBe(b.obscuration01);
  });

  it("maps Normal transmission stronger than a 0.16 overlay at moderate obscuration", () => {
    const t = solarEclipseVisualTransmission01(0.5, "normal");
    expect(1 - t).toBeGreaterThan(0.16);
    expect(1 - solarEclipseVisualTransmission01(0.1, "normal")).toBeLessThan(0.08);
    expect(1 - solarEclipseVisualTransmission01(0.5, "dramatic")).toBeGreaterThan(1 - t);
    expect(1 - solarEclipseVisualTransmission01(0.5, "dramatic")).toBeLessThan(0.55);
  });

  it("builds a 2017 GE field well inside an ambient frame budget", () => {
    const event = requireEvent(TOTAL_2017);
    const t0 = performance.now();
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const buildMs = performance.now() - t0;
    solarEclipseObscurationFieldAt(event.greatestEclipseUtcMs, event);
    const t1 = performance.now();
    solarEclipseObscurationFieldAt(event.greatestEclipseUtcMs + 40, event);
    const cachedMs = performance.now() - t1;
    expect(field.lonSamples).toBe(288);
    expect(field.latSamples).toBe(145);
    expect(field.obscuration01.length).toBe(288 * 145);
    expect(buildMs).toBeLessThan(80);
    expect(cachedMs).toBeLessThan(8);
  });

  it("is zero at 2017-08-21T15:39:02Z before global start", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = Date.parse("2017-08-21T15:39:02.000Z");
    expect(utcMs).toBeLessThan(event.globalStartMs);
    const field = buildSolarEclipseObscurationField(utcMs, event);
    expect(field.obscuration01.every((v) => v === 0)).toBe(true);
    expect(sampleSolarEclipseObscurationField(field, -170, 45)).toBe(0);
    expect(solarEclipseVisualTransmission01(0, "normal")).toBe(1);
  });

  it("does not clip the 2017 ingress west limb to a domain wall", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = Date.parse("2017-08-21T16:45:01.000Z");
    const field = buildSolarEclipseObscurationField(utcMs, event);
    const lat = 45;
    // Former moving-bbox west pad ended at ~−171.24°. These cells were skipped.
    for (const lon of [-172.5, -171.25]) {
      const sampled = sampleSolarEclipseObscurationField(field, lon, lat);
      const exact = solarEclipseObscurationAt(utcMs, event, lat, lon).obscuration01;
      expect(exact).toBeGreaterThan(0.5);
      expect(sampled).toBeGreaterThan(0.5);
      expect(Math.abs(sampled - exact)).toBeLessThan(0.08);
    }
    // Daylit interior across the old bbox edge; horizon gating further west is physical.
    let prevT: number | null = null;
    let maxJump = 0;
    for (let lon = -171.5; lon <= -160; lon += 0.5) {
      const o = sampleSolarEclipseObscurationField(field, lon, lat);
      const t = solarEclipseVisualTransmission01(o, "normal");
      if (prevT !== null) {
        maxJump = Math.max(maxJump, Math.abs(t - prevT));
      }
      prevT = t;
    }
    expect(maxJump).toBeLessThan(0.08);
  });

  it("does not clip the 2017 egress east limb to a domain wall", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = Date.parse("2017-08-21T19:22:59.000Z");
    const field = buildSolarEclipseObscurationField(utcMs, event);
    const lat = 40;
    const clippedLon = -10;
    const sampled = sampleSolarEclipseObscurationField(field, clippedLon, lat);
    const exact = solarEclipseObscurationAt(utcMs, event, lat, clippedLon).obscuration01;
    expect(exact).toBeGreaterThan(0.1);
    expect(sampled).toBeGreaterThan(0.1);
    expect(Math.abs(sampled - exact)).toBeLessThan(0.08);
    let prevT: number | null = null;
    let maxJump = 0;
    for (let lon = -20; lon <= 0; lon += 0.5) {
      const o = sampleSolarEclipseObscurationField(field, lon, lat);
      const t = solarEclipseVisualTransmission01(o, "normal");
      if (prevT !== null) {
        maxJump = Math.max(maxJump, Math.abs(t - prevT));
      }
      prevT = t;
    }
    expect(maxJump).toBeLessThan(0.08);
  });

  it("keeps a smooth 2017 late-event east transect at 19:56:08Z", () => {
    const event = requireEvent(TOTAL_2017);
    const utcMs = Date.parse("2017-08-21T19:56:08.000Z");
    const field = buildSolarEclipseObscurationField(utcMs, event);
    const lat = 42.5;
    const sampled = sampleSolarEclipseObscurationField(field, -17.5, lat);
    const exact = solarEclipseObscurationAt(utcMs, event, lat, -17.5).obscuration01;
    expect(Math.abs(sampled - exact)).toBeLessThan(0.05);
    let prevT: number | null = null;
    let maxJump = 0;
    for (let lon = -30; lon <= -10; lon += 0.5) {
      const o = sampleSolarEclipseObscurationField(field, lon, lat);
      const t = solarEclipseVisualTransmission01(o, "normal");
      if (prevT !== null) {
        maxJump = Math.max(maxJump, Math.abs(t - prevT));
      }
      prevT = t;
    }
    expect(maxJump).toBeLessThan(0.08);
  });

  it("wraps bilinear samples periodically in longitude", () => {
    const event = requireEvent(DATELINE_2016);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event);
    const lat = event.geLatDeg;
    const at179 = sampleSolarEclipseObscurationField(field, 179.9, lat);
    const atNeg179 = sampleSolarEclipseObscurationField(field, -179.9, lat);
    const at181 = sampleSolarEclipseObscurationField(field, 181.1, lat);
    const atNeg1789 = sampleSolarEclipseObscurationField(field, -178.9, lat);
    expect(Math.abs(at181 - atNeg1789)).toBeLessThan(1e-9);
    expect(Math.abs(at179 - atNeg179)).toBeLessThan(0.05);
  });
});
