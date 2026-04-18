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
  anchoredTimezoneSegmentWallClockState,
  buildStructuralAnchor,
  structuralColumnCenterLongitudeDeg,
  type SemanticHourMarkerContent,
  type SemanticHourMarkerInstance,
  type SemanticTopBandHourMarkersPlan,
} from "./topBandHourMarkersSemanticTypes.ts";

/**
 * Mean-solar longitude used for procedural wall-clock state when semantic planning does **not** use
 * {@link BuildSemanticTopBandHourMarkersOptions.anchoredTimezoneSegment} (tape mode, tests, or missing chrome context).
 *
 * - {@link EffectiveTopBandHourMarkerBehavior.staticZoneAnchored}: inverse map of each structural zone center `centerX`
 *   when paired with layout (legacy mean-solar path only if anchored segment options are omitted).
 * - {@link EffectiveTopBandHourMarkerBehavior.tapeAdvected}: inverse equirectangular map of each column’s phased
 *   tape `centerX` so hands match the geographic meridian at the disk’s visual position.
 */
export function wallClockLongitudeDegForStructuralHourMarkers(
  behavior: EffectiveTopBandHourMarkerBehavior,
  markers: readonly { centerX: number; structuralHour0To23: number }[],
  viewportWidthPx: number,
  /**
   * When {@link EffectiveTopBandHourMarkerBehavior.staticZoneAnchored}, procedural layout x comes from these
   * structural zone centers (same as {@link SemanticTopBandHourMarkerLayoutContext.structuralZoneCenterXPx}).
   * Wall-clock longitude must be {@link longitudeDegFromMapX} of that x so time meaning matches the painted disk.
   */
  structuralZoneCenterXPx?: readonly number[],
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
    } else if (structuralZoneCenterXPx?.length === 24) {
      out[h] = longitudeDegFromMapX(structuralZoneCenterXPx[h]!, w);
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
  anchoredTimezoneSegment: BuildSemanticTopBandHourMarkersOptions["anchoredTimezoneSegment"],
): SemanticHourMarkerContent {
  const h = structuralHour0To23;
  if (effective.content.kind === "localWallClock") {
    if (
      effective.behavior === "staticZoneAnchored" &&
      anchoredTimezoneSegment !== undefined
    ) {
      const wallClock = anchoredTimezoneSegmentWallClockState(
        anchoredTimezoneSegment.referenceFractionalHour,
        h,
        anchoredTimezoneSegment.presentTimeStructuralHour0To23,
      );
      return { kind: "localWallClock", structuralHour0To23: h, wallClock };
    }
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
   * radialWedge): mean-solar wall-clock state per structural column when anchored segment is not used.
   */
  referenceNowMs?: number;
  /**
   * When set (length 24), overrides the default sector-center longitude for each structural hour when resolving
   * mean-solar wall clock (tape-advected phased x → longitude via {@link longitudeDegFromMapX}).
   */
  wallClockLongitudeDegByStructuralHour?: readonly number[];
  /**
   * For {@link EffectiveTopBandHourMarkerBehavior.staticZoneAnchored} procedural realizations in product chrome:
   * band-frame civil fractional hour at the present-time structural column (same basis as the map clock / phased tape)
   * plus that column index. When set, overrides mean-solar longitude for wall-clock content.
   */
  anchoredTimezoneSegment?: {
    referenceFractionalHour: number;
    presentTimeStructuralHour0To23: number;
  };
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
  const anchored = options?.anchoredTimezoneSegment;
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
      content: semanticContentForInstance(effective, h, referenceNowMs, wallClockLon, anchored),
      realization: effective.realization,
      layout: effective.layout,
    });
  }
  return { source: effective, instances };
}
