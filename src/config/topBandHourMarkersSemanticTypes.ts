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
 */
/** Solar-local civil time at a structural column center longitude (UTC time-of-day + lon/15h offset). */
export type SemanticLocalWallClockState = {
  hour0To23: number;
  minute0To59: number;
  /** Fractional hour-of-day [0,24) for continuous hour-hand placement (mean solar). */
  continuousHour0To24: number;
  /** Fractional minute-of-hour [0,60) for continuous minute-hand placement (mean solar). */
  continuousMinute0To60: number;
};

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
