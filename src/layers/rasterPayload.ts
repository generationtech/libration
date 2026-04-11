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

export const EQUIRECTANGULAR_RASTER_KIND = "equirectangularRaster" as const;

/**
 * Renderer-facing payload for a full-viewport equirectangular raster (static URL).
 * Loaded and drawn by the canvas backend; layers only describe the reference.
 */
export interface EquirectangularRasterPayload {
  kind: typeof EQUIRECTANGULAR_RASTER_KIND;
  src: string;
}

export function isEquirectangularRasterPayload(
  data: unknown,
): data is EquirectangularRasterPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return o.kind === EQUIRECTANGULAR_RASTER_KIND && typeof o.src === "string";
}
