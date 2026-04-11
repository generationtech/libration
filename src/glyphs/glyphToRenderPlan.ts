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
 * Renderer-agnostic bridge from semantic glyphs to {@link RenderPlan} primitives.
 *
 * Flow: TypographyRole → {@link resolveTextStyle} → {@link TextGlyph} → plan text item
 * (font identity = manifest fontAssetId + nominal style; no CSS-family-first emission).
 *
 * Non-text glyphs emit {@link RenderPlan} `path2d` / `line` items with colors and geometry only;
 * path geometry uses {@link RenderPathDescriptor} via {@link ../renderer/renderPlan/pathItemFactories.ts!createDescriptorPathItem}
 * where migrated; stroke caps/joins come from {@link resolveHourMarkerGlyphStyle} — no Canvas state in emitters.
 */

import type { FontAssetRegistry } from "../typography/fontAssetRegistry.ts";
import { resolveTextStyle } from "../typography/typographyResolver.ts";
import type { RenderPlan, RenderTextAlign } from "../renderer/renderPlan/renderPlanTypes.ts";
import { circlePathDescriptor } from "../renderer/renderPlan/circlePath2D.ts";
import { createDescriptorPathItem } from "../renderer/renderPlan/pathItemFactories.ts";
import type { ClockFaceGlyphStyle } from "./glyphStyleTypes.ts";
import { annularSectorPathDescriptor, hourToTheta, polarToCartesian } from "./glyphGeometry.ts";
import { resolveHourMarkerGlyphStyle } from "./glyphStyles.ts";
import type {
  ClockFaceGlyph,
  GlyphRenderable,
  RadialLineGlyph,
  RadialWedgeGlyph,
  TextGlyph,
} from "./glyphTypes.ts";
import type { GlyphLayoutBox } from "./glyphLayout.ts";

export type GlyphRenderContext = {
  fontRegistry: FontAssetRegistry;
};

/** Mutable sink for plan items (same shape as {@link RenderPlan.items}). */
export type RenderPlanBuilder = RenderPlan["items"];

/** Default hour-disk numeral fill when no explicit `TextGlyph.fill` (matches prior `glyph.fill ?? …` behavior). */
export const DEFAULT_HOUR_MARKER_TEXT_FILL = "rgba(8, 28, 58, 0.94)";

/** Legacy hour-disk tracking (em), preserved when combining with role + glyph token spacing. */
const HOUR_DISK_BASE_LETTER_SPACING_EM = 0.02;

function emitTextGlyph(
  glyph: TextGlyph,
  layout: GlyphLayoutBox,
  ctx: GlyphRenderContext,
  out: RenderPlanBuilder,
): void {
  const hints =
    glyph.styleId !== undefined ? resolveHourMarkerGlyphStyle(glyph.styleId).text : {};
  const insetFrac = Math.max(0, hints.insetFrac ?? 0);
  const effectiveSize = layout.size * (1 - 2 * insetFrac);
  const baselineShiftFrac = hints.baselineShiftFrac ?? 0;
  const baseline = glyph.textBaseline ?? "middle";
  const y = layout.cy + layout.size * baselineShiftFrac;
  const x = layout.cx;
  const textAlign: RenderTextAlign = glyph.textAlign ?? "center";

  const style = resolveTextStyle(ctx.fontRegistry, glyph.role, {
    fontSizePx: effectiveSize,
    ...glyph.typographyOverrides,
  });
  const trackingPx = hints.trackingPx ?? 0;
  const letterSpacingEm =
    glyph.letterSpacingEm !== undefined
      ? glyph.letterSpacingEm
      : HOUR_DISK_BASE_LETTER_SPACING_EM + (style.letterSpacingPx + trackingPx) / style.fontSizePx;

  const weight = style.fontWeight ?? 400;
  const fill = glyph.fill ?? DEFAULT_HOUR_MARKER_TEXT_FILL;
  out.push({
    kind: "text",
    x,
    y,
    text: glyph.text,
    fill,
    font: {
      assetId: style.fontAssetId,
      displayName: style.displayName,
      sizePx: style.fontSizePx,
      weight: typeof weight === "number" ? weight : weight,
      style: style.fontStyle,
      ...(style.lineHeightPx !== undefined ? { lineHeightPx: style.lineHeightPx } : {}),
    },
    textAlign,
    textBaseline: baseline,
    letterSpacingEm,
    ...(glyph.shadow !== undefined ? { shadow: glyph.shadow } : {}),
  });
}

/**
 * Deterministic hour-hand tip for tests (same math as {@link emitClockFaceGlyph}).
 * {@link clockStyle} comes from {@link resolveHourMarkerGlyphStyle}; do not duplicate fractions here.
 */
export function clockFaceHourHandTip(
  layout: GlyphLayoutBox,
  hour0To23: number,
  clockStyle: ClockFaceGlyphStyle,
): { x: number; y: number } {
  const R = layout.size * 0.5;
  const reach = R * clockStyle.handLengthRadiusFrac;
  return polarToCartesian(layout.cx, layout.cy, reach, hourToTheta(hour0To23));
}

function emitClockFaceGlyph(
  glyph: ClockFaceGlyph,
  layout: GlyphLayoutBox,
  out: RenderPlanBuilder,
): void {
  const styleSpec = resolveHourMarkerGlyphStyle(glyph.styleId ?? "topBandHourAnalogClock");
  const cf = styleSpec.clockFace;
  const R = layout.size * 0.5;
  const cx = layout.cx;
  const cy = layout.cy;
  const hourNorm = ((glyph.hour % 24) + 24) % 24;
  const ringR = R * (1 - cf.ringInsetFrac);
  const tip = clockFaceHourHandTip(layout, hourNorm, cf);

  const ringStroke = glyph.ringStrokeOverride ?? glyph.colorOverride ?? cf.ringStroke;
  const handStroke = glyph.handStrokeOverride ?? glyph.colorOverride ?? cf.handStroke;
  const faceFill = glyph.faceFillOverride ?? cf.faceFill;
  out.push(
    createDescriptorPathItem({
      pathDescriptor: circlePathDescriptor(cx, cy, ringR),
      fill: faceFill,
      stroke: ringStroke,
      strokeWidthPx: cf.ringStrokeWidthPx,
    }),
  );
  out.push({
    kind: "line",
    x1: cx,
    y1: cy,
    x2: tip.x,
    y2: tip.y,
    stroke: handStroke,
    strokeWidthPx: cf.handStrokeWidthPx,
    lineCap: cf.lineCap,
  });
}

function emitRadialLineGlyph(glyph: RadialLineGlyph, layout: GlyphLayoutBox, out: RenderPlanBuilder): void {
  const styleSpec = resolveHourMarkerGlyphStyle(glyph.styleId ?? "topBandHourDefault");
  const rl = styleSpec.radialLine;
  const R = layout.size * 0.5;
  const theta = hourToTheta(glyph.hour);
  const length = R * rl.lengthRadiusFrac;
  const tip = polarToCartesian(layout.cx, layout.cy, length, theta);
  out.push({
    kind: "line",
    x1: layout.cx,
    y1: layout.cy,
    x2: tip.x,
    y2: tip.y,
    stroke: glyph.colorOverride ?? rl.stroke,
    strokeWidthPx: rl.lineWidthPx,
    lineCap: rl.lineCap,
  });
}

function emitRadialWedgeGlyph(glyph: RadialWedgeGlyph, layout: GlyphLayoutBox, out: RenderPlanBuilder): void {
  const styleSpec = resolveHourMarkerGlyphStyle(glyph.styleId ?? "topBandHourDefault");
  const rw = styleSpec.radialWedge;
  const R = layout.size * 0.5;
  const theta = hourToTheta(glyph.hour);
  const halfSweep = (rw.sweepAngleDeg * Math.PI) / 180 / 2;
  const t0 = theta - halfSweep;
  const t1 = theta + halfSweep;
  const rOuter = R * rw.outerRadiusFrac;
  const rInner = R * rw.innerRadiusFrac;
  const pathDescriptor = annularSectorPathDescriptor(layout.cx, layout.cy, rInner, rOuter, t0, t1);
  const strokeW = rw.strokeWidthPx;
  const useStroke =
    rw.stroke !== undefined && strokeW !== undefined && strokeW > 0;
  const fill = glyph.colorOverride ?? rw.fill;
  out.push(
    createDescriptorPathItem({
      pathDescriptor,
      fill,
      ...(useStroke ? { stroke: rw.stroke, strokeWidthPx: strokeW } : {}),
    }),
  );
}

/**
 * Appends draw items for {@link glyph} into {@link out}. {@link layout.size} is the disk label size for text
 * and the square box side for the analog clock (circle radius = size / 2).
 */
export function emitGlyphToRenderPlan(
  glyph: GlyphRenderable,
  layout: GlyphLayoutBox,
  ctx: GlyphRenderContext,
  out: RenderPlanBuilder,
): void {
  if (glyph.kind === "text") {
    emitTextGlyph(glyph, layout, ctx, out);
    return;
  }
  if (glyph.kind === "clockFace") {
    emitClockFaceGlyph(glyph, layout, out);
    return;
  }
  if (glyph.kind === "radialLine") {
    emitRadialLineGlyph(glyph, layout, out);
    return;
  }
  emitRadialWedgeGlyph(glyph, layout, out);
}
