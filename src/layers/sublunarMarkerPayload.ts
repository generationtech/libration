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
import {
  DEFAULT_SUBLUNAR_MARKER_APPEARANCE,
  normalizeSublunarMarkerAppearance,
  type SublunarMarkerAppearance,
} from "../core/sublunarMarkerAppearance";

export const SUBLUNAR_MARKER_KIND = "sublunarMarkerEquirect" as const;

/**
 * Single sub-lunar point in equirectangular space (same convention as subsolar / grid:
 * lon −180…180 east positive, lat −90…90).
 *
 * Phase and optical-libration fields come from core; the renderer draws the disc and
 * indicator from those numbers — no astronomy in the backend.
 */
export interface SublunarMarkerPayload {
  kind: typeof SUBLUNAR_MARKER_KIND;
  latDeg: number;
  lonDeg: number;
  /** 0 = new … 1 = full; from geocentric elongation. */
  illuminatedFraction: number;
  /** Moon ecliptic longitude minus Sun's, degrees in (−180, 180]; positive ⇒ waxing. */
  geocentricElongationDeg: number;
  /** When true, the lit portion grows toward full; when false, toward new. */
  waxing: boolean;
  /** Optical libration in longitude (degrees). Display mapping is downstream. */
  librationLongitudeDeg: number;
  /** Optical libration in latitude (degrees). Display mapping is downstream. */
  librationLatitudeDeg: number;
  /**
   * Presentation rotation of the libration mark (degrees). 0 = map-oriented LIB-010 axes.
   * Computed upstream from observer orientation; the backend must not interpret it.
   */
  librationOrientationDeg: number;
  appearance: SublunarMarkerAppearance;
  readability?: OverlayReadabilityHints;
  /**
   * Optional Earth-shadow disc overlay in Moon radii (east/north). Presentation
   * numbers only; the backend must not interpret astronomy.
   */
  earthShadowOverlay?: EarthShadowOverlayAppearance;
}

export type EarthShadowOverlayAppearance = {
  readonly offsetEastMoonRadii: number;
  readonly offsetNorthMoonRadii: number;
  readonly outerRadiusMoonRadii: number;
  readonly innerRadiusMoonRadii: number;
  readonly innerCoversDisc: boolean;
};

export function isSublunarMarkerPayload(data: unknown): data is SublunarMarkerPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  if (
    !(
      o.kind === SUBLUNAR_MARKER_KIND &&
      typeof o.latDeg === "number" &&
      typeof o.lonDeg === "number" &&
      typeof o.illuminatedFraction === "number" &&
      typeof o.geocentricElongationDeg === "number" &&
      typeof o.waxing === "boolean" &&
      typeof o.librationLongitudeDeg === "number" &&
      typeof o.librationLatitudeDeg === "number" &&
      typeof o.librationOrientationDeg === "number"
    )
  ) {
    return false;
  }
  if (o.readability !== undefined && !isOverlayReadabilityHints(o.readability)) {
    return false;
  }
  return true;
}

export function sublunarMarkerAppearanceFromPayload(
  payload: SublunarMarkerPayload,
): SublunarMarkerAppearance {
  return normalizeSublunarMarkerAppearance(payload.appearance ?? DEFAULT_SUBLUNAR_MARKER_APPEARANCE);
}
