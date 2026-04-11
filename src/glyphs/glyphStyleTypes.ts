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
 * Backend-neutral style tokens for glyph rendering. Layout supplies the box;
 * these tokens control drawing inside the box.
 */

export type ClockFaceGlyphStyle = {
  /** Face + ring fill (CSS color string). */
  faceFill: string;
  ringStroke: string;
  handStroke: string;
  ringStrokeWidthPx: number;
  handStrokeWidthPx: number;
  /** Hour-hand tip distance from center as a fraction of nominal radius {@code layout.size * 0.5}. */
  handLengthRadiusFrac: number;
  /** Minute-hand tip distance from center as a fraction of nominal radius (nearly to inner face edge). */
  minuteHandLengthRadiusFrac: number;
  /** Minute hand stroke width (px); typically slightly thinner than the hour hand for hierarchy. */
  minuteHandStrokeWidthPx: number;
  /** Shrinks the ring path relative to the layout disk (0 = full radius, unchanged from legacy). */
  ringInsetFrac: number;
  lineCap: "butt" | "round" | "square";
};

/**
 * Glyph-local presentation hints for text hour markers. Planner owns placement and {@link GlyphLayoutBox.size};
 * these adjust drawing inside that box. Not a substitute for {@link TypographyRole} (font asset, nominal metrics).
 */
export type TextGlyphStyle = {
  /** Inset from each edge as a fraction of layout box side — shrinks the effective typographic size. */
  insetFrac?: number;
  /** Optical vertical shift of the text anchor as a fraction of layout box side (positive = down). */
  baselineShiftFrac?: number;
  /** Additive letter-spacing in px, on top of the resolved role’s {@link TypographyRoleSpec.letterSpacingPx}. */
  trackingPx?: number;
};

export type RadialLineGlyphStyle = {
  lineWidthPx: number;
  lengthRadiusFrac: number;
  lineCap: "butt" | "round" | "square";
  /** Stroke color (CSS color string). */
  stroke: string;
};

export type RadialWedgeGlyphStyle = {
  outerRadiusFrac: number;
  innerRadiusFrac: number;
  /** Full angular width of the wedge (degrees). */
  sweepAngleDeg: number;
  fill: string;
  stroke?: string;
  strokeWidthPx?: number;
};

export type HourMarkerGlyphStyleSpec = {
  clockFace: ClockFaceGlyphStyle;
  radialLine: RadialLineGlyphStyle;
  radialWedge: RadialWedgeGlyphStyle;
  text: TextGlyphStyle;
};
