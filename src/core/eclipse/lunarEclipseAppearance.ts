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
 * Lunar-eclipse presentation parameters: type filters, forecast horizon, and
 * Moon Earth-shadow treatment. Moon-visible map geography was removed in
 * LIB-046; ordinary Moon-above-horizon astronomy lives elsewhere.
 */

import type { LunarEclipseSubtype } from "./lunarEclipseTypes";
import {
  DEFAULT_SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS,
  normalizeForecastHorizonDays,
  type SolarEclipseForecastHorizonDays,
} from "./solarEclipseAppearance";

export const DEFAULT_LUNAR_ECLIPSE_SHOW_MOON_SHADOW = true;
export const DEFAULT_LUNAR_ECLIPSE_FORECAST_HORIZON_DAYS: SolarEclipseForecastHorizonDays =
  DEFAULT_SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS;
export type LunarEclipseForecastHorizonDays = SolarEclipseForecastHorizonDays;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_TOTAL = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PARTIAL = true;
export const DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PENUMBRAL = true;

export type LunarEclipsePresentation = {
  readonly showMoonEclipseShadow: boolean;
  readonly forecastHorizonDays: LunarEclipseForecastHorizonDays;
  readonly showTypeTotal: boolean;
  readonly showTypePartial: boolean;
  readonly showTypePenumbral: boolean;
};

function flag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === true;
}

/**
 * Normalize current lunar eclipse presentation.
 * Legacy Moon-visible map keys (`showVisibilityRegion`, `showVisibilityBoundary`,
 * `showForecastVisibility*`, and their paint tokens) are accepted and ignored.
 */
export function normalizeLunarEclipsePresentation(
  raw: Readonly<Record<string, unknown>> | undefined,
): LunarEclipsePresentation {
  return {
    showMoonEclipseShadow: flag(raw?.showMoonEclipseShadow, DEFAULT_LUNAR_ECLIPSE_SHOW_MOON_SHADOW),
    forecastHorizonDays: normalizeForecastHorizonDays(raw?.forecastHorizonDays),
    showTypeTotal: flag(raw?.showTypeTotal, DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_TOTAL),
    showTypePartial: flag(raw?.showTypePartial, DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PARTIAL),
    showTypePenumbral: flag(raw?.showTypePenumbral, DEFAULT_LUNAR_ECLIPSE_SHOW_TYPE_PENUMBRAL),
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
