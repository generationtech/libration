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
 * Visual and layout tokens for bottom instrument chrome (screen overlay on the map, not map layers).
 * Canvas consumes these today; other backends can reuse the same semantic keys.
 */

/** rgba(...) / color strings for bottom chrome panels and navigator. */
export interface BottomChromeColorTokens {
  /** Micro label above the primary clock (e.g. LOCAL TIME). */
  microLabel: string;
  /** Primary clock readout. */
  primaryTime: string;
  /** Day cell weekday line (short). */
  dayCellWeekday: string;
  /** Day cell date line (month + day). */
  dayCellDate: string;
  /** Non-selected day cell backgrounds. */
  dayCellBackgroundMuted: string;
  /** Selected / current day cell background. */
  dayCellBackgroundSelected: string;
  /** Previous / next chevrons. */
  navigatorChevron: string;
  /** Subdued fill behind arrow glyphs (instrument control well). */
  navigatorArrowWell: string;
  /** Hairline framing the day navigator assembly inside the center strip. */
  navigatorFrameStroke: string;
  /** Inset fill behind the day cell row (separates cells from strip chrome). */
  navigatorDayRowWell: string;
  /** Vertical hairlines between day columns. */
  dayCellColumnDivider: string;
  /** Selected day cell outline (instrument emphasis, not glow). */
  dayCellSelectedStroke: string;
  /** Hairline at the global date boundary (center of the day-line indicator). */
  dayLineBoundarySplit: string;
}

/** Typography sizes (CSS px) derived in the renderer via min/max/frac of viewport — stored as bounds here. */
export interface BottomChromeTypographyBounds {
  microLabelMinPx: number;
  microLabelMaxPx: number;
  microLabelFracOfViewportWidth: number;
  primaryTimeMinPx: number;
  primaryTimeMaxPx: number;
  primaryTimeFracOfViewportWidth: number;
  dayCellWeekdayMinPx: number;
  dayCellWeekdayMaxPx: number;
  dayCellWeekdayFracOfViewportWidth: number;
  dayCellDatePrimaryMinPx: number;
  dayCellDatePrimaryMaxPx: number;
  dayCellDatePrimaryFracOfViewportWidth: number;
  dayCellDateSecondaryMinPx: number;
  dayCellDateSecondaryMaxPx: number;
  dayCellDateSecondaryFracOfViewportWidth: number;
  navigatorChevronMinPx: number;
  navigatorChevronMaxPx: number;
  navigatorChevronFracOfViewportWidth: number;
}

/** Resolved spacing / radii (px) from viewport width — same min/max/frac pattern as typography. */
export interface BottomChromeSpacingTokens {
  dayCellGapMinPx: number;
  dayCellGapMaxPx: number;
  dayCellGapFracOfViewportWidth: number;
  dayCellCornerRadiusMinPx: number;
  dayCellCornerRadiusMaxPx: number;
  dayCellCornerRadiusFracOfViewportWidth: number;
  navigatorInnerPadMinPx: number;
  navigatorInnerPadMaxPx: number;
  navigatorInnerPadFracOfViewportWidth: number;
  navigatorArrowWellPadMinPx: number;
  navigatorArrowWellPadMaxPx: number;
  navigatorArrowWellPadFracOfViewportWidth: number;
}

export interface BottomChromeLayoutTokens {
  /** Horizontal inset from viewport edge for left/right text (clamped). */
  horizontalPaddingMinPx: number;
  horizontalPaddingMaxPx: number;
  horizontalPaddingFracOfViewportWidth: number;
  /** Preferred width of the center day navigator as a fraction of viewport. */
  centerStripWidthFracOfViewport: number;
  centerStripMinWidthPx: number;
  centerStripMaxWidthPx: number;
  /** Minimum width reserved for each side panel so the center strip cannot consume the full width. */
  minSidePanelWidthPx: number;
  /** Horizontal gap between the center strip and the left/right panel content areas. */
  centerStripSideGutterPx: number;
  /**
   * Minimum horizontal inset (px) from the physical viewport edge so the day-line strip stays fully visible
   * (used with {@link computeDayLineIndicatorCenterX} — not the raw seam x).
   */
  dayLineStripViewportEdgeInsetMinPx: number;
  dayLineStripViewportEdgeInsetMaxPx: number;
  dayLineStripViewportEdgeInsetFracOfViewportWidth: number;
  /** Inset from the center strip edge for ‹ › chevrons. */
  navigatorArrowInsetMinPx: number;
  navigatorArrowInsetMaxPx: number;
  navigatorArrowInsetFracOfViewportWidth: number;
  /** Vertical inset for day cells from band top/bottom (fraction of band height). */
  dayCellVerticalPadFracOfBandHeight: number;
  /** Emphasis multiplier baseline for non-current day cells (alpha blend). */
  dayCellNeighborEmphasis: number;
  /** Emphasis for the current/selected center cell. */
  dayCellSelectedEmphasis: number;
  /** Micro label baseline Y as a fraction of band height (0 = top of band). */
  leftMicroLabelYFracOfBandHeight: number;
  /** Letter-spacing (em) for the LOCAL TIME / UTC TIME micro label. */
  leftMicroLabelLetterSpacingEm: number;
  /** Primary clock Y as a fraction of band height. */
  leftPrimaryTimeYFracOfBandHeight: number;
  /** Vertical center for boundary glyphs / day-line midline reference. */
  centerDayLineMidYFracOfBandHeight: number;
  /** Day cell weekday line Y (center strip). */
  centerDayCellWeekdayYFracOfBandHeight: number;
  /** Day cell date line Y (center strip). */
  centerDayCellDateYFracOfBandHeight: number;
  /**
   * Subtract from side readout Y positions (fraction of bottom band height) so left/right floats sit higher
   * over the map — independent of the day-line indicator block.
   */
  sideReadoutVerticalLiftFracOfBandHeight: number;
  /**
   * Subtract from day-line indicator Y positions (fraction of bottom band height) — independent of side readouts.
   */
  dayLineIndicatorVerticalLiftFracOfBandHeight: number;
  /** Weekday line alpha = base + span × emphasis (emphasis from neighbor/selected tokens). */
  dayCellWeekdayAlphaBase: number;
  dayCellWeekdayAlphaSpan: number;
  /** Date line alpha = base + span × emphasis. */
  dayCellDateAlphaBase: number;
  dayCellDateAlphaSpan: number;
  /** Shorten vertical hairlines between day columns so they clear rounded corners. */
  dayCellColumnDividerInsetFracOfCellHeight: number;
  dayCellColumnDividerInsetMinPx: number;
  dayCellColumnDividerInsetMaxPx: number;
  /** Column content inset from chevron column as a fraction of chevron cap height. */
  navigatorColumnGutterFracOfChevronPx: number;
  /** Arrow control well width: pad×2 + chevronPx × this. */
  navigatorArrowWellWidthFracOfChevronPx: number;
  /** Arrow well height clamps (fractions of cell row height / band height). */
  navigatorArrowWellHeightFracOfCellHeight: number;
  navigatorArrowWellHeightMaxFracOfBandHeight: number;
  /** Rounded corner on arrow well: min(height × this, cap px). */
  navigatorArrowWellCornerRadiusFracOfHeight: number;
  navigatorArrowWellCornerRadiusMaxPx: number;
  /** Outer navigator frame corner radius cap (px). */
  navigatorFrameCornerRadiusMaxPx: number;
}

/**
 * Inset of the bottom chrome cluster from the viewport bottom (floating overlay), and
 * canvas text shadow for lightweight left/right readouts (no panel wells).
 */
export interface BottomChromeOverlayTokens {
  bottomMarginMinPx: number;
  bottomMarginMaxPx: number;
  bottomMarginFracOfViewportHeight: number;
  /** Left/right floating labels: shadow for legibility over the map. */
  sideReadoutTextShadowColor: string;
  sideReadoutTextShadowBlurPx: number;
  sideReadoutTextShadowOffsetXPx: number;
  sideReadoutTextShadowOffsetYPx: number;
  /**
   * Vertical fade above the bottom HUD band: darkens map pixels just under the readouts so the lower instrument row
   * meets the map with a soft bezel (not a floating-text-only edge).
   */
  mapHudBoundaryFadeDepthMinPx: number;
  mapHudBoundaryFadeDepthMaxPx: number;
  mapHudBoundaryFadeDepthFracOfViewportHeight: number;
  mapHudBoundaryFadeColorTop: string;
  /** Darkest sample at the soft fade end; kept subdued so the map→HUD edge does not read as a band or seam. */
  mapHudBoundaryFadeColorBottom: string;
  /**
   * Full-width plate over the bottom instrument layout box (CSS px), drawn before floating readouts.
   * Default is fully transparent so the map shows through unchanged; raise alpha slightly for a uniform HUD tint.
   */
  bottomInstrumentBandPlateFill: string;
}

/** Logical height of the bottom chrome row (navigator + flanking readouts); used for vertical proportions. */
export interface BottomChromeBandHeightTokens {
  heightFracOfViewport: number;
  minHeightPx: number;
  maxHeightPx: number;
}

export interface BottomChromeStyle {
  colors: BottomChromeColorTokens;
  typography: BottomChromeTypographyBounds;
  spacing: BottomChromeSpacingTokens;
  layout: BottomChromeLayoutTokens;
  overlay: BottomChromeOverlayTokens;
  bandHeight: BottomChromeBandHeightTokens;
}

export const BOTTOM_CHROME_STYLE: BottomChromeStyle = {
  colors: {
    microLabel: "rgba(112, 124, 156, 0.62)",
    primaryTime: "rgba(252, 253, 255, 0.99)",
    dayCellWeekday: "rgba(162, 176, 206, 0.92)",
    dayCellDate: "rgba(228, 232, 244, 0.96)",
    dayCellBackgroundMuted: "rgba(255, 255, 255, 0.038)",
    dayCellBackgroundSelected: "rgba(255, 255, 255, 0.13)",
    navigatorChevron: "rgba(190, 202, 230, 0.84)",
    navigatorArrowWell: "rgba(0, 0, 0, 0.30)",
    navigatorFrameStroke: "rgba(255, 255, 255, 0.11)",
    navigatorDayRowWell: "rgba(0, 0, 0, 0.26)",
    dayCellColumnDivider: "rgba(255, 255, 255, 0.058)",
    dayCellSelectedStroke: "rgba(255, 255, 255, 0.17)",
    dayLineBoundarySplit: "rgba(255, 255, 255, 0.14)",
  },
  typography: {
    microLabelMinPx: 7,
    microLabelMaxPx: 9,
    microLabelFracOfViewportWidth: 0.0048,
    primaryTimeMinPx: 13,
    primaryTimeMaxPx: 19,
    primaryTimeFracOfViewportWidth: 0.016,
    dayCellWeekdayMinPx: 7,
    dayCellWeekdayMaxPx: 9,
    dayCellWeekdayFracOfViewportWidth: 0.0048,
    dayCellDatePrimaryMinPx: 11,
    dayCellDatePrimaryMaxPx: 14,
    dayCellDatePrimaryFracOfViewportWidth: 0.0081,
    dayCellDateSecondaryMinPx: 9,
    dayCellDateSecondaryMaxPx: 11,
    dayCellDateSecondaryFracOfViewportWidth: 0.0064,
    navigatorChevronMinPx: 13,
    navigatorChevronMaxPx: 20,
    navigatorChevronFracOfViewportWidth: 0.0125,
  },
  spacing: {
    dayCellGapMinPx: 2,
    dayCellGapMaxPx: 5,
    dayCellGapFracOfViewportWidth: 0.0016,
    dayCellCornerRadiusMinPx: 1,
    dayCellCornerRadiusMaxPx: 3,
    dayCellCornerRadiusFracOfViewportWidth: 0.00045,
    navigatorInnerPadMinPx: 5,
    navigatorInnerPadMaxPx: 11,
    navigatorInnerPadFracOfViewportWidth: 0.0042,
    navigatorArrowWellPadMinPx: 3,
    navigatorArrowWellPadMaxPx: 7,
    navigatorArrowWellPadFracOfViewportWidth: 0.0024,
  },
  layout: {
    horizontalPaddingMinPx: 14,
    horizontalPaddingMaxPx: 26,
    horizontalPaddingFracOfViewportWidth: 0.018,
    centerStripWidthFracOfViewport: 0.36,
    centerStripMinWidthPx: 200,
    centerStripMaxWidthPx: 640,
    minSidePanelWidthPx: 72,
    centerStripSideGutterPx: 6,
    dayLineStripViewportEdgeInsetMinPx: 10,
    dayLineStripViewportEdgeInsetMaxPx: 32,
    dayLineStripViewportEdgeInsetFracOfViewportWidth: 0.014,
    navigatorArrowInsetMinPx: 10,
    navigatorArrowInsetMaxPx: 18,
    navigatorArrowInsetFracOfViewportWidth: 0.0105,
    dayCellVerticalPadFracOfBandHeight: 0.1,
    dayCellNeighborEmphasis: 0.42,
    dayCellSelectedEmphasis: 1,
    leftMicroLabelYFracOfBandHeight: 0.24,
    leftMicroLabelLetterSpacingEm: 0.12,
    leftPrimaryTimeYFracOfBandHeight: 0.555,
    centerDayLineMidYFracOfBandHeight: 0.52,
    centerDayCellWeekdayYFracOfBandHeight: 0.34,
    centerDayCellDateYFracOfBandHeight: 0.62,
    sideReadoutVerticalLiftFracOfBandHeight: 1.10,
    dayLineIndicatorVerticalLiftFracOfBandHeight: 0.09,
    dayCellWeekdayAlphaBase: 0.24,
    dayCellWeekdayAlphaSpan: 0.48,
    dayCellDateAlphaBase: 0.38,
    dayCellDateAlphaSpan: 0.62,
    dayCellColumnDividerInsetFracOfCellHeight: 0.07,
    dayCellColumnDividerInsetMinPx: 1,
    dayCellColumnDividerInsetMaxPx: 4,
    navigatorColumnGutterFracOfChevronPx: 0.5,
    navigatorArrowWellWidthFracOfChevronPx: 0.85,
    navigatorArrowWellHeightFracOfCellHeight: 0.72,
    navigatorArrowWellHeightMaxFracOfBandHeight: 0.52,
    navigatorArrowWellCornerRadiusFracOfHeight: 0.22,
    navigatorArrowWellCornerRadiusMaxPx: 5,
    navigatorFrameCornerRadiusMaxPx: 5,
  },
  overlay: {
    bottomMarginMinPx: 48,
    bottomMarginMaxPx: 100,
    bottomMarginFracOfViewportHeight: 0.072,
    sideReadoutTextShadowColor: "rgba(0, 4, 14, 0.94)",
    sideReadoutTextShadowBlurPx: 6,
    sideReadoutTextShadowOffsetXPx: 0,
    sideReadoutTextShadowOffsetYPx: 1,
    mapHudBoundaryFadeDepthMinPx: 16,
    mapHudBoundaryFadeDepthMaxPx: 44,
    mapHudBoundaryFadeDepthFracOfViewportHeight: 0.034,
    mapHudBoundaryFadeColorTop: "rgba(2, 12, 32, 0)",
    mapHudBoundaryFadeColorBottom: "rgba(2, 14, 38, 0.11)",
    bottomInstrumentBandPlateFill: "rgba(0, 0, 0, 0)",
  },
  bandHeight: {
    heightFracOfViewport: 0.072,
    minHeightPx: 40,
    maxHeightPx: 88,
  },
};
