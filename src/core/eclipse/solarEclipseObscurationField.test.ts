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
} from "./solarEclipseObscurationField";
import { solarEclipseVisualTransmission01 } from "./solarEclipseDaylightTransmission";
import { solveSolarLocalCircumstances } from "./solarLocalCircumstances";

const TOTAL_2017 = "nasa-5mcse-solar-9546";
const TOTAL_2024 = "nasa-5mcse-solar-9561";
const ANNULAR_2023 = "nasa-5mcse-solar-9560";
const DATELINE_2016 = "nasa-5mcse-solar-9543";
const POLAR_2021 = "nasa-5mcse-solar-9556";
const HYBRID_2023 = "nasa-5mcse-solar-9559";

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

  it("stays in [0, 1] and interpolates smoothly at 2017 GE", () => {
    const event = requireEvent(TOTAL_2017);
    const geom = solarEclipseGeometryAt(event, event.greatestEclipseUtcMs);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event, {
      partialRegion: geom?.partialRegion,
    });
    for (const v of field.obscuration01) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
    const center = sampleSolarEclipseObscurationField(field, event.geLonDeg, event.geLatDeg);
    expect(center).toBeGreaterThan(0.9);
  });

  it("has a monotonic 2017 GE north-south transect through the central axis", () => {
    const event = requireEvent(TOTAL_2017);
    const geom = solarEclipseGeometryAt(event, event.greatestEclipseUtcMs);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event, {
      partialRegion: geom?.partialRegion,
    });
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
    const geom = solarEclipseGeometryAt(event, knox.maximum!.utcMs);
    const field = buildSolarEclipseObscurationField(knox.maximum!.utcMs, event, {
      partialRegion: geom?.partialRegion,
    });
    const sampled = sampleSolarEclipseObscurationField(field, -83.9207, 35.9606);
    expect(Math.abs(sampled - knox.obscuration!)).toBeLessThan(0.08);

    const dallas = solveSolarLocalCircumstances(event, 32.783, -96.8);
    const dallasField = buildSolarEclipseObscurationField(dallas.maximum!.utcMs, event, {
      partialRegion: solarEclipseGeometryAt(event, dallas.maximum!.utcMs)?.partialRegion,
    });
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
    const annularField = buildSolarEclipseObscurationField(annular.greatestEclipseUtcMs, annular, {
      partialRegion: solarEclipseGeometryAt(annular, annular.greatestEclipseUtcMs)?.partialRegion,
    });
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
    const geom = solarEclipseGeometryAt(event, event.greatestEclipseUtcMs);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event, {
      partialRegion: geom?.partialRegion,
    });
    const west = sampleSolarEclipseObscurationField(field, 170, event.geLatDeg);
    const east = sampleSolarEclipseObscurationField(field, -170, event.geLatDeg);
    const wrap = sampleSolarEclipseObscurationField(field, 179.5, event.geLatDeg);
    const wrap2 = sampleSolarEclipseObscurationField(field, -179.5, event.geLatDeg);
    expect(Math.abs(wrap - wrap2)).toBeLessThan(0.08);
    expect(west + east).toBeLessThan(1.6);
  });

  it("remains finite near the 2021 polar eclipse", () => {
    const event = requireEvent(POLAR_2021);
    const geom = solarEclipseGeometryAt(event, event.greatestEclipseUtcMs);
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event, {
      partialRegion: geom?.partialRegion,
    });
    const pole = sampleSolarEclipseObscurationField(field, event.geLonDeg, event.geLatDeg);
    expect(pole).toBeGreaterThanOrEqual(0);
    expect(pole).toBeLessThanOrEqual(1);
    expect(Number.isFinite(pole)).toBe(true);
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
    const geom = solarEclipseGeometryAt(event, event.greatestEclipseUtcMs);
    const t0 = performance.now();
    const field = buildSolarEclipseObscurationField(event.greatestEclipseUtcMs, event, {
      partialRegion: geom?.partialRegion,
    });
    const buildMs = performance.now() - t0;
    solarEclipseObscurationFieldAt(event.greatestEclipseUtcMs, event, {
      partialRegion: geom?.partialRegion,
    });
    const t1 = performance.now();
    solarEclipseObscurationFieldAt(event.greatestEclipseUtcMs + 40, event, {
      partialRegion: geom?.partialRegion,
    });
    const cachedMs = performance.now() - t1;
    expect(field.lonSamples).toBe(288);
    expect(field.latSamples).toBe(145);
    expect(field.obscuration01.length).toBe(288 * 145);
    expect(buildMs).toBeLessThan(80);
    expect(cachedMs).toBeLessThan(8);
  });
});
