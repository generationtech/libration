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
 * E1 solar-eclipse presentation parameters. Style tokens are implementation defaults,
 * not a user-facing customization surface.
 */

export const DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_LINE = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_CENTRAL_BAND = true;
export const DEFAULT_SOLAR_ECLIPSE_SHOW_PARTIAL_REGION = true;

export type SolarEclipsePresentation = {
  readonly showCentralLine: boolean;
  readonly showCentralBand: boolean;
  readonly showPartialRegion: boolean;
};

export function normalizeSolarEclipsePresentation(
  raw: Readonly<Record<string, unknown>> | undefined,
): SolarEclipsePresentation {
  return {
    showCentralLine: raw?.showCentralLine === undefined ? true : raw.showCentralLine === true,
    showCentralBand: raw?.showCentralBand === undefined ? true : raw.showCentralBand === true,
    showPartialRegion: raw?.showPartialRegion === undefined ? true : raw.showPartialRegion === true,
  };
}

/** Partial footprint: cool violet, distinct from solar shading. */
export const SOLAR_ECLIPSE_PARTIAL_FILL = "rgba(92, 74, 168, 0.18)";
/** Totality (umbra) band. */
export const SOLAR_ECLIPSE_UMBRA_FILL = "rgba(48, 28, 92, 0.42)";
/** Annularity (antumbra) band — warm, not totality. */
export const SOLAR_ECLIPSE_ANTUMBRA_FILL = "rgba(176, 96, 36, 0.36)";
export const SOLAR_ECLIPSE_CENTERLINE_STROKE = "rgba(236, 220, 255, 0.92)";
export const SOLAR_ECLIPSE_CENTERLINE_WIDTH_PX = 1.6;
