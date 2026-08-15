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
 * Bounded stroke thickness for astronomical path overlays (Lunar locus, Solar analemma).
 * Multiplies the existing veil-aware base width; color identity is per overlay.
 */

import { parseCssColorToRgba8888 } from "../color/contrastForegroundOnCssBackground";

export const ASTRONOMY_PATH_THICKNESS_IDS = ["thin", "normal", "thick"] as const;
export type AstronomyPathThicknessId = (typeof ASTRONOMY_PATH_THICKNESS_IDS)[number];
export const DEFAULT_ASTRONOMY_PATH_THICKNESS: AstronomyPathThicknessId = "normal";

const THICKNESS_MULT: Record<AstronomyPathThicknessId, number> = {
  thin: 0.7,
  normal: 1,
  thick: 1.45,
};

export function normalizeAstronomyPathThicknessId(raw: unknown): AstronomyPathThicknessId {
  return typeof raw === "string" &&
    (ASTRONOMY_PATH_THICKNESS_IDS as readonly string[]).includes(raw)
    ? (raw as AstronomyPathThicknessId)
    : DEFAULT_ASTRONOMY_PATH_THICKNESS;
}

export function astronomyPathStrokeWidthPx(
  veil01: number,
  thickness: AstronomyPathThicknessId = DEFAULT_ASTRONOMY_PATH_THICKNESS,
): number {
  const base = 1.2 + 0.95 * Math.max(0, Math.min(1, veil01));
  return base * THICKNESS_MULT[normalizeAstronomyPathThicknessId(thickness)];
}

function toHexRrggbb(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function normalizeAstronomyPathColorCss(raw: unknown, fallback: string): string {
  if (typeof raw !== "string") {
    return fallback;
  }
  const parsed = parseCssColorToRgba8888(raw);
  if (!parsed) {
    return fallback;
  }
  return toHexRrggbb(parsed.r, parsed.g, parsed.b);
}

/** Current production Solar analemma stroke RGB (`rgba(255, 200, 120, …)`). */
export const DEFAULT_SOLAR_ANALEMMA_STROKE_RGB = "#ffc878";
