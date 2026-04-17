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

import type { EffectiveTopBandHourMarkerSelection } from "../../config/appConfig.ts";
import { buildSemanticTopBandHourMarkers } from "../../config/topBandHourMarkersSemanticPlan.ts";
import type { EffectiveTopBandHourMarkers } from "../../config/topBandHourMarkersTypes.ts";
import {
  layoutSemanticTopBandAnalogClockMarkers,
  layoutSemanticTopBandHourMarkers,
  layoutSemanticTopBandRadialLineMarkers,
  layoutSemanticTopBandRadialWedgeMarkers,
} from "../../config/topBandHourMarkersLayout.ts";
import { shouldRenderTopBandUpperNumerals } from "../../config/topBandVisualPolicy.ts";
import { createTopBandHourNumeralGlyph } from "../../glyphs/glyphFactory.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../../glyphs/glyphToRenderPlan.ts";
import type { TopBandHourNumeralContent } from "../../glyphs/topBandContent.ts";
import { alignCrispLineY } from "../crispLines";
import { topBandUpperNumeralWrapHalfExtentPx } from "../topBandHourDiskWrapExtents";
import {
  TOP_CHROME_CIRCLE_STACK_LAYOUT,
  TOP_CHROME_STYLE,
  type TopChromeStyle,
} from "../../config/topChromeStyle.ts";
import { emitLaidOutSemanticTopBandAnalogClockMarkersToRenderPlan } from "../semanticTopBandHourMarkerAnalogAdapter.ts";
import { emitLaidOutSemanticTopBandRadialLineMarkersToRenderPlan } from "../semanticTopBandHourMarkerRadialLineAdapter.ts";
import { emitLaidOutSemanticTopBandRadialWedgeMarkersToRenderPlan } from "../semanticTopBandHourMarkerRadialWedgeAdapter.ts";
import { emitLaidOutSemanticTopBandHourTextMarkersToRenderPlan } from "../semanticTopBandHourMarkerTextAdapter.ts";
import { topBandWrapOffsetsForCenteredExtent } from "../topBandWrapOffsets";
import { resolveTopBandTextDiskRowIntrinsicContentHeightPxForProductPath } from "../topBandTextDiskRowIntrinsicProductPath.ts";
import type { RenderPlan } from "./renderPlanTypes";

const IN_DISK_HOUR_ERR = "top-band in-disk hour markers:";

/**
 * Which semantic branch {@link buildTopBandCircleBandHourStackRenderPlan} uses for hour-disk interiors (full 24 columns only).
 */
export type TopBandInDiskHourMarkerSemanticRenderPath =
  | { kind: "semanticTextHourDisks" }
  | { kind: "semanticAnalogClockHourDisks" }
  | { kind: "semanticRadialLineHourDisks" }
  | { kind: "semanticRadialWedgeHourDisks" };

/**
 * Resolves the in-disk semantic render path or throws with a developer-facing message.
 * Requires {@link EffectiveTopBandHourMarkers}, 24 tape columns, selection ↔ effective realization consistency, and for
 * analogClock {@link referenceNowMs} plus {@link structuralZoneCenterXPx} length 24.
 */
export function resolveTopBandInDiskHourMarkerSemanticPath(args: {
  effectiveTopBandHourMarkerSelection: EffectiveTopBandHourMarkerSelection;
  effectiveTopBandHourMarkers: EffectiveTopBandHourMarkers | undefined;
  markerCount: number;
  structuralZoneCenterXPx: readonly number[] | undefined;
  referenceNowMs: number | undefined;
}): TopBandInDiskHourMarkerSemanticRenderPath {
  if (args.effectiveTopBandHourMarkers === undefined) {
    throw new Error(`${IN_DISK_HOUR_ERR} effectiveTopBandHourMarkers is required`);
  }
  if (args.markerCount !== 24) {
    throw new Error(`${IN_DISK_HOUR_ERR} expected 24 tape columns, got ${args.markerCount}`);
  }

  const sel = args.effectiveTopBandHourMarkerSelection;
  const eff = args.effectiveTopBandHourMarkers;

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
      if (eff.behavior !== "staticZoneAnchored") {
        throw new Error(
          `${IN_DISK_HOUR_ERR} analogClock requires effective behavior "staticZoneAnchored", got "${eff.behavior}"`,
        );
      }
      if (args.referenceNowMs === undefined) {
        throw new Error(`${IN_DISK_HOUR_ERR} analogClock requires referenceNowMs`);
      }
      if (args.structuralZoneCenterXPx?.length !== 24) {
        throw new Error(
          `${IN_DISK_HOUR_ERR} analogClock requires structuralZoneCenterXPx with 24 entries`,
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
      return { kind: "semanticRadialLineHourDisks" };
    }
    if (sel.glyphMode === "radialWedge") {
      if (eff.realization.kind !== "radialWedge") {
        throw new Error(
          `${IN_DISK_HOUR_ERR} radialWedge selection requires effective realization kind "radialWedge", got "${eff.realization.kind}"`,
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
    annotationKind: "none" | "noon" | "midnight";
    /** From planner when {@link annotationKind} is noon/midnight. */
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
  /** Solar-local wall clock for semantic analog pipeline; pair with {@link structuralZoneCenterXPx}. */
  referenceNowMs?: number;
  /** Structural {@link UtcTopScaleHourSegment.centerX} per hour (24); semantic analog static-zone anchoring. */
  structuralZoneCenterXPx?: readonly number[];
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

  const inDiskPath = resolveTopBandInDiskHourMarkerSemanticPath({
    effectiveTopBandHourMarkerSelection: topBandSel,
    effectiveTopBandHourMarkers: effectiveMarkers,
    markerCount: markers.length,
    structuralZoneCenterXPx: options.structuralZoneCenterXPx,
    referenceNowMs: options.referenceNowMs,
  });

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

  if (
    shouldRenderTopBandUpperNumerals({
      upperNumeralH: circleStack.upperNumeralH,
      upperRowMinPx: TOP_CHROME_CIRCLE_STACK_LAYOUT.upperRowMinPx,
    })
  ) {
    const yUpperCy = yUpperRow0 + circleStack.upperNumeralH * 0.5;
    for (let i = 0; i < markers.length; i += 1) {
      const m = markers[i]!;
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

  if (inDiskPath.kind === "semanticTextHourDisks") {
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
      referenceNowMs: options.referenceNowMs,
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
    );
  } else if (inDiskPath.kind === "semanticRadialLineHourDisks") {
    const semanticPlan = buildSemanticTopBandHourMarkers(effectiveMarkers);
    const laidOutRadial = layoutSemanticTopBandRadialLineMarkers(semanticPlan, {
      viewportWidthPx: vw,
      topBandYPx: y0,
      circleBandHeightPx: circleH,
      circleStack,
      markers,
      diskLabelSizePx: labelSize,
      markerContentSizePx,
      hourMarkerLayout: effectiveMarkers.layout,
    });
    emitLaidOutSemanticTopBandRadialLineMarkersToRenderPlan(
      laidOutRadial,
      vw,
      topBandSel,
      effectiveMarkers,
      gctx,
      items,
    );
  } else if (inDiskPath.kind === "semanticRadialWedgeHourDisks") {
    const semanticPlan = buildSemanticTopBandHourMarkers(effectiveMarkers);
    const laidOutWedge = layoutSemanticTopBandRadialWedgeMarkers(semanticPlan, {
      viewportWidthPx: vw,
      topBandYPx: y0,
      circleBandHeightPx: circleH,
      circleStack,
      markers,
      diskLabelSizePx: labelSize,
      markerContentSizePx,
      hourMarkerLayout: effectiveMarkers.layout,
    });
    emitLaidOutSemanticTopBandRadialWedgeMarkersToRenderPlan(
      laidOutWedge,
      vw,
      topBandSel,
      effectiveMarkers,
      gctx,
      items,
    );
  }

  return { items };
}
