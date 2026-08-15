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
 * Durable Moon-glyph size and libration-indicator presentation.
 * Visual displacement is display scaling of real optical libration, not a new ephemeris.
 */

import {
  blackOrWhiteForegroundForBackgroundCss,
  parseCssColorToRgba8888,
} from "../color/contrastForegroundOnCssBackground";

export const SUBLUNAR_MARKER_SIZE_IDS = ["small", "normal", "large", "extraLarge"] as const;
export type SublunarMarkerSizeId = (typeof SUBLUNAR_MARKER_SIZE_IDS)[number];
export const DEFAULT_SUBLUNAR_MARKER_SIZE: SublunarMarkerSizeId = "normal";

const SIZE_SCALE: Record<SublunarMarkerSizeId, number> = {
  small: 0.72,
  normal: 1,
  large: 1.42,
  extraLarge: 1.85,
};

export const LIBRATION_STYLE_IDS = ["ring", "crosshair"] as const;
export type LibrationIndicatorStyleId = (typeof LIBRATION_STYLE_IDS)[number];
export const DEFAULT_LIBRATION_STYLE: LibrationIndicatorStyleId = "ring";

export const LIBRATION_THICKNESS_IDS = ["thin", "normal", "thick"] as const;
export type LibrationThicknessId = (typeof LIBRATION_THICKNESS_IDS)[number];
export const DEFAULT_LIBRATION_THICKNESS: LibrationThicknessId = "normal";

export const LIBRATION_MOTION_SCALE_IDS = ["subtle", "normal", "enhanced"] as const;
export type LibrationMotionScaleId = (typeof LIBRATION_MOTION_SCALE_IDS)[number];
export const DEFAULT_LIBRATION_MOTION_SCALE: LibrationMotionScaleId = "normal";

/** Cool muted instrument tone: readable on both phase halves without a bright-red HUD look. */
export const DEFAULT_LIBRATION_INDICATOR_COLOR = "#c5d4e8";

export const DEFAULT_LIBRATION_ENABLED = true;

export const LIBRATION_ORIENTATION_IDS = ["map", "observer"] as const;
export type LibrationOrientationId = (typeof LIBRATION_ORIENTATION_IDS)[number];
export const DEFAULT_LIBRATION_ORIENTATION: LibrationOrientationId = "observer";

export const DEFAULT_LIBRATION_USE_REFERENCE_CITY = true;

/** Restrained neutrals for the automatic under-stroke (not a user setting). */
export const LIBRATION_UNDERSTROKE_DARK_RGB = "18, 26, 40";
export const LIBRATION_UNDERSTROKE_LIGHT_RGB = "236, 240, 246";

/** Typical optical-libration extrema used only to map degrees into glyph space. */
export const LIBRATION_LONGITUDE_DISPLAY_EXTREMA_DEG = 8;
export const LIBRATION_LATITUDE_DISPLAY_EXTREMA_DEG = 6.9;

const MOTION_SCALE: Record<LibrationMotionScaleId, number> = {
  subtle: 0.62,
  normal: 1,
  enhanced: 1.38,
};

const THICKNESS_SCALE: Record<LibrationThicknessId, number> = {
  thin: 0.72,
  normal: 1,
  thick: 1.38,
};

function isOneOf<T extends string>(raw: unknown, ids: readonly T[]): raw is T {
  return typeof raw === "string" && (ids as readonly string[]).includes(raw);
}

export function normalizeSublunarMarkerSizeId(raw: unknown): SublunarMarkerSizeId {
  return isOneOf(raw, SUBLUNAR_MARKER_SIZE_IDS) ? raw : DEFAULT_SUBLUNAR_MARKER_SIZE;
}

export function normalizeLibrationIndicatorStyleId(raw: unknown): LibrationIndicatorStyleId {
  return isOneOf(raw, LIBRATION_STYLE_IDS) ? raw : DEFAULT_LIBRATION_STYLE;
}

export function normalizeLibrationThicknessId(raw: unknown): LibrationThicknessId {
  return isOneOf(raw, LIBRATION_THICKNESS_IDS) ? raw : DEFAULT_LIBRATION_THICKNESS;
}

export function normalizeLibrationMotionScaleId(raw: unknown): LibrationMotionScaleId {
  return isOneOf(raw, LIBRATION_MOTION_SCALE_IDS) ? raw : DEFAULT_LIBRATION_MOTION_SCALE;
}

export function normalizeLibrationEnabled(raw: unknown): boolean {
  return typeof raw === "boolean" ? raw : DEFAULT_LIBRATION_ENABLED;
}

export function normalizeLibrationOrientationId(raw: unknown): LibrationOrientationId {
  return isOneOf(raw, LIBRATION_ORIENTATION_IDS) ? raw : DEFAULT_LIBRATION_ORIENTATION;
}

export function normalizeLibrationUseReferenceCity(raw: unknown): boolean {
  return typeof raw === "boolean" ? raw : DEFAULT_LIBRATION_USE_REFERENCE_CITY;
}

/** Light foreground → dark under-stroke; dark foreground → light under-stroke. */
export function librationUnderStrokeKind(foregroundCss: string): "dark" | "light" {
  return blackOrWhiteForegroundForBackgroundCss(foregroundCss) === "#000000" ? "dark" : "light";
}

export function librationUnderStrokeWidthPx(foregroundWidthPx: number): number {
  const fg = Math.max(0, foregroundWidthPx);
  const extra = Math.min(1.25, Math.max(0.55, fg * 0.55));
  return fg + extra;
}

function toHexRrggbb(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function normalizeLibrationIndicatorColorCss(raw: unknown): string {
  if (typeof raw !== "string") {
    return DEFAULT_LIBRATION_INDICATOR_COLOR;
  }
  const parsed = parseCssColorToRgba8888(raw);
  if (!parsed) {
    return DEFAULT_LIBRATION_INDICATOR_COLOR;
  }
  return toHexRrggbb(parsed.r, parsed.g, parsed.b);
}

/**
 * Same default disc radius as the historical Moon glyph, then scaled by size.
 * Viewport width 1888 → 7.5 px at {@link DEFAULT_SUBLUNAR_MARKER_SIZE}.
 */
export function sublunarMarkerRadiusPx(
  viewportWidthPx: number,
  size: SublunarMarkerSizeId = DEFAULT_SUBLUNAR_MARKER_SIZE,
): number {
  const base = Math.min(7.5, Math.max(3.8, viewportWidthPx * 0.0046));
  return base * SIZE_SCALE[normalizeSublunarMarkerSizeId(size)];
}

export function librationRingRadiusPx(moonRadiusPx: number): number {
  return moonRadiusPx * 0.28;
}

export function librationCrosshairArmPx(moonRadiusPx: number): number {
  return moonRadiusPx * 0.34;
}

export function librationStrokeWidthPx(
  moonRadiusPx: number,
  thickness: LibrationThicknessId = DEFAULT_LIBRATION_THICKNESS,
): number {
  const t = THICKNESS_SCALE[normalizeLibrationThicknessId(thickness)];
  return Math.max(0.7, moonRadiusPx * 0.1) * t;
}

export type LibrationDisplayOffsetPx = {
  readonly dxPx: number;
  readonly dyPx: number;
};

/**
 * Map optical libration into glyph-space offset.
 * +longitude → east (right); +latitude → north (up, negative screen y).
 * Clamps the *display* position so the mark stays inside the disc.
 */
export function librationDisplayOffsetPx(options: {
  longitudeDeg: number;
  latitudeDeg: number;
  moonRadiusPx: number;
  motionScale?: LibrationMotionScaleId;
  markRadiusPx: number;
  strokeWidthPx: number;
}): LibrationDisplayOffsetPx {
  const scale = MOTION_SCALE[normalizeLibrationMotionScaleId(options.motionScale)];
  const nx = options.longitudeDeg / LIBRATION_LONGITUDE_DISPLAY_EXTREMA_DEG;
  const ny = options.latitudeDeg / LIBRATION_LATITUDE_DISPLAY_EXTREMA_DEG;
  const inner =
    options.moonRadiusPx - options.markRadiusPx - options.strokeWidthPx * 0.5 - 0.45;
  const maxDisp = Math.max(0, inner) * 0.42 * scale;
  let dx = nx * maxDisp;
  let dy = -ny * maxDisp;
  const mag = Math.hypot(dx, dy);
  if (mag > maxDisp && mag > 0) {
    const k = maxDisp / mag;
    dx *= k;
    dy *= k;
  }
  return { dxPx: dx, dyPx: dy };
}

/**
 * Rotate a map-oriented offset so lunar north moves from map-north toward map-east by `orientationDeg`.
 * χ = 0 is identity (LIB-010 axes). Screen y increases downward.
 */
export function rotateLibrationOffsetPx(
  offset: LibrationDisplayOffsetPx,
  orientationDeg: number,
): LibrationDisplayOffsetPx {
  if (!Number.isFinite(orientationDeg) || orientationDeg === 0) {
    return offset;
  }
  const a = (orientationDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  return {
    dxPx: offset.dxPx * c - offset.dyPx * s,
    dyPx: offset.dxPx * s + offset.dyPx * c,
  };
}

export function rotateScreenPoint(
  x: number,
  y: number,
  originX: number,
  originY: number,
  orientationDeg: number,
): { x: number; y: number } {
  if (!Number.isFinite(orientationDeg) || orientationDeg === 0) {
    return { x, y };
  }
  const a = (orientationDeg * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  const dx = x - originX;
  const dy = y - originY;
  return { x: originX + dx * c - dy * s, y: originY + dx * s + dy * c };
}

export type SublunarMarkerAppearance = {
  readonly size: SublunarMarkerSizeId;
  readonly librationEnabled: boolean;
  readonly librationStyle: LibrationIndicatorStyleId;
  readonly librationColor: string;
  readonly librationThickness: LibrationThicknessId;
  readonly librationMotionScale: LibrationMotionScaleId;
  readonly librationOrientation: LibrationOrientationId;
  readonly librationUseReferenceCity: boolean;
};

export const DEFAULT_SUBLUNAR_MARKER_APPEARANCE: SublunarMarkerAppearance = {
  size: DEFAULT_SUBLUNAR_MARKER_SIZE,
  librationEnabled: DEFAULT_LIBRATION_ENABLED,
  librationStyle: DEFAULT_LIBRATION_STYLE,
  librationColor: DEFAULT_LIBRATION_INDICATOR_COLOR,
  librationThickness: DEFAULT_LIBRATION_THICKNESS,
  librationMotionScale: DEFAULT_LIBRATION_MOTION_SCALE,
  librationOrientation: DEFAULT_LIBRATION_ORIENTATION,
  librationUseReferenceCity: DEFAULT_LIBRATION_USE_REFERENCE_CITY,
};

export function normalizeSublunarMarkerAppearance(
  params: Readonly<Record<string, unknown>> | undefined,
): SublunarMarkerAppearance {
  return {
    size: normalizeSublunarMarkerSizeId(params?.size),
    librationEnabled: normalizeLibrationEnabled(params?.librationEnabled),
    librationStyle: normalizeLibrationIndicatorStyleId(params?.librationStyle),
    librationColor: normalizeLibrationIndicatorColorCss(params?.librationColor),
    librationThickness: normalizeLibrationThicknessId(params?.librationThickness),
    librationMotionScale: normalizeLibrationMotionScaleId(params?.librationMotionScale),
    librationOrientation: normalizeLibrationOrientationId(params?.librationOrientation),
    librationUseReferenceCity: normalizeLibrationUseReferenceCity(params?.librationUseReferenceCity),
  };
}
