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

import type {
  EffectiveTopBandHourMarkerBehavior,
  EffectiveTopBandHourMarkerLayout,
  EffectiveTopBandHourMarkerRealization,
  EffectiveTopBandHourMarkers,
} from "./topBandHourMarkersTypes.ts";
import type { IndicatorEntryNoonMidnightRole } from "./noonMidnightIndicatorSemantics.ts";
import { structuralZoneLetterFromIndex } from "./structuralZoneLetters.ts";

/** Degrees of longitude per structural UTC hour column on the top band (−180°…+180° in 24 sectors). */
export const STRUCTURAL_LONGITUDE_DEG_PER_HOUR = 15 as const;

/**
 * Center longitude (°) for structural hour `h` ∈ [0, 23]: west edge −180° + 15°·`h`, then +7.5° to sector center.
 * Matches {@link UtcTopScaleHourSegment.centerLongitudeDeg} for the same index.
 */
export function structuralColumnCenterLongitudeDeg(structuralHour0To23: number): number {
  const h = Math.max(0, Math.min(23, Math.floor(structuralHour0To23)));
  const lon0 = -180 + STRUCTURAL_LONGITUDE_DEG_PER_HOUR * h;
  return lon0 + STRUCTURAL_LONGITUDE_DEG_PER_HOUR / 2;
}

/**
 * Stable identity for the structural 15° column: meridian center + canonical NATO strip letter (west→east index).
 */
export type SemanticHourMarkerStructuralAnchor = {
  centerLongitudeDeg: number;
  /** NATO letter for this structural column; not civil-TZ membership. */
  structuralZoneLetter: string;
};

/**
 * Renderer-agnostic tape content for one marker instance (phasing/layout x is not part of this slice).
 *
 * Clock-hand state for procedural markers uses reference-zone civil time: either column-anchored civil wall clock
 * ({@link anchoredTimezoneSegmentWallClockState}) or phased 24h labels — not meridian-offset solar time as chrome civil time.
 */
export type SemanticLocalWallClockState = {
  hour0To23: number;
  minute0To59: number;
  /** Fractional hour-of-day [0,24) for continuous hour-hand placement. */
  continuousHour0To24: number;
  /** Fractional minute-of-hour [0,60) for continuous minute-hand placement. */
  continuousMinute0To60: number;
};

function wrapContinuousHour0To24(x: number): number {
  return ((x % 24) + 24) % 24;
}

/**
 * Civil clock state for structural column {@code structuralHour0To23} when the present-time tick sits in column
 * {@code presentTimeStructuralHour0To23}: band-frame fractional hour at the tick plus one nominal hour per column east.
 * Same time basis as the phased tape and map clock for that band mode / reference zone.
 */
export function anchoredTimezoneSegmentWallClockState(
  referenceFractionalHourAtPresentTick: number,
  structuralHour0To23: number,
  presentTimeStructuralHour0To23: number,
): SemanticLocalWallClockState {
  const delta = structuralHour0To23 - presentTimeStructuralHour0To23;
  const continuousHour0To24 = wrapContinuousHour0To24(referenceFractionalHourAtPresentTick + delta);
  const continuousMinute0To60 = (continuousHour0To24 % 1) * 60;
  const hour0To23 = Math.floor(continuousHour0To24) % 24;
  const minute0To59 = Math.min(59, Math.floor(continuousMinute0To60));
  return { hour0To23, minute0To59, continuousHour0To24, continuousMinute0To60 };
}

export type SemanticHourMarkerContent =
  | {
      kind: "hour24Label";
      /** Which structural hour slot this instance belongs to; label numerals are phased separately. */
      structuralHour0To23: number;
    }
  | {
      kind: "localWallClock";
      structuralHour0To23: number;
      wallClock: SemanticLocalWallClockState;
    };

/**
 * One phased hour-marker slot on the top band circle row: structural column + effective realization profile.
 */
export type SemanticHourMarkerInstance = {
  structuralHour0To23: number;
  structuralAnchor: SemanticHourMarkerStructuralAnchor;
  /** Noon/midnight structural roles (hours 12 / 0); independent of customization being enabled. */
  indicatorEntryNoonMidnightRole: IndicatorEntryNoonMidnightRole;
  behavior: EffectiveTopBandHourMarkerBehavior;
  content: SemanticHourMarkerContent;
  realization: EffectiveTopBandHourMarkerRealization;
  layout: EffectiveTopBandHourMarkerLayout;
};

/**
 * Semantic plan for all 24 structural columns; no canvas/render-plan types.
 */
export type SemanticTopBandHourMarkersPlan = {
  /** Effective resolver snapshot this plan was derived from. */
  source: EffectiveTopBandHourMarkers;
  instances: readonly SemanticHourMarkerInstance[];
};

export function buildStructuralAnchor(structuralHour0To23: number): SemanticHourMarkerStructuralAnchor {
  const h = Math.max(0, Math.min(23, Math.floor(structuralHour0To23)));
  return {
    centerLongitudeDeg: structuralColumnCenterLongitudeDeg(h),
    structuralZoneLetter: structuralZoneLetterFromIndex(h),
  };
}
