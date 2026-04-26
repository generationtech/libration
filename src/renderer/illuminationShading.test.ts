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
  DAY_TWILIGHT_DOT,
  NIGHT_DARKEN,
  sampleIlluminationRgba8,
  smootherstep,
  smoothstep,
  TWILIGHT_BAND_BLEND_OVERLAP_DEG,
  TWILIGHT_B,
  TWILIGHT_G,
  TWILIGHT_R,
} from "./illuminationShading";
import { classifyTwilightBand, solarAltitudeDegFromSurfaceSunDotProduct } from "../core/solarTwilight";

describe("smootherstep", () => {
  it("matches endpoints and has zero slope at edges vs linear ramp", () => {
    expect(smootherstep(0, 1, 0)).toBe(0);
    expect(smootherstep(0, 1, 1)).toBe(1);
    expect(smootherstep(2, 4, 3)).toBe(0.5);
  });
});

describe("smoothstep", () => {
  it("is 0 and 1 at edges", () => {
    expect(smoothstep(0, 1, 0)).toBe(0);
    expect(smoothstep(0, 1, 1)).toBe(1);
    expect(smoothstep(0, 1, 0.5)).toBe(0.5);
  });
});

describe("sampleIlluminationRgba8 (twilight-aware)", () => {
  function dotFromAltitudeDeg(altitudeDeg: number): number {
    return Math.sin((altitudeDeg * Math.PI) / 180);
  }

  it("is fully transparent on the high day side away from the low-sun band", () => {
    expect(sampleIlluminationRgba8(1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(sampleIlluminationRgba8(0.5, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(sampleIlluminationRgba8(DAY_TWILIGHT_DOT, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
  });

  it("uses twilight tint on the day-side pre-horizon low-sun band", () => {
    const mid = sampleIlluminationRgba8(DAY_TWILIGHT_DOT * 0.5, 1);
    expect(mid.r).toBe(TWILIGHT_R);
    expect(mid.g).toBe(TWILIGHT_G);
    expect(mid.b).toBe(TWILIGHT_B);
    expect(mid.a).toBeGreaterThan(0);
    expect(mid.a).toBeLessThanOrEqual(255);
  });

  it("has zero alpha exactly on the subsolar/terminator dot=0 (night branch at horizon)", () => {
    expect(sampleIlluminationRgba8(0, 1).a).toBe(0);
  });

  it("ramps to full night darken in deep night (arbitrary sub-horizon dot)", () => {
    const deep = sampleIlluminationRgba8(-1, 1);
    expect(deep.a).toBe(Math.round(NIGHT_DARKEN * 255));
    expect(deep.r).toBe(0);
    expect(deep.g).toBe(0);
    expect(deep.b).toBe(0);
  });

  it("scales alpha by layer opacity", () => {
    const deep = sampleIlluminationRgba8(-1, 0.5);
    expect(deep.a).toBe(Math.round(NIGHT_DARKEN * 0.5 * 255));
  });

  it("produces partial night alpha in nautical twilight (classifier agrees)", () => {
    const dot = -0.17;
    const deg = solarAltitudeDegFromSurfaceSunDotProduct(dot);
    expect(deg).toBeLessThan(-6);
    expect(deg).toBeGreaterThan(-12);
    expect(classifyTwilightBand(deg)).toBe("nauticalTwilight");
    const t = sampleIlluminationRgba8(dot, 1);
    expect(t.a).toBeGreaterThan(0);
    expect(t.a).toBeLessThan(Math.round(NIGHT_DARKEN * 255));
  });

  it("uses distinct overlay RGB between civil and nautical for the same alpha depth", () => {
    const civilDot = Math.sin((-4 * Math.PI) / 180);
    const nautDot = Math.sin((-8 * Math.PI) / 180);
    const c1 = sampleIlluminationRgba8(civilDot, 1);
    const c2 = sampleIlluminationRgba8(nautDot, 1);
    const sum1 = c1.r + c1.g + c1.b;
    const sum2 = c2.r + c2.g + c2.b;
    expect(sum1).not.toBe(sum2);
  });

  it("keeps color continuity across civil and nautical boundaries with overlap blending", () => {
    const boundary = -6;
    const step = TWILIGHT_BAND_BLEND_OVERLAP_DEG * 0.5;
    const before = sampleIlluminationRgba8(dotFromAltitudeDeg(boundary + step), 1);
    const after = sampleIlluminationRgba8(dotFromAltitudeDeg(boundary - step), 1);
    const colorDelta =
      Math.abs(before.r - after.r) + Math.abs(before.g - after.g) + Math.abs(before.b - after.b);
    expect(colorDelta).toBeLessThanOrEqual(12);
  });

  it("fades astronomical tint smoothly into deep night near -18 deg", () => {
    const justBeforeNight = sampleIlluminationRgba8(dotFromAltitudeDeg(-17.5), 1);
    const atNight = sampleIlluminationRgba8(dotFromAltitudeDeg(-18), 1);
    expect(justBeforeNight.r + justBeforeNight.g + justBeforeNight.b).toBeGreaterThan(0);
    expect(atNight.r + atNight.g + atNight.b).toBe(0);
    expect(atNight.a).toBeGreaterThanOrEqual(justBeforeNight.a);
  });
});
