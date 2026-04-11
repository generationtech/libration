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

import type { SemanticTopBandHourMarkersPlan } from "./topBandHourMarkersSemanticTypes.ts";
import type { EffectiveTopBandHourMarkerBehavior } from "./topBandHourMarkersTypes.ts";
import {
  TOP_BAND_DISK_WRAP_HALO_PAD_PX,
  topBandDiskWrapHalfExtentPx,
} from "./topBandDiskWrapGeometry.ts";

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
  const labelSize = ctx.diskLabelSizePx;

  const yCircleBottom = y0 + circleH;
  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;
  const gDiskToAnn = circleStack.gapDiskToAnnotationPx;
  const circleDiskCy = yDiskRow0 + diskBandH * 0.5;

  const out: LaidOutSemanticTopBandHourTextMarker[] = [];

  for (const inst of plan.instances) {
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
  const labelSize = ctx.diskLabelSizePx;

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
  const labelSize = ctx.diskLabelSizePx;

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
  const labelSize = ctx.diskLabelSizePx;
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
    });
  }

  return out;
}
