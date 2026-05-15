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
 * Upstream overlay legibility hints derived from the same solar-altitude / night-veil
 * field as planetary illumination (no persisted config in v1).
 */
export interface OverlayReadabilityHints {
  /**
   * 0 = day-clarity reference; 1 = deep-night side of the continuous illumination veil.
   * Aligns with {@link illuminationNightVeil01FromSolarAltitudeDeg}.
   */
  nightVeil01: number;
}

export function isOverlayReadabilityHints(value: unknown): value is OverlayReadabilityHints {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const v = (value as Record<string, unknown>).nightVeil01;
  return typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1;
}
