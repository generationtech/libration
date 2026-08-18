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
import { getLunarEclipseEventById } from "./eclipseAuthority";
import { lunarEclipseGeometryAt } from "./lunarEclipseGeometry";
import {
  lunarEarthShadowCueLengthMoonRadii,
  lunarEarthShadowCueStrength01,
} from "./lunarEarthShadowCue";
import { earthShadowCueScreenUnit } from "../../renderer/renderPlan/sceneSubsolarSublunarMarkersPlan";

const TOTAL_2022 = "nasa-5mcle-lunar-9700";
const TOTAL_2029 = "nasa-5mcle-lunar-9716";
const MINUTE_MS = 60_000;

describe("lunar Earth-shadow cue", () => {
  it("is absent before P1 and after P4", () => {
    const event = getLunarEclipseEventById(TOTAL_2029)!;
    expect(lunarEarthShadowCueStrength01(lunarEclipseGeometryAt(event, event.p1UtcMs! - MINUTE_MS))).toBe(0);
    expect(lunarEarthShadowCueStrength01(lunarEclipseGeometryAt(event, event.p4UtcMs! + MINUTE_MS))).toBe(0);
    expect(lunarEarthShadowCueStrength01(null)).toBe(0);
  });

  it("strengthens continuously from penumbra through totality and recovers on egress", () => {
    const event = getLunarEclipseEventById(TOTAL_2029)!;
    const samples = [
      event.p1UtcMs! + 8 * MINUTE_MS,
      (event.p1UtcMs! + event.u1UtcMs!) / 2,
      event.u1UtcMs! + 8 * MINUTE_MS,
      (event.u1UtcMs! + event.u2UtcMs!) / 2,
      event.greatestEclipseUtcMs,
    ].map((utc) => lunarEarthShadowCueStrength01(lunarEclipseGeometryAt(event, utc)));
    for (let i = 1; i < samples.length; i += 1) {
      expect(samples[i]!).toBeGreaterThanOrEqual(samples[i - 1]! - 1e-9);
    }
    expect(samples[0]!).toBeGreaterThan(0);
    expect(samples[0]!).toBeLessThan(samples[samples.length - 1]!);
    const egress = lunarEarthShadowCueStrength01(
      lunarEclipseGeometryAt(event, event.u3UtcMs! + 20 * MINUTE_MS),
    );
    expect(egress).toBeGreaterThan(0);
    expect(egress).toBeLessThan(samples[samples.length - 1]!);
  });

  it("points from the Earth-shadow side toward the Moon without a 180° wrap flip", () => {
    const event = getLunarEclipseEventById(TOTAL_2022)!;
    let prev: { ux: number; uy: number } | null = null;
    for (let t = event.p1UtcMs! + MINUTE_MS; t < event.p4UtcMs!; t += 5 * MINUTE_MS) {
      const geom = lunarEclipseGeometryAt(event, t);
      const dir = earthShadowCueScreenUnit(
        geom.shadowOffsetEastMoonRadii,
        geom.shadowOffsetNorthMoonRadii,
        0,
      );
      expect(dir).not.toBeNull();
      expect(Math.hypot(dir!.ux, dir!.uy)).toBeCloseTo(1, 6);
      if (prev) {
        const dot = prev.ux * dir!.ux + prev.uy * dir!.uy;
        expect(dot).toBeGreaterThan(0.5);
      }
      prev = dir;
    }
  });

  it("keeps Dramatic length modest (Moon-local, not a world beam)", () => {
    expect(lunarEarthShadowCueLengthMoonRadii("subtle")).toBeLessThan(lunarEarthShadowCueLengthMoonRadii("normal"));
    expect(lunarEarthShadowCueLengthMoonRadii("normal")).toBeLessThan(lunarEarthShadowCueLengthMoonRadii("dramatic"));
    expect(lunarEarthShadowCueLengthMoonRadii("dramatic")).toBeLessThan(4);
  });
});
