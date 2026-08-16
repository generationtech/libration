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
 * Presentation mapping from physical solar-disc obscuration to visual daylight
 * transmission. This is not photometric lux simulation.
 *
 *   visualDarkening = maxDarken × obscuration^γ
 *   visualTransmission = 1 − visualDarkening
 *
 * γ > 1 restrains low obscuration and becomes more dramatic toward totality.
 * Intensity tokens change maxDarken and γ only — no exposed physics controls.
 */

export const SOLAR_ECLIPSE_SHADING_INTENSITY_IDS = ["subtle", "normal", "dramatic"] as const;
export type SolarEclipseShadingIntensityId = (typeof SOLAR_ECLIPSE_SHADING_INTENSITY_IDS)[number];
export const DEFAULT_SOLAR_ECLIPSE_SHADING_ENABLED = true;
export const DEFAULT_SOLAR_ECLIPSE_SHADING_INTENSITY: SolarEclipseShadingIntensityId = "normal";

type TransmissionCurve = {
  readonly maxDarken: number;
  readonly gamma: number;
};

const TRANSMISSION_CURVE: Record<SolarEclipseShadingIntensityId, TransmissionCurve> = {
  subtle: { maxDarken: 0.34, gamma: 1.7 },
  normal: { maxDarken: 0.56, gamma: 1.45 },
  dramatic: { maxDarken: 0.74, gamma: 1.22 },
};

export function normalizeSolarEclipseShadingIntensityId(raw: unknown): SolarEclipseShadingIntensityId {
  return typeof raw === "string" &&
    (SOLAR_ECLIPSE_SHADING_INTENSITY_IDS as readonly string[]).includes(raw)
    ? (raw as SolarEclipseShadingIntensityId)
    : DEFAULT_SOLAR_ECLIPSE_SHADING_INTENSITY;
}

export function solarEclipseShadingIntensityLabel(id: SolarEclipseShadingIntensityId): string {
  return id[0]!.toUpperCase() + id.slice(1);
}

export function solarEclipseVisualTransmission01(
  obscuration01: number,
  intensity: SolarEclipseShadingIntensityId = DEFAULT_SOLAR_ECLIPSE_SHADING_INTENSITY,
): number {
  if (!(obscuration01 > 0) || !Number.isFinite(obscuration01)) {
    return 1;
  }
  const o = Math.max(0, Math.min(1, obscuration01));
  const curve = TRANSMISSION_CURVE[normalizeSolarEclipseShadingIntensityId(intensity)];
  return Math.max(0, Math.min(1, 1 - curve.maxDarken * o ** curve.gamma));
}

export function solarEclipseShadingCurve(
  intensity: SolarEclipseShadingIntensityId = DEFAULT_SOLAR_ECLIPSE_SHADING_INTENSITY,
): TransmissionCurve {
  return TRANSMISSION_CURVE[normalizeSolarEclipseShadingIntensityId(intensity)];
}
