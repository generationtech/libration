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
 * Noon = filled + stroked; midnight = stroke only (no fill). Dominant diamond + tape numeral below the glyph.
 *
 * **solarLunarPictogram**: Sun/moon pictogram only (no embedded hour numeral).
 *
 * **boxedNumber**: Stroke rectangles use {@link boxedNumberStrokeHalfExtentsFromMarkerContentBox} for every
 * realization that draws a box (including analog after the clock face); plaque geometry is keyed to the laid-out
 * indicator-entry content box (strip-scale breathing room), not the numeral glyph footprint.
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
const BOXED_NUMBER_HALF_H_FRAC = 0.62;
/** Strong floor: plaque half-width stays strip-scale, not numeral-footprint-driven. */
const BOXED_NUMBER_HALF_W_MIN_FRAC = 0.72;
const BOXED_NUMBER_HALF_W_PAD_FRAC = 0.2;
const BOXED_NUMBER_HALF_W_PER_CHAR_FRAC = 0.24;
const BOXED_NUMBER_STROKE_WIDTH_FRAC = 0.17;
const BOXED_NUMBER_STROKE_WIDTH_MIN_PX = 3;
/** Slightly larger tape numeral inside the plaque (layout.size drives glyph metrics). */
const BOXED_NUMBER_NUMERAL_LAYOUT_SIZE_SCALE = 1.12;

const SOLAR_DISK_R_FRAC = 0.46;
const SOLAR_RAY_FRAC = 0.12;
const SOLAR_LINE_STROKE_FRAC = 0.072;
const SOLAR_CIRCLE_STROKE_FRAC = 0.078;
/** Moon crescent uses a slightly larger layout pass than legacy factors so it matches sun prominence. */
const MOON_PICTO_LAYOUT_SCALE = 1.08;
const MOON_FILL_ALPHA_SUFFIX = "38";
const MOON_STROKE_WEIGHT = 1.14;

const SEMANTIC_DIAMOND_HALF_FRAC = 0.58;
/** Midnight diamond is slightly larger + heavier stroke so hollow form does not read weaker than noon fill. */
const SEMANTIC_MIDNIGHT_DIAMOND_HALF_FRAC = 0.595;
const SEMANTIC_NOON_STROKE_FRAC = 0.078;
const SEMANTIC_MIDNIGHT_STROKE_FRAC = 0.132;

/** Tape numeral paired with semantic diamond; larger than legacy secondary for strip readability. */
const SEMANTIC_NUMERAL_SIZE_FRAC = 0.52;
const SEMANTIC_NUMERAL_GAP_BELOW_DIAMOND_FRAC = 0.06;

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

function boxedNumberTapeNumeralLayout(base: GlyphLayoutBox): GlyphLayoutBox {
  return {
    ...base,
    size: base.size * BOXED_NUMBER_NUMERAL_LAYOUT_SIZE_SCALE,
  };
}

/** Tape numeral below the diamond; tracks diamond extent so scaling stays composed. */
function semanticGlyphTapeNumeralLayout(base: GlyphLayoutBox, diamondHalfPx: number): GlyphLayoutBox {
  return {
    cx: base.cx,
    cy: base.cy + diamondHalfPx + base.size * SEMANTIC_NUMERAL_GAP_BELOW_DIAMOND_FRAC,
    size: base.size * SEMANTIC_NUMERAL_SIZE_FRAC,
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
        boxedNumberTapeNumeralLayout(args.layout),
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
        boxedNumberTapeNumeralLayout(args.layout),
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
        boxedNumberTapeNumeralLayout(args.layout),
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
      const moonStroke = Math.max(1, pictoStroke * MOON_STROKE_WEIGHT);
      out.push(
        createDescriptorPathItem({
          pathDescriptor: moonCrescentDescriptor(cx, cy, size * MOON_PICTO_LAYOUT_SCALE),
          fill: `${args.markerColor}${MOON_FILL_ALPHA_SUFFIX}`,
          stroke: args.markerColor,
          strokeWidthPx: moonStroke,
        }),
      );
    }
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
    const half = size * (role === "noon" ? SEMANTIC_DIAMOND_HALF_FRAC : SEMANTIC_MIDNIGHT_DIAMOND_HALF_FRAC);
    const numeralLayout = semanticGlyphTapeNumeralLayout(args.layout, half);
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
          strokeWidthPx: Math.max(2, size * SEMANTIC_MIDNIGHT_STROKE_FRAC),
        }),
      );
    }
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
