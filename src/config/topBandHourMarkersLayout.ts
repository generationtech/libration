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
 * Renderer-agnostic geometry for semantic top-band hour markers (disk-row placement, wrap half-extent).
 * No Canvas or RenderPlan types — pairs with {@link buildSemanticTopBandHourMarkers} and tape marker inputs.
 */

import type { HourDiskTextGlyphInkMetrics } from "./hourDiskTextGlyphInkMetrics.ts";
import type { SemanticTopBandHourMarkersPlan } from "./topBandHourMarkersSemanticTypes.ts";
import type { EffectiveTopBandHourMarkerBehavior } from "./topBandHourMarkersTypes.ts";
import {
  TOP_BAND_DISK_WRAP_HALO_PAD_PX,
  topBandDiskWrapHalfExtentPx,
} from "./topBandDiskWrapGeometry.ts";

/**
 * Resolved vertical model for the text-mode disk row (the band slice that holds hour numerals).
 */
export type TextModeDiskBandVerticalMetrics = {
  /**
   * Layout text-core height (px): for 24h text Option A, measured glyph ink height
   * ({@link HourDiskTextGlyphInkMetrics.glyphInkHeightPx}); otherwise rounded nominal em/core height.
   */
  textCoreHeightPx: number;
  /**
   * Total padding above the text core inside the disk row (px). For layout rows, this is the configured top inset; for
   * intrinsic sizing rows, automatic padding from the legacy pad-frac model.
   */
  topPadInsideDiskPx: number;
  /**
   * Total padding below the text core inside the disk row (px). Same semantics as {@link topPadInsideDiskPx}.
   */
  bottomPadInsideDiskPx: number;
  /** Final disk-row height (px): {@code textCoreHeightPx + top + bottom} (no hidden floors). */
  diskBandH: number;
  /**
   * Always {@code 0} for layout metrics; reserved for callers that may attach non-user slack elsewhere.
   */
  structuralDiskRowSlackPx: number;
  /**
   * Y offset from the disk-row top to the layout vertical center for disk numerals
   * ({@code topPadInsideDiskPx + textCoreHeightPx / 2}); Canvas uses alphabetic baseline + measured glyph centering.
   */
  textCenterYFromDiskRowTopPx: number;
};

function computeTextCoreHeightPx(args: {
  fontSizePx: number;
  sizeMultiplier: number;
  fontMetrics?: { heightPx: number };
}): number {
  const { fontSizePx } = args;
  const rawCore = args.fontMetrics?.heightPx ?? fontSizePx;
  return Math.max(1, Math.round(rawCore));
}

/**
 * **Intrinsic (sizing-only)** vertical model for text-mode 24h indicators: automatic in-disk padding from the legacy
 * pad-frac + safety rules. Used for marker-radius / nominal font fixed-point solving only — it does **not** read
 * configured text-row insets so changing those cannot feed back into sizing.
 */
export function computeTextModeIntrinsicDiskBandVerticalMetrics(args: {
  fontSizePx: number;
  sizeMultiplier: number;
  fontMetrics?: { heightPx: number };
}): TextModeDiskBandVerticalMetrics {
  const textCoreHeightPx = computeTextCoreHeightPx(args);
  const sm = Math.max(0.5, Math.min(3, args.sizeMultiplier));
  const padFracTotal = Math.min(0.12, Math.max(0.06, 0.06 + 0.04 * (sm - 1)));
  const totalPadPx = Math.round(textCoreHeightPx * padFracTotal);
  let topPadInsideDiskPx = Math.floor(totalPadPx / 2);
  let bottomPadInsideDiskPx = totalPadPx - topPadInsideDiskPx;
  let diskBandH = textCoreHeightPx + topPadInsideDiskPx + bottomPadInsideDiskPx;
  const safetyFloor = Math.max(7, Math.round(args.fontSizePx * 0.62));
  if (diskBandH < safetyFloor) {
    const extra = safetyFloor - diskBandH;
    const addTop = Math.floor(extra / 2);
    const addBottom = extra - addTop;
    topPadInsideDiskPx += addTop;
    bottomPadInsideDiskPx += addBottom;
    diskBandH = textCoreHeightPx + topPadInsideDiskPx + bottomPadInsideDiskPx;
  }
  const textCenterYFromDiskRowTopPx = topPadInsideDiskPx + textCoreHeightPx * 0.5;
  const natural = textCoreHeightPx + topPadInsideDiskPx + bottomPadInsideDiskPx;
  return {
    textCoreHeightPx,
    topPadInsideDiskPx,
    bottomPadInsideDiskPx,
    diskBandH,
    structuralDiskRowSlackPx: diskBandH - natural,
    textCenterYFromDiskRowTopPx,
  };
}

/**
 * **Layout** vertical model: disk row height = text core + **authoritative** configured top/bottom insets (px). This is
 * the truthful row-internal padding surfaced in the config UI. Marker radius / nominal font size must still be solved
 * from {@link computeTextModeIntrinsicDiskBandVerticalMetrics} only, not from this row height.
 */
export function computeTextModeLayoutDiskBandVerticalMetrics(args: {
  fontSizePx: number;
  sizeMultiplier: number;
  fontMetrics?: { heightPx: number };
  /** Total px padding above the text core inside the disk row (already clamped at the callsite). */
  rowTopInsetPx: number;
  /** Total px padding below the text core inside the disk row (already clamped at the callsite). */
  rowBottomInsetPx: number;
  /**
   * When set (24h indicator entries, text realization), row core height follows measured glyph ink — not rounded
   * nominal font size — so configured insets align with visible padding around numeral ink.
   */
  glyphInkMetrics?: HourDiskTextGlyphInkMetrics;
}): TextModeDiskBandVerticalMetrics {
  const textCoreHeightPx =
    args.glyphInkMetrics !== undefined
      ? Math.max(1, args.glyphInkMetrics.glyphInkHeightPx)
      : computeTextCoreHeightPx(args);
  const topPadInsideDiskPx = Math.max(0, Math.round(args.rowTopInsetPx));
  const bottomPadInsideDiskPx = Math.max(0, Math.round(args.rowBottomInsetPx));
  const naturalH = textCoreHeightPx + topPadInsideDiskPx + bottomPadInsideDiskPx;
  const diskBandH = naturalH;
  const structuralDiskRowSlackPx = 0;
  const textCenterYFromDiskRowTopPx = topPadInsideDiskPx + textCoreHeightPx * 0.5;
  return {
    textCoreHeightPx,
    topPadInsideDiskPx,
    bottomPadInsideDiskPx,
    diskBandH,
    structuralDiskRowSlackPx,
    textCenterYFromDiskRowTopPx,
  };
}

/** @deprecated Use {@link computeTextModeIntrinsicDiskBandVerticalMetrics} (sizing) or {@link computeTextModeLayoutDiskBandVerticalMetrics} (layout). */
export function computeTextModeDiskBandVerticalMetrics(args: {
  fontSizePx: number;
  sizeMultiplier: number;
  fontMetrics?: { heightPx: number };
}): TextModeDiskBandVerticalMetrics {
  return computeTextModeIntrinsicDiskBandVerticalMetrics(args);
}

/**
 * Disk row height for text mode: {@link computeTextModeLayoutDiskBandVerticalMetrics} when insets are passed, otherwise
 * intrinsic sizing height.
 */
export function computeTextIndicatorRowHeightPx(args: {
  fontSizePx: number;
  sizeMultiplier: number;
  fontMetrics?: { heightPx: number };
  textTopMarginPx?: number;
  textBottomMarginPx?: number;
  glyphInkMetrics?: HourDiskTextGlyphInkMetrics;
}): number {
  if (args.textTopMarginPx !== undefined || args.textBottomMarginPx !== undefined) {
    return computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: args.fontSizePx,
      sizeMultiplier: args.sizeMultiplier,
      fontMetrics: args.fontMetrics,
      rowTopInsetPx: args.textTopMarginPx ?? 0,
      rowBottomInsetPx: args.textBottomMarginPx ?? 0,
      glyphInkMetrics: args.glyphInkMetrics,
    }).diskBandH;
  }
  return computeTextModeIntrinsicDiskBandVerticalMetrics(args).diskBandH;
}

/**
 * Vertical slice of the circle band stack (same fields as {@link buildTopBandCircleBandHourStackRenderPlan} options).
 */
export type TopBandCircleStackLayoutInput = {
  padTopPx: number;
  upperNumeralH: number;
  gapNumeralToDiskPx: number;
  diskBandH: number;
  gapDiskToAnnotationPx: number;
  annotationH: number;
  padBottomPx: number;
  /**
   * Text-mode 24h only: glyph ink used for Option A layout row core height; threaded from
   * {@link resolveTextIndicatorCircleStackMetrics} so semantic layout matches the text-led stack.
   */
  text24hLayoutGlyphInkMetrics?: HourDiskTextGlyphInkMetrics;
};

/**
 * Per-column tape geometry from the existing top-band planner (structural hour + phased x + disk radius).
 */
export type TopBandHourMarkerTapeColumn = {
  centerX: number;
  radiusPx: number;
  structuralHour0To23: number;
  /** Civil-time label inside the disk (unchanged from legacy planner). */
  currentHourLabel: string;
};

export type SemanticTopBandHourMarkerLayoutContext = {
  viewportWidthPx: number;
  topBandYPx: number;
  circleBandHeightPx: number;
  circleStack: TopBandCircleStackLayoutInput;
  /** Typically 24 columns (full UTC tape); must match the render-plan marker count for in-disk semantic paths. */
  markers: readonly TopBandHourMarkerTapeColumn[];
  diskLabelSizePx: number;
  /** Scaled disk-interior content size (text/glyph); defaults to {@link diskLabelSizePx}. */
  markerContentSizePx?: number;
  /**
   * Structural (NATO) column center x from {@link UtcTopScaleHourSegment.centerX}, length 24.
   * Used when {@link EffectiveTopBandHourMarkers.behavior} is `staticZoneAnchored` for analog clocks.
   */
  structuralZoneCenterXPx?: readonly number[];
};

/**
 * One laid-out hour-disk text interior (center, nominal box size, wrap seam half-extent) from the semantic layout pass.
 */
export type LaidOutSemanticTopBandHourTextMarker = {
  structuralHour0To23: number;
  centerX: number;
  centerY: number;
  sizePx: number;
  wrapHalfExtentPx: number;
  displayLabel: string;
};

/** Laid-out analog clock disk interior: static zone x + continuous solar-local hour for the hour hand. */
export type LaidOutSemanticTopBandAnalogClockMarker = {
  structuralHour0To23: number;
  centerX: number;
  centerY: number;
  sizePx: number;
  wrapHalfExtentPx: number;
  continuousHour0To24: number;
  continuousMinute0To60: number;
};

/** Laid-out radial line disk interior (tape column x + same vertical center as hour-disk text / analog). */
export type LaidOutSemanticTopBandRadialLineMarker = {
  structuralHour0To23: number;
  centerX: number;
  centerY: number;
  sizePx: number;
  wrapHalfExtentPx: number;
  /** Civil-time label from the tape column (legacy glyph path passes it; unused for radial stroke). */
  displayLabel: string;
};

/** Laid-out radial wedge disk interior (same geometry as radial line; wedge angle comes from glyph style). */
export type LaidOutSemanticTopBandRadialWedgeMarker = {
  structuralHour0To23: number;
  centerX: number;
  centerY: number;
  sizePx: number;
  wrapHalfExtentPx: number;
  displayLabel: string;
};

/**
 * Disk diameter vs layout radius and band height — matches legacy {@link hourCircleHeadMetrics} in the stack planner.
 */
export function hourCircleHeadMetrics(
  radiusPx: number,
  diskBandH: number,
  viewportWidthPx: number,
): { headD: number } {
  const r = radiusPx;
  const vw = viewportWidthPx;
  const headWMax = Math.min(r * 2.12, vw * 0.059);
  const headHMax = Math.min(diskBandH * 0.96, r * 1.92);
  const headD = Math.min(headWMax, headHMax);
  return { headD };
}

/**
 * Disk row vertical anchor — matches legacy {@link hourCircleYHeadTop} in the stack planner.
 */
export function hourCircleYHeadTop(
  yDiskRow0: number,
  diskBandH: number,
  headD: number,
  gapDiskToAnnotationPx: number,
  yCircleBandBottomPx: number,
): number {
  const slack = Math.max(0, diskBandH - headD);
  const padFromDiskRowBottomPx = Math.min(0.28, Math.max(0.04, slack * 0.012));
  const glowPastFillBottomPx = 2.05;
  const safeBorrowPx = Math.max(0, gapDiskToAnnotationPx - glowPastFillBottomPx);
  const diskDownshiftPx = Math.min(10, safeBorrowPx * 0.98);
  const diskRowBottomBiasedY = yDiskRow0 + slack - padFromDiskRowBottomPx + diskDownshiftPx;

  const gapAboveBandBottomPx = 1.5;
  const inflate = TOP_BAND_DISK_WRAP_HALO_PAD_PX - 1;
  const glowBelowFillPx = Math.max(1.75, inflate + 0.45);
  const tapeCoupledY =
    yCircleBandBottomPx - gapAboveBandBottomPx - headD - glowBelowFillPx;

  return Math.max(diskRowBottomBiasedY, tapeCoupledY);
}

function markerColumnForStructuralHour(
  markers: readonly TopBandHourMarkerTapeColumn[],
  structuralHour0To23: number,
): TopBandHourMarkerTapeColumn | undefined {
  const direct = markers.find((m) => m.structuralHour0To23 === structuralHour0To23);
  if (direct !== undefined) {
    return direct;
  }
  return markers[structuralHour0To23];
}

/**
 * Lays out all 24 semantic hour-marker columns into disk-interior positions for hour-disk text rendering.
 */
export function layoutSemanticTopBandHourMarkers(
  plan: SemanticTopBandHourMarkersPlan,
  ctx: SemanticTopBandHourMarkerLayoutContext,
): readonly LaidOutSemanticTopBandHourTextMarker[] {
  const vw = ctx.viewportWidthPx;
  const y0 = ctx.topBandYPx;
  const circleH = ctx.circleBandHeightPx;
  const circleStack = ctx.circleStack;
  const labelSize = ctx.markerContentSizePx ?? ctx.diskLabelSizePx;
  const isTextRealization = plan.source.realization.kind === "text";

  const yCircleBottom = y0 + circleH;
  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;
  const gDiskToAnn = circleStack.gapDiskToAnnotationPx;
  const circleDiskCy = yDiskRow0 + diskBandH * 0.5;
  const sw = vw / 24;

  const out: LaidOutSemanticTopBandHourTextMarker[] = [];

  for (const inst of plan.instances) {
    const h = inst.structuralHour0To23;
    const m = markerColumnForStructuralHour(ctx.markers, h);
    if (m === undefined) {
      continue;
    }
    let numeralY: number;
    let halfExt: number;

    if (isTextRealization) {
      const diskLabel = ctx.diskLabelSizePx;
      const sizeMultiplier = diskLabel > 0 ? labelSize / diskLabel : 1;
      const effLayout = plan.source.layout;
      const vm = computeTextModeLayoutDiskBandVerticalMetrics({
        fontSizePx: labelSize,
        sizeMultiplier,
        rowTopInsetPx: Math.max(0, Math.round(effLayout.textTopMarginPx ?? 0)),
        rowBottomInsetPx: Math.max(0, Math.round(effLayout.textBottomMarginPx ?? 0)),
        glyphInkMetrics: circleStack.text24hLayoutGlyphInkMetrics,
      });
      numeralY = yDiskRow0 + vm.textCenterYFromDiskRowTopPx;
      halfExt = Math.max(labelSize * 0.62 + TOP_BAND_DISK_WRAP_HALO_PAD_PX, sw * 0.42);
    } else {
      const r = m.radiusPx;
      const ph = r > 0 ? hourCircleHeadMetrics(r, diskBandH, vw) : null;
      const headD = ph?.headD ?? 0;
      const yHeadTop = ph
        ? hourCircleYHeadTop(yDiskRow0, diskBandH, headD, gDiskToAnn, yCircleBottom)
        : yDiskRow0;
      numeralY = ph ? yHeadTop + headD * 0.5 - Math.min(0.55, headD * 0.035) : circleDiskCy;
      halfExt = r > 0 ? topBandDiskWrapHalfExtentPx(r) : labelSize;
    }

    out.push({
      structuralHour0To23: h,
      centerX: m.centerX,
      centerY: numeralY,
      sizePx: labelSize,
      wrapHalfExtentPx: halfExt,
      displayLabel: m.currentHourLabel,
    });
  }

  return out;
}

/**
 * Disk-row layout for radialLine + tape-advected hour24: x from tape columns, y/size/wrap match legacy hour-disk stack.
 */
export function layoutSemanticTopBandRadialLineMarkers(
  plan: SemanticTopBandHourMarkersPlan,
  ctx: SemanticTopBandHourMarkerLayoutContext,
): readonly LaidOutSemanticTopBandRadialLineMarker[] {
  const vw = ctx.viewportWidthPx;
  const y0 = ctx.topBandYPx;
  const circleH = ctx.circleBandHeightPx;
  const circleStack = ctx.circleStack;
  const labelSize = ctx.markerContentSizePx ?? ctx.diskLabelSizePx;

  const yCircleBottom = y0 + circleH;
  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;
  const gDiskToAnn = circleStack.gapDiskToAnnotationPx;
  const circleDiskCy = yDiskRow0 + diskBandH * 0.5;

  const out: LaidOutSemanticTopBandRadialLineMarker[] = [];

  for (const inst of plan.instances) {
    if (inst.realization.kind !== "radialLine" || inst.content.kind !== "hour24Label") {
      continue;
    }
    const h = inst.structuralHour0To23;
    const m = markerColumnForStructuralHour(ctx.markers, h);
    if (m === undefined) {
      continue;
    }
    const r = m.radiusPx;
    const ph = r > 0 ? hourCircleHeadMetrics(r, diskBandH, vw) : null;
    const headD = ph?.headD ?? 0;
    const yHeadTop = ph
      ? hourCircleYHeadTop(yDiskRow0, diskBandH, headD, gDiskToAnn, yCircleBottom)
      : yDiskRow0;
    const numeralY = ph
      ? yHeadTop + headD * 0.5 - Math.min(0.55, headD * 0.035)
      : circleDiskCy;
    const halfExt = r > 0 ? topBandDiskWrapHalfExtentPx(r) : labelSize;

    out.push({
      structuralHour0To23: h,
      centerX: m.centerX,
      centerY: numeralY,
      sizePx: labelSize,
      wrapHalfExtentPx: halfExt,
      displayLabel: m.currentHourLabel,
    });
  }

  return out;
}

/**
 * Disk-row layout for radialWedge + tape-advected hour24: same x/y/size/wrap as radialLine and legacy hour-disk stack.
 */
export function layoutSemanticTopBandRadialWedgeMarkers(
  plan: SemanticTopBandHourMarkersPlan,
  ctx: SemanticTopBandHourMarkerLayoutContext,
): readonly LaidOutSemanticTopBandRadialWedgeMarker[] {
  const vw = ctx.viewportWidthPx;
  const y0 = ctx.topBandYPx;
  const circleH = ctx.circleBandHeightPx;
  const circleStack = ctx.circleStack;
  const labelSize = ctx.markerContentSizePx ?? ctx.diskLabelSizePx;

  const yCircleBottom = y0 + circleH;
  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;
  const gDiskToAnn = circleStack.gapDiskToAnnotationPx;
  const circleDiskCy = yDiskRow0 + diskBandH * 0.5;

  const out: LaidOutSemanticTopBandRadialWedgeMarker[] = [];

  for (const inst of plan.instances) {
    if (inst.realization.kind !== "radialWedge" || inst.content.kind !== "hour24Label") {
      continue;
    }
    const h = inst.structuralHour0To23;
    const m = markerColumnForStructuralHour(ctx.markers, h);
    if (m === undefined) {
      continue;
    }
    const r = m.radiusPx;
    const ph = r > 0 ? hourCircleHeadMetrics(r, diskBandH, vw) : null;
    const headD = ph?.headD ?? 0;
    const yHeadTop = ph
      ? hourCircleYHeadTop(yDiskRow0, diskBandH, headD, gDiskToAnn, yCircleBottom)
      : yDiskRow0;
    const numeralY = ph
      ? yHeadTop + headD * 0.5 - Math.min(0.55, headD * 0.035)
      : circleDiskCy;
    const halfExt = r > 0 ? topBandDiskWrapHalfExtentPx(r) : labelSize;

    out.push({
      structuralHour0To23: h,
      centerX: m.centerX,
      centerY: numeralY,
      sizePx: labelSize,
      wrapHalfExtentPx: halfExt,
      displayLabel: m.currentHourLabel,
    });
  }

  return out;
}

function structuralXForHour(
  behavior: EffectiveTopBandHourMarkerBehavior,
  structuralHour0To23: number,
  tapeColumn: TopBandHourMarkerTapeColumn,
  structuralZoneCenterXPx: readonly number[] | undefined,
): number {
  if (behavior === "staticZoneAnchored" && structuralZoneCenterXPx?.length === 24) {
    return structuralZoneCenterXPx[structuralHour0To23]!;
  }
  return tapeColumn.centerX;
}

/**
 * Disk-row layout for analogClock + staticZoneAnchored: x from structural zone centers, y/size/wrap from tape columns.
 */
export function layoutSemanticTopBandAnalogClockMarkers(
  plan: SemanticTopBandHourMarkersPlan,
  ctx: SemanticTopBandHourMarkerLayoutContext,
): readonly LaidOutSemanticTopBandAnalogClockMarker[] {
  const vw = ctx.viewportWidthPx;
  const y0 = ctx.topBandYPx;
  const circleH = ctx.circleBandHeightPx;
  const circleStack = ctx.circleStack;
  const labelSize = ctx.markerContentSizePx ?? ctx.diskLabelSizePx;
  const zoneX = ctx.structuralZoneCenterXPx;

  const yCircleBottom = y0 + circleH;
  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;
  const gDiskToAnn = circleStack.gapDiskToAnnotationPx;
  const circleDiskCy = yDiskRow0 + diskBandH * 0.5;

  const out: LaidOutSemanticTopBandAnalogClockMarker[] = [];

  for (const inst of plan.instances) {
    if (inst.realization.kind !== "analogClock" || inst.content.kind !== "localWallClock") {
      continue;
    }
    const h = inst.structuralHour0To23;
    const m = markerColumnForStructuralHour(ctx.markers, h);
    if (m === undefined) {
      continue;
    }
    const centerX = structuralXForHour(inst.behavior, h, m, zoneX);
    const r = m.radiusPx;
    const ph = r > 0 ? hourCircleHeadMetrics(r, diskBandH, vw) : null;
    const headD = ph?.headD ?? 0;
    const yHeadTop = ph
      ? hourCircleYHeadTop(yDiskRow0, diskBandH, headD, gDiskToAnn, yCircleBottom)
      : yDiskRow0;
    const numeralY = ph
      ? yHeadTop + headD * 0.5 - Math.min(0.55, headD * 0.035)
      : circleDiskCy;
    const halfExt = r > 0 ? topBandDiskWrapHalfExtentPx(r) : labelSize;

    out.push({
      structuralHour0To23: h,
      centerX,
      centerY: numeralY,
      sizePx: labelSize,
      wrapHalfExtentPx: halfExt,
      continuousHour0To24: inst.content.wallClock.continuousHour0To24,
      continuousMinute0To60: inst.content.wallClock.continuousMinute0To60,
    });
  }

  return out;
}
