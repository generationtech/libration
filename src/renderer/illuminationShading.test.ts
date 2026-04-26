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
  DAYLIGHT_CLEAR_ALTITUDE_DEG,
  DEEP_NIGHT_SETTLE_ALTITUDE_DEG,
  MOONLIGHT_MAX_LIFT,
  NIGHT_DARKEN,
  sampleIlluminationRgba8,
  smootherstep,
  smoothstep,
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

  function compositeChannel(dst: number, src: number, alpha8: number): number {
    const alpha = alpha8 / 255;
    return src * alpha + dst * (1 - alpha);
  }

  function luminance(rgb: { r: number; g: number; b: number }): number {
    return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  }

  it("is fully transparent on the high day side above +4 deg", () => {
    expect(sampleIlluminationRgba8(1, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(sampleIlluminationRgba8(0.5, 1)).toEqual({ r: 0, g: 0, b: 0, a: 0 });
    expect(sampleIlluminationRgba8(dotFromAltitudeDeg(DAYLIGHT_CLEAR_ALTITUDE_DEG), 1)).toEqual({
      r: 0,
      g: 0,
      b: 0,
      a: 0,
    });
  });

  it("uses a non-black atmospheric tint on the low day side near the horizon", () => {
    const mid = sampleIlluminationRgba8(dotFromAltitudeDeg(2), 1);
    expect(mid.r + mid.g + mid.b).toBeGreaterThan(0);
    expect(mid.a).toBeGreaterThan(0);
    expect(mid.a).toBeLessThanOrEqual(255);
  });

  it("keeps a visible atmospheric alpha exactly on the terminator (dot=0)", () => {
    const horizon = sampleIlluminationRgba8(0, 1);
    expect(horizon.a).toBeGreaterThan(0);
    expect(horizon.a).toBeLessThan(Math.round(NIGHT_DARKEN * 255));
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

  it("uses distinct overlay RGB between civil and nautical reference altitudes", () => {
    const civilDot = Math.sin((-4 * Math.PI) / 180);
    const nautDot = Math.sin((-8 * Math.PI) / 180);
    const c1 = sampleIlluminationRgba8(civilDot, 1);
    const c2 = sampleIlluminationRgba8(nautDot, 1);
    const sum1 = c1.r + c1.g + c1.b;
    const sum2 = c2.r + c2.g + c2.b;
    expect(sum1).not.toBe(sum2);
  });

  it("keeps color continuity through civil/nautical/astronomical references", () => {
    const sampleAltitudeSet = [-6, -12, -18] as const;
    for (const boundary of sampleAltitudeSet) {
      const before = sampleIlluminationRgba8(dotFromAltitudeDeg(boundary + 0.25), 1);
      const after = sampleIlluminationRgba8(dotFromAltitudeDeg(boundary - 0.25), 1);
      const colorDelta =
        Math.abs(before.r - after.r) + Math.abs(before.g - after.g) + Math.abs(before.b - after.b);
      expect(colorDelta).toBeLessThanOrEqual(18);
    }
  });

  it("settles into deep night by astronomical twilight", () => {
    const atAstro = sampleIlluminationRgba8(dotFromAltitudeDeg(-18), 1);
    const beforeAstro = sampleIlluminationRgba8(dotFromAltitudeDeg(-17), 1);
    const deepNight = sampleIlluminationRgba8(dotFromAltitudeDeg(DEEP_NIGHT_SETTLE_ALTITUDE_DEG), 1);
    expect(beforeAstro.a).toBeGreaterThan(0);
    expect(beforeAstro.r + beforeAstro.g + beforeAstro.b).toBeGreaterThanOrEqual(0);
    expect(deepNight.r + deepNight.g + deepNight.b).toBe(0);
    expect(deepNight.a).toBeGreaterThanOrEqual(atAstro.a);
  });

  it("fades day-side attenuation monotonically away from the horizon", () => {
    const lowDay = sampleIlluminationRgba8(dotFromAltitudeDeg(1), 1).a;
    const midDay = sampleIlluminationRgba8(dotFromAltitudeDeg(4), 1).a;
    const highDay = sampleIlluminationRgba8(dotFromAltitudeDeg(7), 1).a;
    expect(lowDay).toBeGreaterThanOrEqual(midDay);
    expect(midDay).toBeGreaterThanOrEqual(highDay);
  });

  it("does not brighten a dark ocean substrate across twilight anchors", () => {
    const darkOcean = { r: 14, g: 26, b: 44 };
    const darkOceanLum = luminance(darkOcean);
    const twilightAltitudes = [2, 0, -6, -12] as const;

    for (const altitude of twilightAltitudes) {
      const overlay = sampleIlluminationRgba8(dotFromAltitudeDeg(altitude), 1);
      const composed = {
        r: compositeChannel(darkOcean.r, overlay.r, overlay.a),
        g: compositeChannel(darkOcean.g, overlay.g, overlay.a),
        b: compositeChannel(darkOcean.b, overlay.b, overlay.a),
      };
      expect(luminance(composed)).toBeLessThanOrEqual(darkOceanLum + 0.25);
    }
  });

  it("keeps twilight tint subordinate to bright day substrate luminance", () => {
    const brightSubstrate = { r: 180, g: 190, b: 200 };
    const brightLum = luminance(brightSubstrate);
    const twilight = sampleIlluminationRgba8(dotFromAltitudeDeg(-3), 1);
    const composed = {
      r: compositeChannel(brightSubstrate.r, twilight.r, twilight.a),
      g: compositeChannel(brightSubstrate.g, twilight.g, twilight.a),
      b: compositeChannel(brightSubstrate.b, twilight.b, twilight.a),
    };
    expect(luminance(composed)).toBeLessThan(brightLum);
  });

  it("darkening alpha is monotonic from +4 deg through deep night", () => {
    const aPos4 = sampleIlluminationRgba8(dotFromAltitudeDeg(4), 1).a;
    const a0 = sampleIlluminationRgba8(dotFromAltitudeDeg(0), 1).a;
    const aCivil = sampleIlluminationRgba8(dotFromAltitudeDeg(-6), 1).a;
    const aNaut = sampleIlluminationRgba8(dotFromAltitudeDeg(-12), 1).a;
    const aAstro = sampleIlluminationRgba8(dotFromAltitudeDeg(-18), 1).a;
    const aDeep = sampleIlluminationRgba8(dotFromAltitudeDeg(DEEP_NIGHT_SETTLE_ALTITUDE_DEG), 1).a;
    expect(aPos4).toBe(0);
    expect(a0).toBeGreaterThan(aPos4);
    expect(aCivil).toBeGreaterThanOrEqual(a0);
    expect(aNaut).toBeGreaterThanOrEqual(aCivil);
    expect(aAstro).toBeGreaterThanOrEqual(aNaut);
    expect(aDeep).toBeGreaterThanOrEqual(aAstro);
  });

  it("color gradient changes smoothly without abrupt frame-to-frame jumps", () => {
    let previous = sampleIlluminationRgba8(dotFromAltitudeDeg(4), 1);
    for (let altitude = 3.5; altitude >= -18; altitude -= 0.5) {
      const next = sampleIlluminationRgba8(dotFromAltitudeDeg(altitude), 1);
      const prevWeight = previous.a / 255;
      const nextWeight = next.a / 255;
      const delta =
        Math.abs(next.r * nextWeight - previous.r * prevWeight) +
        Math.abs(next.g * nextWeight - previous.g * prevWeight) +
        Math.abs(next.b * nextWeight - previous.b * prevWeight);
      expect(delta).toBeLessThanOrEqual(20);
      previous = next;
    }
  });

  it("keeps moonlight near zero at new moon even when high above night horizon", () => {
    const solarNightDot = dotFromAltitudeDeg(-30);
    const lunarHighDot = dotFromAltitudeDeg(65);
    const baseline = sampleIlluminationRgba8(solarNightDot, 1);
    const newMoon = sampleIlluminationRgba8(solarNightDot, 1, {
      lunarDot: lunarHighDot,
      lunarIlluminatedFraction: 0.01,
    });
    expect(Math.abs(newMoon.a - baseline.a)).toBeLessThanOrEqual(2);
  });

  it("applies a small bounded night lift for a high full moon", () => {
    const solarNightDot = dotFromAltitudeDeg(-30);
    const lunarHighDot = dotFromAltitudeDeg(65);
    const baseline = sampleIlluminationRgba8(solarNightDot, 1);
    const fullMoon = sampleIlluminationRgba8(solarNightDot, 1, {
      lunarDot: lunarHighDot,
      lunarIlluminatedFraction: 1,
    });
    expect(fullMoon.a).toBeLessThan(baseline.a);
    expect(fullMoon.a).toBeGreaterThanOrEqual(
      Math.floor(baseline.a * (1 - MOONLIGHT_MAX_LIFT)) - 1,
    );
    expect(fullMoon.b).toBeGreaterThanOrEqual(fullMoon.r);
  });

  it("applies no moonlight lift when moon is below horizon", () => {
    const solarNightDot = dotFromAltitudeDeg(-30);
    const baseline = sampleIlluminationRgba8(solarNightDot, 1);
    const moonBelow = sampleIlluminationRgba8(solarNightDot, 1, {
      lunarDot: dotFromAltitudeDeg(-5),
      lunarIlluminatedFraction: 1,
    });
    expect(moonBelow).toEqual(baseline);
  });

  it("does not meaningfully brighten daylight/twilight with moonlight inputs", () => {
    const daylight = sampleIlluminationRgba8(dotFromAltitudeDeg(8), 1, {
      lunarDot: dotFromAltitudeDeg(60),
      lunarIlluminatedFraction: 1,
    });
    expect(daylight.a).toBe(0);

    const twilightBaseline = sampleIlluminationRgba8(dotFromAltitudeDeg(-4), 1);
    const twilightWithMoon = sampleIlluminationRgba8(dotFromAltitudeDeg(-4), 1, {
      lunarDot: dotFromAltitudeDeg(60),
      lunarIlluminatedFraction: 1,
    });
    expect(Math.abs(twilightWithMoon.a - twilightBaseline.a)).toBeLessThanOrEqual(2);
  });
});
