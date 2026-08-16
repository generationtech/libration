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
 * Lunar-eclipse presentation parameters. Style tokens are implementation defaults,
 * not a user-facing customization surface.
 */

export const DEFAULT_LUNAR_ECLIPSE_SHOW_MOON_SHADOW = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_VISIBILITY_BOUNDARY = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_VISIBILITY_REGION = true;

export type LunarEclipsePresentation = {
  readonly showMoonEclipseShadow: boolean;
  readonly showVisibilityBoundary: boolean;
  readonly showVisibilityRegion: boolean;
};

function flag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === true;
}

export function normalizeLunarEclipsePresentation(
  raw: Readonly<Record<string, unknown>> | undefined,
): LunarEclipsePresentation {
  return {
    showMoonEclipseShadow: flag(raw?.showMoonEclipseShadow, DEFAULT_LUNAR_ECLIPSE_SHOW_MOON_SHADOW),
    showVisibilityBoundary: flag(
      raw?.showVisibilityBoundary,
      DEFAULT_LUNAR_ECLIPSE_SHOW_VISIBILITY_BOUNDARY,
    ),
    showVisibilityRegion: flag(
      raw?.showVisibilityRegion,
      DEFAULT_LUNAR_ECLIPSE_SHOW_VISIBILITY_REGION,
    ),
  };
}

/** Subtle cool darkening where Earth's penumbra covers the Moon disc. */
export const LUNAR_ECLIPSE_PENUMBRA_FILL = "rgba(28, 36, 64, 0.28)";
/** Stronger umbral overlay; not a totality tint. */
export const LUNAR_ECLIPSE_UMBRA_FILL = "rgba(16, 14, 28, 0.58)";
/** Restrained red/brown cue used only when the Moon is inside the umbra (totality). */
export const LUNAR_ECLIPSE_TOTALITY_FILL = "rgba(110, 36, 24, 0.55)";

/** Thin lunar-colored geometric horizon. Distinct from the solar terminator. */
export const LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_STROKE = "rgba(186, 210, 236, 0.78)";
export const LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_WIDTH_PX = 1.4;
/** Quiet fill on the Moon-up side. Distinct from solar shading and solar eclipse partial. */
export const LUNAR_ECLIPSE_VISIBILITY_REGION_FILL = "rgba(120, 168, 214, 0.14)";
