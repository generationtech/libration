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
import type { LunarGroundTrackSample } from "../core/lunarGroundTrack";

export const LUNAR_GROUND_TRACK_KIND = "lunarGroundTrack" as const;

export interface LunarGroundTrackPayload {
  kind: typeof LUNAR_GROUND_TRACK_KIND;
  readonly past: readonly LunarGroundTrackSample[];
  readonly current: LunarGroundTrackSample;
  readonly future: readonly LunarGroundTrackSample[];
  readonly ticks: readonly LunarGroundTrackSample[];
  /** Canonical `#rrggbb` RGB identity; alpha is applied in the plan builder. */
  readonly pastColor: string;
  readonly futureColor: string;
  readability?: OverlayReadabilityHints;
}

function isSample(p: unknown): p is LunarGroundTrackSample {
  if (p === null || typeof p !== "object") {
    return false;
  }
  const q = p as Record<string, unknown>;
  return typeof q.latDeg === "number" && typeof q.lonDeg === "number";
}

export function isLunarGroundTrackPayload(data: unknown): data is LunarGroundTrackPayload {
  if (data === null || typeof data !== "object") {
    return false;
  }
  const o = data as Record<string, unknown>;
  if (o.kind !== LUNAR_GROUND_TRACK_KIND) {
    return false;
  }
  if (!Array.isArray(o.past) || !Array.isArray(o.future) || !Array.isArray(o.ticks)) {
    return false;
  }
  if (!isSample(o.current)) {
    return false;
  }
  if (typeof o.pastColor !== "string" || typeof o.futureColor !== "string") {
    return false;
  }
  for (const p of o.past) {
    if (!isSample(p)) {
      return false;
    }
  }
  for (const p of o.future) {
    if (!isSample(p)) {
      return false;
    }
  }
  for (const p of o.ticks) {
    if (!isSample(p)) {
      return false;
    }
  }
  if (o.readability !== undefined && !isOverlayReadabilityHints(o.readability)) {
    return false;
  }
  return true;
}
