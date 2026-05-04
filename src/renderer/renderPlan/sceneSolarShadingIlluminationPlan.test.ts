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
  buildSolarShadingIlluminationRenderPlan,
  SOLAR_SHADING_PLAN_DOWNSAMPLE,
} from "./sceneSolarShadingIlluminationPlan";
import { sampleIlluminationRgba8 } from "../illuminationShading";
import { approximateLunarPhase } from "../../core/lunarPhase";
import { moonlightNightEligibilityFromSolarAltitude } from "../../core/lunarIllumination";
import { sublunarPoint } from "../../core/sublunarPoint";
import { subsolarPoint } from "../../core/subsolarPoint";
import { solarAltitudeDegFromSurfaceSunDotProduct } from "../../core/solarTwilight";
import { getMoonlightPolicy } from "../../core/moonlightPolicy";
import { DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE } from "../../core/sceneIlluminationPresentationDefaults";

/** Emissive night lights (Phase 1+) resolve upstream; this plan stays a single `rasterPatch` with no emissive-specific options. */
describe("buildSolarShadingIlluminationRenderPlan", () => {
  const ILL_POLICY = getMoonlightPolicy("illustrative");
  function dotFromAltitudeDeg(altitudeDeg: number): number {
    return Math.sin((altitudeDeg * Math.PI) / 180);
  }

  function surfaceDotToSubpoint(
    surfaceLatDeg: number,
    surfaceLonDeg: number,
    bodySubpointLatDeg: number,
    bodySubpointLonDeg: number,
  ): number {
    const phi = (surfaceLatDeg * Math.PI) / 180;
    const lam = (surfaceLonDeg * Math.PI) / 180;
    const bodyPhi = (bodySubpointLatDeg * Math.PI) / 180;
    const bodyLam = (bodySubpointLonDeg * Math.PI) / 180;
    return (
      Math.cos(phi) * Math.cos(bodyPhi) * Math.cos(lam - bodyLam) +
      Math.sin(phi) * Math.sin(bodyPhi)
    );
  }

  function compositeChannel(dst: number, src: number, alpha8: number): number {
    const alpha = alpha8 / 255;
    return src * alpha + dst * (1 - alpha);
  }

  function luminance(rgb: { r: number; g: number; b: number }): number {
    return 0.2126 * rgb.r + 0.7152 * rgb.g + 0.0722 * rgb.b;
  }

  it("emits no items when the viewport has non-positive size", () => {
    expect(buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 0,
      viewportHeightPx: 100,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 0.5,
      layerOpacity: 1,
      moonlightPolicy: ILL_POLICY,
    }).items).toEqual([]);

    expect(buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 100,
      viewportHeightPx: -1,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 0.5,
      layerOpacity: 1,
      moonlightPolicy: ILL_POLICY,
    }).items).toEqual([]);
  });

  it("emits a single rasterPatch covering the viewport with downsampled RGBA buffer", () => {
    const plan = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 100,
      viewportHeightPx: 80,
      subsolarLatDeg: 10,
      subsolarLonDeg: -20,
      sublunarLatDeg: -4,
      sublunarLonDeg: 48,
      lunarIlluminatedFraction: 0.72,
      layerOpacity: 0.75,
      moonlightPolicy: ILL_POLICY,
    });

    expect(plan.items).toHaveLength(1);
    const item = plan.items[0];
    expect(item.kind).toBe("rasterPatch");
    if (item.kind !== "rasterPatch") {
      return;
    }

    const sw = Math.ceil(100 / SOLAR_SHADING_PLAN_DOWNSAMPLE);
    const sh = Math.ceil(80 / SOLAR_SHADING_PLAN_DOWNSAMPLE);
    expect(item.widthPx).toBe(sw);
    expect(item.heightPx).toBe(sh);
    expect(item.rgba.length).toBe(sw * sh * 4);
    expect(item.x).toBe(0);
    expect(item.y).toBe(0);
    expect(item.destWidth).toBe(100);
    expect(item.destHeight).toBe(80);
  });

  it("zeros alpha across the patch when layer opacity is 0", () => {
    const plan = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 32,
      viewportHeightPx: 32,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 1,
      layerOpacity: 0,
      moonlightPolicy: ILL_POLICY,
    });
    const item = plan.items[0];
    expect(item?.kind).toBe("rasterPatch");
    if (!item || item.kind !== "rasterPatch") {
      return;
    }
    for (let i = 3; i < item.rgba.length; i += 4) {
      expect(item.rgba[i]).toBe(0);
    }
  });

  it("leaves the subsolar disk region transparent on the day side (center column near subsolar)", () => {
    const plan = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 64,
      viewportHeightPx: 64,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 0,
      sublunarLonDeg: 0,
      lunarIlluminatedFraction: 1,
      layerOpacity: 1,
      moonlightPolicy: ILL_POLICY,
    });
    const item = plan.items[0];
    expect(item?.kind).toBe("rasterPatch");
    if (!item || item.kind !== "rasterPatch") {
      return;
    }
    const sw = item.widthPx;
    const sh = item.heightPx;
    const midI = Math.floor(sw / 2);
    const midJ = Math.floor(sh / 2);
    const p = (midJ * sw + midI) * 4 + 3;
    expect(item.rgba[p]).toBe(0);
  });

  it("diagnoses moonlight contribution gates across fixed scenarios", () => {
    const scenarios = [
      {
        name: "full moon, moon high overhead, deep night",
        solarAltitudeDeg: -30,
        lunarDot: dotFromAltitudeDeg(70),
        lunarIlluminatedFraction: 1,
        minAlphaDelta: 40,
      },
      {
        name: "waxing gibbous, moon high overhead, deep night",
        solarAltitudeDeg: -30,
        lunarDot: dotFromAltitudeDeg(70),
        lunarIlluminatedFraction: 0.9,
        minAlphaDelta: 35,
      },
      {
        name: "waxing gibbous, moon low altitude, deep night",
        solarAltitudeDeg: -30,
        lunarDot: dotFromAltitudeDeg(5),
        lunarIlluminatedFraction: 0.9,
        maxAlphaDelta: 4,
      },
      {
        name: "moon below horizon",
        solarAltitudeDeg: -30,
        lunarDot: dotFromAltitudeDeg(-5),
        lunarIlluminatedFraction: 0.9,
        exactAlphaDelta: 0,
      },
      {
        name: "daylight",
        solarAltitudeDeg: 8,
        lunarDot: dotFromAltitudeDeg(70),
        lunarIlluminatedFraction: 0.9,
        exactAlphaDelta: 0,
      },
      {
        name: "early twilight",
        solarAltitudeDeg: -3,
        lunarDot: dotFromAltitudeDeg(70),
        lunarIlluminatedFraction: 0.9,
        exactAlphaDelta: 0,
      },
    ] as const;

    for (const scenario of scenarios) {
      const solarDot = dotFromAltitudeDeg(scenario.solarAltitudeDeg);
      const baseline = sampleIlluminationRgba8(solarDot, 1);
      const withMoonlight = sampleIlluminationRgba8(solarDot, 1, {
        lunarDot: scenario.lunarDot,
        lunarIlluminatedFraction: scenario.lunarIlluminatedFraction,
      });
      const alphaDelta = baseline.a - withMoonlight.a;
      if ("exactAlphaDelta" in scenario) {
        expect(alphaDelta, scenario.name).toBe(scenario.exactAlphaDelta);
      }
      if ("minAlphaDelta" in scenario) {
        expect(alphaDelta, scenario.name).toBeGreaterThanOrEqual(scenario.minAlphaDelta);
      }
      if ("maxAlphaDelta" in scenario) {
        expect(alphaDelta, scenario.name).toBeLessThanOrEqual(scenario.maxAlphaDelta);
      }
    }
  });

  it("captures April 25 2026 representative frame diagnostics at sublunar point and Knoxville", () => {
    const demoTimestamp = Date.parse("2026-04-25T03:00:00Z");
    const phase = approximateLunarPhase(demoTimestamp);
    const sublunar = sublunarPoint(demoTimestamp);
    const subsolar = subsolarPoint(demoTimestamp);
    const knoxville = { latDeg: 35.9606, lonDeg: -83.9207 };
    const darkSubstrate = { r: 14, g: 26, b: 44 };

    const solarDotAtSublunar = surfaceDotToSubpoint(
      sublunar.latDeg,
      sublunar.lonDeg,
      subsolar.latDeg,
      subsolar.lonDeg,
    );
    const lunarDotAtSublunar = surfaceDotToSubpoint(
      sublunar.latDeg,
      sublunar.lonDeg,
      sublunar.latDeg,
      sublunar.lonDeg,
    );
    const solarDotAtKnoxville = surfaceDotToSubpoint(
      knoxville.latDeg,
      knoxville.lonDeg,
      subsolar.latDeg,
      subsolar.lonDeg,
    );
    const lunarDotAtKnoxville = surfaceDotToSubpoint(
      knoxville.latDeg,
      knoxville.lonDeg,
      sublunar.latDeg,
      sublunar.lonDeg,
    );

    const solarAltitudeAtSublunar = solarAltitudeDegFromSurfaceSunDotProduct(solarDotAtSublunar);
    const solarAltitudeAtKnoxville = solarAltitudeDegFromSurfaceSunDotProduct(solarDotAtKnoxville);
    const nightEligibilityAtSublunar = moonlightNightEligibilityFromSolarAltitude(solarAltitudeAtSublunar);
    const nightEligibilityAtKnoxville = moonlightNightEligibilityFromSolarAltitude(solarAltitudeAtKnoxville);

    const baselineAtSublunar = sampleIlluminationRgba8(solarDotAtSublunar, 1);
    const moonlitAtSublunar = sampleIlluminationRgba8(solarDotAtSublunar, 1, {
      lunarDot: lunarDotAtSublunar,
      lunarIlluminatedFraction: phase.illuminatedFraction,
    });
    const baselineAtKnoxville = sampleIlluminationRgba8(solarDotAtKnoxville, 1);
    const moonlitAtKnoxville = sampleIlluminationRgba8(solarDotAtKnoxville, 1, {
      lunarDot: lunarDotAtKnoxville,
      lunarIlluminatedFraction: phase.illuminatedFraction,
    });

    const alphaDeltaAtSublunar = baselineAtSublunar.a - moonlitAtSublunar.a;
    const alphaDeltaAtKnoxville = baselineAtKnoxville.a - moonlitAtKnoxville.a;
    const baselineCompositeAtSublunar = {
      r: compositeChannel(darkSubstrate.r, baselineAtSublunar.r, baselineAtSublunar.a),
      g: compositeChannel(darkSubstrate.g, baselineAtSublunar.g, baselineAtSublunar.a),
      b: compositeChannel(darkSubstrate.b, baselineAtSublunar.b, baselineAtSublunar.a),
    };
    const moonlitCompositeAtSublunar = {
      r: compositeChannel(darkSubstrate.r, moonlitAtSublunar.r, moonlitAtSublunar.a),
      g: compositeChannel(darkSubstrate.g, moonlitAtSublunar.g, moonlitAtSublunar.a),
      b: compositeChannel(darkSubstrate.b, moonlitAtSublunar.b, moonlitAtSublunar.a),
    };
    const baselineCompositeAtKnoxville = {
      r: compositeChannel(darkSubstrate.r, baselineAtKnoxville.r, baselineAtKnoxville.a),
      g: compositeChannel(darkSubstrate.g, baselineAtKnoxville.g, baselineAtKnoxville.a),
      b: compositeChannel(darkSubstrate.b, baselineAtKnoxville.b, baselineAtKnoxville.a),
    };
    const moonlitCompositeAtKnoxville = {
      r: compositeChannel(darkSubstrate.r, moonlitAtKnoxville.r, moonlitAtKnoxville.a),
      g: compositeChannel(darkSubstrate.g, moonlitAtKnoxville.g, moonlitAtKnoxville.a),
      b: compositeChannel(darkSubstrate.b, moonlitAtKnoxville.b, moonlitAtKnoxville.a),
    };
    const luminanceDeltaAtSublunar =
      luminance(moonlitCompositeAtSublunar) - luminance(baselineCompositeAtSublunar);
    const luminanceDeltaAtKnoxville =
      luminance(moonlitCompositeAtKnoxville) - luminance(baselineCompositeAtKnoxville);

    expect(phase.illuminatedFraction).toBeGreaterThan(0.6);
    expect(phase.illuminatedFraction).toBeLessThan(0.62);
    expect(sublunar.latDeg).toBeGreaterThan(16);
    expect(sublunar.latDeg).toBeLessThan(18.5);
    expect(sublunar.lonDeg).toBeGreaterThan(-119);
    expect(sublunar.lonDeg).toBeLessThan(-116);

    expect(lunarDotAtSublunar).toBeCloseTo(1, 6);
    expect(lunarDotAtKnoxville).toBeGreaterThan(0.8);
    expect(solarAltitudeAtSublunar).toBeLessThan(-12);
    expect(solarAltitudeAtKnoxville).toBeLessThan(-20);
    expect(nightEligibilityAtSublunar).toBeGreaterThan(0.9);
    expect(nightEligibilityAtKnoxville).toBe(1);

    expect(alphaDeltaAtSublunar).toBeGreaterThanOrEqual(22);
    expect(alphaDeltaAtSublunar).toBeLessThanOrEqual(45);
    expect(alphaDeltaAtKnoxville).toBeGreaterThanOrEqual(20);
    expect(alphaDeltaAtKnoxville).toBeLessThanOrEqual(42);
    expect(luminanceDeltaAtSublunar).toBeGreaterThan(10);
    expect(luminanceDeltaAtSublunar).toBeLessThan(36);
    expect(luminanceDeltaAtKnoxville).toBeGreaterThan(8);
    expect(luminanceDeltaAtKnoxville).toBeLessThan(34);
  });

  it("keeps one rasterPatch while moonlight policy changes raster contents", () => {
    const baseOpts = {
      viewportWidthPx: 100,
      viewportHeightPx: 80,
      subsolarLatDeg: 10,
      subsolarLonDeg: -20,
      sublunarLatDeg: -4,
      sublunarLonDeg: 48,
      lunarIlluminatedFraction: 0.99,
      layerOpacity: 1,
    };
    const off = buildSolarShadingIlluminationRenderPlan({
      ...baseOpts,
      moonlightPolicy: getMoonlightPolicy("off"),
    });
    const ill = buildSolarShadingIlluminationRenderPlan({
      ...baseOpts,
      moonlightPolicy: getMoonlightPolicy("illustrative"),
    });
    expect(off.items).toHaveLength(1);
    expect(ill.items).toHaveLength(1);
    expect(off.items[0]?.kind).toBe("rasterPatch");
    expect(ill.items[0]?.kind).toBe("rasterPatch");
    if (off.items[0]?.kind === "rasterPatch" && ill.items[0]?.kind === "rasterPatch") {
      expect(off.items[0].rgba.length).toBe(ill.items[0].rgba.length);
      let sumAbs = 0;
      for (let i = 0; i < off.items[0].rgba.length; i++) {
        sumAbs += Math.abs(off.items[0].rgba[i]! - ill.items[0].rgba[i]!);
      }
      expect(sumAbs).toBeGreaterThan(100);
    }
  });

  function solidWhiteEmissiveRaster(n: number): import("../emissiveIlluminationRaster").EmissiveRasterSampleBuffer {
    const rgba = new Uint8ClampedArray(n * n * 4);
    for (let i = 0; i < n * n; i++) {
      rgba[i * 4] = 255;
      rgba[i * 4 + 1] = 255;
      rgba[i * 4 + 2] = 255;
      rgba[i * 4 + 3] = 255;
    }
    return { width: n, height: n, rgba };
  }

  /** Mid-gray so mode gains stay below RGB saturation in the illumination patch. */
  function solidGrayEmissiveRaster(n: number, v: number): import("../emissiveIlluminationRaster").EmissiveRasterSampleBuffer {
    const rgba = new Uint8ClampedArray(n * n * 4);
    for (let i = 0; i < n * n; i++) {
      rgba[i * 4] = v;
      rgba[i * 4 + 1] = v;
      rgba[i * 4 + 2] = v;
      rgba[i * 4 + 3] = 255;
    }
    return { width: n, height: n, rgba };
  }

  function maxRgbChannelSum(plan: ReturnType<typeof buildSolarShadingIlluminationRenderPlan>): number {
    const it = plan.items[0];
    if (!it || it.kind !== "rasterPatch") {
      return 0;
    }
    let m = 0;
    const { rgba } = it;
    for (let i = 0; i < rgba.length; i += 4) {
      m = Math.max(m, rgba[i]! + rgba[i + 1]! + rgba[i + 2]!);
    }
    return m;
  }

  it("honors explicit emissiveNightLightsMode off versus the omitted default when a raster is present", () => {
    const baseOpts = {
      viewportWidthPx: 96,
      viewportHeightPx: 64,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 10,
      sublunarLonDeg: 40,
      lunarIlluminatedFraction: 0.55,
      layerOpacity: 1,
      moonlightPolicy: getMoonlightPolicy("natural"),
    } as const;
    const raster = solidGrayEmissiveRaster(8, 110);
    const omittedDefault = buildSolarShadingIlluminationRenderPlan({
      ...baseOpts,
      emissiveRaster: raster,
    });
    const explicitOff = buildSolarShadingIlluminationRenderPlan({
      ...baseOpts,
      emissiveNightLightsMode: "off",
      emissiveRaster: raster,
    });
    expect(maxRgbChannelSum(explicitOff)).toBeLessThan(maxRgbChannelSum(omittedDefault));
  });

  it("still emits a single rasterPatch when emissive raster buffer is provided", () => {
    const plan = buildSolarShadingIlluminationRenderPlan({
      viewportWidthPx: 64,
      viewportHeightPx: 48,
      subsolarLatDeg: 0,
      subsolarLonDeg: 0,
      sublunarLatDeg: 5,
      sublunarLonDeg: 10,
      lunarIlluminatedFraction: 0.5,
      layerOpacity: 1,
      moonlightPolicy: getMoonlightPolicy("illustrative"),
      emissiveNightLightsMode: "illustrative",
      emissiveRaster: solidWhiteEmissiveRaster(4),
    });
    expect(plan.items).toHaveLength(1);
    expect(plan.items[0]?.kind).toBe("rasterPatch");
  });

  it("defaults omitted emissiveNightLightsMode to the neutral scene default (illustrative), matching explicit illustrative with null raster", () => {
    const baseOpts = {
      viewportWidthPx: 80,
      viewportHeightPx: 56,
      subsolarLatDeg: -8,
      subsolarLonDeg: 15,
      sublunarLatDeg: 2,
      sublunarLonDeg: -120,
      lunarIlluminatedFraction: 0.4,
      layerOpacity: 1,
      moonlightPolicy: getMoonlightPolicy("natural"),
      emissiveRaster: null,
    } as const;
    const omitted = buildSolarShadingIlluminationRenderPlan({ ...baseOpts });
    const explicit = buildSolarShadingIlluminationRenderPlan({
      ...baseOpts,
      emissiveNightLightsMode: DEFAULT_SCENE_EMISSIVE_NIGHT_LIGHTS_PRESENTATION_MODE,
    });
    expect(maxRgbChannelSum(omitted)).toBe(maxRgbChannelSum(explicit));
  });

  it("increases peak RGB in the patch for illustrative emissive vs off with the same white raster", () => {
    const baseOpts = {
      viewportWidthPx: 96,
      viewportHeightPx: 64,
      subsolarLatDeg: 10,
      subsolarLonDeg: -30,
      sublunarLatDeg: -5,
      sublunarLonDeg: 40,
      lunarIlluminatedFraction: 0.9,
      layerOpacity: 1,
      moonlightPolicy: getMoonlightPolicy("enhanced"),
    } as const;
    const raster = solidWhiteEmissiveRaster(8);
    const without = buildSolarShadingIlluminationRenderPlan({
      ...baseOpts,
      emissiveNightLightsMode: "off",
      emissiveRaster: null,
    });
    const withEm = buildSolarShadingIlluminationRenderPlan({
      ...baseOpts,
      emissiveNightLightsMode: "illustrative",
      emissiveRaster: raster,
    });
    expect(maxRgbChannelSum(withEm)).toBeGreaterThan(maxRgbChannelSum(without));
  });

  it("treats null emissive raster as zero contribution versus explicit off (same peak RGB sum)", () => {
    const baseOpts = {
      viewportWidthPx: 80,
      viewportHeightPx: 56,
      subsolarLatDeg: -8,
      subsolarLonDeg: 15,
      sublunarLatDeg: 2,
      sublunarLonDeg: -120,
      lunarIlluminatedFraction: 0.4,
      layerOpacity: 1,
      moonlightPolicy: getMoonlightPolicy("natural"),
    } as const;
    const a = buildSolarShadingIlluminationRenderPlan({
      ...baseOpts,
      emissiveNightLightsMode: "natural",
      emissiveRaster: null,
    });
    const b = buildSolarShadingIlluminationRenderPlan({
      ...baseOpts,
      emissiveNightLightsMode: "off",
      emissiveRaster: solidWhiteEmissiveRaster(4),
    });
    expect(maxRgbChannelSum(a)).toBe(maxRgbChannelSum(b));
  });

  it("natural < enhanced < illustrative for peak RGB with the same gray emissive raster (deep-night pixels)", () => {
    const raster = solidGrayEmissiveRaster(8, 110);
    const mk = (mode: "natural" | "enhanced" | "illustrative") =>
      maxRgbChannelSum(
        buildSolarShadingIlluminationRenderPlan({
          viewportWidthPx: 96,
          viewportHeightPx: 64,
          subsolarLatDeg: 0,
          subsolarLonDeg: 0,
          sublunarLatDeg: 10,
          sublunarLonDeg: 40,
          lunarIlluminatedFraction: 0.55,
          layerOpacity: 1,
          moonlightPolicy: getMoonlightPolicy("natural"),
          emissiveNightLightsMode: mode,
          emissiveRaster: raster,
        }),
      );
    const n = mk("natural");
    const e = mk("enhanced");
    const i = mk("illustrative");
    expect(n).toBeLessThan(e);
    expect(e).toBeLessThan(i);
  });
});
