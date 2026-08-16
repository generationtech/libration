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
 * Eclipse alignment / beam presentation parameters. Intensity remains a
 * discrete product control; optional base colors are transformed into the
 * layered E5 effect.
 */

import { colorsEqualHex, hexToRgba, normalizeEclipseColorHex } from "./eclipseStyle";

export const ECLIPSE_ALIGNMENT_INTENSITY_IDS = ["subtle", "normal", "dramatic"] as const;
export type EclipseAlignmentIntensityId = (typeof ECLIPSE_ALIGNMENT_INTENSITY_IDS)[number];

export const DEFAULT_ECLIPSE_ALIGNMENT_ENABLED = true;
export const DEFAULT_ECLIPSE_ALIGNMENT_SOLAR_ENABLED = true;
export const DEFAULT_ECLIPSE_ALIGNMENT_LUNAR_ENABLED = true;
export const DEFAULT_ECLIPSE_ALIGNMENT_INTENSITY: EclipseAlignmentIntensityId = "normal";
export const DEFAULT_ECLIPSE_ALIGNMENT_SOLAR_COLOR = "#ffd696";
export const DEFAULT_ECLIPSE_ALIGNMENT_LUNAR_COLOR = "#6c88a4";

export type EclipseAlignmentPresentation = {
  readonly enabled: boolean;
  readonly solarEnabled: boolean;
  readonly lunarEnabled: boolean;
  readonly intensity: EclipseAlignmentIntensityId;
  readonly solarColor: string;
  readonly lunarColor: string;
};

function flag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === true;
}

export function normalizeEclipseAlignmentIntensity(raw: unknown): EclipseAlignmentIntensityId {
  if (raw === "subtle" || raw === "normal" || raw === "dramatic") {
    return raw;
  }
  return DEFAULT_ECLIPSE_ALIGNMENT_INTENSITY;
}

export function normalizeEclipseAlignmentPresentation(
  raw: Readonly<Record<string, unknown>> | undefined,
): EclipseAlignmentPresentation {
  return {
    enabled: flag(raw?.enabled, DEFAULT_ECLIPSE_ALIGNMENT_ENABLED),
    solarEnabled: flag(raw?.solarEnabled, DEFAULT_ECLIPSE_ALIGNMENT_SOLAR_ENABLED),
    lunarEnabled: flag(raw?.lunarEnabled, DEFAULT_ECLIPSE_ALIGNMENT_LUNAR_ENABLED),
    intensity: normalizeEclipseAlignmentIntensity(raw?.intensity),
    solarColor: normalizeEclipseColorHex(raw?.solarColor, DEFAULT_ECLIPSE_ALIGNMENT_SOLAR_COLOR),
    lunarColor: normalizeEclipseColorHex(raw?.lunarColor, DEFAULT_ECLIPSE_ALIGNMENT_LUNAR_COLOR),
  };
}

export function eclipseAlignmentIntensityLabel(id: EclipseAlignmentIntensityId): string {
  if (id === "subtle") {
    return "Subtle";
  }
  if (id === "dramatic") {
    return "Dramatic";
  }
  return "Normal";
}

export type EclipseAlignmentIntensityScale = {
  readonly width: number;
  readonly alpha: number;
};

export function eclipseAlignmentIntensityScale(
  intensity: EclipseAlignmentIntensityId,
): EclipseAlignmentIntensityScale {
  if (intensity === "subtle") {
    return { width: 0.68, alpha: 0.55 };
  }
  if (intensity === "dramatic") {
    return { width: 1.32, alpha: 1.22 };
  }
  return { width: 1, alpha: 1 };
}

function scaleRgbaAlpha(css: string, factor: number): string {
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/.exec(css);
  if (!m) {
    return css;
  }
  const a = Number(m[4]) * Math.max(0, factor);
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${Math.max(0, Math.min(1, a)).toFixed(4)})`;
}

/** Warm gold / pale amber. Not neon, not warning yellow. */
export const SOLAR_ALIGNMENT_OUTER_FILL = "rgba(255, 214, 150, 0.070)";
export const SOLAR_ALIGNMENT_MID_FILL = "rgba(255, 228, 176, 0.110)";
export const SOLAR_ALIGNMENT_CORE_FILL = "rgba(255, 244, 220, 0.165)";
export const SOLAR_ALIGNMENT_AXIS_STROKE = "rgba(255, 236, 200, 0.420)";
export const SOLAR_ALIGNMENT_AXIS_WIDTH_PX = 1.35;

/** Cool blue-gray outer, charcoal/violet core. Not lunar-visibility cyan. */
export const LUNAR_ALIGNMENT_OUTER_FILL = "rgba(108, 136, 164, 0.075)";
export const LUNAR_ALIGNMENT_MID_FILL = "rgba(64, 56, 88, 0.120)";
export const LUNAR_ALIGNMENT_CORE_FILL = "rgba(28, 22, 38, 0.175)";
export const LUNAR_ALIGNMENT_TOTALITY_WASH = "rgba(110, 42, 32, 0.070)";
export const LUNAR_ALIGNMENT_AXIS_STROKE = "rgba(22, 18, 30, 0.400)";
export const LUNAR_ALIGNMENT_AXIS_WIDTH_PX = 1.25;

export function scaleAlignmentFill(css: string, strength01: number, alphaScale: number): string {
  return scaleRgbaAlpha(css, Math.max(0, strength01) * alphaScale);
}

export type EclipseAlignmentPalette = {
  readonly solarOuter: string;
  readonly solarMid: string;
  readonly solarCore: string;
  readonly solarAxis: string;
  readonly lunarOuter: string;
  readonly lunarMid: string;
  readonly lunarCore: string;
  readonly lunarTotalityWash: string;
  readonly lunarAxis: string;
};

export function resolveEclipseAlignmentPalette(
  presentation: EclipseAlignmentPresentation,
): EclipseAlignmentPalette {
  const solarDefault = colorsEqualHex(presentation.solarColor, DEFAULT_ECLIPSE_ALIGNMENT_SOLAR_COLOR);
  const lunarDefault = colorsEqualHex(presentation.lunarColor, DEFAULT_ECLIPSE_ALIGNMENT_LUNAR_COLOR);
  return {
    solarOuter: solarDefault ? SOLAR_ALIGNMENT_OUTER_FILL : hexToRgba(presentation.solarColor, 0.07),
    solarMid: solarDefault ? SOLAR_ALIGNMENT_MID_FILL : hexToRgba(presentation.solarColor, 0.11),
    solarCore: solarDefault ? SOLAR_ALIGNMENT_CORE_FILL : hexToRgba(presentation.solarColor, 0.165),
    solarAxis: solarDefault ? SOLAR_ALIGNMENT_AXIS_STROKE : hexToRgba(presentation.solarColor, 0.42),
    lunarOuter: lunarDefault ? LUNAR_ALIGNMENT_OUTER_FILL : hexToRgba(presentation.lunarColor, 0.075),
    lunarMid: lunarDefault ? LUNAR_ALIGNMENT_MID_FILL : hexToRgba(presentation.lunarColor, 0.12),
    lunarCore: lunarDefault ? LUNAR_ALIGNMENT_CORE_FILL : hexToRgba(presentation.lunarColor, 0.175),
    lunarTotalityWash: LUNAR_ALIGNMENT_TOTALITY_WASH,
    lunarAxis: lunarDefault ? LUNAR_ALIGNMENT_AXIS_STROKE : hexToRgba(presentation.lunarColor, 0.4),
  };
}
