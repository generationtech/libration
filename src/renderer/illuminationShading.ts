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
import {
  computeEmissiveNightLightsContributionLinear01,
  type EmissiveNightLightsPresentationMode,
} from "../core/emissiveNightLightsPolicy";
import { computeCloudSolarAttenuation01 } from "../core/cloudParticipationPolicy";
import type { CloudParticipationPresentationMode } from "../core/cloudParticipationPolicy";
import { getMoonlightPolicy, type MoonlightPolicy } from "../core/moonlightPolicy";
import {
  illuminationNightVeil01FromSolarAltitudeDeg,
  ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG,
  ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG,
} from "../core/nightVeilFromSolarAltitude";

/**
 * Solar illumination sampling for the canvas equirectangular pass.
 * Inputs are the geometric dot product (surface normal · subsolar direction) and layer opacity.
 * Tuning lives here; layers only supply subsolar lat/lon. Twilight bands (civil, nautical,
 * astronomical) are expressed via solar altitude from that dot, ahead of the raster blit.
 */

/** Max night-side overlay opacity (straight alpha). */
export const NIGHT_DARKEN = 0.62;

/** Altitude where the day-side shading veil should be fully clear (shared with `nightVeilFromSolarAltitude`). */
export const DAYLIGHT_CLEAR_ALTITUDE_DEG = ILLUMINATION_DAYLIGHT_CLEAR_ALTITUDE_DEG;

/** Altitude where deep-night treatment reaches its settled black/dark state. */
export const DEEP_NIGHT_SETTLE_ALTITUDE_DEG = ILLUMINATION_DEEP_NIGHT_SETTLE_ALTITUDE_DEG;

export { illuminationNightVeil01FromSolarAltitudeDeg };

/**
 * Per-band tint anchors for attenuation color (kept deliberately low-luminance).
 * Tuned for smoother Gaussian blending between bands and a slightly cooler terminator read.
 */
const C_DAY_GLOW = { r: 22, g: 28, b: 42 } as const;
/** Terminator anchor; slightly cooler / deeper blue for a calmer horizon read. */
const C_HORIZON = { r: 27, g: 35, b: 53 } as const;
const C_CIVIL_END = { r: 19, g: 27, b: 47 } as const;
const C_NAUT = { r: 12, g: 20, b: 36 } as const;
const C_ASTRO = { r: 6, g: 10, b: 24 } as const;
const C_NIGHT = { r: 0, g: 0, b: 0 } as const;

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
export const TWILIGHT_ATMOSPHERIC_ALPHA_MAX = 0.172;
/**
 * Wider sigma smooths band coupling (anchors remain semantic, not hard edges).
 * Third narrow pass (Slice 2 queue **C**): slightly wider coupling after chromatic scientific
 * substrates shipped—reduces residual civil/nautical banding without new SceneConfig surface.
 */
const TWILIGHT_COLOR_SIGMA_DEG = 4.5;
/**
 * Upper edge for the day-side tint envelope (only applies where `altitudeDeg < dayClear`).
 * Using a value slightly above {@link TWILIGHT_REFERENCE_ALTITUDES_DEG.dayClear} makes the
 * fade gentler as altitude approaches +4° from below without changing the shared daylight-clear cutoff.
 * Third pass extends the envelope (+1.28 → +1.38) for a softer approach to the +4° cutoff.
 */
const TWILIGHT_DAY_SIDE_TINT_CLEAR_DEG =
  TWILIGHT_REFERENCE_ALTITUDES_DEG.dayClear + 1.38;

/** Near-terminator tint (legacy name; civil band start). */
export const TWILIGHT_R = C_HORIZON.r;
export const TWILIGHT_G = C_HORIZON.g;
export const TWILIGHT_B = C_HORIZON.b;

/** Illustrative-mode tuning (legacy product baseline); prefer {@link getMoonlightPolicy}. */
const ILLUSTRATIVE_MOONLIGHT = getMoonlightPolicy("illustrative");

/**
 * Straight-alpha transmittance relief on the night darken mask (secondary to cool RGB fill).
 * Matches {@link getMoonlightPolicy} `"illustrative"`.
 */
export const MOONLIGHT_SECONDARY_TRANSMITTANCE_LIFT_MAX =
  ILLUSTRATIVE_MOONLIGHT.secondaryTransmittanceLiftMax;

/**
 * Bounded additive cool moonlight in overlay RGB (0–1 scale on visibility).
 * Matches illustrative policy; gated upstream by phase, night, and incidence.
 */
export const MOONLIGHT_SECONDARY_COOL_INTENSITY = ILLUSTRATIVE_MOONLIGHT.secondaryCoolIntensity;

/** Cool lunar tint direction (illustrative policy). */
export const MOONLIGHT_COOL_TINT_R = ILLUSTRATIVE_MOONLIGHT.coolTintR;
export const MOONLIGHT_COOL_TINT_G = ILLUSTRATIVE_MOONLIGHT.coolTintG;
export const MOONLIGHT_COOL_TINT_B = ILLUSTRATIVE_MOONLIGHT.coolTintB;

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
      ? 1 - smootherstep(0, TWILIGHT_DAY_SIDE_TINT_CLEAR_DEG, altitudeDeg)
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
  /** 0–1 scalar on ordinary moonlight; omitted means 1. Does not change phase. */
  moonlightTransmission01?: number;
}

/** Per-texel emissive composition input resolved upstream of {@link sampleIlluminationRgba8}. */
export interface EmissiveIlluminationInputs {
  /** Linear 0..1 radiance sample (e.g. from {@link sampleEquirectEmissiveRadianceLinear01}). */
  radianceLinear01: number;
  emissiveMode: EmissiveNightLightsPresentationMode;
  /** Scene `presentation.intensity`; defaults to 1 when omitted. */
  presentationIntensity?: number;
}

/** Per-texel Model A cloud participation input resolved upstream of {@link sampleIlluminationRgba8}. */
export interface CloudIlluminationInputs {
  /** Prepared cloud opacity 0..1 at this lon/lat. */
  opacity01: number;
  cloudMode: CloudParticipationPresentationMode;
  /** Scene `presentation.intensity`; defaults to 1 when omitted. */
  presentationIntensity?: number;
}

/**
 * Max additive RGB boost per channel at contribution 1 (bounded city-glow read).
 * Tuned for NASA Black Marble 2016 1° grayscale onboarded asset (low global mean, high urban tail).
 */
const EMISSIVE_ADDITIVE_SCALE = 150;
const EMISSIVE_WARM_G = 0.9;
const EMISSIVE_WARM_B = 0.62;

/** Max day-side soft cloud veil alpha contribution (straight alpha, before layer opacity). */
const CLOUD_DAY_VEIL_ALPHA_MAX = 0.28;
/** Extra night-side darken boost from thick clouds (multiplies into darkness alpha). */
const CLOUD_NIGHT_DARKEN_BOOST_MAX = 0.22;
/** Soft cool-gray cloud veil RGB (non-emissive attenuation tint). */
const CLOUD_VEIL_RGB = { r: 48, g: 54, b: 68 } as const;

/**
 * Compose eclipse daylight transmission into an ordinary illumination overlay.
 *
 * `ordinaryOverlayAlpha01` is night-overlay opacity (straight alpha), not a
 * daylight fraction. `nightVeil01` is {@link illuminationNightVeil01FromSolarAltitudeDeg}
 * (0 = full day, 1 = deep night). Eclipse transmission multiplies remaining
 * daylight (`1 − nightVeil`) only; night-side map visibility is unchanged.
 */
export function overlayAlphaWithEclipseDaylightTransmission(
  ordinaryOverlayAlpha01: number,
  nightVeil01: number,
  daylightTransmission01: number,
): number {
  const dayClear01 = 1 - Math.max(0, Math.min(1, nightVeil01));
  const t = Math.max(0, Math.min(1, daylightTransmission01));
  const eclipseDaylightFactor = 1 - dayClear01 * (1 - t);
  return 1 - (1 - ordinaryOverlayAlpha01) * eclipseDaylightFactor;
}

/**
 * RGBA for one shading pixel given subsolar geometry dot product and layer opacity.
 * `daylightTransmission01` multiplies remaining daylight (1 = unchanged). It is a
 * visual illumination scalar, not a named astronomy concept. It does not further
 * darken ordinary night: composition uses {@link overlayAlphaWithEclipseDaylightTransmission}.
 */
export function sampleIlluminationRgba8(
  dot: number,
  layerOpacity: number,
  moonlight?: MoonlightSamplingInputs,
  moonlightPolicy: MoonlightPolicy = ILLUSTRATIVE_MOONLIGHT,
  emissive?: EmissiveIlluminationInputs,
  cloud?: CloudIlluminationInputs,
  daylightTransmission01?: number,
): IlluminationRgba8 {
  const op = layerOpacity;
  let r = 0;
  let g = 0;
  let b = 0;
  let a = 0;

  const d = Math.max(-1, Math.min(1, dot));
  const altDeg = solarAltitudeDegFromSurfaceSunDotProduct(d);
  const transmission =
    moonlight && Number.isFinite(moonlight.moonlightTransmission01)
      ? Math.max(0, Math.min(1, moonlight.moonlightTransmission01 as number))
      : 1;
  const lunarStrengthRaw =
    moonlight && moonlightPolicy.contributesMoonlight
      ? moonlightStrength(
          {
            lunarIlluminatedFraction: moonlight.lunarIlluminatedFraction,
            solarAltitudeDeg: altDeg,
            surfaceMoonDot: Math.max(0, Math.min(1, moonlight.lunarDot)),
          },
          moonlightPolicy,
        ) * transmission
      : 0;
  const nightStrength = illuminationNightVeil01FromSolarAltitudeDeg(altDeg);
  const cloudAttenuation =
    cloud && cloud.cloudMode !== "off"
      ? computeCloudSolarAttenuation01({
          opacity01: cloud.opacity01,
          mode: cloud.cloudMode,
          presentationIntensity: cloud.presentationIntensity,
        })
      : 0;
  const cloudNightBoost = cloudAttenuation * nightStrength * CLOUD_NIGHT_DARKEN_BOOST_MAX;
  const darknessAlpha = nightStrength * NIGHT_DARKEN * op + cloudNightBoost * op;
  const tintStrength = atmosphericTintStrength(altDeg);
  const moonlightVisibility = lunarStrengthRaw * smoothstep(0.45, 0.95, nightStrength);
  const moonlightContribution = moonlightVisibility * moonlightPolicy.secondaryCoolIntensity;
  const baselineTransmittance = 1 - Math.min(1, darknessAlpha);
  const moonlightTransmittanceLift =
    Math.min(1, darknessAlpha) *
    moonlightVisibility *
    moonlightPolicy.secondaryTransmittanceLiftMax;
  let combinedAlpha = Math.max(
    0,
    1 - Math.min(1, baselineTransmittance + moonlightTransmittanceLift),
  );
  // Day-side soft cloud veil (Model A): reduce solar transmittance under thick clouds.
  const dayClear01 = 1 - nightStrength;
  const cloudDayVeil =
    cloudAttenuation * dayClear01 * CLOUD_DAY_VEIL_ALPHA_MAX * op;
  combinedAlpha = Math.min(1, combinedAlpha + cloudDayVeil);

  const daylightT =
    daylightTransmission01 !== undefined && Number.isFinite(daylightTransmission01)
      ? Math.max(0, Math.min(1, daylightTransmission01))
      : 1;
  combinedAlpha = overlayAlphaWithEclipseDaylightTransmission(
    combinedAlpha,
    nightStrength,
    daylightT,
  );

  if (combinedAlpha > 0) {
    const twilightTint = continuousTwilightOverlayRgb(altDeg);
    const attenuationColor = lerpColor(C_NIGHT, twilightTint, tintStrength);
    const moonCoolScale = Math.max(0, Math.min(1, moonlightContribution));
    r = Math.min(255, attenuationColor.r + moonlightPolicy.coolTintR * moonCoolScale);
    g = Math.min(255, attenuationColor.g + moonlightPolicy.coolTintG * moonCoolScale);
    b = Math.min(255, attenuationColor.b + moonlightPolicy.coolTintB * moonCoolScale);
    if (cloudDayVeil > 0.001) {
      const cloudMix = Math.min(1, cloudDayVeil / Math.max(combinedAlpha, 1e-6));
      r = Math.round(r + (CLOUD_VEIL_RGB.r - r) * cloudMix);
      g = Math.round(g + (CLOUD_VEIL_RGB.g - g) * cloudMix);
      b = Math.round(b + (CLOUD_VEIL_RGB.b - b) * cloudMix);
    }
    a = combinedAlpha;

    if (emissive && emissive.emissiveMode !== "off") {
      const emissiveContrib = computeEmissiveNightLightsContributionLinear01({
        emissiveSampleLinear01: emissive.radianceLinear01,
        solarAltitudeDeg: altDeg,
        moonlightMode: moonlightPolicy.mode,
        emissiveMode: emissive.emissiveMode,
        presentationIntensity: emissive.presentationIntensity,
      });
      if (emissiveContrib > 0) {
        const s = EMISSIVE_ADDITIVE_SCALE * emissiveContrib;
        r = Math.min(255, r + s);
        g = Math.min(255, g + s * EMISSIVE_WARM_G);
        b = Math.min(255, b + s * EMISSIVE_WARM_B);
      }
    }
  }

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    a: Math.round(Math.min(1, Math.max(0, a)) * 255),
  };
}
