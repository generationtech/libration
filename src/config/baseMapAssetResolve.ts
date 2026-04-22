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

import { WORLD_EQUIRECTANGULAR_SRC } from "../layers/baseMapLayer";

/**
 * Resolves a persisted base map asset id to a Vite / public URL for the equirectangular raster.
 * All unknown ids map to the current single shipped asset to preserve existing visuals.
 */
export function resolveEquirectBaseMapImageSrc(id: string): string {
  const t = id.trim();
  if (t === "" || t === "equirect-world-legacy-v1") {
    return WORLD_EQUIRECTANGULAR_SRC;
  }
  if (t === "political-v1" || t === "world-equirectangular-v1") {
    return WORLD_EQUIRECTANGULAR_SRC;
  }
  return WORLD_EQUIRECTANGULAR_SRC;
}
