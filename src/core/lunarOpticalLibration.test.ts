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
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { opticalLunarLibration } from "./lunarOpticalLibration";

const J2000_MS = Date.UTC(2000, 0, 1, 12, 0, 0);

describe("opticalLunarLibration", () => {
  it("is deterministic for a fixed UTC instant", () => {
    expect(opticalLunarLibration(J2000_MS)).toEqual(opticalLunarLibration(J2000_MS));
  });

  it("records optical libration at J2000 from the truncated Meeus-style model", () => {
    const v = opticalLunarLibration(J2000_MS);
    expect(v.longitudeDeg).toBeCloseTo(4.974, 2);
    expect(v.latitudeDeg).toBeCloseTo(-6.622, 2);
  });

  it("stays within plausible optical-libration extrema", () => {
    const samples: { longitudeDeg: number; latitudeDeg: number }[] = [];
    for (let d = 0; d < 400; d += 3) {
      samples.push(opticalLunarLibration(J2000_MS + d * 86_400_000));
    }
    const lons = samples.map((s) => s.longitudeDeg);
    const lats = samples.map((s) => s.latitudeDeg);
    expect(Math.max(...lons.map(Math.abs))).toBeLessThan(10.5);
    expect(Math.max(...lats.map(Math.abs))).toBeLessThan(8.5);
    expect(Math.max(...lons)).toBeGreaterThan(5);
    expect(Math.min(...lons)).toBeLessThan(-5);
    expect(Math.max(...lats)).toBeGreaterThan(4);
    expect(Math.min(...lats)).toBeLessThan(-4);
  });

  it("changes sign in both longitude and latitude over a year", () => {
    let lonPos = false;
    let lonNeg = false;
    let latPos = false;
    let latNeg = false;
    for (let d = 0; d < 370; d += 2) {
      const v = opticalLunarLibration(J2000_MS + d * 86_400_000);
      if (v.longitudeDeg > 1) {
        lonPos = true;
      }
      if (v.longitudeDeg < -1) {
        lonNeg = true;
      }
      if (v.latitudeDeg > 1) {
        latPos = true;
      }
      if (v.latitudeDeg < -1) {
        latNeg = true;
      }
    }
    expect(lonPos && lonNeg).toBe(true);
    expect(latPos && latNeg).toBe(true);
  });

  it("is continuous across nearby instants", () => {
    const a = opticalLunarLibration(J2000_MS);
    const b = opticalLunarLibration(J2000_MS + 3_600_000);
    expect(Math.abs(b.longitudeDeg - a.longitudeDeg)).toBeLessThan(0.8);
    expect(Math.abs(b.latitudeDeg - a.latitudeDeg)).toBeLessThan(0.8);
  });

  it("matches sampled visual-verification epochs from the truncated model", () => {
    const east = opticalLunarLibration(Date.parse("2023-01-28T00:00:00.000Z"));
    const west = opticalLunarLibration(Date.parse("2020-04-01T00:00:00.000Z"));
    const north = opticalLunarLibration(Date.parse("2022-09-08T00:00:00.000Z"));
    const south = opticalLunarLibration(Date.parse("2020-07-25T00:00:00.000Z"));
    expect(east.longitudeDeg).toBeGreaterThan(7);
    expect(west.longitudeDeg).toBeLessThan(-7);
    expect(north.latitudeDeg).toBeGreaterThan(6);
    expect(south.latitudeDeg).toBeLessThan(-6);
  });

  it("does not call Date.now", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "lunarOpticalLibration.ts"), "utf8");
    expect(src).not.toMatch(/Date\.now\s*\(/);
  });
});
