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
 * Renderer-agnostic visual tokens for the fixed top instrument strip (Libration-style tape).
 * Canvas draws these today; WebGL/WebGPU backends can consume the same semantic keys.
 *
 * Geometry lives in {@link computeUtcTopScaleRowMetrics} / {@link computeTopBandCircleStackMetrics} /
 * {@link computeUtcCircleMarkerRadius}; this module is color, weight, and layout tokens for the circle stack.
 */

/** rgba(...) strings — stable for canvas and future GPU uniform packing. */
export interface TopChromeRgbaTokens {
  /** Full top band backdrop (deep instrument blue). */
  stripBackground: string;
  /** Middle tick-rail band — separates circle row from cyan zone strip. */
  tickRailBackground: string;
  /** Upper circle-row bed (stronger panel blue). */
  circleBandBedDeep: string;
  /** Gradient mid layer in circle row (subtle lift). */
  circleBandBedMid: string;
  /** Horizontal hairline under circle bed “shelf”. */
  circleBandShelfHighlight: string;
  /** Shadow under circle bed shelf. */
  circleBandShelfShadow: string;
  /** Hairline at viewport x≈0 and x≈width inside the top band (instrument edge / wrap seam read). */
  verticalEdgeBezel: string;
  /** Same edge treatment continued over the map area below the top band (full viewport height segment). */
  viewportSideBezelOnMap: string;
}

export interface TopChromeTimezoneTabTokens {
  /** Alternating column fills (even index / odd index). Brighter cyan-teal, reference-like. */
  fillEven: string;
  fillOdd: string;
  /** Selected structural column (reference meridian / map anchor). */
  fillActive: string;
  /** Outer trapezoid stroke. */
  strokeOuter: string;
  /** Inner top highlight on tab face. */
  highlightTop: string;
  /** Bottom edge shadow inside tab. */
  innerBottomShadow: string;
  /** Legacy trapezoid-only taper (fraction of segment width); neck-body tabs use {@link neckWidthFrac}. */
  taper: number;
  /** Neck width at the top of each column tab, as a fraction of segment inner width (narrow connection toward tick rail). */
  neckWidthFrac: number;
  /** Neck depth scales with timezone band height; clamped by min/max px. */
  neckHeightFracOfZone: number;
  neckHeightMinPx: number;
  neckHeightMaxPx: number;
  /** Inset above/below the tab fill inside the timezone band (fraction of zone height); capped by {@link zoneFillPadMaxPx}. */
  zoneFillPadFracOfZone: number;
  zoneFillPadMaxPx: number;
  /**
   * Horizontal neck top: fillet radius as a fraction of segment width — softens the join between the flat
   * neck and the sloped shoulders (instrument-badge feel vs sharp pentagon).
   */
  neckTopShoulderFilletFrac: number;
  /**
   * Body “shoulder” where sloped side meets vertical column edge (at yNeck): fillet radius as a fraction
   * of segment width — blends neck transition into the column without a hard kink.
   */
  neckBodyCornerFilletFrac: number;
  /**
   * Vertical anchor for the zone letter within the NATO / timezone **rectangular** body (between horizontal paddings):
   * {@link buildTimezoneLetterRowRenderPlan} places `cy` at `fillTop + fillH * this` with `textBaseline: "middle"`.
   * 0.5 is geometric center; values >0.5 shift the anchor downward in the cell.
   */
  zoneLetterCenterFracOfBody: number;
  /**
   * Top hairline highlight insets from the neck ends (px), scaled by the computed neck-top fillet so the stroke
   * stays on the flat neck span as shoulders round.
   */
  neckHighlightInsetFracOfTopFillet: number;
  neckHighlightInsetMinPx: number;
  neckHighlightInsetMaxPx: number;
  /** Below this px, both shoulder fillets are skipped and the legacy straight neck/shoulder path is used. */
  neckShoulderFilletMinPx: number;
}

export interface TopChromeTickTokens {
  /**
   * Single stroke for every mark in the upper tick rail (hour boundaries, quarter majors, quarter minors).
   * Hierarchy is length-only — same {@link lineWidth} and {@link stroke} for all tick classes.
   */
  stroke: string;
  lineWidth: number;
  /** Horizontal baseline under the ticks (softer than tick strokes so length hierarchy reads clearly). */
  baseline: string;
  /** Hairline width for {@link baseline} only. */
  baselineLineWidth: number;
  /**
   * Present-time tick (reference meridian) in the tick rail: stroke width = {@link lineWidth} × this value.
   * Tabs do not draw their own vertical “now” mark; only this rail segment indicates present time.
   */
  presentTimeTickWidthMulTapeTick: number;
  /**
   * Core stroke for the active structural meridian present-time tick in the tick rail (distinct from generic hour ticks).
   */
  presentTimeStroke: string;
  /** Drawn beneath {@link presentTimeStroke} at {@link presentTimeHaloWidthMul} × core width for contrast on mixed backgrounds. */
  presentTimeHaloStroke: string;
  /** Halo width multiplier vs the present-time core line width (not vs generic tape ticks). */
  presentTimeHaloWidthMul: number;
  /**
   * Core width = {@link lineWidth} × this; paired with {@link referenceMeridianMapHaloWidthMul}, included in the
   * present-time tick’s wrap half-extent so seam tiling stays consistent (no reference line on the map strip).
   */
  referenceMeridianMapLineWidthMulTapeTick: number;
  referenceMeridianMapHaloWidthMul: number;
  /** Reserved stroke tokens (not drawn on the map strip; widths above still participate in wrap extent). */
  referenceMeridianMapCoreStroke: string;
  referenceMeridianMapHaloStroke: string;
}

export interface TopChromeHourDiskTokens {
  dropShadow: string;
  outerGlow: string;
  fill: string;
  rim: string;
  label: string;
}

/** Flat hour paddle: solid head + thin stem; numerals use {@link numeralFill}. */
export interface TopChromeHourPaddleTokens {
  dropShadow: string;
  outerGlow: string;
  headFill: string;
  headRim: string;
  /** Stem fill (same stroke family as head rim; kept separate for fine tuning). */
  handleFill: string;
  /** Bold primary hour glyph inside the head. */
  numeralFill: string;
}

/** Typography inside the white hour disks (canvas `ctx.font` size in CSS px). */
export interface TopChromeHourDiskLabelTokens {
  /** Primary scale: fraction of {@link UtcTopScaleCircleMarker.radiusPx}. */
  sizeFracOfRadius: number;
  minPx: number;
  maxPx: number;
  /** Secondary cap from viewport width so labels stay bounded on ultra-wide layouts. */
  maxFracOfViewportWidth: number;
}

/** Plain next-hour numerals above the hour disks. */
export interface TopChromeTopHourNumeralTokens {
  color: string;
  /** Multiplier vs disk label size (layout uses disk radius / band height). */
  sizeFracOfDiskLabel: number;
  /** CSS font-weight number for canvas (`ctx.font`). Below circled disk labels (800) for hierarchy. */
  fontWeight: number;
}

/** NOON / MIDNIGHT beneath 12 PM / 12 AM disks. */
export interface TopChromeMarkerAnnotationTokens {
  color: string;
  /** Relative to disk label size. */
  sizeFracOfDiskLabel: number;
  /** CSS font-weight number for canvas (`ctx.font`). */
  fontWeight: number;
}

export interface TopChromeZoneTextTokens {
  /** NATO zone letter — matches {@link TopChromeHourPaddleTokens.headFill} (bright solid). */
  letter: string;
  /** Small geography caption under the active column’s letter (reference label). */
  geographyCaption: string;
}

export interface TopChromeSeamTokens {
  /** Between top strip and map: shadow + cool highlight. */
  bottomShadow: string;
  bottomHighlight: string;
  /**
   * Short vertical fade painted onto the map just below the top seam (source-over): darkens the upper map edge so the
   * chrome reads as a recessed instrument face rather than a hard crop.
   */
  mapFaceBezelDepthPx: number;
  mapFaceBezelColorTop: string;
  mapFaceBezelColorBottom: string;
}

/** Shared CSS pixel stroke width for all upper tick marks (boundaries, majors, minors). */
export const TOP_TAPE_TICK_LINE_WIDTH = 1.26 as const;

/** Default multiplier for the tick-rail present-time tick stroke vs ordinary tape ticks ({@link TOP_TAPE_TICK_LINE_WIDTH}). */
export const TOP_PRESENT_TIME_TICK_WIDTH_MUL_TAPE_TICK = 2.5 as const;

/**
 * Pixel size for numerals inside white hour disks — same formula as {@link renderDisplayChrome} uses for labels.
 */
export function computeHourDiskLabelSizePx(
  diskRadiusPx: number,
  viewportWidthPx: number,
  tokens: TopChromeHourDiskLabelTokens = TOP_CHROME_STYLE.hourDiskLabel,
): number {
  const dl = tokens;
  const vw = viewportWidthPx;
  return Math.min(
    dl.maxPx,
    Math.max(dl.minPx, Math.min(diskRadiusPx * dl.sizeFracOfRadius, vw * dl.maxFracOfViewportWidth)),
  );
}

/**
 * Max fraction of the NATO row **inner body height** ({@link buildTimezoneLetterRowRenderPlan} `fillH`) used for the
 * zone letter em size. Keeps clear vertical inset in short strips while {@link computeHourDiskLabelSizePx} still sets the ceiling.
 */
export const NATO_ZONE_LETTER_MAX_HEIGHT_FRAC_OF_BODY = 0.87 as const;

/**
 * NATO zone letter font size (CSS px): scales with hour-disk labels, but caps against the zone body height so letters
 * stay proportioned inside the (reduced) NATO row instead of filling the cell edge-to-edge.
 */
export function computeTimezoneLetterSizePx(diskLabelSizePx: number, zoneLetterBodyHeightPx: number): number {
  const disk = Math.max(0, diskLabelSizePx);
  const body = Math.max(0, zoneLetterBodyHeightPx);
  if (body <= 0) {
    return disk;
  }
  const maxFit = body * NATO_ZONE_LETTER_MAX_HEIGHT_FRAC_OF_BODY;
  return Math.min(disk, maxFit);
}

/**
 * First-class vertical layout for the circle-band stack (padding → gap → hour paddles → gap → NOON/MIDNIGHT crown).
 * The legacy upper next-hour numeral row is not allocated height (see {@link surplusUpperFrac} / {@link upperRowMinPx}).
 * {@link computeTopBandCircleStackMetrics} turns these into integer CSS px; render uses explicit row centers (no baseline hacks).
 */
export const TOP_CHROME_CIRCLE_STACK_LAYOUT = {
  /** Minimum padding from circle-band top to the gap above paddle row (headroom). */
  padTopMinPx: 6,
  /** Minimum padding from annotation row bottom to circle-band bottom. */
  padBottomMinPx: 4,
  /** Minimum gap between circle-band top padding and paddle row (replaces former upper-numeral gap). */
  gapNumeralToDiskMinPx: 4,
  /** Minimum gap between disk row and NOON/MIDNIGHT row. */
  gapDiskToAnnotationMinPx: 5,
  /** Scales padding above minimum with circle-band height. */
  padTopFracOfBandH: 0.055,
  padBottomFracOfBandH: 0.036,
  /** Scales gaps above minimum with circle-band height. */
  gapNumeralToDiskFracOfBandH: 0.055,
  gapDiskToAnnotationFracOfBandH: 0.06,
  /** Preferred minimum row heights (px); solver may shrink toward floors if the band is short. */
  upperRowMinPx: 0,
  diskRowMinPx: 27,
  annotationRowMinPx: 12,
  upperRowFloorPx: 0,
  diskRowFloorPx: 22,
  annotationRowFloorPx: 9,
  /** Surplus row height after minimums: upper (unused) / disk / annotation (sums to 1). */
  surplusUpperFrac: 0,
  surplusDiskFrac: 0.46,
  surplusAnnotationFrac: 0.54,
} as const;

/**
 * Authoritative top-strip styling (Libration reference): cyan-teal zone tabs, deep blue instrument field,
 * bright cool-white hour disks; upper tick hierarchy uses length only (unified stroke). Not user-configurable.
 */
export const TOP_CHROME_STYLE = {
  instrument: {
    stripBackground: "rgba(2, 14, 38, 0.995)",
    tickRailBackground: "rgba(8, 26, 58, 0.98)",
    circleBandBedDeep: "rgba(4, 22, 58, 0.99)",
    circleBandBedMid: "rgba(6, 32, 72, 0.97)",
    circleBandShelfHighlight: "rgba(100, 168, 220, 0.075)",
    circleBandShelfShadow: "rgba(0, 0, 0, 0.42)",
    verticalEdgeBezel: "rgba(100, 175, 220, 0.07)",
    /** Continuation of the side bezel on the map strip (slightly softer than {@link TopChromeRgbaTokens.verticalEdgeBezel}). */
    viewportSideBezelOnMap: "rgba(100, 175, 220, 0.046)",
  },
  timezoneTab: {
    fillEven: "rgba(20, 108, 132, 0.9)",
    fillOdd: "rgba(16, 94, 118, 0.88)",
    /**
     * Selected column: reference meridian / map anchor. Midpoint between the prior strong
     * `rgba(0, 52, 78, 0.96)` and fillOdd so the highlight stays obvious but less heavy.
     */
    fillActive: "rgba(14, 78, 102, 0.92)",
    strokeOuter: "rgba(190, 228, 248, 0.2)",
    highlightTop: "rgba(210, 242, 255, 0.32)",
    innerBottomShadow: "rgba(0, 24, 40, 0.45)",
    taper: 0.072,
    neckWidthFrac: 0.36,
    neckHeightFracOfZone: 0.2,
    neckHeightMinPx: 3,
    neckHeightMaxPx: 7,
    zoneFillPadFracOfZone: 0.038,
    zoneFillPadMaxPx: 2,
    neckTopShoulderFilletFrac: 0.038,
    neckBodyCornerFilletFrac: 0.031,
    zoneLetterCenterFracOfBody: 0.5,
    neckHighlightInsetFracOfTopFillet: 0.38,
    neckHighlightInsetMinPx: 0.65,
    neckHighlightInsetMaxPx: 1.25,
    neckShoulderFilletMinPx: 0.42,
  },
  /** Vertical lines at UTC hour boundaries through the timezone band. */
  zoneBoundary: "rgba(6, 38, 52, 0.38)",
  ticks: {
    stroke: "rgba(218, 235, 252, 0.88)",
    lineWidth: TOP_TAPE_TICK_LINE_WIDTH,
    baseline: "rgba(128, 176, 214, 0.26)",
    baselineLineWidth: 0.78,
    presentTimeTickWidthMulTapeTick: TOP_PRESENT_TIME_TICK_WIDTH_MUL_TAPE_TICK,
    presentTimeStroke: "rgba(248, 252, 255, 0.97)",
    presentTimeHaloStroke: "rgba(4, 18, 48, 0.62)",
    presentTimeHaloWidthMul: 2.35,
    referenceMeridianMapLineWidthMulTapeTick: 1.05,
    referenceMeridianMapHaloWidthMul: 2.6,
    referenceMeridianMapCoreStroke: "rgba(198, 228, 255, 0.28)",
    referenceMeridianMapHaloStroke: "rgba(0, 10, 28, 0.42)",
  },
  bandSeams: {
    circleToTick: "rgba(120, 178, 235, 0.085)",
    tickToZone: "rgba(48, 98, 142, 0.17)",
  },
  hourDisk: {
    dropShadow: "rgba(0, 8, 22, 0.56)",
    outerGlow: "rgba(200, 235, 255, 0.24)",
    fill: "rgba(235, 246, 255, 0.97)",
    rim: "rgba(70, 140, 210, 0.55)",
    label: "rgba(8, 28, 58, 0.94)",
  },
  hourPaddle: {
    dropShadow: "rgba(0, 8, 22, 0.38)",
    outerGlow: "rgba(155, 200, 235, 0.06)",
    headFill: "rgba(235, 246, 255, 0.98)",
    headRim: "rgba(70, 130, 188, 0.42)",
    handleFill: "rgba(235, 246, 255, 0.98)",
    numeralFill: "rgba(8, 28, 58, 0.94)",
  },
  /** Circled hour numerals — sized vs disk radius; upper row / annotations scale via {@link topHourNumeral} / {@link markerAnnotation}. */
  hourDiskLabel: {
    sizeFracOfRadius: 1.1,
    minPx: 12.25,
    maxPx: 32,
    maxFracOfViewportWidth: 0.013,
  },
  topHourNumeral: {
    color: "rgba(188, 210, 238, 0.94)",
    sizeFracOfDiskLabel: 0.96,
    fontWeight: 700,
  },
  markerAnnotation: {
    color: "rgba(220, 235, 252, 0.94)",
    sizeFracOfDiskLabel: 0.635,
    fontWeight: 750,
  },
  /**
   * Default ink for 24-hour indicator entries (text / radial line) on the circle-band instrument bed
   * ({@link instrument.circleBandBed*}). Distinct from {@link hourDisk.label}, which targets white disk fills.
   */
  hourIndicatorEntries: {
    defaultForeground: "rgba(225, 238, 252, 0.94)",
    defaultRadialWedgeFill: "rgba(210, 232, 255, 0.42)",
  },
  zoneText: {
    letter: "rgba(235, 246, 255, 0.98)",
    /** Subordinate NATO cell line: structural UTC offset (not civil-clock authority). */
    utcOffsetSubrow: "rgba(190, 218, 238, 0.58)",
    geographyCaption: "rgba(255, 255, 255, 0.82)",
  },
  seams: {
    bottomShadow: "rgba(0, 0, 0, 0.48)",
    bottomHighlight: "rgba(120, 200, 255, 0.12)",
    mapFaceBezelDepthPx: 5,
    mapFaceBezelColorTop: "rgba(0, 10, 28, 0.42)",
    mapFaceBezelColorBottom: "rgba(0, 4, 12, 0)",
  },
} as const;

/**
 * Alpha applied to automatic black/white NATO / timezone letter ink when alternating cell backgrounds are authored;
 * matches {@link TOP_CHROME_STYLE.zoneText.letter} opacity.
 */
export const TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA = 0.98 as const;

/**
 * When the 24-hour tickmarks tape background is user-overridden, resolver rebuilds tape/baseline ink as
 * `rgba(#000|#fff, α)` using these alphas — matching {@link TOP_CHROME_STYLE.ticks} stroke/baseline opacities.
 */
export const TOP_CHROME_TICK_TAPE_CONTRAST_INK_ALPHAS = {
  tickStroke: 0.88,
  baselineStroke: 0.26,
} as const;

export type TopChromeStyle = typeof TOP_CHROME_STYLE;
