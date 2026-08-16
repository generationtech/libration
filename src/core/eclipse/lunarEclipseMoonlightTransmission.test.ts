/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

import { describe, expect, it } from "vitest";
import { getLunarEclipseEventById } from "./eclipseAuthority";
import { lunarEclipseGeometryAt } from "./lunarEclipseGeometry";
import { moonPhaseStrengthFromIlluminatedFraction } from "../lunarIllumination";
import {
  LUNAR_ECLIPSE_PENUMBRA_TRANSMISSION,
  LUNAR_ECLIPSE_UMBRA_TRANSMISSION,
  lunarEclipseDiscCoverage,
  lunarEclipseMoonlightTransmission,
} from "./lunarEclipseMoonlightTransmission";

const TOTAL_2022 = "nasa-5mcle-lunar-9700";
const MINUTE_MS = 60_000;

describe("lunar eclipse moonlight transmission", () => {
  const event = getLunarEclipseEventById(TOTAL_2022)!;

  it("is 1 outside the eclipse and does not change lunar phase", () => {
    const before = lunarEclipseGeometryAt(event, event.p1UtcMs! - 5 * MINUTE_MS);
    expect(before.phase).toBe("none");
    expect(lunarEclipseMoonlightTransmission(before)).toBe(1);
    expect(lunarEclipseMoonlightTransmission(null)).toBe(1);
    expect(moonPhaseStrengthFromIlluminatedFraction(1)).toBeGreaterThan(0.9);
  });

  it("is slightly below 1 in penumbra, lower in partial umbra, and much lower in totality", () => {
    const pen = lunarEclipseDiscCoverage(
      lunarEclipseGeometryAt(event, (event.p1UtcMs! + event.u1UtcMs!) / 2),
    );
    const partial = lunarEclipseDiscCoverage(
      lunarEclipseGeometryAt(event, (event.u1UtcMs! + event.u2UtcMs!) / 2),
    );
    const total = lunarEclipseDiscCoverage(lunarEclipseGeometryAt(event, event.greatestEclipseUtcMs));
    expect(pen.penumbralCoverage01).toBeGreaterThan(0.2);
    expect(pen.umbralCoverage01).toBe(0);
    expect(pen.moonlightTransmission01).toBeLessThan(1);
    expect(pen.moonlightTransmission01).toBeGreaterThan(0.7);
    expect(partial.umbralCoverage01).toBeGreaterThan(0.15);
    expect(partial.umbralCoverage01).toBeLessThan(1);
    expect(partial.moonlightTransmission01).toBeLessThan(pen.moonlightTransmission01);
    expect(total.umbralCoverage01).toBe(1);
    expect(total.moonlightTransmission01).toBeCloseTo(LUNAR_ECLIPSE_UMBRA_TRANSMISSION, 5);
    expect(total.moonlightTransmission01).toBeLessThan(0.1);
  });

  it("progresses monotonically through sampled ingress and restores on egress", () => {
    const stations = [
      event.p1UtcMs! - 2 * MINUTE_MS,
      event.p1UtcMs! + 8 * MINUTE_MS,
      (event.p1UtcMs! + event.u1UtcMs!) / 2,
      event.u1UtcMs! + 8 * MINUTE_MS,
      (event.u1UtcMs! + event.u2UtcMs!) / 2,
      event.u2UtcMs! + 2 * MINUTE_MS,
      event.greatestEclipseUtcMs,
    ];
    const samples = stations.map((utc) => lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, utc)));
    for (let i = 1; i < samples.length; i++) {
      expect(samples[i]!).toBeLessThanOrEqual(samples[i - 1]! + 1e-9);
    }
    const afterU3 = lunarEclipseMoonlightTransmission(
      lunarEclipseGeometryAt(event, event.u3UtcMs! + 8 * MINUTE_MS),
    );
    const afterU4 = lunarEclipseMoonlightTransmission(
      lunarEclipseGeometryAt(event, (event.u4UtcMs! + event.p4UtcMs!) / 2),
    );
    const afterP4 = lunarEclipseMoonlightTransmission(
      lunarEclipseGeometryAt(event, event.p4UtcMs! + 2 * MINUTE_MS),
    );
    expect(afterU3).toBeGreaterThan(LUNAR_ECLIPSE_UMBRA_TRANSMISSION);
    expect(afterU4).toBeGreaterThan(afterU3);
    expect(afterP4).toBe(1);
  });

  it("multiplies ordinary phase moonlight rather than replacing the phase value", () => {
    const phase = moonPhaseStrengthFromIlluminatedFraction(0.99);
    const t = lunarEclipseMoonlightTransmission(lunarEclipseGeometryAt(event, event.greatestEclipseUtcMs));
    expect(phase * t).toBeCloseTo(phase * LUNAR_ECLIPSE_UMBRA_TRANSMISSION, 5);
    expect(phase).toBeGreaterThan(0.9);
    expect(LUNAR_ECLIPSE_PENUMBRA_TRANSMISSION).toBeGreaterThan(LUNAR_ECLIPSE_UMBRA_TRANSMISSION);
  });
});
