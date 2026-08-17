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
 * Equirectangular dynamic track overlays (DLC-3).
 * Lon −180…180 left→right, lat +90…−90 top→bottom (matches base map / polylines).
 */

import type { IssOrbitalPresentation } from "../core/issOrbitalPresentation";

export const DYNAMIC_TRACKS_KIND = "dynamicTracksEquirect" as const;

export interface DynamicTrackSampleMarker {
  lonDeg: number;
  latDeg: number;
  timeMs: number;
}

export interface DynamicTrackOverlay {
  id: string;
  /** Ordered trail samples (oldest → newest), unfiltered acquired window. */
  samples: readonly DynamicTrackSampleMarker[];
  /** Past segment including the current sample as the last vertex. */
  pastSamples?: readonly DynamicTrackSampleMarker[];
  /** Future segment including the current sample as the first vertex. */
  futureSamples?: readonly DynamicTrackSampleMarker[];
  /** Optional short label for the tip marker. */
  label?: string;
}

export interface DynamicTracksPayload {
  kind: typeof DYNAMIC_TRACKS_KIND;
  tracks: readonly DynamicTrackOverlay[];
  /**
   * ISS (or other vehicle) position at the product instant.
   * Independent of the first/last track sample.
   */
  currentPosition?: DynamicTrackSampleMarker;
  /** ISS presentation resolved upstream of RenderPlan. */
  presentation?: IssOrbitalPresentation;
  /**
   * Screen-space travel heading (radians from +X / east) for silhouette rotation.
   * Omitted when neighboring samples are not usable.
   */
  travelHeadingRad?: number;
  /**
   * Substrate-aware scale for overlay readability lift (0.35–1).
   * Omitted means 1.
   */
  overlayReadabilityLiftScale01?: number;
  /**
   * Optional derived solar night veil (0–1) at the current position
   * (or first-track fallback), aligned with planetary illumination.
   */
  tipReadabilityNightVeil01?: number;
  /**
   * Active TLE orbital period in milliseconds, when derived.
   * Used only for orbit-distance fading; not a persisted config value.
   */
  orbitalPeriodMs?: number;
}

export function isDynamicTracksPayload(
  data: unknown,
): data is DynamicTracksPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (o.kind !== DYNAMIC_TRACKS_KIND || !Array.isArray(o.tracks)) {
    return false;
  }
  if (o.overlayReadabilityLiftScale01 !== undefined) {
    const ls = o.overlayReadabilityLiftScale01;
    if (typeof ls !== "number" || !Number.isFinite(ls) || ls < 0 || ls > 1) {
      return false;
    }
  }
  if (o.tipReadabilityNightVeil01 !== undefined) {
    const v = o.tipReadabilityNightVeil01;
    if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 1) {
      return false;
    }
  }
  if (o.travelHeadingRad !== undefined) {
    const h = o.travelHeadingRad;
    if (typeof h !== "number" || !Number.isFinite(h)) {
      return false;
    }
  }
  if (o.orbitalPeriodMs !== undefined) {
    const p = o.orbitalPeriodMs;
    if (typeof p !== "number" || !Number.isFinite(p) || p <= 0) {
      return false;
    }
  }
  if (o.currentPosition !== undefined) {
    if (o.currentPosition === null || typeof o.currentPosition !== "object") {
      return false;
    }
    const cur = o.currentPosition as Record<string, unknown>;
    if (
      typeof cur.lonDeg !== "number" ||
      typeof cur.latDeg !== "number" ||
      typeof cur.timeMs !== "number" ||
      !Number.isFinite(cur.lonDeg) ||
      !Number.isFinite(cur.latDeg) ||
      !Number.isFinite(cur.timeMs)
    ) {
      return false;
    }
  }
  for (const t of o.tracks) {
    if (t === null || typeof t !== "object") return false;
    const row = t as Record<string, unknown>;
    if (typeof row.id !== "string" || !Array.isArray(row.samples)) {
      return false;
    }
    if (row.label !== undefined && typeof row.label !== "string") return false;
    if (!samplesAreValid(row.samples)) return false;
    if (row.pastSamples !== undefined && !samplesAreValid(row.pastSamples)) return false;
    if (row.futureSamples !== undefined && !samplesAreValid(row.futureSamples)) return false;
  }
  return true;
}

function samplesAreValid(raw: unknown): boolean {
  if (!Array.isArray(raw)) return false;
  for (const s of raw) {
    if (s === null || typeof s !== "object") return false;
    const sample = s as Record<string, unknown>;
    if (
      typeof sample.lonDeg !== "number" ||
      typeof sample.latDeg !== "number" ||
      typeof sample.timeMs !== "number" ||
      !Number.isFinite(sample.lonDeg) ||
      !Number.isFinite(sample.latDeg) ||
      !Number.isFinite(sample.timeMs)
    ) {
      return false;
    }
  }
  return true;
}
