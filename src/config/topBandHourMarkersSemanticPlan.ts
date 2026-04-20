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
 * Longitude (°) per structural hour for layout/debug helpers — geographic meridian at each disk’s x when needed.
 * Not used for chrome civil time semantics (see {@link anchoredTimezoneSegmentWallClockState}).
 */
export function wallClockLongitudeDegForStructuralHourMarkers(
  behavior: EffectiveTopBandHourMarkerBehavior,
  markers: readonly { centerX: number; structuralHour0To23: number }[],
  viewportWidthPx: number,
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
    if (behavior === "civilPhased") {
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
  anchoredTimezoneSegment: BuildSemanticTopBandHourMarkersOptions["anchoredTimezoneSegment"],
): SemanticHourMarkerContent {
  const h = structuralHour0To23;
  if (effective.content.kind === "localWallClock") {
    if (anchoredTimezoneSegment === undefined) {
      throw new Error(
        "buildSemanticTopBandHourMarkers: localWallClock requires anchoredTimezoneSegment (reference civil time)",
      );
    }
    const wallClock = anchoredTimezoneSegmentWallClockState(
      anchoredTimezoneSegment.referenceFractionalHour,
      h,
      anchoredTimezoneSegment.presentTimeStructuralHour0To23,
    );
    return { kind: "localWallClock", structuralHour0To23: h, wallClock };
  }
  return { kind: "hour24Label", structuralHour0To23: h };
}

export type BuildSemanticTopBandHourMarkersOptions = {
  /**
   * Band-frame civil fractional hour at the present-time structural column plus that column index
   * (same basis as the phased tape). Required for procedural `localWallClock` content.
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
  const anchored = options?.anchoredTimezoneSegment;
  const instances: SemanticHourMarkerInstance[] = [];
  for (let h = 0; h < 24; h += 1) {
    instances.push({
      structuralHour0To23: h,
      structuralAnchor: buildStructuralAnchor(h),
      indicatorEntryNoonMidnightRole: indicatorEntryNoonMidnightRole(h),
      behavior: effective.behavior,
      content: semanticContentForInstance(effective, h, anchored),
      realization: effective.realization,
      layout: effective.layout,
    });
  }
  return { source: effective, instances };
}
