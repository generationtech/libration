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

import type { BaseMapPresentationConfig } from "../config/baseMapPresentation";

/**
 * Renderer-facing payload for a full-viewport equirectangular raster (static URL).
 * Loaded and drawn by the canvas backend; layers only describe the reference.
 */
export interface EquirectangularRasterPayload {
  kind: typeof EQUIRECTANGULAR_RASTER_KIND;
  src: string;
  /**
   * Normalized per-family display tuning (same for all month rasters in a month-aware family).
   * The canvas backend maps B/C/S to a CSS `filter` and applies γ in a pixel pass when γ ≠ 1;
   * it does not affect asset resolution.
   */
  presentation?: BaseMapPresentationConfig;
  /**
   * When true, the canvas backend reports a failed decode/network for `src` so the app can
   * exclude that URL from base map resolution (see `baseMapEquirectImageExclusions`).
   */
  emitLoadFailure?: true;
}

export function isEquirectangularRasterPayload(
  data: unknown,
): data is EquirectangularRasterPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return o.kind === EQUIRECTANGULAR_RASTER_KIND && typeof o.src === "string";
}
