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

import { longitudeDegFromMapX } from "../core/equirectangularProjection.ts";
import { solarLocalWallClockStateFromUtcMs } from "../core/solarLocalWallClock.ts";
import { indicatorEntryNoonMidnightRole } from "./noonMidnightIndicatorSemantics.ts";
import type {
  EffectiveTopBandHourMarkerBehavior,
  EffectiveTopBandHourMarkers,
} from "./topBandHourMarkersTypes.ts";
import {
  buildStructuralAnchor,
  structuralColumnCenterLongitudeDeg,
  type SemanticHourMarkerContent,
  type SemanticHourMarkerInstance,
  type SemanticTopBandHourMarkersPlan,
} from "./topBandHourMarkersSemanticTypes.ts";

/**
 * Mean-solar longitude used for procedural wall-clock state for each structural hour column.
 *
 * - {@link EffectiveTopBandHourMarkerBehavior.staticZoneAnchored}: sector center longitude (15° grid), matching
 *   structural zone centers and the present-time tick column.
 * - {@link EffectiveTopBandHourMarkerBehavior.tapeAdvected}: inverse equirectangular map of each column’s phased
 *   tape `centerX` so hands match the geographic meridian at the disk’s visual position
 *   (aligns with the tick when that disk sits on the reference meridian).
 */
export function wallClockLongitudeDegForStructuralHourMarkers(
  behavior: EffectiveTopBandHourMarkerBehavior,
  markers: readonly { centerX: number; structuralHour0To23: number }[],
  viewportWidthPx: number,
): readonly number[] {
  const w = viewportWidthPx;
  const out: number[] = new Array(24);
  for (let h = 0; h < 24; h += 1) {
    const m =
      markers.find((col) => col.structuralHour0To23 === h) ?? markers[h];
    if (m === undefined) {
      out[h] = structuralColumnCenterLongitudeDeg(h);
      continue;
    }
    if (behavior === "tapeAdvected") {
      out[h] = longitudeDegFromMapX(m.centerX, w);
    } else {
      out[h] = structuralColumnCenterLongitudeDeg(h);
    }
  }
  return out;
}

function semanticContentForInstance(
  effective: EffectiveTopBandHourMarkers,
  structuralHour0To23: number,
  referenceNowMs: number | undefined,
  wallClockLongitudeDegByStructuralHour: readonly number[] | undefined,
): SemanticHourMarkerContent {
  const h = structuralHour0To23;
  if (effective.content.kind === "localWallClock") {
    const lon =
      wallClockLongitudeDegByStructuralHour !== undefined
        ? wallClockLongitudeDegByStructuralHour[h]!
        : structuralColumnCenterLongitudeDeg(h);
    const wallClock =
      referenceNowMs !== undefined
        ? solarLocalWallClockStateFromUtcMs(referenceNowMs, lon)
        : solarLocalWallClockStateFromUtcMs(0, lon);
    return { kind: "localWallClock", structuralHour0To23: h, wallClock };
  }
  return { kind: "hour24Label", structuralHour0To23: h };
}

export type BuildSemanticTopBandHourMarkersOptions = {
  /**
   * Required for effective {@link EffectiveTopBandHourMarkerContent} `localWallClock` (analogClock, radialLine,
   * radialWedge): mean-solar wall-clock state per structural column.
   */
  referenceNowMs?: number;
  /**
   * When set (length 24), overrides the default sector-center longitude for each structural hour when resolving
   * mean-solar wall clock (tape-advected phased x → longitude via {@link longitudeDegFromMapX}).
   */
  wallClockLongitudeDegByStructuralHour?: readonly number[];
};

/**
 * Builds 24 structural hour-marker instances from resolved effective top-band hour markers.
 * Renderer-agnostic: no layout x, canvas, or render-plan types.
 */
export function buildSemanticTopBandHourMarkers(
  effective: EffectiveTopBandHourMarkers,
  options?: BuildSemanticTopBandHourMarkersOptions,
): SemanticTopBandHourMarkersPlan {
  if (!effective.areaVisible) {
    return { source: effective, instances: [] };
  }
  const referenceNowMs = options?.referenceNowMs;
  const wallClockLon = options?.wallClockLongitudeDegByStructuralHour;
  if (wallClockLon !== undefined && wallClockLon.length !== 24) {
    throw new Error("buildSemanticTopBandHourMarkers: wallClockLongitudeDegByStructuralHour must have length 24");
  }
  const instances: SemanticHourMarkerInstance[] = [];
  for (let h = 0; h < 24; h += 1) {
    instances.push({
      structuralHour0To23: h,
      structuralAnchor: buildStructuralAnchor(h),
      indicatorEntryNoonMidnightRole: indicatorEntryNoonMidnightRole(h),
      behavior: effective.behavior,
      content: semanticContentForInstance(effective, h, referenceNowMs, wallClockLon),
      realization: effective.realization,
      layout: effective.layout,
    });
  }
  return { source: effective, instances };
}
