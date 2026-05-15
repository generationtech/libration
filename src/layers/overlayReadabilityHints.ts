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
 * (see {@link ../core/overlayReadabilityFrame} v1.1). Optional `overlayReadabilityLiftScale01` attenuates lift from
 * resolved base-map substrate (see frame). Optional SceneConfig `overlayReadability.presentation`
 * scales the derived frame in the shell before hints are built; optional `scene.overlayReadability.perLayer.grid`
 * and `perLayer.solarAnalemma` apply the same scalars again for those layers only
 * applies the same veil/lift scalars again for the lat/lon grid layer only (see {@link ./latLonGridLayer}).
 */
export interface OverlayReadabilityHints {
  /**
   * 0 = day-clarity reference; 1 = strong night-side overlay lift for stroke / cssFilter scaling.
   * Typically {@link ../core/overlayReadabilityFrame.readabilityVeil01At} / `globalReadabilityVeil01`
   * (subsolar veil plus bounded emissive policy pressure when enabled).
   */
  nightVeil01: number;
  /**
   * Substrate-aware attenuation of overlay lift (0.35–1), from resolved base-map presentation +
   * optional catalog capabilities. Omitted means 1 (legacy v1.1 behavior).
   */
  overlayReadabilityLiftScale01?: number;
}

export function isOverlayReadabilityHints(value: unknown): value is OverlayReadabilityHints {
  if (value === null || typeof value !== "object") {
    return false;
  }
  const o = value as Record<string, unknown>;
  const v = o.nightVeil01;
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
    return false;
  }
  if (o.overlayReadabilityLiftScale01 !== undefined) {
    const ls = o.overlayReadabilityLiftScale01;
    if (typeof ls !== "number" || !Number.isFinite(ls) || ls < 0 || ls > 1) {
      return false;
    }
  }
  return true;
}

/**
 * Night-side veil (0–1) scaled by substrate lift scale for stroke / cssFilter deltas.
 */
export function effectiveOverlayReadabilityLiftVeil01(
  nightVeil01: number | undefined,
  liftScale01: number | undefined,
): number {
  const v =
    typeof nightVeil01 === "number" && Number.isFinite(nightVeil01)
      ? Math.max(0, Math.min(1, nightVeil01))
      : 0;
  const s =
    typeof liftScale01 === "number" && Number.isFinite(liftScale01)
      ? Math.max(0, Math.min(1, liftScale01))
      : 1;
  return v * s;
}
