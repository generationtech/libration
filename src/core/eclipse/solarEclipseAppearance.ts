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
 * Solar-eclipse presentation parameters: geography toggles, type filters, and
 * user-facing style. Default paint tokens preserve the verified E1–E5 look.
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
import type { SolarEclipseSubtype } from "./solarEclipseTypes";

export const DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_LINE = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_BAND = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_PARTIAL_REGION = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_CORRIDOR = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_PARTIAL_REGION = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_TYPE_TOTAL = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_TYPE_ANNULAR = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_TYPE_PARTIAL = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_TYPE_HYBRID = true;

export const DEFAULT_SOLAR_FORECAST_CORRIDOR_COLOR = "#48308c";
export const DEFAULT_SOLAR_FORECAST_CORRIDOR_OPACITY = 0.28;
export const DEFAULT_SOLAR_FORECAST_PARTIAL_OPACITY = 0.14;
export const DEFAULT_SOLAR_LIVE_CENTRAL_LINE_COLOR = "#ecdcff";
export const DEFAULT_SOLAR_LIVE_CENTRAL_BAND_COLOR = "#301c5c";
export const DEFAULT_SOLAR_LIVE_CENTRAL_BAND_OPACITY = 0.42;
export const DEFAULT_SOLAR_LIVE_PARTIAL_COLOR = "#5c4aa8";
export const DEFAULT_SOLAR_LIVE_PARTIAL_OPACITY = 0.18;

export const SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS = [0, 1, 3, 7, 14, 30, 90, 365] as const;
export type SolarEclipseForecastHorizonDays = (typeof SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS)[number];
export const DEFAULT_SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS: SolarEclipseForecastHorizonDays = 7;

const HORIZON_SET = new Set<number>(SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS);

export function forecastHorizonMsFromDays(days: SolarEclipseForecastHorizonDays): number {
  return days * 86_400_000;
}

export function normalizeForecastHorizonDays(raw: unknown): SolarEclipseForecastHorizonDays {
  if (typeof raw === "number" && HORIZON_SET.has(raw)) {
    return raw as SolarEclipseForecastHorizonDays;
  }
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) {
    let best: SolarEclipseForecastHorizonDays = DEFAULT_SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS;
    let bestD = Infinity;
    for (const d of SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS) {
      const ad = Math.abs(d - raw);
      if (ad < bestD) {
        bestD = ad;
        best = d;
      }
    }
    return best;
  }
  return DEFAULT_SOLAR_ECLIPSE_FORECAST_HORIZON_DAYS;
}

export type SolarEclipsePresentation = {
  readonly showCentralLine: boolean;
  readonly showCentralBand: boolean;
  readonly showPartialRegion: boolean;
  readonly showForecastCorridor: boolean;
  readonly showForecastPartialRegion: boolean;
  readonly forecastHorizonDays: SolarEclipseForecastHorizonDays;
  readonly showTypeTotal: boolean;
  readonly showTypeAnnular: boolean;
  readonly showTypePartial: boolean;
  readonly showTypeHybrid: boolean;
  readonly forecastCorridorColor: string;
  readonly forecastCorridorThickness: AstronomyPathThicknessId;
  readonly forecastCorridorOpacity: number;
  readonly forecastPartialOpacity: number;
  readonly liveCentralLineColor: string;
  readonly liveCentralLineThickness: AstronomyPathThicknessId;
  readonly liveCentralBandColor: string;
  readonly liveCentralBandOpacity: number;
  readonly livePartialColor: string;
  readonly livePartialOpacity: number;
};

function flag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === true;
}

export function normalizeSolarEclipsePresentation(
  raw: Readonly<Record<string, unknown>> | undefined,
): SolarEclipsePresentation {
  return {
    showCentralLine: flag(raw?.showCentralLine, DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_LINE),
    showCentralBand: flag(raw?.showCentralBand, DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_BAND),
    showPartialRegion: flag(raw?.showPartialRegion, DEFAULT_SOLAR_ECLIPSE_SHOW_PARTIAL_REGION),
    showForecastCorridor: flag(raw?.showForecastCorridor, DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_CORRIDOR),
    showForecastPartialRegion: flag(
      raw?.showForecastPartialRegion,
      DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_PARTIAL_REGION,
    ),
    forecastHorizonDays: normalizeForecastHorizonDays(raw?.forecastHorizonDays),
    showTypeTotal: flag(raw?.showTypeTotal, DEFAULT_SOLAR_ECLIPSE_SHOW_TYPE_TOTAL),
    showTypeAnnular: flag(raw?.showTypeAnnular, DEFAULT_SOLAR_ECLIPSE_SHOW_TYPE_ANNULAR),
    showTypePartial: flag(raw?.showTypePartial, DEFAULT_SOLAR_ECLIPSE_SHOW_TYPE_PARTIAL),
    showTypeHybrid: flag(raw?.showTypeHybrid, DEFAULT_SOLAR_ECLIPSE_SHOW_TYPE_HYBRID),
    forecastCorridorColor: normalizeEclipseColorHex(
      raw?.forecastCorridorColor,
      DEFAULT_SOLAR_FORECAST_CORRIDOR_COLOR,
    ),
    forecastCorridorThickness: normalizeAstronomyPathThicknessId(raw?.forecastCorridorThickness),
    forecastCorridorOpacity: normalizeEclipseFillOpacity(
      raw?.forecastCorridorOpacity,
      DEFAULT_SOLAR_FORECAST_CORRIDOR_OPACITY,
    ),
    forecastPartialOpacity: normalizeEclipseFillOpacity(
      raw?.forecastPartialOpacity,
      DEFAULT_SOLAR_FORECAST_PARTIAL_OPACITY,
    ),
    liveCentralLineColor: normalizeEclipseColorHex(
      raw?.liveCentralLineColor,
      DEFAULT_SOLAR_LIVE_CENTRAL_LINE_COLOR,
    ),
    liveCentralLineThickness: normalizeAstronomyPathThicknessId(raw?.liveCentralLineThickness),
    liveCentralBandColor: normalizeEclipseColorHex(
      raw?.liveCentralBandColor,
      DEFAULT_SOLAR_LIVE_CENTRAL_BAND_COLOR,
    ),
    liveCentralBandOpacity: normalizeEclipseFillOpacity(
      raw?.liveCentralBandOpacity,
      DEFAULT_SOLAR_LIVE_CENTRAL_BAND_OPACITY,
    ),
    livePartialColor: normalizeEclipseColorHex(raw?.livePartialColor, DEFAULT_SOLAR_LIVE_PARTIAL_COLOR),
    livePartialOpacity: normalizeEclipseFillOpacity(
      raw?.livePartialOpacity,
      DEFAULT_SOLAR_LIVE_PARTIAL_OPACITY,
    ),
  };
}

export function solarEclipseTypeVisible(
  subtype: SolarEclipseSubtype,
  presentation: SolarEclipsePresentation,
): boolean {
  if (subtype === "annular") {
    return presentation.showTypeAnnular;
  }
  if (subtype === "partial") {
    return presentation.showTypePartial;
  }
  if (subtype === "hybrid") {
    return presentation.showTypeHybrid;
  }
  return presentation.showTypeTotal;
}

export function forecastHorizonLabel(days: SolarEclipseForecastHorizonDays): string {
  if (days === 0) {
    return "Live only";
  }
  if (days === 1) {
    return "1 day ahead";
  }
  return `${days} days ahead`;
}

/** Partial footprint: cool violet, distinct from solar shading. */
export const SOLAR_ECLIPSE_PARTIAL_FILL = "rgba(92, 74, 168, 0.18)";
/** Totality (umbra) band. */
export const SOLAR_ECLIPSE_UMBRA_FILL = "rgba(48, 28, 92, 0.42)";
/** Annularity (antumbra) band — warm, not totality. */
export const SOLAR_ECLIPSE_ANTUMBRA_FILL = "rgba(176, 96, 36, 0.36)";
export const SOLAR_ECLIPSE_CENTERLINE_STROKE = "rgba(236, 220, 255, 0.92)";
export const SOLAR_ECLIPSE_CENTERLINE_WIDTH_PX = 1.6;

export const SOLAR_ECLIPSE_FORECAST_PARTIAL_FILL = "rgba(92, 74, 168, 0.14)";
export const SOLAR_ECLIPSE_FORECAST_CORRIDOR_UMBRA_FILL = "rgba(72, 48, 140, 0.28)";
export const SOLAR_ECLIPSE_FORECAST_CORRIDOR_ANTUMBRA_FILL = "rgba(176, 96, 36, 0.24)";
export const SOLAR_ECLIPSE_FORECAST_CENTERLINE_STROKE = "rgba(236, 220, 255, 0.62)";
export const SOLAR_ECLIPSE_FORECAST_CENTERLINE_WIDTH_PX = 1.4;
export const SOLAR_ECLIPSE_FORECAST_CORRIDOR_STROKE = "rgba(220, 208, 255, 0.38)";
export const SOLAR_ECLIPSE_FORECAST_CORRIDOR_STROKE_WIDTH_PX = 1.0;
export const SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL = "rgba(72, 48, 140, 0.12)";
export const SOLAR_ECLIPSE_ACTIVE_CORRIDOR_ANTUMBRA_FILL = "rgba(176, 96, 36, 0.10)";

export function scaleRgbaAlpha(css: string, factor: number): string {
  const m = /^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([0-9.]+)\s*\)$/.exec(css);
  if (!m) {
    return css;
  }
  const a = Number(m[4]) * Math.max(0, factor);
  return `rgba(${m[1]}, ${m[2]}, ${m[3]}, ${Math.max(0, Math.min(1, a)).toFixed(4)})`;
}

function usesDefaultForecastPaint(presentation: SolarEclipsePresentation): boolean {
  return (
    colorsEqualHex(presentation.forecastCorridorColor, DEFAULT_SOLAR_FORECAST_CORRIDOR_COLOR) &&
    presentation.forecastCorridorThickness === DEFAULT_ASTRONOMY_PATH_THICKNESS &&
    presentation.forecastCorridorOpacity === DEFAULT_SOLAR_FORECAST_CORRIDOR_OPACITY &&
    presentation.forecastPartialOpacity === DEFAULT_SOLAR_FORECAST_PARTIAL_OPACITY
  );
}

function usesDefaultLivePaint(presentation: SolarEclipsePresentation): boolean {
  return (
    colorsEqualHex(presentation.liveCentralLineColor, DEFAULT_SOLAR_LIVE_CENTRAL_LINE_COLOR) &&
    presentation.liveCentralLineThickness === DEFAULT_ASTRONOMY_PATH_THICKNESS &&
    colorsEqualHex(presentation.liveCentralBandColor, DEFAULT_SOLAR_LIVE_CENTRAL_BAND_COLOR) &&
    presentation.liveCentralBandOpacity === DEFAULT_SOLAR_LIVE_CENTRAL_BAND_OPACITY &&
    colorsEqualHex(presentation.livePartialColor, DEFAULT_SOLAR_LIVE_PARTIAL_COLOR) &&
    presentation.livePartialOpacity === DEFAULT_SOLAR_LIVE_PARTIAL_OPACITY
  );
}

export type SolarEclipsePaint = {
  readonly forecastPartialFill: string;
  readonly forecastCorridorUmbraFill: string;
  readonly forecastCorridorAntumbraFill: string;
  readonly forecastCenterlineStroke: string;
  readonly forecastCenterlineWidthPx: number;
  readonly forecastCorridorStroke: string;
  readonly forecastCorridorStrokeWidthPx: number;
  readonly activeCorridorUmbraFill: string;
  readonly activeCorridorAntumbraFill: string;
  readonly livePartialFill: string;
  readonly liveUmbraFill: string;
  readonly liveAntumbraFill: string;
  readonly liveCenterlineStroke: string;
  readonly liveCenterlineWidthPx: number;
};

export function resolveSolarEclipsePaint(presentation: SolarEclipsePresentation): SolarEclipsePaint {
  const forecastDefault = usesDefaultForecastPaint(presentation);
  const liveDefault = usesDefaultLivePaint(presentation);
  const corridor = presentation.forecastCorridorColor;
  const band = presentation.liveCentralBandColor;
  const line = presentation.liveCentralLineColor;
  const partial = presentation.livePartialColor;
  return {
    forecastPartialFill: forecastDefault
      ? SOLAR_ECLIPSE_FORECAST_PARTIAL_FILL
      : hexToRgba(DEFAULT_SOLAR_LIVE_PARTIAL_COLOR, presentation.forecastPartialOpacity),
    forecastCorridorUmbraFill: forecastDefault
      ? SOLAR_ECLIPSE_FORECAST_CORRIDOR_UMBRA_FILL
      : hexToRgba(corridor, presentation.forecastCorridorOpacity),
    forecastCorridorAntumbraFill: forecastDefault
      ? SOLAR_ECLIPSE_FORECAST_CORRIDOR_ANTUMBRA_FILL
      : hexToRgba(corridor, presentation.forecastCorridorOpacity * 0.86),
    forecastCenterlineStroke: forecastDefault
      ? SOLAR_ECLIPSE_FORECAST_CENTERLINE_STROKE
      : hexToRgba(corridor, 0.62),
    forecastCenterlineWidthPx: forecastDefault
      ? SOLAR_ECLIPSE_FORECAST_CENTERLINE_WIDTH_PX
      : eclipseStrokeWidthPx(
          SOLAR_ECLIPSE_FORECAST_CENTERLINE_WIDTH_PX,
          presentation.forecastCorridorThickness,
        ),
    forecastCorridorStroke: forecastDefault
      ? SOLAR_ECLIPSE_FORECAST_CORRIDOR_STROKE
      : hexToRgba(corridor, 0.38),
    forecastCorridorStrokeWidthPx: forecastDefault
      ? SOLAR_ECLIPSE_FORECAST_CORRIDOR_STROKE_WIDTH_PX
      : eclipseStrokeWidthPx(
          SOLAR_ECLIPSE_FORECAST_CORRIDOR_STROKE_WIDTH_PX,
          presentation.forecastCorridorThickness,
        ),
    activeCorridorUmbraFill: forecastDefault
      ? SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL
      : hexToRgba(corridor, presentation.forecastCorridorOpacity * 0.43),
    activeCorridorAntumbraFill: forecastDefault
      ? SOLAR_ECLIPSE_ACTIVE_CORRIDOR_ANTUMBRA_FILL
      : hexToRgba(corridor, presentation.forecastCorridorOpacity * 0.36),
    livePartialFill: liveDefault
      ? SOLAR_ECLIPSE_PARTIAL_FILL
      : hexToRgba(partial, presentation.livePartialOpacity),
    liveUmbraFill: liveDefault
      ? SOLAR_ECLIPSE_UMBRA_FILL
      : hexToRgba(band, presentation.liveCentralBandOpacity),
    liveAntumbraFill: liveDefault
      ? SOLAR_ECLIPSE_ANTUMBRA_FILL
      : hexToRgba(band, presentation.liveCentralBandOpacity * 0.86),
    liveCenterlineStroke: liveDefault
      ? SOLAR_ECLIPSE_CENTERLINE_STROKE
      : hexToRgba(line, 0.92),
    liveCenterlineWidthPx: liveDefault
      ? SOLAR_ECLIPSE_CENTERLINE_WIDTH_PX
      : eclipseStrokeWidthPx(SOLAR_ECLIPSE_CENTERLINE_WIDTH_PX, presentation.liveCentralLineThickness),
  };
}
