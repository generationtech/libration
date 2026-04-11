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
 * Longitude clamp for top-band anchor editing — matches renderer
 * `clampLongitudeDeg` behavior ({@link resolveTopBandAnchorLongitudeDeg}) without importing the renderer.
 */
export function clampLongitudeDegForAnchor(lon: number): number {
  if (!Number.isFinite(lon)) {
    return 0;
  }
  return Math.max(-180, Math.min(180, lon));
}
