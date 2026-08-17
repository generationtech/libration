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

export const EQUIRECT_REGION_OVERLAY_KIND = "equirectRegionOverlay" as const;

export type EquirectLatLon = { readonly latDeg: number; readonly lonDeg: number };

export type EquirectRegionFill = {
  readonly ring: readonly EquirectLatLon[];
  readonly fill: string;
  /**
   * When the unwrapped ring spans most of the world (polar/hemispheric caps),
   * close through this latitude (±90). Generic; not eclipse-specific.
   */
  readonly polarCloseLatDeg?: number;
  /**
   * Lower values draw earlier. Unset fills default to 0 (before unset strokes).
   * Generic stacking hint; Canvas must not interpret product meaning.
   */
  readonly drawOrder?: number;
};

export type EquirectRegionStroke = {
  readonly points: readonly EquirectLatLon[];
  readonly stroke: string;
  readonly strokeWidthPx: number;
  /** Lower values draw earlier. Unset strokes default to 100 (after unset fills). */
  readonly drawOrder?: number;
};

export type EquirectRegionLabel = {
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly text: string;
  readonly fill?: string;
};

/**
 * Screen-halo discs that labels should avoid. `haloMultiplier` scales the larger
 * of the extra-large Moon disc and the Sun glow at the current viewport.
 */
export type EquirectRegionAvoidDisc = {
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly haloMultiplier: number;
};

/**
 * Geographic polylines used only for solar event-label direction and clearance.
 * Canvas still does not interpret astronomy; the RenderPlan builder projects them.
 */
export type EquirectRegionLabelPathHint = {
  readonly points: readonly EquirectLatLon[];
};

/**
 * Generic disc radius for {@link EquirectRegionPointMarker} at `radiusScale = 1`.
 * Viewport 1919 → 7.2 px.
 */
export function equirectPointMarkerBaseRadiusPx(viewportWidthPx: number): number {
  return Math.min(7.2, Math.max(4.2, viewportWidthPx * 0.0038));
}

/**
 * Screen-space circular locator at a geographic point. Pixel radius is derived
 * in the RenderPlan builder from viewport width × {@link radiusScale}. Canvas
 * must not interpret astronomy.
 */
export type EquirectRegionPointMarker = {
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly radiusScale: number;
  readonly fill: string;
  readonly stroke: string;
  readonly underStroke: string;
  readonly haloFill?: string;
};

/**
 * Seam-aware geographic fills, strokes, and optional labels in lat/lon. Canvas
 * must not interpret astronomy; it only executes the projected primitives.
 */
export type EquirectRegionOverlayPayload = {
  readonly kind: typeof EQUIRECT_REGION_OVERLAY_KIND;
  readonly fills: readonly EquirectRegionFill[];
  readonly strokes: readonly EquirectRegionStroke[];
  readonly labels?: readonly EquirectRegionLabel[];
  readonly labelAvoidDiscs?: readonly EquirectRegionAvoidDisc[];
  readonly labelPathHints?: readonly EquirectRegionLabelPathHint[];
  readonly pointMarkers?: readonly EquirectRegionPointMarker[];
  readonly readability?: OverlayReadabilityHints;
};

function isLatLon(p: unknown): p is EquirectLatLon {
  if (p === null || typeof p !== "object") {
    return false;
  }
  const q = p as Record<string, unknown>;
  return typeof q.latDeg === "number" && typeof q.lonDeg === "number";
}

export function isEquirectRegionOverlayPayload(data: unknown): data is EquirectRegionOverlayPayload {
  if (data === null || typeof data !== "object") {
    return false;
  }
  const o = data as Record<string, unknown>;
  if (o.kind !== EQUIRECT_REGION_OVERLAY_KIND || !Array.isArray(o.fills) || !Array.isArray(o.strokes)) {
    return false;
  }
  for (const f of o.fills) {
    if (f === null || typeof f !== "object") {
      return false;
    }
    const g = f as Record<string, unknown>;
    if (typeof g.fill !== "string" || !Array.isArray(g.ring) || !g.ring.every(isLatLon)) {
      return false;
    }
    if (g.drawOrder !== undefined && (typeof g.drawOrder !== "number" || !Number.isFinite(g.drawOrder))) {
      return false;
    }
  }
  for (const s of o.strokes) {
    if (s === null || typeof s !== "object") {
      return false;
    }
    const g = s as Record<string, unknown>;
    if (
      typeof g.stroke !== "string" ||
      typeof g.strokeWidthPx !== "number" ||
      !Array.isArray(g.points) ||
      !g.points.every(isLatLon)
    ) {
      return false;
    }
    if (g.drawOrder !== undefined && (typeof g.drawOrder !== "number" || !Number.isFinite(g.drawOrder))) {
      return false;
    }
  }
  if (o.labels !== undefined) {
    if (!Array.isArray(o.labels)) {
      return false;
    }
    for (const label of o.labels) {
      if (label === null || typeof label !== "object") {
        return false;
      }
      const g = label as Record<string, unknown>;
      if (typeof g.latDeg !== "number" || typeof g.lonDeg !== "number" || typeof g.text !== "string") {
        return false;
      }
      if (g.fill !== undefined && typeof g.fill !== "string") {
        return false;
      }
    }
  }
  if (o.labelAvoidDiscs !== undefined) {
    if (!Array.isArray(o.labelAvoidDiscs)) {
      return false;
    }
    for (const disc of o.labelAvoidDiscs) {
      if (disc === null || typeof disc !== "object") {
        return false;
      }
      const g = disc as Record<string, unknown>;
      if (
        typeof g.latDeg !== "number" ||
        typeof g.lonDeg !== "number" ||
        typeof g.haloMultiplier !== "number"
      ) {
        return false;
      }
    }
  }
  if (o.labelPathHints !== undefined) {
    if (!Array.isArray(o.labelPathHints)) {
      return false;
    }
    for (const hint of o.labelPathHints) {
      if (hint === null || typeof hint !== "object") {
        return false;
      }
      const g = hint as Record<string, unknown>;
      if (!Array.isArray(g.points) || !g.points.every(isLatLon)) {
        return false;
      }
    }
  }
  if (o.pointMarkers !== undefined) {
    if (!Array.isArray(o.pointMarkers)) {
      return false;
    }
    for (const marker of o.pointMarkers) {
      if (marker === null || typeof marker !== "object") {
        return false;
      }
      const g = marker as Record<string, unknown>;
      if (
        typeof g.latDeg !== "number" ||
        typeof g.lonDeg !== "number" ||
        typeof g.radiusScale !== "number" ||
        typeof g.fill !== "string" ||
        typeof g.stroke !== "string" ||
        typeof g.underStroke !== "string"
      ) {
        return false;
      }
      if (g.haloFill !== undefined && typeof g.haloFill !== "string") {
        return false;
      }
    }
  }
  if (o.readability !== undefined && !isOverlayReadabilityHints(o.readability)) {
    return false;
  }
  return true;
}
