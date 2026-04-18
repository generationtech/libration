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
 * Vertical placement for the disk row uses {@link HourMarkerContentRowVerticalMetrics} via
 * {@link computeHourMarkerContentRowVerticalMetrics} (shared by text and glyph realizations). Text intrinsic height
 * comes from {@link ../topBandHourMarkerTextIntrinsicHeight.ts} / optional precomputed override; glyphs use head-disk
 * diameter from {@link hourCircleHeadMetrics}.
 */

import type { EffectiveTopBandHourMarkerSelection } from "./appConfig.ts";
import { resolveIndicatorEntryDiskDisplayLabel } from "./noonMidnightIndicatorSemantics.ts";
import type { SemanticTopBandHourMarkersPlan } from "./topBandHourMarkersSemanticTypes.ts";
import type {
  EffectiveTopBandHourMarkerBehavior,
  EffectiveTopBandHourMarkerLayout,
} from "./topBandHourMarkersTypes.ts";
import {
  computeHourMarkerContentRowVerticalMetrics,
  HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_CAP_PX,
  HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_FRAC_OF_HEAD_D,
  resolveHourMarkerContentRowPaddingPx,
  resolveHourMarkerDiskRowIntrinsicContentHeightPx,
  type HourMarkerContentRowVerticalMetrics,
} from "./topBandHourMarkerContentRowVerticalMetrics.ts";
import type { FontAssetRegistry } from "../typography/fontAssetRegistry.ts";
import { resolveTopBandHourMarkerTextIntrinsicContentHeightPxFromTypography } from "../topBandHourMarkerTextIntrinsicHeight.ts";
import { topBandDiskWrapHalfExtentPx } from "./topBandDiskWrapGeometry.ts";

/**
 * Vertical slice of the circle band stack (same fields as {@link buildTopBandCircleBandHourStackRenderPlan} options).
 * The `diskBandH` field is the allocated height of the hour-disk row (matches
 * {@link HourMarkerContentRowVerticalMetrics.allocatedContentRowHeightPx} in the canonical vertical model).
 */
export type TopBandCircleStackLayoutInput = {
  padTopPx: number;
  upperNumeralH: number;
  gapNumeralToDiskPx: number;
  diskBandH: number;
  gapDiskToAnnotationPx: number;
  annotationH: number;
  padBottomPx: number;
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
  /** Size multiplier + optional content-row padding overrides from {@link resolveEffectiveTopBandHourMarkers}. */
  hourMarkerLayout: EffectiveTopBandHourMarkerLayout;
  /**
   * Text hour-disk intrinsic content height (px) for the canonical row model — measured ink and/or typography
   * (see {@link ../topBandHourMarkerTextIntrinsicHeight.ts}, {@link ../renderer/topBandHourMarkerTextInkMeasure.ts}).
   * When set (> 0), wins over {@link fontRegistry} / {@link effectiveTopBandHourMarkerSelection}.
   */
  textDiskRowIntrinsicContentHeightPx?: number;
  /**
   * With {@link effectiveTopBandHourMarkerSelection}, resolves typography intrinsic when
   * {@link textDiskRowIntrinsicContentHeightPx} is omitted.
   */
  fontRegistry?: FontAssetRegistry;
  /** Text selection for typography-derived intrinsic height when {@link textDiskRowIntrinsicContentHeightPx} is omitted. */
  effectiveTopBandHourMarkerSelection?: EffectiveTopBandHourMarkerSelection;
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
  /** Tape hour label before noon/midnight text substitution (for pictogram / boxed numeric content). */
  tapeHourLabel: string;
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
  /** Civil label from the phased tape column (for noon/midnight pictogram numerals). */
  tapeHourLabel: string;
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
  tapeHourLabel: string;
};

/** Laid-out radial wedge disk interior (same geometry as radial line; wedge angle comes from glyph style). */
export type LaidOutSemanticTopBandRadialWedgeMarker = {
  structuralHour0To23: number;
  centerX: number;
  centerY: number;
  sizePx: number;
  wrapHalfExtentPx: number;
  displayLabel: string;
  tapeHourLabel: string;
};

/**
 * Disk diameter vs layout radius and vertical cap for the head-disk fit.
 * Pass **intrinsic content height** (not padding-inclusive row height) for `verticalCapPx` when sizing so row padding
 * does not enlarge procedural glyph heads.
 */
export function hourCircleHeadMetrics(
  radiusPx: number,
  verticalCapPx: number,
  viewportWidthPx: number,
): { headD: number } {
  const r = radiusPx;
  const vw = viewportWidthPx;
  const cap = Math.max(0, verticalCapPx);
  const headWMax = Math.min(r * 2.12, vw * 0.059);
  const headHMax = Math.min(cap * 0.96, r * 1.92);
  const headD = Math.min(headWMax, headHMax);
  return { headD };
}

type DiskRowVerticalIntrinsicMode =
  /** Procedural glyphs: intrinsic height = fitted head-disk diameter. */
  | { kind: "glyphHeadDisk" }
  /** Text hour markers: ink- or typography-derived intrinsic height (px). */
  | { kind: "text"; intrinsicContentHeightPx: number };

/**
 * Disk-row vertical placement: intrinsic height comes from the white-disk head diameter (glyphs) or from
 * text-specific height (labels); padding uses {@link resolveHourMarkerContentRowPaddingPx} then
 * {@link computeHourMarkerContentRowVerticalMetrics}.
 */
function layoutDiskRowHourMarkerVertical(
  yDiskRow0: number,
  diskBandH: number,
  radiusPx: number,
  viewportWidthPx: number,
  hourMarkerLayout: EffectiveTopBandHourMarkerLayout,
  mode: DiskRowVerticalIntrinsicMode,
): {
  centerY: number;
  contentRowVerticalMetrics: HourMarkerContentRowVerticalMetrics | undefined;
} {
  const vw = viewportWidthPx;
  const circleDiskCy = yDiskRow0 + diskBandH * 0.5;
  let intrinsic: number;
  if (mode.kind === "glyphHeadDisk") {
    const ph0 = radiusPx > 0 ? hourCircleHeadMetrics(radiusPx, diskBandH, vw) : null;
    let headD = ph0?.headD ?? 0;
    if (!ph0 || !(headD > 0)) {
      return { centerY: circleDiskCy, contentRowVerticalMetrics: undefined };
    }
    intrinsic = resolveHourMarkerDiskRowIntrinsicContentHeightPx({ headDiameterPx: headD });
    const ph1 = hourCircleHeadMetrics(radiusPx, intrinsic, vw);
    headD = ph1.headD;
    intrinsic = resolveHourMarkerDiskRowIntrinsicContentHeightPx({ headDiameterPx: headD });
  } else {
    intrinsic = mode.intrinsicContentHeightPx;
    if (!(intrinsic > 0)) {
      return { centerY: circleDiskCy, contentRowVerticalMetrics: undefined };
    }
  }
  const tweak = Math.min(
    HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_CAP_PX,
    intrinsic * HOUR_MARKER_DISK_ROW_NUMERAL_Y_TWEAK_FRAC_OF_HEAD_D,
  );
  const { contentPaddingTopPx: padTop, contentPaddingBottomPx: padBottom } =
    resolveHourMarkerContentRowPaddingPx({
      layout: hourMarkerLayout,
      intrinsicContentHeightPx: intrinsic,
    });
  const contentRowVerticalMetrics = computeHourMarkerContentRowVerticalMetrics({
    intrinsicContentHeightPx: intrinsic,
    contentPaddingTopPx: padTop,
    contentPaddingBottomPx: padBottom,
    contentCenterYOffsetFromIntrinsicMidPx: -tweak,
  });
  return {
    centerY: yDiskRow0 + contentRowVerticalMetrics.contentCenterYFromRowTopPx,
    contentRowVerticalMetrics,
  };
}

function resolveTextDiskRowIntrinsicContentHeightPxForLayout(
  ctx: SemanticTopBandHourMarkerLayoutContext,
  markerLayoutBoxSizePx: number,
): number {
  const o = ctx.textDiskRowIntrinsicContentHeightPx;
  if (o !== undefined && o > 0) {
    return o;
  }
  if (ctx.fontRegistry !== undefined && ctx.effectiveTopBandHourMarkerSelection !== undefined) {
    return resolveTopBandHourMarkerTextIntrinsicContentHeightPxFromTypography({
      fontRegistry: ctx.fontRegistry,
      selection: ctx.effectiveTopBandHourMarkerSelection,
      markerLayoutBoxSizePx,
    });
  }
  throw new Error(
    "layoutSemanticTopBandHourMarkers: set textDiskRowIntrinsicContentHeightPx (> 0), or fontRegistry + effectiveTopBandHourMarkerSelection for typography intrinsic height",
  );
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
  const circleStack = ctx.circleStack;
  const labelSize = ctx.markerContentSizePx ?? ctx.diskLabelSizePx;

  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;
  const textIntrinsicPx = resolveTextDiskRowIntrinsicContentHeightPxForLayout(ctx, labelSize);

  const out: LaidOutSemanticTopBandHourTextMarker[] = [];

  for (const inst of plan.instances) {
    const h = inst.structuralHour0To23;
    const m = markerColumnForStructuralHour(ctx.markers, h);
    if (m === undefined) {
      continue;
    }
    const r = m.radiusPx;
    const { centerY: numeralY } = layoutDiskRowHourMarkerVertical(
      yDiskRow0,
      diskBandH,
      r,
      vw,
      ctx.hourMarkerLayout,
      { kind: "text", intrinsicContentHeightPx: textIntrinsicPx },
    );
    const halfExt = r > 0 ? topBandDiskWrapHalfExtentPx(r) : labelSize;
    const tape = m.currentHourLabel;
    const display = resolveIndicatorEntryDiskDisplayLabel(tape, h, plan.source.noonMidnightCustomization);

    out.push({
      structuralHour0To23: h,
      centerX: m.centerX,
      centerY: numeralY,
      sizePx: labelSize,
      wrapHalfExtentPx: halfExt,
      displayLabel: display,
      tapeHourLabel: tape,
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
  const circleStack = ctx.circleStack;
  const labelSize = ctx.markerContentSizePx ?? ctx.diskLabelSizePx;

  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;

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
    const { centerY: numeralY } = layoutDiskRowHourMarkerVertical(
      yDiskRow0,
      diskBandH,
      r,
      vw,
      ctx.hourMarkerLayout,
      { kind: "glyphHeadDisk" },
    );
    const halfExt = r > 0 ? topBandDiskWrapHalfExtentPx(r) : labelSize;
    const tape = m.currentHourLabel;
    const display = resolveIndicatorEntryDiskDisplayLabel(tape, h, plan.source.noonMidnightCustomization);

    out.push({
      structuralHour0To23: h,
      centerX: m.centerX,
      centerY: numeralY,
      sizePx: labelSize,
      wrapHalfExtentPx: halfExt,
      displayLabel: display,
      tapeHourLabel: tape,
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
  const circleStack = ctx.circleStack;
  const labelSize = ctx.markerContentSizePx ?? ctx.diskLabelSizePx;

  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;

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
    const { centerY: numeralY } = layoutDiskRowHourMarkerVertical(
      yDiskRow0,
      diskBandH,
      r,
      vw,
      ctx.hourMarkerLayout,
      { kind: "glyphHeadDisk" },
    );
    const halfExt = r > 0 ? topBandDiskWrapHalfExtentPx(r) : labelSize;
    const tape = m.currentHourLabel;
    const display = resolveIndicatorEntryDiskDisplayLabel(tape, h, plan.source.noonMidnightCustomization);

    out.push({
      structuralHour0To23: h,
      centerX: m.centerX,
      centerY: numeralY,
      sizePx: labelSize,
      wrapHalfExtentPx: halfExt,
      displayLabel: display,
      tapeHourLabel: tape,
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
  const circleStack = ctx.circleStack;
  const labelSize = ctx.markerContentSizePx ?? ctx.diskLabelSizePx;
  const zoneX = ctx.structuralZoneCenterXPx;

  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;

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
    const { centerY: numeralY } = layoutDiskRowHourMarkerVertical(
      yDiskRow0,
      diskBandH,
      r,
      vw,
      ctx.hourMarkerLayout,
      { kind: "glyphHeadDisk" },
    );
    const halfExt = r > 0 ? topBandDiskWrapHalfExtentPx(r) : labelSize;

    out.push({
      structuralHour0To23: h,
      centerX,
      centerY: numeralY,
      sizePx: labelSize,
      wrapHalfExtentPx: halfExt,
      continuousHour0To24: inst.content.wallClock.continuousHour0To24,
      continuousMinute0To60: inst.content.wallClock.continuousMinute0To60,
      tapeHourLabel: m.currentHourLabel,
    });
  }

  return out;
}
