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
 * **Paint order (invariant)**: Procedural backdrops (clock face, radial/wedge base, boxed-number highlight fill,
 * sun/moon, diamond) are pushed before tape numerals / words so overlays read above structure.
 * {@link tryEmitNoonMidnightIndicatorDiskContent} is the single planner — adapters must not reorder.
 *
 * **semanticGlyph**: Diamond = four-point path (top / right / bottom / left); not an axis-aligned square.
 * Noon = filled + stroked; midnight = stroke only (no fill). Tape numeral is inscribed and centered inside the diamond.
 *
 * **solarLunarPictogram**: Sun/moon pictogram only (no embedded hour numeral).
 *
 * **boxedNumber**: Filled highlight rectangles behind the tape numeral use
 * {@link boxedNumberHighlightHalfExtentsFromMarkerContentBox} (tight to the label, not strip-scale plaque framing).
 * Color is the resolver’s derived treatment color (same source as the former stroke). Analog clock still gets a
 * center highlight aligned to the same model.
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

/** Highlight bar half-height vs marker content box — one-line cap height, not a full strip-scale plaque. */
const BOXED_NUMBER_HIGHLIGHT_HALF_H_FRAC = 0.38;
const BOXED_NUMBER_HIGHLIGHT_HALF_W_MIN_FRAC = 0.28;
const BOXED_NUMBER_HIGHLIGHT_HALF_W_PAD_FRAC = 0.06;
const BOXED_NUMBER_HIGHLIGHT_HALF_W_PER_CHAR_FRAC = 0.11;
/** Highlight fill alpha (treatment color is resolver-derived rgb/hex). */
const BOXED_NUMBER_HIGHLIGHT_FILL_ALPHA = 0.5;
/** Slightly larger tape numeral over the highlight (layout.size drives glyph metrics). */
const BOXED_NUMBER_NUMERAL_LAYOUT_SIZE_SCALE = 1.12;

const SOLAR_DISK_R_FRAC = 0.46;
const SOLAR_RAY_FRAC = 0.12;
const SOLAR_LINE_STROKE_FRAC = 0.072;
const SOLAR_CIRCLE_STROKE_FRAC = 0.078;
/** Moon crescent uses a slightly larger layout pass than legacy factors so it matches sun prominence. */
const MOON_PICTO_LAYOUT_SCALE = 1.08;
const MOON_FILL_ALPHA_SUFFIX = "38";
const MOON_STROKE_WEIGHT = 1.14;

/** Material strip-scale diamond; bounded by indicator-entry content model (same {@link GlyphLayoutBox.size} basis). */
const SEMANTIC_DIAMOND_HALF_FRAC = 0.74;
/** Midnight diamond is slightly larger + heavier stroke so hollow form does not read weaker than noon fill. */
const SEMANTIC_MIDNIGHT_DIAMOND_HALF_FRAC = 0.755;
const SEMANTIC_NOON_STROKE_FRAC = 0.078;
const SEMANTIC_MIDNIGHT_STROKE_FRAC = 0.132;

/**
 * Inscribed numeral: {@link GlyphLayoutBox.size} is chosen so the hour string fits inside the diamond with margin.
 * Not a detached label below the glyph — geometric center matches the diamond center ({@link GlyphLayoutBox.cx/cy}).
 */
const SEMANTIC_NUMERAL_IN_DIAMOND_FRAC = 0.4;

/**
 * Bounded reduction for NOON / MIDNIGHT word labels in `textWords` mode only (long words vs compact hour numerals).
 * MIDNIGHT uses a smaller fraction than NOON — more characters at the same font pressure — to relieve adjacent entries.
 */
export const TEXT_WORDS_NOON_LAYOUT_SIZE_FRAC = 0.64;
export const TEXT_WORDS_MIDNIGHT_LAYOUT_SIZE_FRAC = 0.54;

/**
 * Half extents for the boxed-number **highlight** rectangle (text-highlighter bar behind the tape numeral): derived
 * from the semantic layout’s marker content box size ({@link GlyphLayoutBox.size}) and the tape label span.
 * Applies to text, radialLine, radialWedge, and analogClock — in each case {@link GlyphLayoutBox.size} is the
 * solved disk box side from layout. Tighter than the old plaque frame so the strip reads as highlighted text, not a badge.
 */
export function boxedNumberHighlightHalfExtentsFromMarkerContentBox(
  markerContentBoxSizePx: number,
  label: string,
): { halfW: number; halfH: number } {
  const s = Math.max(0, markerContentBoxSizePx);
  const halfH = s * BOXED_NUMBER_HIGHLIGHT_HALF_H_FRAC;
  const n = Math.max(1, label.length);
  const halfW = Math.max(
    s * BOXED_NUMBER_HIGHLIGHT_HALF_W_MIN_FRAC,
    n * s * BOXED_NUMBER_HIGHLIGHT_HALF_W_PER_CHAR_FRAC + s * BOXED_NUMBER_HIGHLIGHT_HALF_W_PAD_FRAC,
  );
  return { halfW, halfH };
}

function cssColorToRgbaFill(cssColor: string, alpha: number): string {
  const a = Math.max(0, Math.min(1, alpha));
  const s = cssColor.trim();
  const rgb = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(s);
  if (rgb) {
    return `rgba(${rgb[1]}, ${rgb[2]}, ${rgb[3]}, ${a})`;
  }
  const hex6 = /^#([0-9a-f]{6})$/i.exec(s);
  if (hex6) {
    const v = hex6[1]!;
    const r = parseInt(v.slice(0, 2), 16);
    const g = parseInt(v.slice(2, 4), 16);
    const b = parseInt(v.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  }
  return s;
}

function pushHighlightBehindTapeNumeral(
  cx: number,
  cy: number,
  text: string,
  markerContentBoxSizePx: number,
  treatmentColor: string,
  out: RenderPlanBuilder,
): void {
  const { halfW, halfH } = boxedNumberHighlightHalfExtentsFromMarkerContentBox(markerContentBoxSizePx, text);
  out.push({
    kind: "rect",
    x: cx - halfW,
    y: cy - halfH,
    width: halfW * 2,
    height: halfH * 2,
    fill: cssColorToRgbaFill(treatmentColor, BOXED_NUMBER_HIGHLIGHT_FILL_ALPHA),
  });
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

function boxedNumberTapeNumeralLayout(base: GlyphLayoutBox): GlyphLayoutBox {
  return {
    ...base,
    size: base.size * BOXED_NUMBER_NUMERAL_LAYOUT_SIZE_SCALE,
  };
}

function semanticGlyphInteriorNumeralLayout(base: GlyphLayoutBox, diamondHalfPx: number): GlyphLayoutBox {
  const numeralBoxSide = 2 * diamondHalfPx * SEMANTIC_NUMERAL_IN_DIAMOND_FRAC;
  return {
    cx: base.cx,
    cy: base.cy,
    size: numeralBoxSide,
  };
}

function textWordsNoonMidnightWordLayout(base: GlyphLayoutBox, structuralHour0To23: number): GlyphLayoutBox {
  const frac =
    structuralHour0To23 === 0 ? TEXT_WORDS_MIDNIGHT_LAYOUT_SIZE_FRAC : TEXT_WORDS_NOON_LAYOUT_SIZE_FRAC;
  return {
    ...base,
    size: base.size * frac,
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
  const boxedNumberTreatmentColor =
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
      pushGlyphContent(
        args,
        wordContent,
        numeralSpec,
        gctx,
        out,
        textWordsNoonMidnightWordLayout(args.layout, args.structuralHour0To23),
      );
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
      pushGlyphContent(
        args,
        wordContent,
        numeralSpec,
        gctx,
        out,
        textWordsNoonMidnightWordLayout(args.layout, args.structuralHour0To23),
      );
      return true;
    }
    return false;
  }

  if (mode === "boxedNumber") {
    const highlightColor = boxedNumberTreatmentColor;
    if (args.realizationKind === "text") {
      pushHighlightBehindTapeNumeral(cx, cy, tape, size, highlightColor, out);
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
      pushHighlightBehindTapeNumeral(cx, cy, tape, size, highlightColor, out);
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
      pushHighlightBehindTapeNumeral(cx, cy, tape, size, highlightColor, out);
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
    // Highlight uses the same marker-content-box + label geometry as text/radial (layout.size is the disk box side).
    pushHighlightBehindTapeNumeral(cx, cy, tape, size, highlightColor, out);
    return true;
  }

  // solarLunarPictogram: geometry reviewed; no change this pass (sun/moon balance already acceptable).
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
    const numeralLayout = semanticGlyphInteriorNumeralLayout(args.layout, half);
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
