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

import type { FontAssetId } from "../typography/fontAssetTypes.ts";

/** Optional text styling for text hour markers (`realization.appearance`). */
export type HourMarkersTextAppearance = {
  color?: string;
};

/** Structured colors for analog-clock hour markers (`realization.appearance`). */
export type HourMarkersAnalogClockAppearance = {
  handColor?: string;
  faceColor?: string;
};

/** Structured colors for radial-line hour markers. */
export type HourMarkersRadialLineAppearance = {
  lineColor?: string;
};

/** Structured colors for radial-wedge hour markers. */
export type HourMarkersRadialWedgeAppearance = {
  fillColor?: string;
};

/**
 * Persisted authoring intent for top-band hour markers (`chrome.layout.hourMarkers` only).
 * Content is derived at runtime when absent; optional {@link HourMarkersConfig.behavior} overrides defaults from
 * {@link resolveEffectiveTopBandHourMarkers}.
 */
export type HourMarkersRealizationConfig =
  | { kind: "text"; fontAssetId: FontAssetId; appearance: HourMarkersTextAppearance }
  | { kind: "analogClock"; appearance: HourMarkersAnalogClockAppearance }
  | { kind: "radialLine"; appearance: HourMarkersRadialLineAppearance }
  | { kind: "radialWedge"; appearance: HourMarkersRadialWedgeAppearance };

/** How phased hour markers move with the longitude tape vs fixed structural columns. */
export type EffectiveTopBandHourMarkerBehavior = "tapeAdvected" | "staticZoneAnchored";

/**
 * Optional tick-tape presentation: boxed hour numerals on the middle tick rail (glyph contexts).
 * Not a separate realization kind — companion chrome only.
 */
export type HourMarkersTapeHourNumberOverlay = {
  enabled: boolean;
};

export interface HourMarkersConfig {
  /**
   * When false, the 24-hour indicator row (markers + circle-band bed) is omitted; tick tape and NATO strip keep their
   * heights and the top band reflows. Default true when absent in input.
   */
  visible?: boolean;
  realization: HourMarkersRealizationConfig;
  /** When set, overrides behavior implied by realization kind (see resolver default mapping). */
  behavior?: EffectiveTopBandHourMarkerBehavior;
  layout: {
    sizeMultiplier: number;
    /**
     * Local vertical inset above the 24-hour text core inside the disk row (px), normalized 0–24. Shifts rendered text
     * only; does not change solved disk row height or marker radius.
     */
    textTopMarginPx: number;
    /**
     * Local vertical inset below the 24-hour text core inside the disk row (px), normalized 0–24. Shifts rendered text
     * only; does not change solved disk row height or marker radius.
     */
    textBottomMarginPx: number;
  };
  /** Optional boxed numerals carried on the hourly tick tape (glyph realization contexts). */
  tapeHourNumberOverlay?: HourMarkersTapeHourNumberOverlay;
}

/**
 * What civil-time content the marker encodes: 24h tape hour vs local wall-clock for the analog face.
 */
export type EffectiveTopBandHourMarkerContent =
  | { kind: "hour24" }
  | { kind: "localWallClock" };

/**
 * Visual realization on the hour disk. Distinct from {@link EffectiveTopBandHourMarkerContent}, which names the
 * time basis; this names drawable mechanics (text vs procedural variants).
 */
export type EffectiveAnalogClockResolvedAppearance = {
  ringStroke: string;
  handStroke: string;
  faceFill: string;
};

export type EffectiveRadialLineResolvedAppearance = {
  lineColor: string;
};

export type EffectiveRadialWedgeResolvedAppearance = {
  fillColor: string;
};

export type EffectiveTextResolvedAppearance = {
  color: string;
};

export type EffectiveTopBandHourMarkerRealization =
  | {
      kind: "text";
      /** Bundled font id; when omitted, resolution uses the canonical default bundled font. */
      fontAssetId?: FontAssetId;
      resolvedAppearance: EffectiveTextResolvedAppearance;
    }
  | { kind: "analogClock"; resolvedAppearance: EffectiveAnalogClockResolvedAppearance }
  | { kind: "radialLine"; resolvedAppearance: EffectiveRadialLineResolvedAppearance }
  | { kind: "radialWedge"; resolvedAppearance: EffectiveRadialWedgeResolvedAppearance };

export type EffectiveTopBandHourMarkerLayout = {
  /** Finite check, default 1.0 when absent/invalid, then clamp to the v2 [0.5, 2] range. */
  sizeMultiplier: number;
  /** Clamped local inset above the text core (px); placement-only, not a size driver. */
  textTopMarginPx: number;
  /** Clamped local inset below the text core (px); placement-only, not a size driver. */
  textBottomMarginPx: number;
};

/**
 * Authoritative resolved model for top-band hour markers: semantic planning and UI consume this shape
 * alongside {@link DisplayChromeLayoutConfig.hourMarkers}.
 */
export type EffectiveTopBandHourMarkers = {
  enabled: boolean;
  behavior: EffectiveTopBandHourMarkerBehavior;
  content: EffectiveTopBandHourMarkerContent;
  realization: EffectiveTopBandHourMarkerRealization;
  layout: EffectiveTopBandHourMarkerLayout;
  /** Resolved optional tape overlay (companion presentation, not a realization kind). */
  tapeHourNumberOverlay?: { enabled: boolean };
};
