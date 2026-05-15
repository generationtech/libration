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

import type { OverlayReadabilityHints } from "./overlayReadabilityHints";
import { isOverlayReadabilityHints } from "./overlayReadabilityHints";

export const EQUIRECT_GRID_KIND = "equirectGrid" as const;

/**
 * Lat/lon grid in equirectangular layout (matches base map): lon −180…180 left→right, lat +90…−90 top→bottom.
 */
export interface EquirectangularGridPayload {
  kind: typeof EQUIRECT_GRID_KIND;
  meridianStepDeg: number;
  parallelStepDeg: number;
  /** When set, grid line weight/contrast track terminator-aware legibility (upstream). */
  readability?: OverlayReadabilityHints;
}

export function isEquirectangularGridPayload(
  data: unknown,
): data is EquirectangularGridPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (
    !(
      o.kind === EQUIRECT_GRID_KIND &&
      typeof o.meridianStepDeg === "number" &&
      typeof o.parallelStepDeg === "number"
    )
  ) {
    return false;
  }
  if (o.readability !== undefined && !isOverlayReadabilityHints(o.readability)) {
    return false;
  }
  return true;
}
