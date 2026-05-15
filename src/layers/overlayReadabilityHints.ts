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
 * field as planetary illumination, optionally augmented by emissive night-light **policy**
 * (see {@link ../core/overlayReadabilityFrame} v1.1). No persisted readability keys in v1/v1.1.
 */
export interface OverlayReadabilityHints {
  /**
   * 0 = day-clarity reference; 1 = strong night-side overlay lift for stroke / cssFilter scaling.
   * Typically {@link ../core/overlayReadabilityFrame.readabilityVeil01At} / `globalReadabilityVeil01`
   * (subsolar veil plus bounded emissive policy pressure when enabled).
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
