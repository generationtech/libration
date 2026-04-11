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

export const SOLAR_SHADING_KIND = "solarShading" as const;

/**
 * Renderer-facing day/night mask parameters for an equirectangular map.
 * Computed in the layer using {@link subsolarPoint}; the illumination pass samples this into a render-plan raster patch upstream of canvas execution.
 */
export interface SolarShadingPayload {
  kind: typeof SOLAR_SHADING_KIND;
  subsolarLatDeg: number;
  subsolarLonDeg: number;
}

export function isSolarShadingPayload(data: unknown): data is SolarShadingPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    o.kind === SOLAR_SHADING_KIND &&
    typeof o.subsolarLatDeg === "number" &&
    typeof o.subsolarLonDeg === "number"
  );
}
