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
 * Equirectangular dynamic point-feature markers (DLC-2).
 * Lon −180…180 left→right, lat +90…−90 top→bottom (matches base map / city pins).
 */

export const DYNAMIC_POINT_FEATURES_KIND = "dynamicPointFeaturesEquirect" as const;

export interface DynamicPointFeatureMarker {
  id: string;
  lonDeg: number;
  latDeg: number;
  /** Optional persistent map label. */
  label?: string;
  /**
   * Compact `M4.6 · place` text for hover (LIB-060). Present on visible
   * earthquake markers even when {@link label} is omitted.
   */
  compactLabel?: string;
  /** Transient hover label; never persisted. Mutually exclusive with {@link label}. */
  hoverLabel?: string;
  /** Optional magnitude for radius scaling (earthquakes). */
  magnitude?: number;
  /** Provider event time (ms); used for hover overlap tie-break. */
  eventTimeMs?: number;
  /**
   * Optional derived solar night veil (0–1) at this point, aligned with planetary illumination.
   */
  readabilityNightVeil01?: number;
}

export interface DynamicPointFeaturesPayload {
  kind: typeof DYNAMIC_POINT_FEATURES_KIND;
  features: readonly DynamicPointFeatureMarker[];
  /**
   * Substrate-aware scale for overlay readability lift (0.35–1).
   * Omitted means 1.
   */
  overlayReadabilityLiftScale01?: number;
}

export function isDynamicPointFeaturesPayload(
  data: unknown,
): data is DynamicPointFeaturesPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (o.kind !== DYNAMIC_POINT_FEATURES_KIND || !Array.isArray(o.features)) {
    return false;
  }
  if (o.overlayReadabilityLiftScale01 !== undefined) {
    const ls = o.overlayReadabilityLiftScale01;
    if (typeof ls !== "number" || !Number.isFinite(ls) || ls < 0 || ls > 1) {
      return false;
    }
  }
  for (const f of o.features) {
    if (f === null || typeof f !== "object") return false;
    const row = f as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      typeof row.lonDeg !== "number" ||
      typeof row.latDeg !== "number" ||
      !Number.isFinite(row.lonDeg) ||
      !Number.isFinite(row.latDeg)
    ) {
      return false;
    }
    if (row.label !== undefined && typeof row.label !== "string") return false;
    if (row.compactLabel !== undefined && typeof row.compactLabel !== "string") {
      return false;
    }
    if (row.hoverLabel !== undefined && typeof row.hoverLabel !== "string") {
      return false;
    }
    if (row.magnitude !== undefined) {
      const m = row.magnitude;
      if (typeof m !== "number" || !Number.isFinite(m)) return false;
    }
    if (row.eventTimeMs !== undefined) {
      const t = row.eventTimeMs;
      if (typeof t !== "number" || !Number.isFinite(t)) return false;
    }
    if (row.readabilityNightVeil01 !== undefined) {
      const v = row.readabilityNightVeil01;
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
        return false;
      }
    }
  }
  return true;
}
