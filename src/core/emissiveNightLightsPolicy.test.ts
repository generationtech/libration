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
import { DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID } from "../config/emissiveCompositionAssetResolve";
import {
  clampEmissiveRadianceTexelSample,
  computeEmissiveNightLightsContributionLinear01,
  emissiveMoonlightCoexistenceFactor,
  emissiveSolarVisibilityGate01,
  getEmissiveNightLightsPolicy,
} from "./emissiveNightLightsPolicy";

describe("emissiveSolarVisibilityGate01", () => {
  it("suppresses emissive in daylight and at the horizon", () => {
    expect(emissiveSolarVisibilityGate01(12)).toBe(0);
    expect(emissiveSolarVisibilityGate01(0)).toBe(0);
  });

  it("ramps through twilight bands toward full night", () => {
    expect(emissiveSolarVisibilityGate01(-3)).toBeCloseTo(0.0175, 5);
    expect(emissiveSolarVisibilityGate01(-6)).toBeCloseTo(0.035, 5);
    expect(emissiveSolarVisibilityGate01(-9)).toBeCloseTo(0.1975, 5);
    expect(emissiveSolarVisibilityGate01(-15)).toBeCloseTo(0.62, 5);
    expect(emissiveSolarVisibilityGate01(-18)).toBeCloseTo(0.88, 5);
    expect(emissiveSolarVisibilityGate01(-22)).toBe(1);
  });

  it("is monotonic non-increasing as solar altitude increases (deeper night → higher gate)", () => {
    const alts = [-24, -20, -18, -15, -12, -9, -6, -3, -1, 0, 4];
    for (let i = 1; i < alts.length; i++) {
      const prev = emissiveSolarVisibilityGate01(alts[i - 1]!);
      const cur = emissiveSolarVisibilityGate01(alts[i]!);
      expect(cur).toBeLessThanOrEqual(prev + 1e-12);
    }
  });
});

describe("computeEmissiveNightLightsContributionLinear01", () => {
  it("is zero in off mode regardless of sample and solar gate", () => {
    expect(
      computeEmissiveNightLightsContributionLinear01({
        emissiveSampleLinear01: 1,
        solarAltitudeDeg: -30,
        moonlightMode: "illustrative",
        emissiveMode: "off",
      }),
    ).toBe(0);
  });

  it("is zero in off mode even with high presentationIntensity", () => {
    expect(
      computeEmissiveNightLightsContributionLinear01({
        emissiveSampleLinear01: 1,
        solarAltitudeDeg: -30,
        moonlightMode: "illustrative",
        emissiveMode: "off",
        presentationIntensity: 4,
      }),
    ).toBe(0);
  });

  it("increases contribution monotonically with presentationIntensity before clamp", () => {
    const base = {
      emissiveSampleLinear01: 0.2,
      solarAltitudeDeg: -24,
      moonlightMode: "off" as const,
      emissiveMode: "enhanced" as const,
    };
    const a = computeEmissiveNightLightsContributionLinear01({ ...base, presentationIntensity: 0.5 });
    const b = computeEmissiveNightLightsContributionLinear01({ ...base, presentationIntensity: 1 });
    const c = computeEmissiveNightLightsContributionLinear01({ ...base, presentationIntensity: 2 });
    expect(b).toBeGreaterThanOrEqual(a);
    expect(c).toBeGreaterThanOrEqual(b);
  });

  it("suppresses contribution in daylight for active modes", () => {
    const x = computeEmissiveNightLightsContributionLinear01({
      emissiveSampleLinear01: 1,
      solarAltitudeDeg: 5,
      moonlightMode: "off",
      emissiveMode: "natural",
    });
    expect(x).toBe(0);
  });

  it("activates materially in deep night with natural mode", () => {
    const x = computeEmissiveNightLightsContributionLinear01({
      emissiveSampleLinear01: 0.5,
      solarAltitudeDeg: -22,
      moonlightMode: "off",
      emissiveMode: "natural",
    });
    expect(x).toBeCloseTo(0.5 * getEmissiveNightLightsPolicy("natural").radianceGain, 5);
  });

  it("applies illustrative radiance gain vs natural", () => {
    const nat = computeEmissiveNightLightsContributionLinear01({
      emissiveSampleLinear01: 0.5,
      solarAltitudeDeg: -22,
      moonlightMode: "off",
      emissiveMode: "natural",
    });
    const ill = computeEmissiveNightLightsContributionLinear01({
      emissiveSampleLinear01: 0.5,
      solarAltitudeDeg: -22,
      moonlightMode: "off",
      emissiveMode: "illustrative",
    });
    expect(ill).toBeGreaterThan(nat);
    expect(ill).toBeCloseTo(
      Math.min(1, 0.5 * getEmissiveNightLightsPolicy("illustrative").radianceGain),
      5,
    );
  });

  it("orders natural < enhanced < illustrative at deep night for the same radiance sample", () => {
    const base = {
      emissiveSampleLinear01: 0.35,
      solarAltitudeDeg: -25,
      moonlightMode: "off" as const,
    };
    const n = computeEmissiveNightLightsContributionLinear01({ ...base, emissiveMode: "natural" });
    const e = computeEmissiveNightLightsContributionLinear01({ ...base, emissiveMode: "enhanced" });
    const i = computeEmissiveNightLightsContributionLinear01({ ...base, emissiveMode: "illustrative" });
    expect(n).toBeLessThan(e);
    expect(e).toBeLessThan(i);
  });

  it("reduces emissive slightly when moonlight contributes in natural mode", () => {
    const moonOff = computeEmissiveNightLightsContributionLinear01({
      emissiveSampleLinear01: 0.65,
      solarAltitudeDeg: -22,
      moonlightMode: "off",
      emissiveMode: "natural",
    });
    const moonNat = computeEmissiveNightLightsContributionLinear01({
      emissiveSampleLinear01: 0.65,
      solarAltitudeDeg: -22,
      moonlightMode: "natural",
      emissiveMode: "natural",
    });
    expect(moonNat).toBeCloseTo(moonOff * emissiveMoonlightCoexistenceFactor("natural"), 5);
    expect(moonNat).toBeGreaterThan(0);
  });

  it("is deterministic for identical inputs", () => {
    const input = {
      emissiveSampleLinear01: 0.37,
      solarAltitudeDeg: -11.2,
      moonlightMode: "enhanced" as const,
      emissiveMode: "enhanced" as const,
    };
    expect(computeEmissiveNightLightsContributionLinear01(input)).toBe(
      computeEmissiveNightLightsContributionLinear01(input),
    );
  });

  it("treats non-finite samples as zero", () => {
    expect(
      computeEmissiveNightLightsContributionLinear01({
        emissiveSampleLinear01: Number.NaN,
        solarAltitudeDeg: -30,
        moonlightMode: "illustrative",
        emissiveMode: "natural",
      }),
    ).toBe(0);
  });
});

describe("clampEmissiveRadianceTexelSample", () => {
  it("clamps to 0..1", () => {
    expect(clampEmissiveRadianceTexelSample(-1)).toBe(0);
    expect(clampEmissiveRadianceTexelSample(0)).toBe(0);
    expect(clampEmissiveRadianceTexelSample(0.4)).toBe(0.4);
    expect(clampEmissiveRadianceTexelSample(2)).toBe(1);
  });
});

describe("DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID", () => {
  it("is a stable semantic id string", () => {
    expect(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID).toMatch(/^equirect-world-night-lights-viirs-v1$/);
  });
});
