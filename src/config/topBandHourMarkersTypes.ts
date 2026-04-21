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
  /** Radial stroke ink; when omitted, resolver uses contrast foreground on the indicator entries row. */
  lineColor?: string;
  /** Filled disk behind the radial stroke; when omitted, resolver blends row background toward resolved line ink. */
  faceColor?: string;
};

/** Structured colors for radial-wedge hour markers. */
export type HourMarkersRadialWedgeAppearance = {
  /**
   * Wedge annulus interior fill (distinct from the full disk face behind the wedge).
   * When omitted, resolver blends row background toward contrast foreground at t ≈ 0.62.
   */
  fillColor?: string;
  /** Full disk behind the wedge annulus (analog-style “face”); when omitted, resolver uses the analog face blend (t = 0.25). */
  faceColor?: string;
  /**
   * Wedge edge / outline ink (resolved {@link EffectiveRadialWedgeResolvedAppearance.strokeColor}).
   * When omitted, resolver uses contrast foreground at a fixed alpha for visibility on the row.
   */
  edgeColor?: string;
};

/**
 * Persisted authoring intent for top-band hour markers (`chrome.layout.hourMarkers` only).
 * Placement behavior is not authored — see {@link resolveEffectiveHourMarkerBehavior}.
 * UTC label mode (`utc24`) resolves to text-only hour markers at runtime; other kinds may remain stored for non-UTC modes.
 */
export type HourMarkersRealizationConfig =
  | { kind: "text"; fontAssetId?: FontAssetId; appearance: HourMarkersTextAppearance }
  | { kind: "analogClock"; appearance: HourMarkersAnalogClockAppearance }
  | { kind: "radialLine"; appearance: HourMarkersRadialLineAppearance }
  | { kind: "radialWedge"; appearance: HourMarkersRadialWedgeAppearance };

/** How phased hour markers move with the longitude tape vs fixed structural columns. */
/** Text numerals move with the civil-phased tape; procedural glyphs use fixed structural column positions. */
export type EffectiveTopBandHourMarkerBehavior = "civilPhased" | "civilColumnAnchored";

/**
 * How noon (structural hour 12) and midnight (structural hour 0) are expressed on the 24-hour indicator entries row.
 * Only applies when {@link HourMarkersNoonMidnightCustomization.enabled} is true.
 */
export type HourMarkersNoonMidnightExpressionMode =
  | "textWords"
  | "boxedNumber"
  | "solarLunarPictogram"
  | "semanticGlyph";

/**
 * Optional customization for the two structural columns that read as noon and midnight in the band’s civil frame
 * (hour 12 → noon, hour 0 → midnight). Persisted under `chrome.layout.hourMarkers.noonMidnightCustomization`.
 * Effective runtime behavior applies only when {@link HourMarkersRealizationConfig} is `text`; other realizations
 * ignore this block at resolve time while still persisting authored values.
 */
export type HourMarkersNoonMidnightCustomization = {
  /** When false or omitted, noon/midnight render like any other hour entry. @default true */
  enabled?: boolean;
  /** Ignored when {@link enabled} is false. @default boxedNumber */
  expressionMode?: HourMarkersNoonMidnightExpressionMode;
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
  /** Optional noon/midnight treatment for indicator entries (hour columns 0 and 12). */
  noonMidnightCustomization?: HourMarkersNoonMidnightCustomization;
}

/**
 * What civil-time content the marker encodes: 24h tape labels (text) vs reference-zone civil wall-clock per structural
 * column (analogClock, radialLine, radialWedge procedural angles).
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
  /** Default: one quarter of the way from indicator entries row background toward resolved ring/hand stroke color. */
  faceFill: string;
};

export type EffectiveRadialLineResolvedAppearance = {
  lineColor: string;
  /**
   * Filled disk behind the radial stroke (visible “hour disk” surface). Default: same policy as analog
   * {@link EffectiveAnalogClockResolvedAppearance.faceFill} — blend from indicator entries background toward resolved line ink.
   */
  faceFill: string;
};

export type EffectiveRadialWedgeResolvedAppearance = {
  /**
   * Default: blend from indicator entries row background toward contrast foreground at resolver t ≈ 0.62
   * (foreground-heavy vs noon/midnight midpoint t = 0.5) so the wedge interior separates from the strip bed.
   */
  fillColor: string;
  /**
   * Edge stroke when the glyph style enables a non-zero wedge outline. Default: contrast foreground at resolver-chosen
   * alpha so the edge stays visibly tied to the high-contrast foreground on the indicator row.
   */
  strokeColor: string;
  /**
   * Full disk behind the wedge annulus (covers the inner hole and matches analog-style face treatment).
   * Default: blend from indicator entries background toward contrast foreground at t = 0.25 (same as analog face).
   */
  faceFill: string;
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
 * Resolved noon/midnight customization for the indicator entries row. Box color is precomputed in resolver space
 * for {@link HourMarkersNoonMidnightExpressionMode boxedNumber} only.
 */
export type EffectiveNoonMidnightCustomization =
  | { enabled: false }
  | {
      enabled: true;
      expressionMode: HourMarkersNoonMidnightExpressionMode;
      /** Present when {@link expressionMode} is `boxedNumber`: halfway between row background and contrast foreground. */
      boxedNumberBoxColor?: string;
    };

/**
 * 24-hour mode only: numeric emphasis for structural hours `00` and `12` (boxed tape numerals), not civil noon/midnight wording.
 * Resolved from the same authored {@link HourMarkersConfig.noonMidnightCustomization} enable flag as 12hr emphasis.
 */
export type EffectiveTwentyFourHourAnchorCustomization =
  | { enabled: false }
  | { enabled: true; boxedNumberBoxColor: string };

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
  /** Noon/midnight indicator-entry customization (semantic + layout consume; renderer adapts per realization). */
  noonMidnightCustomization: EffectiveNoonMidnightCustomization;
  /** 24-hour anchor emphasis (`00` / `12` boxed numerals) for text realization when the band is in 24-hour civil mode. */
  twentyFourHourAnchorCustomization: EffectiveTwentyFourHourAnchorCustomization;
};
