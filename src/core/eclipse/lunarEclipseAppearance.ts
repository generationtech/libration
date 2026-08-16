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
 * Lunar-eclipse presentation parameters: geography toggles, type filters, and
 * user-facing style. Default paint tokens preserve the verified E3 look.
 */

import {
  colorsEqualHex,
  DEFAULT_ASTRONOMY_PATH_THICKNESS,
  eclipseStrokeWidthPx,
  hexToRgba,
  normalizeAstronomyPathThicknessId,
  normalizeEclipseColorHex,
  normalizeEclipseFillOpacity,
  type AstronomyPathThicknessId,
} from "./eclipseStyle";
import type { LunarEclipseSubtype } from "./lunarEclipseTypes";

export const DEFAULT_LUNAR_ECLIPSE_SHOW_MOON_SHADOW = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_VISIBILITY_BOUNDARY = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_VISIBILITY_REGION = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_TOTAL = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PARTIAL = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PENUMBRAL = true;

export const DEFAULT_LUNAR_VISIBILITY_BOUNDARY_COLOR = "#bad2ec";
export const DEFAULT_LUNAR_VISIBILITY_REGION_COLOR = "#78a8d6";
export const DEFAULT_LUNAR_VISIBILITY_REGION_OPACITY = 0.14;

export type LunarEclipsePresentation = {
  readonly showMoonEclipseShadow: boolean;
  readonly showVisibilityBoundary: boolean;
  readonly showVisibilityRegion: boolean;
  readonly showTypeTotal: boolean;
  readonly showTypePartial: boolean;
  readonly showTypePenumbral: boolean;
  readonly visibilityBoundaryColor: string;
  readonly visibilityBoundaryThickness: AstronomyPathThicknessId;
  readonly visibilityRegionColor: string;
  readonly visibilityRegionOpacity: number;
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
    showTypeTotal: flag(raw?.showTypeTotal, DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_TOTAL),
    showTypePartial: flag(raw?.showTypePartial, DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PARTIAL),
    showTypePenumbral: flag(raw?.showTypePenumbral, DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PENUMBRAL),
    visibilityBoundaryColor: normalizeEclipseColorHex(
      raw?.visibilityBoundaryColor,
      DEFAULT_LUNAR_VISIBILITY_BOUNDARY_COLOR,
    ),
    visibilityBoundaryThickness: normalizeAstronomyPathThicknessId(raw?.visibilityBoundaryThickness),
    visibilityRegionColor: normalizeEclipseColorHex(
      raw?.visibilityRegionColor,
      DEFAULT_LUNAR_VISIBILITY_REGION_COLOR,
    ),
    visibilityRegionOpacity: normalizeEclipseFillOpacity(
      raw?.visibilityRegionOpacity,
      DEFAULT_LUNAR_VISIBILITY_REGION_OPACITY,
    ),
  };
}

export function lunarEclipseTypeVisible(
  subtype: LunarEclipseSubtype,
  presentation: LunarEclipsePresentation,
): boolean {
  if (subtype === "partial") {
    return presentation.showTypePartial;
  }
  if (subtype === "penumbral") {
    return presentation.showTypePenumbral;
  }
  return presentation.showTypeTotal;
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

export type LunarEclipsePaint = {
  readonly visibilityBoundaryStroke: string;
  readonly visibilityBoundaryWidthPx: number;
  readonly visibilityRegionFill: string;
};

export function resolveLunarEclipsePaint(presentation: LunarEclipsePresentation): LunarEclipsePaint {
  const defaults =
    colorsEqualHex(presentation.visibilityBoundaryColor, DEFAULT_LUNAR_VISIBILITY_BOUNDARY_COLOR) &&
    presentation.visibilityBoundaryThickness === DEFAULT_ASTRONOMY_PATH_THICKNESS &&
    colorsEqualHex(presentation.visibilityRegionColor, DEFAULT_LUNAR_VISIBILITY_REGION_COLOR) &&
    presentation.visibilityRegionOpacity === DEFAULT_LUNAR_VISIBILITY_REGION_OPACITY;
  if (defaults) {
    return {
      visibilityBoundaryStroke: LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_STROKE,
      visibilityBoundaryWidthPx: LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_WIDTH_PX,
      visibilityRegionFill: LUNAR_ECLIPSE_VISIBILITY_REGION_FILL,
    };
  }
  return {
    visibilityBoundaryStroke: hexToRgba(presentation.visibilityBoundaryColor, 0.78),
    visibilityBoundaryWidthPx: eclipseStrokeWidthPx(
      LUNAR_ECLIPSE_VISIBILITY_BOUNDARY_WIDTH_PX,
      presentation.visibilityBoundaryThickness,
    ),
    visibilityRegionFill: hexToRgba(
      presentation.visibilityRegionColor,
      presentation.visibilityRegionOpacity,
    ),
  };
}
