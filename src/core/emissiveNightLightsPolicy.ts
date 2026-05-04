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

/**
 * Upstream emissive night-light composition policy: solar-altitude gating, moonlight coexistence,
 * and mode gains. Raster sampling and RenderPlan stay outside this module (Phase 3+).
 */

import {
  getMoonlightPolicy,
  type MoonlightPresentationMode,
} from "./moonlightPolicy";

export type EmissiveNightLightsPresentationMode =
  | "off"
  | "natural"
  | "enhanced"
  | "illustrative";

export interface EmissiveNightLightsPolicy {
  readonly mode: EmissiveNightLightsPresentationMode;
  /** When false, emissive radiance does not contribute (deterministic zero). */
  readonly contributesEmissive: boolean;
  /** Scales gated linear emissive radiance before final clamp to 0..1. */
  readonly radianceGain: number;
}

const OFF: EmissiveNightLightsPolicy = {
  mode: "off",
  contributesEmissive: false,
  radianceGain: 0,
};

/** Tuned against shipped NASA Black Marble 2016 1° grayscale (dim ocean, bright urban cores). */
const NATURAL: EmissiveNightLightsPolicy = {
  mode: "natural",
  contributesEmissive: true,
  radianceGain: 1.25,
};

const ENHANCED: EmissiveNightLightsPolicy = {
  mode: "enhanced",
  contributesEmissive: true,
  radianceGain: 1.7,
};

const ILLUSTRATIVE: EmissiveNightLightsPolicy = {
  mode: "illustrative",
  contributesEmissive: true,
  radianceGain: 2.35,
};

const POLICIES: Record<EmissiveNightLightsPresentationMode, EmissiveNightLightsPolicy> = {
  off: OFF,
  natural: NATURAL,
  enhanced: ENHANCED,
  illustrative: ILLUSTRATIVE,
};

/**
 * Phase 1 contract: one texel of linear emissive radiance from a projection-valid equirectangular
 * asset (normalized 0..1 upstream of display encoding).
 */
export type EmissiveRadianceTexelSample = number;

export function getEmissiveNightLightsPolicy(
  mode: EmissiveNightLightsPresentationMode,
): EmissiveNightLightsPolicy {
  return POLICIES[mode];
}

export function isEmissiveNightLightsPresentationMode(
  x: unknown,
): x is EmissiveNightLightsPresentationMode {
  return x === "off" || x === "natural" || x === "enhanced" || x === "illustrative";
}

export function clampEmissiveRadianceTexelSample(x: number): EmissiveRadianceTexelSample {
  if (!Number.isFinite(x) || x <= 0) {
    return 0;
  }
  return Math.min(1, x);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) {
    return 0;
  }
  return Math.max(0, Math.min(1, x));
}

/** Scene-normalized user intensity; clamped defensively for composition math. */
const PRESENTATION_INTENSITY_MIN = 0;
const PRESENTATION_INTENSITY_MAX = 4;

function clampPresentationIntensity(n: number | undefined): number {
  if (n === undefined) {
    return 1;
  }
  if (!Number.isFinite(n)) {
    return 1;
  }
  return Math.max(PRESENTATION_INTENSITY_MIN, Math.min(PRESENTATION_INTENSITY_MAX, n));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp01(t);
}

/**
 * Solar altitude in degrees above the horizon (positive = daylight, negative = twilight/night).
 * Maps to a 0..1 visibility gate for emissive radiance: suppressed in daylight, ramping through
 * civil, nautical, and astronomical twilight bands, full by deep night.
 */
export function emissiveSolarVisibilityGate01(solarAltitudeDeg: number): number {
  const a = solarAltitudeDeg;
  if (a >= 0) {
    return 0;
  }
  // Civil: very subtle; nautical: readable ramp; astronomical → deep night: high legibility.
  if (a >= -6) {
    return lerp(0, 0.035, a / -6);
  }
  if (a >= -12) {
    return lerp(0.035, 0.36, (a + 6) / -6);
  }
  if (a >= -18) {
    return lerp(0.36, 0.88, (a + 12) / -6);
  }
  return 1;
}

/**
 * When moonlight is active, natural mode slightly reduces perceived emissive dominance; other modes
 * keep emissive closer to full gated strength (moonlight does not erase emissive).
 */
export function emissiveMoonlightCoexistenceFactor(mode: MoonlightPresentationMode): number {
  const p = getMoonlightPolicy(mode);
  if (!p.contributesMoonlight) {
    return 1;
  }
  switch (mode) {
    case "natural":
      return 0.91;
    case "enhanced":
      return 0.96;
    case "illustrative":
      return 1;
    default:
      return 1;
  }
}

/**
 * Deterministic linear emissive contribution scale in 0..1 for one texel, before any display gamma.
 * Does not sample assets; pass an already-resolved linear radiance sample (see {@link clampEmissiveRadianceTexelSample}).
 */
export function computeEmissiveNightLightsContributionLinear01(input: {
  emissiveSampleLinear01: number;
  solarAltitudeDeg: number;
  moonlightMode: MoonlightPresentationMode;
  emissiveMode: EmissiveNightLightsPresentationMode;
  /**
   * Multiplies policy contribution after mode gain and gates; omitted defaults to 1.
   * Clamped to 0..4; mode `off` still yields zero before intensity is applied.
   */
  presentationIntensity?: number;
}): number {
  const policy = getEmissiveNightLightsPolicy(input.emissiveMode);
  if (!policy.contributesEmissive) {
    return 0;
  }
  const sample = clampEmissiveRadianceTexelSample(input.emissiveSampleLinear01);
  if (sample <= 0) {
    return 0;
  }
  const gate = emissiveSolarVisibilityGate01(input.solarAltitudeDeg);
  if (gate <= 0) {
    return 0;
  }
  const moon = emissiveMoonlightCoexistenceFactor(input.moonlightMode);
  const intensity = clampPresentationIntensity(input.presentationIntensity);
  return clamp01(sample * gate * moon * policy.radianceGain * intensity);
}
