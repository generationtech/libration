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
    expect(emissiveSolarVisibilityGate01(-3)).toBeCloseTo(0.04, 5);
    expect(emissiveSolarVisibilityGate01(-6)).toBeCloseTo(0.08, 5);
    expect(emissiveSolarVisibilityGate01(-9)).toBeCloseTo(0.25, 5);
    expect(emissiveSolarVisibilityGate01(-15)).toBeCloseTo(0.67, 5);
    expect(emissiveSolarVisibilityGate01(-18)).toBeCloseTo(0.92, 5);
    expect(emissiveSolarVisibilityGate01(-22)).toBe(1);
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
    expect(x).toBeCloseTo(0.5, 5);
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
    expect(ill).toBeCloseTo(0.5 * getEmissiveNightLightsPolicy("illustrative").radianceGain, 5);
  });

  it("reduces emissive slightly when moonlight contributes in natural mode", () => {
    const moonOff = computeEmissiveNightLightsContributionLinear01({
      emissiveSampleLinear01: 1,
      solarAltitudeDeg: -22,
      moonlightMode: "off",
      emissiveMode: "natural",
    });
    const moonNat = computeEmissiveNightLightsContributionLinear01({
      emissiveSampleLinear01: 1,
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
