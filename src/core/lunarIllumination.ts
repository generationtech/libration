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
 * Restrained moonlight model for night-side illumination lift.
 * Returns a bounded scalar in [0, 1] that can be safely capped downstream.
 */

export interface MoonlightStrengthInputs {
  lunarIlluminatedFraction: number;
  lunarAltitudeDeg: number;
  solarAltitudeDeg: number;
}

export const MOONLIGHT_ALTITUDE_FULL_STRENGTH_DEG = 30;
export const MOONLIGHT_NIGHT_ELIGIBILITY_START_DEG = -6;
export const MOONLIGHT_NIGHT_ELIGIBILITY_FULL_DEG = -12;

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

/**
 * Converts a moon phase illuminated fraction into a restrained lighting strength.
 * Strongly suppresses crescents/new moon while preserving full-moon contrast.
 */
export function moonPhaseStrengthFromIlluminatedFraction(illuminatedFraction: number): number {
  const k = clamp01(illuminatedFraction);
  const eased = smoothstep(0.12, 1, k);
  return eased * eased;
}

/**
 * Surface observer lunar altitude contribution.
 * 0 below horizon; smooth rise to full by 30° altitude.
 */
export function moonAltitudeStrength(lunarAltitudeDeg: number): number {
  return smoothstep(0, MOONLIGHT_ALTITUDE_FULL_STRENGTH_DEG, lunarAltitudeDeg);
}

/**
 * Prefer deep twilight/night; suppress moonlight in daylight.
 */
export function moonlightNightEligibilityFromSolarAltitude(solarAltitudeDeg: number): number {
  return smoothstep(
    MOONLIGHT_NIGHT_ELIGIBILITY_START_DEG,
    MOONLIGHT_NIGHT_ELIGIBILITY_FULL_DEG,
    solarAltitudeDeg,
  );
}

export function moonlightStrength(inputs: MoonlightStrengthInputs): number {
  const phaseStrength = moonPhaseStrengthFromIlluminatedFraction(inputs.lunarIlluminatedFraction);
  const altitudeStrength = moonAltitudeStrength(inputs.lunarAltitudeDeg);
  const nightEligibility = moonlightNightEligibilityFromSolarAltitude(inputs.solarAltitudeDeg);
  return clamp01(phaseStrength * altitudeStrength * nightEligibility);
}
