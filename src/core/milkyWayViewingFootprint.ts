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
 * Event-static Milky Way viewing footprint.
 *
 * At the selected viewing window’s peak UTC, a location belongs iff it satisfies
 * the same v2 policy as the reference-city event: GC altitude, local nightly-max
 * quality, astronomical darkness, and low modeled moonlight.
 *
 * Geography is a snapshot at peakUtcMs. It does not sweep the event interval
 * and does not move with product time.
 */

import { extractClosedContoursFromGrid, type GeographicRingPoint } from "./scalarFieldContours";
import { MILKY_WAY_VIEWING_POLICY_VERSION } from "./milkyWayViewingPolicy";
import {
  evaluateMilkyWayViewingAt,
  milkyWayViewingInstantFieldAt,
  type MilkyWayViewingWindow,
} from "./milkyWayViewingWindows";

export const MILKY_WAY_VIEWING_FOOTPRINT_ALGORITHM_ID = "milky-way-viewing-footprint-v1";
export const MILKY_WAY_VIEWING_FOOTPRINT_GRID_STEP_DEG = 1;
export const MILKY_WAY_VIEWING_FOOTPRINT_DIAGNOSTIC_STEP_DEG = 0.5;

export type MilkyWayViewingFootprint = {
  readonly eventId: string;
  readonly policyVersion: string;
  readonly algorithmId: string;
  readonly peakUtcMs: number;
  readonly rings: readonly (readonly GeographicRingPoint[])[];
  readonly geometryHash: string;
};

type CachedFootprint = MilkyWayViewingFootprint;

const footprintCache = new Map<string, CachedFootprint>();

function cacheKey(eventId: string, peakUtcMs: number, stepDeg: number): string {
  return [
    MILKY_WAY_VIEWING_POLICY_VERSION,
    MILKY_WAY_VIEWING_FOOTPRINT_ALGORITHM_ID,
    eventId,
    String(peakUtcMs),
    String(stepDeg),
  ].join("|");
}

function geometryHash(rings: readonly (readonly GeographicRingPoint[])[]): string {
  let h = 2166136261;
  for (const ring of rings) {
    h ^= ring.length;
    h = Math.imul(h, 16777619);
    for (const p of ring) {
      const lat = Math.round(p.latDeg * 1e4);
      const lon = Math.round(p.lonDeg * 1e4);
      h ^= lat;
      h = Math.imul(h, 16777619);
      h ^= lon;
      h = Math.imul(h, 16777619);
    }
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

function buildGrid(utcMs: number, stepDeg: number): number[][] | null {
  const field = milkyWayViewingInstantFieldAt(utcMs);
  if (!field) {
    return null;
  }
  const nLat = Math.round(180 / stepDeg) + 1;
  const nLon = Math.round(360 / stepDeg);
  const values: number[][] = [];
  for (let i = 0; i < nLat; i += 1) {
    const lat = -90 + i * stepDeg;
    const row: number[] = [];
    for (let j = 0; j < nLon; j += 1) {
      const lon = -180 + j * stepDeg;
      const c = evaluateMilkyWayViewingAt(field, lat, lon);
      row.push(c.qualifies ? 1 : -1);
    }
    values.push(row);
  }
  return values;
}

function buildFootprint(
  window: Pick<MilkyWayViewingWindow, "id" | "peakUtcMs">,
  stepDeg: number,
): MilkyWayViewingFootprint {
  const values = buildGrid(window.peakUtcMs, stepDeg);
  const rings = values
    ? extractClosedContoursFromGrid({
        values,
        lat0: -90,
        lon0: -180,
        latStep: stepDeg,
        lonStep: stepDeg,
      })
    : [];
  return {
    eventId: window.id,
    policyVersion: MILKY_WAY_VIEWING_POLICY_VERSION,
    algorithmId: MILKY_WAY_VIEWING_FOOTPRINT_ALGORITHM_ID,
    peakUtcMs: window.peakUtcMs,
    rings,
    geometryHash: geometryHash(rings),
  };
}

export function milkyWayViewingFootprint(
  window: Pick<MilkyWayViewingWindow, "id" | "peakUtcMs">,
  options?: { readonly gridStepDeg?: number },
): MilkyWayViewingFootprint {
  const stepDeg = options?.gridStepDeg ?? MILKY_WAY_VIEWING_FOOTPRINT_GRID_STEP_DEG;
  const key = cacheKey(window.id, window.peakUtcMs, stepDeg);
  const hit = footprintCache.get(key);
  if (hit) {
    return hit;
  }
  const built = buildFootprint(window, stepDeg);
  footprintCache.set(key, built);
  if (footprintCache.size > 16) {
    const oldest = footprintCache.keys().next().value;
    if (oldest !== undefined) {
      footprintCache.delete(oldest);
    }
  }
  return built;
}

export function milkyWayViewingFootprintContains(
  window: Pick<MilkyWayViewingWindow, "peakUtcMs">,
  latDeg: number,
  lonDeg: number,
): boolean {
  const field = milkyWayViewingInstantFieldAt(window.peakUtcMs);
  if (!field) {
    return false;
  }
  return evaluateMilkyWayViewingAt(field, latDeg, lonDeg).qualifies;
}

export function resetMilkyWayViewingFootprintCacheForTests(): void {
  footprintCache.clear();
}
