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
import type { SublunarPointDeg } from "../core/sublunarPoint";
import {
  ASTRONOMY_PATH_THICKNESS_IDS,
  type AstronomyPathThicknessId,
} from "../core/astronomyOverlayStrokeAppearance";
import {
  DEFAULT_SUBLUNAR_MARKER_SIZE,
  SUBLUNAR_MARKER_SIZE_IDS,
  type SublunarMarkerSizeId,
} from "../core/sublunarMarkerAppearance";

export const LUNAR_LOCUS_KIND = "lunarLocus" as const;

export interface LunarLocusPayload {
  kind: typeof LUNAR_LOCUS_KIND;
  /** Open one-cycle polyline in unwrapped geographic degrees (lon0 + residual); seam at the current Moon. */
  readonly points: readonly SublunarPointDeg[];
  /** Production stroke RGB; plan applies veil alpha. */
  strokeColor?: string;
  strokeThickness?: AstronomyPathThicknessId;
  /** Moon glyph size used only to trim strokes inside the disc footprint. */
  moonSize?: SublunarMarkerSizeId;
  readability?: OverlayReadabilityHints;
}

function isPoint(p: unknown): p is SublunarPointDeg {
  if (p === null || typeof p !== "object") {
    return false;
  }
  const q = p as Record<string, unknown>;
  return typeof q.latDeg === "number" && typeof q.lonDeg === "number";
}

export function isLunarLocusPayload(data: unknown): data is LunarLocusPayload {
  if (data === null || typeof data !== "object") {
    return false;
  }
  const o = data as Record<string, unknown>;
  if (o.kind !== LUNAR_LOCUS_KIND) {
    return false;
  }
  if (!Array.isArray(o.points)) {
    return false;
  }
  for (const p of o.points) {
    if (!isPoint(p)) {
      return false;
    }
  }
  if (o.strokeColor !== undefined && typeof o.strokeColor !== "string") {
    return false;
  }
  if (
    o.strokeThickness !== undefined &&
    !(ASTRONOMY_PATH_THICKNESS_IDS as readonly string[]).includes(o.strokeThickness as string)
  ) {
    return false;
  }
  if (
    o.moonSize !== undefined &&
    !(SUBLUNAR_MARKER_SIZE_IDS as readonly string[]).includes(o.moonSize as string)
  ) {
    return false;
  }
  if (o.readability !== undefined && !isOverlayReadabilityHints(o.readability)) {
    return false;
  }
  return true;
}

export function lunarLocusMoonSizeFromPayload(payload: LunarLocusPayload): SublunarMarkerSizeId {
  return payload.moonSize ?? DEFAULT_SUBLUNAR_MARKER_SIZE;
}
