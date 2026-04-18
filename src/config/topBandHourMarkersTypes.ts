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
  realization: HourMarkersRealizationConfig;
  /**
   * When false, the 24-hour indicator entries row (hour-disk strip above the tick tape) is omitted from planning,
   * layout height, and render-plan emission. Tick tape and NATO row are unchanged.
   * @default true
   */
  indicatorEntriesAreaVisible?: boolean;
  /**
   * Authored CSS background for the 24-hour indicator entries row (disk-band strip) only.
   * When omitted, the default from app config (`DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR`) is used at resolve time.
   */
  indicatorEntriesAreaBackgroundColor?: string;
  /** When set, overrides behavior implied by realization kind (see resolver default mapping). */
  behavior?: EffectiveTopBandHourMarkerBehavior;
  layout: {
    sizeMultiplier: number;
    /**
     * Top padding of the hour-marker **content row** inside the disk strip (`diskBandH`), in px.
     * Shared by text and procedural realizations; when omitted, defaults come from
     * {@link ./topBandHourMarkerContentRowVerticalMetrics.ts!resolveHourMarkerContentRowPaddingPx} (Phase 3).
     */
    contentPaddingTopPx?: number;
    /**
     * Bottom padding of that same content row, in px.
     * When omitted, defaults come from {@link ./topBandHourMarkerContentRowVerticalMetrics.ts!resolveHourMarkerContentRowPaddingPx}
     * (intrinsic-proportional for Auto). May be negative when set explicitly.
     */
    contentPaddingBottomPx?: number;
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
  /** Optional overrides; same semantics as {@link HourMarkersConfig.layout} padding fields. */
  contentPaddingTopPx?: number;
  contentPaddingBottomPx?: number;
};

/**
 * Authoritative resolved model for top-band hour markers: semantic planning and UI consume this shape
 * alongside {@link DisplayChromeLayoutConfig.hourMarkers}.
 */
export type EffectiveTopBandHourMarkers = {
  /**
   * Structural presence of the indicator entries band in layout and render composition (from
   * {@link HourMarkersConfig.indicatorEntriesAreaVisible}). Not feature “activation” or realization behavior.
   */
  areaVisible: boolean;
  /**
   * Resolved background for the indicator entries row plus {@link effectiveForegroundColor} derived for contrast
   * (black/white) when authored realization appearance does not override ink.
   */
  indicatorEntriesArea: {
    effectiveBackgroundColor: string;
    effectiveForegroundColor: "#000000" | "#ffffff";
  };
  behavior: EffectiveTopBandHourMarkerBehavior;
  content: EffectiveTopBandHourMarkerContent;
  realization: EffectiveTopBandHourMarkerRealization;
  layout: EffectiveTopBandHourMarkerLayout;
  /** Resolved optional tape overlay (companion presentation, not a realization kind). */
  tapeHourNumberOverlay?: { enabled: boolean };
};
