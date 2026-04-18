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
 * Noon/midnight indicator-entry customization: emits specialized {@link RenderPlan} draws for structural hours
 * 0 and 12 when enabled. Returns whether the caller should skip its default emission for that instance.
 *
 * Non-`textWords` modes are **label-level** presentations for the upper indicator-entries strip: geometry is
 * sized from {@link GlyphLayoutBox.size} (the laid-out marker content box), not as tiny marker decorations.
 *
 * **Paint order (invariant)**: Procedural backdrops (clock face, radial/wedge base, boxed stroke, sun/moon,
 * diamond) are pushed before tape numerals / words so overlays read above structure. {@link tryEmitNoonMidnightIndicatorDiskContent}
 * is the single planner — adapters must not reorder.
 *
 * **semanticGlyph**: Diamond = four-point path (top / right / bottom / left); not an axis-aligned square.
 * Noon = filled + stroked; midnight = stroke only (no fill). Dominant diamond + small secondary tape numeral.
 *
 * **solarLunarPictogram**: Dominant sun/moon + small secondary tape numeral (instrument-like).
 *
 * **boxedNumber**: Stroke rectangles use {@link boxedNumberStrokeHalfExtentsFromMarkerContentBox} for every
 * realization that draws a box (including analog after the clock face); there is no separate analog-only frame scale.
 */

import type { EffectiveTopBandHourMarkerSelection } from "../config/appConfig.ts";
import { noonMidnightActiveIntent } from "../config/noonMidnightIndicatorSemantics.ts";
import {
  resolveDefaultHourMarkerRepresentationSpec,
  type HourMarkerRepresentationSpec,
} from "../config/types/hourMarkerRepresentationSpec.ts";
import type {
  EffectiveAnalogClockResolvedAppearance,
  EffectiveNoonMidnightCustomization,
  EffectiveTopBandHourMarkers,
} from "../config/topBandHourMarkersTypes.ts";
import { resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection } from "../config/topBandVisualPolicy.ts";
import { createHourMarkerGlyph } from "../glyphs/glyphFactory.ts";
import type { HourMarkerContent } from "../glyphs/hourMarkerContent.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext, type RenderPlanBuilder } from "../glyphs/glyphToRenderPlan.ts";
import type { GlyphLayoutBox } from "../glyphs/glyphLayout.ts";
import { circlePathDescriptor } from "./renderPlan/circlePath2D.ts";
import { createDescriptorPathItem } from "./renderPlan/pathItemFactories.ts";
import { createPathBuilder } from "./renderPlan/pathBuilder.ts";
import type { RenderPathDescriptor } from "./renderPlan/pathTypes.ts";

function diamondDescriptor(cx: number, cy: number, half: number): RenderPathDescriptor {
  const b = createPathBuilder();
  b.moveTo(cx, cy - half);
  b.lineTo(cx + half, cy);
  b.lineTo(cx, cy + half);
  b.lineTo(cx - half, cy);
  b.closePath();
  return b.build();
}

function sunBurstLines(
  cx: number,
  cy: number,
  R: number,
  ray: number,
): { x1: number; y1: number; x2: number; y2: number }[] {
  const n = 8;
  const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
  for (let i = 0; i < n; i += 1) {
    const t = (i / n) * Math.PI * 2;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    out.push({
      x1: cx + ct * R,
      y1: cy + st * R,
      x2: cx + ct * (R + ray),
      y2: cy + st * (R + ray),
    });
  }
  return out;
}

function moonCrescentDescriptor(cx: number, cy: number, size: number): RenderPathDescriptor {
  const R = size * 0.44;
  const dx = R * 0.42;
  const r2 = R * 0.78;
  const theta0 = (70 * Math.PI) / 180;
  const theta1 = (290 * Math.PI) / 180;
  const b = createPathBuilder();
  const x0 = cx + R * Math.cos(theta0);
  const y0 = cy + R * Math.sin(theta0);
  b.moveTo(x0, y0);
  b.arc(cx, cy, R, theta0, theta1, false);
  b.arc(cx + dx, cy, r2, theta1 - Math.PI * 2, theta0 - Math.PI * 2, true);
  b.closePath();
  return b.build();
}

/** Fractions of marker content box side — tied to {@link GlyphLayoutBox.size} from semantic layout only. */
const BOXED_NUMBER_HALF_H_FRAC = 0.49;
const BOXED_NUMBER_HALF_W_MIN_FRAC = 0.46;
/** Extra horizontal margin so short labels still get a badge-like frame in the strip. */
const BOXED_NUMBER_HALF_W_PAD_FRAC = 0.06;
const BOXED_NUMBER_HALF_W_PER_CHAR_FRAC = 0.24;
const BOXED_NUMBER_STROKE_WIDTH_FRAC = 0.1;
const BOXED_NUMBER_STROKE_WIDTH_MIN_PX = 2;

const SOLAR_DISK_R_FRAC = 0.46;
const SOLAR_RAY_FRAC = 0.12;
const SOLAR_LINE_STROKE_FRAC = 0.072;
const SOLAR_CIRCLE_STROKE_FRAC = 0.078;

const SEMANTIC_DIAMOND_HALF_FRAC = 0.48;
const SEMANTIC_NOON_STROKE_FRAC = 0.078;
const SEMANTIC_MIDNIGHT_STROKE_FRAC = 0.1;

/** Small tape numeral under dominant pictogram/glyph; scales with marker content box. */
const SECONDARY_NUMERAL_SIZE_FRAC = 0.38;
const SECONDARY_NUMERAL_DOWN_FRAC = 0.3;

/**
 * Half extents for the boxed-number stroke rectangle: derived from the semantic layout’s marker content box
 * size ({@link GlyphLayoutBox.size}) and the tape/numeral label span. Applies to text, radialLine, radialWedge,
 * and analogClock noon/midnight boxed-number strokes — in each case {@link GlyphLayoutBox.size} is the solved
 * disk box side from layout. Scales with solved dimensions (font/size changes flow through layout), without
 * Canvas measurement in the planner.
 */
export function boxedNumberStrokeHalfExtentsFromMarkerContentBox(
  markerContentBoxSizePx: number,
  label: string,
): { halfW: number; halfH: number } {
  const s = Math.max(0, markerContentBoxSizePx);
  const halfH = s * BOXED_NUMBER_HALF_H_FRAC;
  const n = Math.max(1, label.length);
  const halfW = Math.max(
    s * BOXED_NUMBER_HALF_W_MIN_FRAC,
    n * s * BOXED_NUMBER_HALF_W_PER_CHAR_FRAC + s * BOXED_NUMBER_HALF_W_PAD_FRAC,
  );
  return { halfW, halfH };
}

export type NoonMidnightEmitArgs = {
  realizationKind: "text" | "analogClock" | "radialLine" | "radialWedge";
  customization: EffectiveNoonMidnightCustomization;
  structuralHour0To23: number;
  tapeHourLabel: string;
  displayLabel: string;
  layout: GlyphLayoutBox;
  markerColor: string;
  hourSpec: HourMarkerRepresentationSpec;
  effectiveTopBandHourMarkerSelection: EffectiveTopBandHourMarkerSelection;
  effectiveTopBandHourMarkers: EffectiveTopBandHourMarkers;
  continuousHour0To24?: number;
  continuousMinute0To60?: number;
  analogResolvedAppearance?: EffectiveAnalogClockResolvedAppearance;
};

function typographyOverridesFor(args: NoonMidnightEmitArgs) {
  return resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection(
    args.effectiveTopBandHourMarkerSelection,
  );
}

/** Text numerals on procedural disks use the geometric text policy so typography stays font-backed and measurable. */
function textNumeralSpecFor(args: NoonMidnightEmitArgs): HourMarkerRepresentationSpec {
  return args.realizationKind === "text"
    ? args.hourSpec
    : resolveDefaultHourMarkerRepresentationSpec("geometric");
}

function pushGlyphContent(
  args: NoonMidnightEmitArgs,
  content: HourMarkerContent,
  spec: HourMarkerRepresentationSpec,
  gctx: GlyphRenderContext,
  out: RenderPlanBuilder,
  layoutOverride?: GlyphLayoutBox,
): void {
  const glyph = createHourMarkerGlyph(content, spec, typographyOverridesFor(args), args.markerColor);
  emitGlyphToRenderPlan(glyph, layoutOverride ?? args.layout, gctx, out);
}

function pushStrokeBoxAroundText(
  cx: number,
  cy: number,
  text: string,
  markerContentBoxSizePx: number,
  stroke: string,
  out: RenderPlanBuilder,
): void {
  const { halfW, halfH } = boxedNumberStrokeHalfExtentsFromMarkerContentBox(markerContentBoxSizePx, text);
  const sw = Math.max(
    BOXED_NUMBER_STROKE_WIDTH_MIN_PX,
    markerContentBoxSizePx * BOXED_NUMBER_STROKE_WIDTH_FRAC,
  );
  out.push({
    kind: "rect",
    x: cx - halfW,
    y: cy - halfH,
    width: halfW * 2,
    height: halfH * 2,
    stroke,
    strokeWidthPx: sw,
  });
}

/** Tape numeral under dominant noon/midnight graphics — uses layout-derived size only. */
function secondaryTapeNumeralLayout(base: GlyphLayoutBox): GlyphLayoutBox {
  const s = base.size;
  return {
    cx: base.cx,
    cy: base.cy + s * SECONDARY_NUMERAL_DOWN_FRAC,
    size: s * SECONDARY_NUMERAL_SIZE_FRAC,
  };
}

/**
 * When true, the caller must not emit its default hour-disk glyph for this instance.
 */
export function tryEmitNoonMidnightIndicatorDiskContent(
  args: NoonMidnightEmitArgs,
  gctx: GlyphRenderContext,
  out: RenderPlanBuilder,
): boolean {
  const intent = noonMidnightActiveIntent(args.customization, args.structuralHour0To23);
  if (!intent.active) {
    return false;
  }
  const mode = intent.expressionMode;
  const { cx, cy, size } = args.layout;
  const role = intent.role;
  const tape = args.tapeHourLabel;
  const disp = args.displayLabel;
  const strokeForBox =
    args.customization.enabled &&
    args.customization.expressionMode === "boxedNumber" &&
    "boxedNumberBoxColor" in args.customization &&
    args.customization.boxedNumberBoxColor !== undefined
      ? args.customization.boxedNumberBoxColor
      : args.markerColor;
  const numeralSpec = textNumeralSpecFor(args);

  if (mode === "textWords") {
    if (args.realizationKind === "text") {
      return false;
    }
    const wordContent: HourMarkerContent = {
      structuralHour0To23: args.structuralHour0To23,
      displayLabel: disp,
    };
    const ty = typographyOverridesFor(args);
    if (args.realizationKind === "radialLine" || args.realizationKind === "radialWedge") {
      const baseGlyph = createHourMarkerGlyph(
        {
          structuralHour0To23: args.structuralHour0To23,
          displayLabel: args.displayLabel,
        },
        args.hourSpec,
        ty,
        args.markerColor,
      );
      emitGlyphToRenderPlan(baseGlyph, args.layout, gctx, out);
      pushGlyphContent(args, wordContent, numeralSpec, gctx, out);
      return true;
    }
    if (args.realizationKind === "analogClock") {
      const ra = args.analogResolvedAppearance;
      const ch = args.continuousHour0To24;
      const cm = args.continuousMinute0To60;
      if (ra === undefined || ch === undefined || cm === undefined) {
        return false;
      }
      emitGlyphToRenderPlan(
        {
          kind: "clockFace",
          hour: ch,
          minute: cm,
          styleId: args.hourSpec.glyphStyleId,
          showMinuteHand: true,
          ringStrokeOverride: ra.ringStroke,
          handStrokeOverride: ra.handStroke,
          faceFillOverride: ra.faceFill,
        },
        args.layout,
        gctx,
        out,
      );
      pushGlyphContent(args, wordContent, numeralSpec, gctx, out);
      return true;
    }
    return false;
  }

  if (mode === "boxedNumber") {
    const stroke = strokeForBox;
    if (args.realizationKind === "text") {
      pushStrokeBoxAroundText(cx, cy, tape, size, stroke, out);
      pushGlyphContent(
        args,
        { structuralHour0To23: args.structuralHour0To23, displayLabel: tape },
        args.hourSpec,
        gctx,
        out,
      );
      return true;
    }
    if (args.realizationKind === "radialLine") {
      pushGlyphContent(
        args,
        { structuralHour0To23: args.structuralHour0To23, displayLabel: tape },
        args.hourSpec,
        gctx,
        out,
      );
      pushStrokeBoxAroundText(cx, cy, tape, size, stroke, out);
      pushGlyphContent(
        args,
        { structuralHour0To23: args.structuralHour0To23, displayLabel: tape },
        numeralSpec,
        gctx,
        out,
      );
      return true;
    }
    if (args.realizationKind === "radialWedge") {
      pushGlyphContent(
        args,
        { structuralHour0To23: args.structuralHour0To23, displayLabel: tape },
        args.hourSpec,
        gctx,
        out,
      );
      pushStrokeBoxAroundText(cx, cy, tape, size, stroke, out);
      pushGlyphContent(
        args,
        { structuralHour0To23: args.structuralHour0To23, displayLabel: tape },
        numeralSpec,
        gctx,
        out,
      );
      return true;
    }
    const ra = args.analogResolvedAppearance;
    const ch = args.continuousHour0To24;
    const cm = args.continuousMinute0To60;
    if (ra === undefined || ch === undefined || cm === undefined) {
      return false;
    }
    emitGlyphToRenderPlan(
      {
        kind: "clockFace",
        hour: ch,
        minute: cm,
        styleId: args.hourSpec.glyphStyleId,
        showMinuteHand: true,
        ringStrokeOverride: ra.ringStroke,
        handStrokeOverride: ra.handStroke,
        faceFillOverride: ra.faceFill,
      },
      args.layout,
      gctx,
      out,
    );
    // Box stroke uses the same marker-content-box + label geometry as text/radial (layout.size is the disk box side).
    pushStrokeBoxAroundText(cx, cy, tape, size, stroke, out);
    return true;
  }

  if (mode === "solarLunarPictogram") {
    if (args.realizationKind === "analogClock") {
      const ra = args.analogResolvedAppearance;
      const ch = args.continuousHour0To24;
      const cm = args.continuousMinute0To60;
      if (ra === undefined || ch === undefined || cm === undefined) {
        return false;
      }
      emitGlyphToRenderPlan(
        {
          kind: "clockFace",
          hour: ch,
          minute: cm,
          styleId: args.hourSpec.glyphStyleId,
          showMinuteHand: true,
          ringStrokeOverride: ra.ringStroke,
          handStrokeOverride: ra.handStroke,
          faceFillOverride: ra.faceFill,
        },
        args.layout,
        gctx,
        out,
      );
    }
    const R = size * SOLAR_DISK_R_FRAC;
    const ray = size * SOLAR_RAY_FRAC;
    const pictoStroke = Math.max(1, size * SOLAR_CIRCLE_STROKE_FRAC);
    const rayStroke = Math.max(1, size * SOLAR_LINE_STROKE_FRAC);
    if (role === "noon") {
      out.push(
        createDescriptorPathItem({
          pathDescriptor: circlePathDescriptor(cx, cy, R),
          fill: `${args.markerColor}33`,
          stroke: args.markerColor,
          strokeWidthPx: pictoStroke,
        }),
      );
      for (const ln of sunBurstLines(cx, cy, R, ray)) {
        out.push({
          kind: "line",
          x1: ln.x1,
          y1: ln.y1,
          x2: ln.x2,
          y2: ln.y2,
          stroke: args.markerColor,
          strokeWidthPx: rayStroke,
          lineCap: "round",
        });
      }
    } else {
      out.push(
        createDescriptorPathItem({
          pathDescriptor: moonCrescentDescriptor(cx, cy, size),
          fill: `${args.markerColor}2a`,
          stroke: args.markerColor,
          strokeWidthPx: pictoStroke,
        }),
      );
    }
    const numeralLayout = secondaryTapeNumeralLayout(args.layout);
    pushGlyphContent(
      args,
      { structuralHour0To23: args.structuralHour0To23, displayLabel: tape },
      numeralSpec,
      gctx,
      out,
      numeralLayout,
    );
    return true;
  }

  if (mode === "semanticGlyph") {
    if (args.realizationKind === "analogClock") {
      const ra = args.analogResolvedAppearance;
      const ch = args.continuousHour0To24;
      const cm = args.continuousMinute0To60;
      if (ra === undefined || ch === undefined || cm === undefined) {
        return false;
      }
      emitGlyphToRenderPlan(
        {
          kind: "clockFace",
          hour: ch,
          minute: cm,
          styleId: args.hourSpec.glyphStyleId,
          showMinuteHand: true,
          ringStrokeOverride: ra.ringStroke,
          handStrokeOverride: ra.handStroke,
          faceFillOverride: ra.faceFill,
        },
        args.layout,
        gctx,
        out,
      );
    }
    const half = size * SEMANTIC_DIAMOND_HALF_FRAC;
    const d = diamondDescriptor(cx, cy, half);
    if (role === "noon") {
      out.push(
        createDescriptorPathItem({
          pathDescriptor: d,
          fill: `${args.markerColor}44`,
          stroke: args.markerColor,
          strokeWidthPx: Math.max(1, size * SEMANTIC_NOON_STROKE_FRAC),
        }),
      );
    } else {
      out.push(
        createDescriptorPathItem({
          pathDescriptor: d,
          stroke: args.markerColor,
          strokeWidthPx: Math.max(1, size * SEMANTIC_MIDNIGHT_STROKE_FRAC),
        }),
      );
    }
    const numeralLayout = secondaryTapeNumeralLayout(args.layout);
    pushGlyphContent(
      args,
      { structuralHour0To23: args.structuralHour0To23, displayLabel: tape },
      numeralSpec,
      gctx,
      out,
      numeralLayout,
    );
    return true;
  }

  return false;
}
