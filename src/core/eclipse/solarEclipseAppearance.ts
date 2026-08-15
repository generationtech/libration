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
 * Solar-eclipse presentation parameters. Style tokens are implementation defaults,
 * not a user-facing customization surface.
 */

export const DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_LINE = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_BAND = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_PARTIAL_REGION = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_CORRIDOR = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_FORECAST_PARTIAL_REGION = true;

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
  };
}

export function forecastHorizonLabel(days: SolarEclipseForecastHorizonDays): string {
  if (days === 0) {
    return "Off / Live only";
  }
  if (days === 1) {
    return "1 day";
  }
  return `${days} days`;
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
