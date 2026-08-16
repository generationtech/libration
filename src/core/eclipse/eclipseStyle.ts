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
 * Shared eclipse presentation style helpers. User colors are hex RGB;
 * layered fills keep the verified E1–E5 alpha structure at defaults.
 */

import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground";
import {
  DEFAULT_ASTRONOMY_PATH_THICKNESS,
  normalizeAstronomyPathColorCss,
  normalizeAstronomyPathThicknessId,
  type AstronomyPathThicknessId,
} from "../astronomyOverlayStrokeAppearance";

export const ECLIPSE_FILL_OPACITY_MIN = 0.04;
export const ECLIPSE_FILL_OPACITY_MAX = 0.55;

const THICKNESS_MULT: Record<AstronomyPathThicknessId, number> = {
  thin: 0.7,
  normal: 1,
  thick: 1.45,
};

export function normalizeEclipseFillOpacity(raw: unknown, fallback: number): number {
  const base = Number.isFinite(fallback)
    ? Math.max(ECLIPSE_FILL_OPACITY_MIN, Math.min(ECLIPSE_FILL_OPACITY_MAX, fallback))
    : 0.18;
  if (typeof raw !== "number" || !Number.isFinite(raw)) {
    return base;
  }
  return Math.max(ECLIPSE_FILL_OPACITY_MIN, Math.min(ECLIPSE_FILL_OPACITY_MAX, raw));
}

export function eclipseStrokeWidthPx(
  basePx: number,
  thickness: AstronomyPathThicknessId = DEFAULT_ASTRONOMY_PATH_THICKNESS,
): number {
  return basePx * THICKNESS_MULT[normalizeAstronomyPathThicknessId(thickness)];
}

export function hexToRgba(hex: string, alpha: number): string {
  const parsed = parseCssColorToRgba8888(hex);
  if (!parsed) {
    return `rgba(0, 0, 0, ${Math.max(0, Math.min(1, alpha)).toFixed(4)})`;
  }
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${parsed.r}, ${parsed.g}, ${parsed.b}, ${a.toFixed(4)})`;
}

export function normalizeEclipseColorHex(raw: unknown, fallback: string): string {
  return normalizeAstronomyPathColorCss(raw, fallback);
}

export function colorsEqualHex(a: string, b: string): boolean {
  return normalizeAstronomyPathColorCss(a, "#000000") === normalizeAstronomyPathColorCss(b, "#000000");
}

export { normalizeAstronomyPathThicknessId, DEFAULT_ASTRONOMY_PATH_THICKNESS };
export type { AstronomyPathThicknessId };
