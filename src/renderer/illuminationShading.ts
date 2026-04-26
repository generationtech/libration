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

import {
  ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG,
  CIVIL_TWILIGHT_HORIZON_OFFSET_DEG,
  NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG,
  solarAltitudeDegFromSurfaceSunDotProduct,
} from "../core/solarTwilight";
import { moonlightStrength } from "../core/lunarIllumination";

/**
 * Solar illumination sampling for the canvas equirectangular pass.
 * Inputs are the geometric dot product (surface normal · subsolar direction) and layer opacity.
 * Tuning lives here; layers only supply subsolar lat/lon. Twilight bands (civil, nautical,
 * astronomical) are expressed via solar altitude from that dot, ahead of the raster blit.
 */

/** Max night-side overlay opacity (straight alpha). */
export const NIGHT_DARKEN = 0.62;

/**
 * Altitude where the day-side shading veil should be fully clear.
 */
export const DAYLIGHT_CLEAR_ALTITUDE_DEG = 4;

/**
 * Altitude where deep-night treatment reaches its settled black/dark state.
 */
export const DEEP_NIGHT_SETTLE_ALTITUDE_DEG = -18;

/** Per-band tint anchors for attenuation color (kept deliberately low-luminance). */
const C_DAY_GLOW = { r: 24, g: 30, b: 40 } as const;
const C_HORIZON = { r: 30, g: 38, b: 50 } as const;
const C_CIVIL_END = { r: 22, g: 30, b: 44 } as const;
const C_NAUT = { r: 14, g: 22, b: 34 } as const;
const C_ASTRO = { r: 8, g: 12, b: 22 } as const;
const C_NIGHT = { r: 0, g: 0, b: 0 } as const;
const C_MOONLIGHT_NIGHT = { r: 72, g: 90, b: 122 } as const;

/**
 * Standard twilight thresholds remain semantic reference anchors for the continuous field.
 */
const TWILIGHT_REFERENCE_ALTITUDES_DEG = {
  dayClear: DAYLIGHT_CLEAR_ALTITUDE_DEG,
  horizon: 0,
  civil: -CIVIL_TWILIGHT_HORIZON_OFFSET_DEG,
  nautical: -NAUTICAL_TWILIGHT_HORIZON_OFFSET_DEG,
  astronomical: -ASTRONOMICAL_TWILIGHT_HORIZON_OFFSET_DEG,
  deepNight: DEEP_NIGHT_SETTLE_ALTITUDE_DEG,
} as const;

/** Maximum tint modulation contribution; this is not additional emitted alpha. */
export const TWILIGHT_ATMOSPHERIC_ALPHA_MAX = 0.16;
const TWILIGHT_COLOR_SIGMA_DEG = 3.5;

/** Near-terminator tint (legacy name; civil band start). */
export const TWILIGHT_R = C_HORIZON.r;
export const TWILIGHT_G = C_HORIZON.g;
export const TWILIGHT_B = C_HORIZON.b;
export const MOONLIGHT_SECONDARY_ALPHA_RELIEF_MAX = 0.32;
export const MOONLIGHT_SECONDARY_COLOR_BLEND_MAX = 0.78;

export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function smootherstep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerpChannel(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: lerpChannel(a.r, b.r, t),
    g: lerpChannel(a.g, b.g, t),
    b: lerpChannel(a.b, b.b, t),
  };
}

function gaussianWeight(value: number, center: number, sigma: number): number {
  const d = (value - center) / sigma;
  return Math.exp(-0.5 * d * d);
}

/**
 * Continuous overlay RGB field (0–255) driven directly by solar altitude.
 * Twilight thresholds are anchor points, not rendered boundaries.
 */
function continuousTwilightOverlayRgb(altitudeDeg: number): { r: number; g: number; b: number } {
  if (altitudeDeg >= TWILIGHT_REFERENCE_ALTITUDES_DEG.dayClear) {
    return C_DAY_GLOW;
  }
  if (altitudeDeg <= TWILIGHT_REFERENCE_ALTITUDES_DEG.deepNight) {
    return C_NIGHT;
  }

  const anchors = [
    { altitudeDeg: TWILIGHT_REFERENCE_ALTITUDES_DEG.dayClear, color: C_DAY_GLOW },
    { altitudeDeg: TWILIGHT_REFERENCE_ALTITUDES_DEG.horizon, color: C_HORIZON },
    { altitudeDeg: TWILIGHT_REFERENCE_ALTITUDES_DEG.civil, color: C_CIVIL_END },
    { altitudeDeg: TWILIGHT_REFERENCE_ALTITUDES_DEG.nautical, color: C_NAUT },
    { altitudeDeg: TWILIGHT_REFERENCE_ALTITUDES_DEG.astronomical, color: C_ASTRO },
    { altitudeDeg: TWILIGHT_REFERENCE_ALTITUDES_DEG.deepNight, color: C_NIGHT },
  ] as const;

  let weightSum = 0;
  let r = 0;
  let g = 0;
  let b = 0;
  for (const anchor of anchors) {
    const w = gaussianWeight(altitudeDeg, anchor.altitudeDeg, TWILIGHT_COLOR_SIGMA_DEG);
    weightSum += w;
    r += anchor.color.r * w;
    g += anchor.color.g * w;
    b += anchor.color.b * w;
  }
  if (weightSum <= 0) {
    return C_NIGHT;
  }
  return { r: r / weightSum, g: g / weightSum, b: b / weightSum };
}

function atmosphericTintStrength(altitudeDeg: number): number {
  if (
    altitudeDeg >= TWILIGHT_REFERENCE_ALTITUDES_DEG.dayClear ||
    altitudeDeg <= TWILIGHT_REFERENCE_ALTITUDES_DEG.deepNight
  ) {
    return 0;
  }

  const horizonEnvelope =
    1 -
    smootherstep(
      0,
      Math.abs(TWILIGHT_REFERENCE_ALTITUDES_DEG.deepNight),
      Math.abs(altitudeDeg),
    );
  const dayFadeIn =
    altitudeDeg > 0
      ? 1 - smootherstep(0, TWILIGHT_REFERENCE_ALTITUDES_DEG.dayClear, altitudeDeg)
      : 1;
  const deepNightFadeIn =
    altitudeDeg < TWILIGHT_REFERENCE_ALTITUDES_DEG.astronomical
      ? 1 -
        smootherstep(
          TWILIGHT_REFERENCE_ALTITUDES_DEG.astronomical,
          TWILIGHT_REFERENCE_ALTITUDES_DEG.deepNight,
          altitudeDeg,
        )
      : 1;
  return TWILIGHT_ATMOSPHERIC_ALPHA_MAX * horizonEnvelope * dayFadeIn * deepNightFadeIn;
}

/**
 * Continuous darkening ramp driven by solar altitude:
 * clear day above +4°, full darken by −18°.
 */
function nightMaskStrength(altitudeDeg: number): number {
  return smootherstep(
    TWILIGHT_REFERENCE_ALTITUDES_DEG.dayClear,
    TWILIGHT_REFERENCE_ALTITUDES_DEG.deepNight,
    altitudeDeg,
  );
}

export interface IlluminationRgba8 {
  r: number;
  g: number;
  b: number;
  /** Straight alpha, 0–255. */
  a: number;
}

export interface MoonlightSamplingInputs {
  lunarDot: number;
  lunarIlluminatedFraction: number;
}

/**
 * RGBA for one shading pixel given subsolar geometry dot product and layer opacity.
 */
export function sampleIlluminationRgba8(
  dot: number,
  layerOpacity: number,
  moonlight?: MoonlightSamplingInputs,
): IlluminationRgba8 {
  const op = layerOpacity;
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;

  const d = Math.max(-1, Math.min(1, dot));
  const altDeg = solarAltitudeDegFromSurfaceSunDotProduct(d);
  const lunarStrengthRaw = moonlight
    ? moonlightStrength({
        lunarIlluminatedFraction: moonlight.lunarIlluminatedFraction,
        solarAltitudeDeg: altDeg,
        surfaceMoonDot: Math.max(0, Math.min(1, moonlight.lunarDot)),
      })
    : 0;
  const nightStrength = nightMaskStrength(altDeg);
  const darknessAlpha = nightStrength * NIGHT_DARKEN * op;
  const tintStrength = atmosphericTintStrength(altDeg);
  const moonSecondaryStrength = lunarStrengthRaw * smoothstep(0.45, 0.95, nightStrength);
  const alphaRelief = darknessAlpha * moonSecondaryStrength * MOONLIGHT_SECONDARY_ALPHA_RELIEF_MAX;
  const combinedAlpha = Math.max(0, darknessAlpha - alphaRelief);

  if (combinedAlpha > 0) {
    const twilightTint = continuousTwilightOverlayRgb(altDeg);
    const attenuationColor = lerpColor(C_NIGHT, twilightTint, tintStrength);
    const moonColorBlend = moonSecondaryStrength * MOONLIGHT_SECONDARY_COLOR_BLEND_MAX;
    const attenuationWithMoonlight = lerpColor(attenuationColor, C_MOONLIGHT_NIGHT, moonColorBlend);
    r = attenuationWithMoonlight.r;
    g = attenuationWithMoonlight.g;
    b = attenuationWithMoonlight.b;
    a = combinedAlpha;
  }

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: Math.round(Math.min(1, Math.max(0, a)) * 255),
  };
}
