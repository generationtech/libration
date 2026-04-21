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
 * Render-plan builder: top-band circle bed + hour-marker content (numerals / procedural glyphs).
 * Layout, labels, wrap expansion, and paint order are resolved here; executor applies rects/lines/path2d/text only.
 * Hour labels and glyphs are positioned per {@link layoutSemanticTopBandHourMarkers} and related layout (no standalone disk circles).
 *
 * In-disk hour markers use **only** the semantic pipeline: {@link buildSemanticTopBandHourMarkers} plus the mode-specific
 * layout + adapter for text, analogClock, radialLine, and radialWedge ({@link resolveTopBandInDiskHourMarkerSemanticPath}).
 * Callers must supply a full 24-column tape and {@link EffectiveTopBandHourMarkers} consistent with
 * {@link EffectiveTopBandHourMarkerSelection}; see {@link resolveTopBandInDiskHourMarkerSemanticPath}.
 */

import type { EffectiveTopBandHourMarkerSelection, TopBandTimeMode } from "../../config/appConfig.ts";
import { buildSemanticTopBandHourMarkers } from "../../config/topBandHourMarkersSemanticPlan.ts";
import type { EffectiveTopBandHourMarkers } from "../../config/topBandHourMarkersTypes.ts";
import {
  layoutSemanticTopBandAnalogClockMarkers,
  layoutSemanticTopBandHourMarkers,
  layoutSemanticTopBandRadialLineMarkers,
  layoutSemanticTopBandRadialWedgeMarkers,
} from "../../config/topBandHourMarkersLayout.ts";
import { shouldRenderTopBandUpperNumerals } from "../../config/topBandVisualPolicy.ts";
import {
  hourMarkerRepresentationSpecForTopBandEffectiveSelection,
  resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection,
} from "../../config/topBandVisualPolicy.ts";
import { createTopBandHourNumeralGlyph } from "../../glyphs/glyphFactory.ts";
import { createHourMarkerGlyph } from "../../glyphs/glyphFactory.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../../glyphs/glyphToRenderPlan.ts";
import type { TopBandHourNumeralContent } from "../../glyphs/topBandContent.ts";
import type { HourMarkerContent } from "../../glyphs/hourMarkerContent.ts";
import { alignCrispLineY } from "../crispLines";
import { topBandUpperNumeralWrapHalfExtentPx } from "../topBandHourDiskWrapExtents";
import {
  TOP_CHROME_CIRCLE_STACK_LAYOUT,
  TOP_CHROME_STYLE,
  type TopChromeStyle,
} from "../../config/topChromeStyle.ts";
import { displayTimeModeFromTopBandTimeMode } from "../../core/displayTimeMode.ts";
import { emitLaidOutSemanticTopBandAnalogClockMarkersToRenderPlan } from "../semanticTopBandHourMarkerAnalogAdapter.ts";
import { emitLaidOutSemanticTopBandRadialLineMarkersToRenderPlan } from "../semanticTopBandHourMarkerRadialLineAdapter.ts";
import { emitLaidOutSemanticTopBandRadialWedgeMarkersToRenderPlan } from "../semanticTopBandHourMarkerRadialWedgeAdapter.ts";
import { emitLaidOutSemanticTopBandHourTextMarkersToRenderPlan } from "../semanticTopBandHourMarkerTextAdapter.ts";
import { topBandWrapOffsetsForCenteredExtent } from "../topBandWrapOffsets";
import { resolveTopBandTextDiskRowIntrinsicContentHeightPxForProductPath } from "../topBandTextDiskRowIntrinsicProductPath.ts";
import {
  buildUtcFocusWindow,
  placeUtcFocusAnnotationXWithGap,
  utcFocusAnnotationCenterY,
  utcFocusAnnotationMinGapPx,
  utcFocusAnnotationPreferredX,
  UTC_FOCUS_ANNOTATION_TEXT,
  utcFocusAnnotationSide,
  utcFocusOpacityAtX,
} from "./utcTopTapeFocusTreatment.ts";
import { tryEmitNoonMidnightIndicatorDiskContent } from "../noonMidnightIndicatorRenderPlan.ts";
import type { RenderPlan } from "./renderPlanTypes";
import type { RenderTextItem } from "./renderPlanTypes";
import { canvasFontStringFromRenderTextItem } from "../canvas/canvasTextFontBridge.ts";
import { tryCreateOffscreenCanvas2dContext } from "../topBandHourMarkerTextInkMeasure.ts";
import { halfwayRgbStringBetweenCssColors } from "../../color/halfwayRgbBetweenCssColors.ts";

const IN_DISK_HOUR_ERR = "top-band in-disk hour markers:";

/**
 * Which semantic branch {@link buildTopBandCircleBandHourStackRenderPlan} uses for hour-disk interiors (full 24 columns only).
 */
export type TopBandInDiskHourMarkerSemanticRenderPath =
  | { kind: "semanticTextHourDisks" }
  | { kind: "semanticAnalogClockHourDisks" }
  | { kind: "semanticRadialLineHourDisks" }
  | { kind: "semanticRadialWedgeHourDisks" }
  /** Hour-marker entries area is absent from chrome (no semantic in-disk emission). */
  | { kind: "hourMarkerEntriesAbsent" };

function markerIndexClosestToReadPoint(markers: readonly { centerX: number }[], readPointX: number): number {
  if (markers.length === 0) {
    return -1;
  }
  let bestIdx = 0;
  let bestDist = Number.POSITIVE_INFINITY;
  for (let i = 0; i < markers.length; i += 1) {
    const d = Math.abs(markers[i]!.centerX - readPointX);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function utcFocusCoreMarkerIndices(
  markers: readonly { centerX: number }[],
  readPointX: number,
): Set<number> {
  const focusedIndex = markerIndexClosestToReadPoint(markers, readPointX);
  if (focusedIndex < 0) {
    return new Set<number>();
  }
  const byX = markers
    .map((m, idx) => ({ idx, x: m.centerX }))
    .sort((a, b) => a.x - b.x);
  const focusedOrderIndex = byX.findIndex((entry) => entry.idx === focusedIndex);
  const out = new Set<number>([focusedIndex]);
  const prev = byX[focusedOrderIndex - 1];
  const next = byX[focusedOrderIndex + 1];
  if (prev !== undefined) {
    out.add(prev.idx);
  }
  if (next !== undefined) {
    out.add(next.idx);
  }
  return out;
}

function utcFocusForcedAnchorColor(effectiveMarkers: EffectiveTopBandHourMarkers): string {
  if (effectiveMarkers.twentyFourHourAnchorCustomization.enabled) {
    return effectiveMarkers.twentyFourHourAnchorCustomization.boxedNumberBoxColor;
  }
  if (
    effectiveMarkers.noonMidnightCustomization.enabled &&
    effectiveMarkers.noonMidnightCustomization.expressionMode === "boxedNumber"
  ) {
    return effectiveMarkers.noonMidnightCustomization.boxedNumberBoxColor;
  }
  return halfwayRgbStringBetweenCssColors(
    effectiveMarkers.indicatorEntriesArea.effectiveBackgroundColor,
    effectiveMarkers.indicatorEntriesArea.effectiveForegroundColor,
  );
}

function measureRenderTextWidthPx(item: RenderTextItem): number {
  const ctx = tryCreateOffscreenCanvas2dContext();
  if (ctx === undefined) {
    return item.text.length * item.font.sizePx * 0.56;
  }
  ctx.font = canvasFontStringFromRenderTextItem(item);
  const textWidth = ctx.measureText(item.text).width;
  const letterSpacingEm = item.letterSpacingEm ?? 0;
  const letterSpacingPx = item.font.sizePx * letterSpacingEm;
  const trackingWidth = item.text.length > 1 ? letterSpacingPx * (item.text.length - 1) : 0;
  return Math.max(0, textWidth + trackingWidth);
}

function textItemAtMarkerCenter(
  items: RenderPlan["items"],
  label: string,
  centerX: number,
): RenderTextItem | undefined {
  return items.find(
    (i): i is RenderTextItem =>
      i.kind === "text" && i.text === label && Math.abs(i.x - centerX) <= 0.001,
  );
}

/**
 * Resolves the in-disk semantic render path or throws with a developer-facing message.
 * Requires {@link EffectiveTopBandHourMarkers}, 24 tape columns, selection ↔ effective realization consistency, and for
 * analogClock and radial glyphs {@link referenceFractionalHour} + {@link presentTimeStructuralHour0To23}; for
 * civilColumnAnchored, {@link structuralZoneCenterXPx} length 24.
 */
export function resolveTopBandInDiskHourMarkerSemanticPath(args: {
  effectiveTopBandHourMarkerSelection: EffectiveTopBandHourMarkerSelection;
  effectiveTopBandHourMarkers: EffectiveTopBandHourMarkers | undefined;
  markerCount: number;
  structuralZoneCenterXPx: readonly number[] | undefined;
  referenceFractionalHour: number | undefined;
  presentTimeStructuralHour0To23: number | undefined;
}): TopBandInDiskHourMarkerSemanticRenderPath {
  if (args.effectiveTopBandHourMarkers === undefined) {
    throw new Error(`${IN_DISK_HOUR_ERR} effectiveTopBandHourMarkers is required`);
  }
  const eff = args.effectiveTopBandHourMarkers;
  if (!eff.areaVisible) {
    return { kind: "hourMarkerEntriesAbsent" };
  }
  if (args.markerCount !== 24) {
    throw new Error(`${IN_DISK_HOUR_ERR} expected 24 tape columns, got ${args.markerCount}`);
  }

  const sel = args.effectiveTopBandHourMarkerSelection;

  if (sel.kind === "text") {
    if (eff.realization.kind !== "text") {
      throw new Error(
        `${IN_DISK_HOUR_ERR} text selection requires effective realization kind "text", got "${eff.realization.kind}"`,
      );
    }
    return { kind: "semanticTextHourDisks" };
  }

  if (sel.kind === "glyph") {
    if (sel.glyphMode === "analogClock") {
      if (eff.realization.kind !== "analogClock") {
        throw new Error(
          `${IN_DISK_HOUR_ERR} analogClock selection requires effective realization kind "analogClock", got "${eff.realization.kind}"`,
        );
      }
      if (
        args.referenceFractionalHour === undefined ||
        args.presentTimeStructuralHour0To23 === undefined
      ) {
        throw new Error(
          `${IN_DISK_HOUR_ERR} analogClock requires referenceFractionalHour and presentTimeStructuralHour0To23`,
        );
      }
      if (eff.behavior === "civilColumnAnchored" && args.structuralZoneCenterXPx?.length !== 24) {
        throw new Error(
          `${IN_DISK_HOUR_ERR} analogClock with civilColumnAnchored requires structuralZoneCenterXPx with 24 entries`,
        );
      }
      return { kind: "semanticAnalogClockHourDisks" };
    }
    if (sel.glyphMode === "radialLine") {
      if (eff.realization.kind !== "radialLine") {
        throw new Error(
          `${IN_DISK_HOUR_ERR} radialLine selection requires effective realization kind "radialLine", got "${eff.realization.kind}"`,
        );
      }
      if (
        args.referenceFractionalHour === undefined ||
        args.presentTimeStructuralHour0To23 === undefined
      ) {
        throw new Error(
          `${IN_DISK_HOUR_ERR} radialLine requires referenceFractionalHour and presentTimeStructuralHour0To23`,
        );
      }
      if (eff.behavior === "civilColumnAnchored" && args.structuralZoneCenterXPx?.length !== 24) {
        throw new Error(
          `${IN_DISK_HOUR_ERR} radialLine with civilColumnAnchored requires structuralZoneCenterXPx with 24 entries`,
        );
      }
      return { kind: "semanticRadialLineHourDisks" };
    }
    if (sel.glyphMode === "radialWedge") {
      if (eff.realization.kind !== "radialWedge") {
        throw new Error(
          `${IN_DISK_HOUR_ERR} radialWedge selection requires effective realization kind "radialWedge", got "${eff.realization.kind}"`,
        );
      }
      if (
        args.referenceFractionalHour === undefined ||
        args.presentTimeStructuralHour0To23 === undefined
      ) {
        throw new Error(
          `${IN_DISK_HOUR_ERR} radialWedge requires referenceFractionalHour and presentTimeStructuralHour0To23`,
        );
      }
      if (eff.behavior === "civilColumnAnchored" && args.structuralZoneCenterXPx?.length !== 24) {
        throw new Error(
          `${IN_DISK_HOUR_ERR} radialWedge with civilColumnAnchored requires structuralZoneCenterXPx with 24 entries`,
        );
      }
      return { kind: "semanticRadialWedgeHourDisks" };
    }
  }

  throw new Error(`${IN_DISK_HOUR_ERR} unsupported effectiveTopBandHourMarkerSelection`);
}

/**
 * Circle-band vertical bed (two fills + shelf highlight/shadow) and the phased hour-disk stack above the tick rail.
 * Paint order: bed → upper next-hour numerals (when row height > 0) → in-disk numerals / procedural glyphs.
 */
export function buildTopBandCircleBandHourStackRenderPlan(options: {
  viewportWidthPx: number;
  topBandOriginXPx: number;
  topBandYPx: number;
  circleBandHeightPx: number;
  /**
   * Vertical model from {@link computeTopBandCircleStackMetrics} (circle band padding + rows).
   * `diskBandH` is the allocated hour-marker content-row height (see {@link ../../config/topBandHourMarkerContentRowVerticalMetrics.ts!HourMarkerContentRowVerticalMetrics}).
   */
  circleStack: {
    padTopPx: number;
    upperNumeralH: number;
    gapNumeralToDiskPx: number;
    diskBandH: number;
    gapDiskToAnnotationPx: number;
    annotationH: number;
    padBottomPx: number;
  };
  markers: readonly {
    centerX: number;
    radiusPx: number;
    nextHourLabel: string;
    currentHourLabel: string;
    annotationKind: "none" | "noon" | "midnight" | "hour00" | "hour12";
    /** From planner when {@link annotationKind} is non-none. */
    annotationLabel?: string;
    /** Structural hour 0–23 (top-band column); used for analog clock glyphs. */
    structuralHour0To23: number;
  }[];
  diskLabelSizePx: number;
  /** Scaled hour-disk interior size (text/glyph); defaults to {@link diskLabelSizePx} when omitted. */
  markerDiskContentSizePx?: number;
  /** Authoritative top-band hour-disk intent ({@link effectiveTopBandHourMarkerSelection}). */
  effectiveTopBandHourMarkerSelection: EffectiveTopBandHourMarkerSelection;
  /**
   * Resolved hour-marker model for semantic pipelines. Required: full 24-column tape uses only semantic in-disk paths.
   */
  effectiveTopBandHourMarkers: EffectiveTopBandHourMarkers;
  /** Required to resolve {@link TextGlyph} typography and bundled font families. */
  glyphRenderContext: GlyphRenderContext;
  /**
   * Retained for API parity with callers that pair the stack with the tick rail; stem alignment is unused for standalone disks.
   */
  tickBandHeightPx?: number;
  /** Defaults to {@link TOP_CHROME_STYLE} for tests and legacy callers. */
  chromeStyle?: TopChromeStyle;
  /**
   * Civil fractional hour-of-day [0,24) in the top-band reference frame (same value as {@link UtcTopScaleLayout.referenceFractionalHour}).
   * With {@link presentTimeStructuralHour0To23}, drives anchored NATO-segment procedural wall-clock semantics when the
   * effective hour-marker behavior is `civilColumnAnchored`.
   */
  referenceFractionalHour?: number;
  /** Structural {@link UtcTopScaleHourSegment.centerX} per hour (24); civil-column anchoring for analog and radial layouts when behavior is `civilColumnAnchored`. */
  structuralZoneCenterXPx?: readonly number[];
  /**
   * Structural UTC column 0–23 containing the reference meridian (same index as the segment that contains the exact-meridian read point).
   * When set, procedural hour-disk emission paints this column last so its wall-clock reads on top when wrap tiling overlaps disks near the IDL seam.
   */
  presentTimeStructuralHour0To23?: number;
  /** Label formatting mode; utc24 enables focused UTC window treatment. */
  topBandMode?: TopBandTimeMode;
  /** Authoritative read-point x (present-time tick x). Required for utc24 focused window treatment. */
  readPointX?: number;
}): RenderPlan {
  const vw = options.viewportWidthPx;
  const items: RenderPlan["items"] = [];
  if (!(vw > 0)) {
    return { items };
  }

  const y0 = options.topBandYPx;
  const circleH = options.circleBandHeightPx;
  const tbX = options.topBandOriginXPx;
  const circleStack = options.circleStack;
  const st = options.chromeStyle ?? TOP_CHROME_STYLE;
  const inst = st.instrument;
  const topBandSel = options.effectiveTopBandHourMarkerSelection;
  const gctx = options.glyphRenderContext;
  const effectiveMarkers = options.effectiveTopBandHourMarkers;
  const markers = options.markers;
  const presentTickStructuralHour = options.presentTimeStructuralHour0To23;

  if (!effectiveMarkers.areaVisible) {
    return { items };
  }

  const inDiskPath = resolveTopBandInDiskHourMarkerSemanticPath({
    effectiveTopBandHourMarkerSelection: topBandSel,
    effectiveTopBandHourMarkers: effectiveMarkers,
    markerCount: markers.length,
    structuralZoneCenterXPx: options.structuralZoneCenterXPx,
    referenceFractionalHour: options.referenceFractionalHour,
    presentTimeStructuralHour0To23: options.presentTimeStructuralHour0To23,
  });

  const anchoredTimezoneSegment =
    options.referenceFractionalHour !== undefined && options.presentTimeStructuralHour0To23 !== undefined
      ? {
          referenceFractionalHour: options.referenceFractionalHour,
          presentTimeStructuralHour0To23: options.presentTimeStructuralHour0To23,
        }
      : undefined;

  const yCircleBottom = y0 + circleH;
  const circleBedY0 = y0 + circleH * 0.065;
  const circleBedY1 = yCircleBottom - 0.5;

  items.push({
    kind: "rect",
    x: tbX,
    y: y0,
    width: vw,
    height: circleH,
    fill: inst.circleBandBedDeep,
  });
  items.push({
    kind: "rect",
    x: tbX,
    y: circleBedY0,
    width: vw,
    height: Math.max(0, circleBedY1 - circleBedY0),
    fill: inst.circleBandBedMid,
  });

  const yDiskRow0 = y0 + circleStack.padTopPx + circleStack.upperNumeralH + circleStack.gapNumeralToDiskPx;
  const diskBandH = circleStack.diskBandH;
  items.push({
    kind: "rect",
    x: tbX,
    y: yDiskRow0,
    width: vw,
    height: Math.max(0, diskBandH),
    fill: effectiveMarkers.indicatorEntriesArea.effectiveBackgroundColor,
  });

  items.push({
    kind: "line",
    x1: 0,
    y1: alignCrispLineY(circleBedY0 + 0.5),
    x2: vw,
    y2: alignCrispLineY(circleBedY0 + 0.5),
    stroke: inst.circleBandShelfHighlight,
    strokeWidthPx: 1,
  });
  items.push({
    kind: "line",
    x1: 0,
    y1: alignCrispLineY(circleBedY1 - 0.5),
    x2: vw,
    y2: alignCrispLineY(circleBedY1 - 0.5),
    stroke: inst.circleBandShelfShadow,
    strokeWidthPx: 1,
  });

  const yUpperRow0 = y0 + circleStack.padTopPx;

  const labelSize = options.diskLabelSizePx;
  const markerContentSizePx = options.markerDiskContentSizePx ?? labelSize;
  const upperNumeralSizePx = labelSize * st.topHourNumeral.sizeFracOfDiskLabel;
  const isUtcFocusMode =
    options.topBandMode !== undefined && displayTimeModeFromTopBandTimeMode(options.topBandMode) === "utc";
  const hourSpacingPx = vw / 24;
  const utcFocusWindow =
    isUtcFocusMode && options.readPointX !== undefined
      ? buildUtcFocusWindow(options.readPointX, hourSpacingPx)
      : undefined;
  const utcFocusedTextMode = utcFocusWindow !== undefined && topBandSel.kind === "text";

  if (
    shouldRenderTopBandUpperNumerals({
      upperNumeralH: circleStack.upperNumeralH,
      upperRowMinPx: TOP_CHROME_CIRCLE_STACK_LAYOUT.upperRowMinPx,
    })
  ) {
    const yUpperCy = yUpperRow0 + circleStack.upperNumeralH * 0.5;
    for (let i = 0; i < markers.length; i += 1) {
      const m = markers[i]!;
      if (utcFocusWindow !== undefined) {
        const cx = m.centerX;
        if (cx < 0 || cx > vw) {
          continue;
        }
        const opacity = utcFocusOpacityAtX(utcFocusWindow, cx);
        if (opacity <= 0.001) {
          continue;
        }
        const content: TopBandHourNumeralContent = {
          hour0To23: m.structuralHour0To23,
          label: m.nextHourLabel,
        };
        const glyph = createTopBandHourNumeralGlyph(content, st);
        const before = items.length;
        emitGlyphToRenderPlan(glyph, { cx, cy: yUpperCy, size: upperNumeralSizePx }, gctx, items);
        const emitted = items[items.length - 1];
        if (items.length > before && emitted?.kind === "text") {
          emitted.opacity = opacity;
        }
        continue;
      }
      const r = m.radiusPx;
      const halfExt =
        r > 0 ? topBandUpperNumeralWrapHalfExtentPx(r, upperNumeralSizePx) : upperNumeralSizePx;
      for (const wrapK of topBandWrapOffsetsForCenteredExtent(m.centerX, halfExt, vw)) {
        const cx = m.centerX + wrapK * vw;
        const content: TopBandHourNumeralContent = {
          hour0To23: m.structuralHour0To23,
          label: m.nextHourLabel,
        };
        const glyph = createTopBandHourNumeralGlyph(content, st);
        emitGlyphToRenderPlan(glyph, { cx, cy: yUpperCy, size: upperNumeralSizePx }, gctx, items);
      }
    }
  }

  if (inDiskPath.kind === "semanticTextHourDisks" && utcFocusedTextMode) {
    const focusedIndex = markerIndexClosestToReadPoint(markers, utcFocusWindow.readPointX);
    const coreVisibleIndices = utcFocusCoreMarkerIndices(markers, utcFocusWindow.readPointX);
    const markerColor = effectiveMarkers.realization.kind === "text"
      ? effectiveMarkers.realization.resolvedAppearance.color
      : st.hourIndicatorEntries.defaultForeground;
    const hourSpec = hourMarkerRepresentationSpecForTopBandEffectiveSelection(topBandSel);
    const typographyOverrides =
      resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection(topBandSel);
    const forcedAnchorColor = utcFocusForcedAnchorColor(effectiveMarkers);
    for (let i = 0; i < markers.length; i += 1) {
      const m = markers[i]!;
      const cx = m.centerX;
      if (cx < 0 || cx > vw) {
        continue;
      }
      const isCoreMarker = coreVisibleIndices.has(i);
      const opacity = isCoreMarker ? 1 : utcFocusOpacityAtX(utcFocusWindow, cx);
      if (opacity <= 0.001) {
        continue;
      }
      const layout = {
        cx,
        cy: yDiskRow0 + diskBandH * 0.5,
        size: markerContentSizePx,
      };
      if (i === focusedIndex) {
        const handled = tryEmitNoonMidnightIndicatorDiskContent(
          {
            realizationKind: "text",
            customization: { enabled: false },
            forcedTwentyFourHourAnchor: { boxedNumberBoxColor: forcedAnchorColor },
            structuralHour0To23: m.structuralHour0To23,
            tapeHourLabel: m.currentHourLabel,
            displayLabel: m.currentHourLabel,
            layout,
            markerColor,
            hourSpec,
            effectiveTopBandHourMarkerSelection: topBandSel,
            effectiveTopBandHourMarkers: effectiveMarkers,
          },
          gctx,
          items,
        );
        if (handled) {
          const beforeHighlight = items.length;
          for (let j = beforeHighlight - 1; j >= 0; j -= 1) {
            const emitted = items[j]!;
            if (
              emitted.kind === "text" &&
              emitted.text === m.currentHourLabel &&
              Math.abs(emitted.x - layout.cx) <= 0.001 &&
              Math.abs(emitted.y - layout.cy) <= 0.001
            ) {
              emitted.opacity = opacity;
              break;
            }
          }
          continue;
        }
      }
      const hourContent: HourMarkerContent = {
        structuralHour0To23: m.structuralHour0To23,
        displayLabel: m.currentHourLabel,
      };
      const glyph = createHourMarkerGlyph(hourContent, hourSpec, typographyOverrides, markerColor);
      const before = items.length;
      emitGlyphToRenderPlan(glyph, layout, gctx, items);
      const emitted = items[items.length - 1];
      if (items.length > before && emitted?.kind === "text") {
        emitted.opacity = opacity;
      }
    }
    const viewportCenterX = vw * 0.5;
    const annotationSide = utcFocusAnnotationSide(utcFocusWindow.readPointX, viewportCenterX);
    const annotationSizePx = markerContentSizePx;
    const marginPx = Math.max(8, annotationSizePx * 0.5);
    const focusedHourX = focusedIndex >= 0 ? markers[focusedIndex]!.centerX : utcFocusWindow.readPointX;
    const preferredX = utcFocusAnnotationPreferredX({
      focusedHourX,
      hourSpacingPx,
      annotationSide,
    });
    const annotationContent: HourMarkerContent = {
      structuralHour0To23: focusedIndex >= 0 ? markers[focusedIndex]!.structuralHour0To23 : 0,
      displayLabel: UTC_FOCUS_ANNOTATION_TEXT,
    };
    const annotationGlyph = createHourMarkerGlyph(
      annotationContent,
      hourSpec,
      typographyOverrides,
      markerColor,
    );
    const beforeAnnotation = items.length;
    emitGlyphToRenderPlan(
      annotationGlyph,
      {
        cx: preferredX,
        cy: utcFocusAnnotationCenterY(yDiskRow0, diskBandH),
        size: markerContentSizePx,
      },
      gctx,
      items,
    );
    const annotationItem = items
      .slice(beforeAnnotation)
      .find((i): i is RenderTextItem => i.kind === "text" && i.text === UTC_FOCUS_ANNOTATION_TEXT);
    if (annotationItem !== undefined) {
      const annotationWidthPx = measureRenderTextWidthPx(annotationItem);
      const coreVisibleSpans = Array.from(coreVisibleIndices)
        .map((idx) => {
          const marker = markers[idx];
          if (marker === undefined || marker.centerX < 0 || marker.centerX > vw) {
            return undefined;
          }
          const coreText = textItemAtMarkerCenter(items, marker.currentHourLabel, marker.centerX);
          if (coreText === undefined) {
            return undefined;
          }
          const width = measureRenderTextWidthPx(coreText);
          return {
            minX: coreText.x - width * 0.5,
            maxX: coreText.x + width * 0.5,
          };
        })
        .filter((span): span is { minX: number; maxX: number } => span !== undefined);
      const focusedHourClusterSpan = coreVisibleSpans.length > 0
        ? {
            minX: Math.min(...coreVisibleSpans.map((span) => span.minX)),
            maxX: Math.max(...coreVisibleSpans.map((span) => span.maxX)),
          }
        : {
            minX: focusedHourX - hourSpacingPx * 0.5,
            maxX: focusedHourX + hourSpacingPx * 0.5,
          };
      const annotationX = placeUtcFocusAnnotationXWithGap({
        preferredX,
        annotationSide,
        annotationWidthPx,
        viewportWidthPx: vw,
        marginPx,
        minGapPx: utcFocusAnnotationMinGapPx({
          hourSpacingPx,
          labelSizePx: annotationSizePx,
        }),
        focusedHourClusterSpan,
      });
      annotationItem.x = annotationX;
    }
  } else if (inDiskPath.kind === "semanticTextHourDisks") {
    const semanticPlan = buildSemanticTopBandHourMarkers(effectiveMarkers);
    const labelSizeForText = markerContentSizePx ?? labelSize;
    const labelsForMeasure = markers.map((m) => m.currentHourLabel);
    const textDiskRowIntrinsicContentHeightPx = resolveTopBandTextDiskRowIntrinsicContentHeightPxForProductPath({
      fontRegistry: gctx.fontRegistry,
      selection: topBandSel,
      markerLayoutBoxSizePx: labelSizeForText,
      hourDiskLabelsWestToEast: labelsForMeasure,
    });
    const laidOut = layoutSemanticTopBandHourMarkers(semanticPlan, {
      viewportWidthPx: vw,
      topBandYPx: y0,
      circleBandHeightPx: circleH,
      circleStack,
      markers,
      diskLabelSizePx: labelSize,
      markerContentSizePx,
      hourMarkerLayout: effectiveMarkers.layout,
      textDiskRowIntrinsicContentHeightPx,
    });
    emitLaidOutSemanticTopBandHourTextMarkersToRenderPlan(laidOut, vw, topBandSel, effectiveMarkers, gctx, items);
  } else if (inDiskPath.kind === "semanticAnalogClockHourDisks") {
    const semanticPlan = buildSemanticTopBandHourMarkers(effectiveMarkers, {
      anchoredTimezoneSegment,
    });
    const laidOutAnalog = layoutSemanticTopBandAnalogClockMarkers(semanticPlan, {
      viewportWidthPx: vw,
      topBandYPx: y0,
      circleBandHeightPx: circleH,
      circleStack,
      markers,
      diskLabelSizePx: labelSize,
      markerContentSizePx,
      hourMarkerLayout: effectiveMarkers.layout,
      structuralZoneCenterXPx: options.structuralZoneCenterXPx,
    });
    emitLaidOutSemanticTopBandAnalogClockMarkersToRenderPlan(
      laidOutAnalog,
      vw,
      topBandSel,
      effectiveMarkers,
      gctx,
      items,
      presentTickStructuralHour,
    );
  } else if (inDiskPath.kind === "semanticRadialLineHourDisks") {
    const semanticPlan = buildSemanticTopBandHourMarkers(effectiveMarkers, {
      anchoredTimezoneSegment,
    });
    const laidOutRadial = layoutSemanticTopBandRadialLineMarkers(semanticPlan, {
      viewportWidthPx: vw,
      topBandYPx: y0,
      circleBandHeightPx: circleH,
      circleStack,
      markers,
      diskLabelSizePx: labelSize,
      markerContentSizePx,
      hourMarkerLayout: effectiveMarkers.layout,
      structuralZoneCenterXPx: options.structuralZoneCenterXPx,
    });
    emitLaidOutSemanticTopBandRadialLineMarkersToRenderPlan(
      laidOutRadial,
      vw,
      topBandSel,
      effectiveMarkers,
      gctx,
      items,
      presentTickStructuralHour,
    );
  } else if (inDiskPath.kind === "semanticRadialWedgeHourDisks") {
    const semanticPlan = buildSemanticTopBandHourMarkers(effectiveMarkers, {
      anchoredTimezoneSegment,
    });
    const laidOutWedge = layoutSemanticTopBandRadialWedgeMarkers(semanticPlan, {
      viewportWidthPx: vw,
      topBandYPx: y0,
      circleBandHeightPx: circleH,
      circleStack,
      markers,
      diskLabelSizePx: labelSize,
      markerContentSizePx,
      hourMarkerLayout: effectiveMarkers.layout,
      structuralZoneCenterXPx: options.structuralZoneCenterXPx,
    });
    emitLaidOutSemanticTopBandRadialWedgeMarkersToRenderPlan(
      laidOutWedge,
      vw,
      topBandSel,
      effectiveMarkers,
      gctx,
      items,
      presentTickStructuralHour,
    );
  }

  return { items };
}
