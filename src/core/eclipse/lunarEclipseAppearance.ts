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
 * Lunar-eclipse presentation parameters: type filters, forecast horizon,
 * event-static visibility footprint, and Moon Earth-shadow treatment.
 *
 * LIB-046 removed instantaneous Moon-visible fill/horizon. LIB-054 adds a
 * different product: the event-whole visibility footprint (line only).
 */

import type { LunarEclipseSubtype } from "./lunarEclipseTypes";
import {
  DEFAULT_ASTRONOMY_PATH_THICKNESS,
  eclipseStrokeWidthPx,
  hexToRgba,
  normalizeAstronomyPathThicknessId,
  normalizeEclipseColorHex,
  type AstronomyPathThicknessId,
} from "./eclipseStyle";
import {
  DEFAULT_SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS,
  normalizeForecastHorizonDays,
  type SolarEclipseForecastHorizonDays,
} from "./solarEclipseAppearance";

export const DEFAULT_LUNAR_ECLIPSE_SHOW_MOON_SHADOW = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_VISIBILITY_FOOTPRINT = true;
export const DEFAULT_LUNAR_ECLIPSE_FORECAST_HORIZON_DAYS: SolarEclipseForecastHorizonDays =
  DEFAULT_SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS;
export type LunarEclipseForecastHorizonDays = SolarEclipseForecastHorizonDays;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_TOTAL = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PARTIAL = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PENUMBRAL = true;
/** Cool lunar/eclipsed-Moon family; distinct from solar violet and white grid. */
export const DEFAULT_LUNAR_VISIBILITY_FOOTPRINT_COLOR = "#6a9aa8";
export const DEFAULT_LUNAR_VISIBILITY_FOOTPRINT_THICKNESS: AstronomyPathThicknessId =
  DEFAULT_ASTRONOMY_PATH_THICKNESS;
export const LUNAR_ECLIPSE_DRAW_VISIBILITY_FOOTPRINT = 35;
export const LUNAR_VISIBILITY_FOOTPRINT_STROKE_WIDTH_PX = 1.45;

export type LunarEclipsePresentation = {
  readonly showMoonEclipseShadow: boolean;
  readonly showVisibilityFootprint: boolean;
  readonly forecastHorizonDays: LunarEclipseForecastHorizonDays;
  readonly showTypeTotal: boolean;
  readonly showTypePartial: boolean;
  readonly showTypePenumbral: boolean;
  readonly visibilityFootprintColor: string;
  readonly visibilityFootprintThickness: AstronomyPathThicknessId;
};

function flag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === true;
}

/**
 * Normalize current lunar eclipse presentation.
 * Legacy instantaneous Moon-visible keys (`showVisibilityRegion`, `showVisibilityBoundary`,
 * `showForecastVisibility*`, and their paint tokens) are accepted and ignored.
 * Missing `showVisibilityFootprint` defaults ON; explicit false persists.
 */
export function normalizeLunarEclipsePresentation(
  raw: Readonly<Record<string, unknown>> | undefined,
): LunarEclipsePresentation {
  return {
    showMoonEclipseShadow: flag(raw?.showMoonEclipseShadow, DEFAULT_LUNAR_ECLIPSE_SHOW_MOON_SHADOW),
    showVisibilityFootprint: flag(
      raw?.showVisibilityFootprint,
      DEFAULT_LUNAR_ECLIPSE_SHOW_VISIBILITY_FOOTPRINT,
    ),
    forecastHorizonDays: normalizeForecastHorizonDays(raw?.forecastHorizonDays),
    showTypeTotal: flag(raw?.showTypeTotal, DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_TOTAL),
    showTypePartial: flag(raw?.showTypePartial, DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PARTIAL),
    showTypePenumbral: flag(raw?.showTypePenumbral, DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PENUMBRAL),
    visibilityFootprintColor: normalizeEclipseColorHex(
      raw?.visibilityFootprintColor,
      DEFAULT_LUNAR_VISIBILITY_FOOTPRINT_COLOR,
    ),
    visibilityFootprintThickness: normalizeAstronomyPathThicknessId(
      raw?.visibilityFootprintThickness,
    ),
  };
}

export type LunarEclipsePaint = {
  readonly visibilityFootprintStroke: string;
  readonly visibilityFootprintStrokeWidthPx: number;
};

export function resolveLunarEclipsePaint(presentation: LunarEclipsePresentation): LunarEclipsePaint {
  return {
    visibilityFootprintStroke: hexToRgba(presentation.visibilityFootprintColor, 0.78),
    visibilityFootprintStrokeWidthPx: eclipseStrokeWidthPx(
      LUNAR_VISIBILITY_FOOTPRINT_STROKE_WIDTH_PX,
      presentation.visibilityFootprintThickness,
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
