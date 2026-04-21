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
 * Noon/midnight indicator-entry customization for **text** hour-marker realization only: emits specialized
 * {@link RenderPlan} draws for structural hours 0 and 12 when enabled. Returns whether the caller should skip its
 * default emission for that instance.
 *
 * Non-`textWords` modes are **label-level** presentations for the upper indicator-entries strip: geometry is
 * sized from {@link GlyphLayoutBox.size} (the laid-out marker content box), not as tiny marker decorations.
 *
 * **Paint order (invariant)**: Procedural backdrops (boxed-number highlight fill, sun/moon, diamond) are pushed before
 * tape numerals / words so overlays read above structure.
 *
 * **semanticGlyph**: Diamond = four-point path (top / right / bottom / left); not an axis-aligned square.
 * Noon = filled + stroked; midnight = stroke only (no fill). Tape numeral is inscribed and centered inside the diamond.
 *
 * **solarLunarPictogram**: Sun/moon pictogram only (no embedded hour numeral).
 *
 * **boxedNumber**: Filled highlight rectangle behind the tape numeral uses
 * {@link boxedNumberHighlightHalfExtentsFromMarkerContentBox} for most labels (broad horizontal swash vs the numeral).
 * Noon tape `"12"` uses {@link noonHighlighted12SwashGeometryFromMarkerContentBox}: one oversized rect from the entry
 * content box (`layout.size`), with vertical edges anchored to the tape numeral center — notional ink bounds from the
 * scaled numeral layout ({@link BOXED_NUMBER_NUMERAL_LAYOUT_SIZE_SCALE} × `size`) plus explicit clearance — not
 * label-length–driven and not a second shared center inflated around `(cx, cy)`.
 * Color is the resolver’s derived treatment color.
 *
 * **textWords**: Renders NOON / MID for the word overlay; resolver may still expose MIDNIGHT as the semantic disk label.
 */

import type { EffectiveTopBandHourMarkerSelection } from "../config/appConfig.ts";
import {
  noonMidnightActiveIntent,
  twentyFourHourAnchorActiveIntent,
} from "../config/noonMidnightIndicatorSemantics.ts";
import type { HourMarkerRepresentationSpec } from "../config/types/hourMarkerRepresentationSpec.ts";
import type {
  EffectiveNoonMidnightCustomization,
  EffectiveTopBandHourMarkers,
  HourMarkersNoonMidnightExpressionMode,
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

/** Highlight bar half-height vs marker content box — flat text-highlighter swash, not a tall plaque behind the glyph. */
const BOXED_NUMBER_HIGHLIGHT_HALF_H_FRAC = 0.3;
/** Minimum half-width: materially wider than typical two-digit numerals so the swash extends past the text. */
const BOXED_NUMBER_HIGHLIGHT_HALF_W_MIN_FRAC = 0.62;
const BOXED_NUMBER_HIGHLIGHT_HALF_W_PAD_FRAC = 0.2;
const BOXED_NUMBER_HIGHLIGHT_HALF_W_PER_CHAR_FRAC = 0.2;

/**
 * Noon boxed tape `"12"` only: broad strip-scale highlighter from {@link GlyphLayoutBox.size} (no text-fit width).
 * Horizontal span is a dedicated minimum; vertical placement uses the numeral anchor `(cx, cy)` with explicit extents
 * derived from the scaled tape numeral box ({@link BOXED_NUMBER_NUMERAL_LAYOUT_SIZE_SCALE} × `size`), not a swash
 * center offset from `cy`.
 */
const NOON_HIGHLIGHTED_12_ENTRY_SWASH_HALF_W_FRAC = 1.28;
/**
 * Notional distance from numeral anchor to top / bottom of `"12"` ink, as fractions of the scaled numeral layout side
 * (`{@link BOXED_NUMBER_NUMERAL_LAYOUT_SIZE_SCALE}` × marker content box). Used only to place the swash relative to the
 * numeral presentation, not for text measurement.
 */
const NOON_12_INK_TOP_FRAC_OF_SCALED_NUMERAL = 0.43;
const NOON_12_INK_BOTTOM_FRAC_OF_SCALED_NUMERAL = 0.41;
/** Extra highlight above the notional top of the ink (fraction of marker content box `s`). Creates visible field above "12". */
const NOON_12_SWASH_CLEAR_ABOVE_INK_FRAC = 0.26;
/** Extra pad below the notional ink bottom (fraction of `s`). */
const NOON_12_SWASH_PAD_BELOW_INK_FRAC = 0.12;

/** Highlight fill alpha (treatment color is resolver-derived rgb/hex). */
const BOXED_NUMBER_HIGHLIGHT_FILL_ALPHA = 0.72;
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
 * Inscribed numeral: {@link GlyphLayoutBox.size} is the square box for the tape label, centered on the diamond
 * center ({@link GlyphLayoutBox.cx/cy}) so the numeral reads as interior content of the glyph.
 */
export const SEMANTIC_NUMERAL_IN_DIAMOND_FRAC = 0.3;

/**
 * Layout scale for NOON / MID word overlays in `textWords` mode (bounded strip labels vs marker content box).
 */
export const TEXT_WORDS_NOON_LAYOUT_SIZE_FRAC = 0.64;

/**
 * Half extents for the boxed-number **highlight** rectangle (text-highlighter bar behind the tape numeral): derived
 * from the semantic layout’s marker content box size ({@link GlyphLayoutBox.size}) and the tape label span.
 * Applies to text realization — {@link GlyphLayoutBox.size} is the solved disk box side from layout. Sized as a broad
 * horizontal highlight span behind the numeral, not a tight numeral-sized plate or strip-scale badge frame. Noon tape
 * `"12"` uses {@link noonHighlighted12SwashGeometryFromMarkerContentBox} instead of this helper.
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

export type NoonHighlighted12SwashGeometry = {
  halfW: number;
  /**
   * Vertical distance from the numeral anchor `cy` (same as {@link GlyphLayoutBox.cy} for the tape label) **upward** to
   * the swash top edge: `rect.y = cy - extentAboveNumeralAnchor`.
   */
  extentAboveNumeralAnchor: number;
  /**
   * Vertical distance from the numeral anchor **downward** to the swash bottom: `rect.height = extentAbove + extentBelow`.
   */
  extentBelowNumeralAnchor: number;
};

/**
 * Noon boxed-number tape `"12"` only: single highlight rect geometry from {@link GlyphLayoutBox.size} — broad horizontal
 * span; vertical edges from explicit distances to the numeral anchor, using the scaled numeral layout side for
 * notional ink top/bottom plus dedicated clearance above the ink.
 */
export function noonHighlighted12SwashGeometryFromMarkerContentBox(markerContentBoxSizePx: number): NoonHighlighted12SwashGeometry {
  const s = Math.max(0, markerContentBoxSizePx);
  const scaledNumeralSide = s * BOXED_NUMBER_NUMERAL_LAYOUT_SIZE_SCALE;
  return {
    halfW: s * NOON_HIGHLIGHTED_12_ENTRY_SWASH_HALF_W_FRAC,
    extentAboveNumeralAnchor:
      scaledNumeralSide * NOON_12_INK_TOP_FRAC_OF_SCALED_NUMERAL + s * NOON_12_SWASH_CLEAR_ABOVE_INK_FRAC,
    extentBelowNumeralAnchor:
      scaledNumeralSide * NOON_12_INK_BOTTOM_FRAC_OF_SCALED_NUMERAL + s * NOON_12_SWASH_PAD_BELOW_INK_FRAC,
  };
}

/**
 * Mean vertical half-extent `(above+below)/2` for comparisons; placement uses
 * {@link noonHighlighted12SwashGeometryFromMarkerContentBox} (edges are not symmetric about a separate swash center).
 */
export function noonHighlighted12SwashHalfExtentsFromMarkerContentBox(markerContentBoxSizePx: number): {
  halfW: number;
  halfH: number;
} {
  const g = noonHighlighted12SwashGeometryFromMarkerContentBox(markerContentBoxSizePx);
  return {
    halfW: g.halfW,
    halfH: (g.extentAboveNumeralAnchor + g.extentBelowNumeralAnchor) / 2,
  };
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

/**
 * Shared strip-scale highlight for tape numerals `"12"` and `"00"`. In 24-hour civil mode both anchors use the same
 * boxed treatment as noon’s `"12"`; generic two-char highlights (`boxedNumberHighlightHalfExtentsFromMarkerContentBox`)
 * were visibly mismatched for `"00"` (narrower / different vertical balance).
 */
/** Exported for tests: 24hr civil `00`/`12` tape numerals share the same strip highlight treatment as noon `12`. */
export function tapeNumeralUsesNoonStyleStripHighlight(text: string): boolean {
  return text === "12" || text === "00";
}

function pushHighlightBehindTapeNumeral(
  cx: number,
  cy: number,
  text: string,
  markerContentBoxSizePx: number,
  treatmentColor: string,
  out: RenderPlanBuilder,
): void {
  if (tapeNumeralUsesNoonStyleStripHighlight(text)) {
    const g = noonHighlighted12SwashGeometryFromMarkerContentBox(markerContentBoxSizePx);
    out.push({
      kind: "rect",
      x: cx - g.halfW,
      y: cy - g.extentAboveNumeralAnchor,
      width: g.halfW * 2,
      height: g.extentAboveNumeralAnchor + g.extentBelowNumeralAnchor,
      fill: cssColorToRgbaFill(treatmentColor, BOXED_NUMBER_HIGHLIGHT_FILL_ALPHA),
    });
    return;
  }
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
  /**
   * Optional explicit emphasis intent for non-noon/midnight use-cases (for example UTC-focused current-hour emphasis).
   * When present, this bypasses structural noon/midnight trigger checks and directly uses the shared emphasis renderer.
   */
  forcedIntent?: {
    role: "noon" | "midnight";
    expressionMode: HourMarkersNoonMidnightExpressionMode;
  };
};

function typographyOverridesFor(args: NoonMidnightEmitArgs) {
  return resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection(
    args.effectiveTopBandHourMarkerSelection,
  );
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

function textWordsNoonMidnightWordLayout(base: GlyphLayoutBox): GlyphLayoutBox {
  return {
    ...base,
    size: base.size * TEXT_WORDS_NOON_LAYOUT_SIZE_FRAC,
  };
}

/**
 * Upper-indicator `textWords` strip label: full semantic roles stay noon/midnight; only this presentation string
 * is shortened for midnight so the word overlay does not crowd adjacent hour labels.
 */
function textWordsIndicatorStripDisplayLabel(structuralHour0To23: number): "NOON" | "MID" {
  return structuralHour0To23 === 0 ? "MID" : "NOON";
}

/**
 * When true, the caller must not emit its default hour-disk glyph for this instance.
 */
export function tryEmitNoonMidnightIndicatorDiskContent(
  args: NoonMidnightEmitArgs,
  gctx: GlyphRenderContext,
  out: RenderPlanBuilder,
): boolean {
  const intent = args.forcedIntent !== undefined
    ? {
        active: true as const,
        role: args.forcedIntent.role,
        expressionMode: args.forcedIntent.expressionMode,
      }
    : noonMidnightActiveIntent(args.customization, args.structuralHour0To23);
  if (!intent.active) {
    const anchor24 = twentyFourHourAnchorActiveIntent(
      args.effectiveTopBandHourMarkers.twentyFourHourAnchorCustomization,
      args.structuralHour0To23,
    );
    if (!anchor24.active || args.realizationKind !== "text") {
      return false;
    }
    const { cx, cy, size } = args.layout;
    const tape = args.tapeHourLabel;
    pushHighlightBehindTapeNumeral(cx, cy, tape, size, anchor24.boxedNumberBoxColor, out);
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
  if (args.realizationKind !== "text") {
    return false;
  }
  const mode = intent.expressionMode;
  const { cx, cy, size } = args.layout;
  const role = intent.role;
  const tape = args.tapeHourLabel;
  const boxedNumberTreatmentColor =
    args.customization.enabled &&
    args.customization.expressionMode === "boxedNumber" &&
    "boxedNumberBoxColor" in args.customization &&
    args.customization.boxedNumberBoxColor !== undefined
      ? args.customization.boxedNumberBoxColor
      : args.markerColor;

  if (mode === "textWords") {
    const wordContent: HourMarkerContent = {
      structuralHour0To23: args.structuralHour0To23,
      displayLabel: textWordsIndicatorStripDisplayLabel(args.structuralHour0To23),
    };
    pushGlyphContent(
      args,
      wordContent,
      args.hourSpec,
      gctx,
      out,
      textWordsNoonMidnightWordLayout(args.layout),
    );
    return true;
  }

  if (mode === "boxedNumber") {
    const highlightColor = boxedNumberTreatmentColor;
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

  // solarLunarPictogram: geometry reviewed; no change this pass (sun/moon balance already acceptable).
  if (mode === "solarLunarPictogram") {
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
      args.hourSpec,
      gctx,
      out,
      numeralLayout,
    );
    return true;
  }

  return false;
}
