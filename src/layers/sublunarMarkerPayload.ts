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

export const SUBLUNAR_MARKER_KIND = "sublunarMarkerEquirect" as const;

/**
 * Single sub-lunar point in equirectangular space (same convention as subsolar / grid:
 * lon −180…180 east positive, lat −90…90).
 *
 * Phase fields come from core `approximateLunarPhase`; the renderer draws the disc
 * from illuminated fraction and waxing/waning — no astronomy in the backend.
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
}

export function isSublunarMarkerPayload(data: unknown): data is SublunarMarkerPayload {
  if (data === null || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return (
    o.kind === SUBLUNAR_MARKER_KIND &&
    typeof o.latDeg === "number" &&
    typeof o.lonDeg === "number" &&
    typeof o.illuminatedFraction === "number" &&
    typeof o.geocentricElongationDeg === "number" &&
    typeof o.waxing === "boolean"
  );
}
