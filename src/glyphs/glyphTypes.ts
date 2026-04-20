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

import type { RenderTextShadowStyle } from "../renderer/renderPlan/renderPlanTypes.ts";
import type { ResolveTextStyleOverrides, TypographyRole } from "../typography/typographyTypes.ts";
import type { HourMarkerGlyphStyleId } from "../config/types/hourMarkerGlyphStyleIds.ts";

export type GlyphRenderable = TextGlyph | ClockFaceGlyph | RadialLineGlyph | RadialWedgeGlyph;

/** Canvas text baseline values used by {@link emitGlyphToRenderPlan} for text glyphs. */
export type TextGlyphTextBaseline = "alphabetic" | "bottom" | "middle" | "top";

export type TextGlyph = {
  kind: "text";
  text: string;
  role: TypographyRole;
  /** Hour-marker style token; emitter resolves procedural/text paint from the style table. */
  styleId?: HourMarkerGlyphStyleId;
  /** When set, overrides the default hour-disk text fill (e.g. upper row / zone strip colors). */
  fill?: string;
  /** Merged into {@link resolveTextStyle} after layout-driven `fontSizePx` (e.g. weight for zone letters). */
  typographyOverrides?: ResolveTextStyleOverrides;
  /** Default `middle`; `top` uses {@link GlyphLayoutBox.cy} as the top baseline anchor. */
  textBaseline?: TextGlyphTextBaseline;
  /** Default `center` (hour-disk labels). Set for edge-anchored chrome lines (e.g. bottom readouts). */
  textAlign?: "left" | "center" | "right";
  /** When set, used as the final `letterSpacingEm` on the render primitive (skips hour-disk base + role mix). */
  letterSpacingEm?: number;
  shadow?: RenderTextShadowStyle;
};

export type ClockFaceGlyph = {
  kind: "clockFace";
  /** Civil / structural hour 0–23 (column index in the top band). */
  hour: number;
  /** Continuous minute-of-hour [0,60) for wall-clock layouts; paired with {@link showMinuteHand}. */
  minute?: number;
  styleId?: HourMarkerGlyphStyleId;
  showMinuteHand?: boolean;
  /** Top-band layout override: tints ring + hand strokes when per-component overrides are absent. */
  colorOverride?: string;
  /** When set, overrides {@link colorOverride} / style for the clock face disk fill. */
  faceFillOverride?: string;
  /** When set, overrides {@link colorOverride} / style for the outer ring stroke. */
  ringStrokeOverride?: string;
  /** When set, overrides {@link colorOverride} / style for the hour hand stroke. */
  handStrokeOverride?: string;
};

export type RadialLineGlyph = {
  kind: "radialLine";
  /** Hour-hand angle source: civil fractional hour-of-day [0,24) from the semantic plan, or structural 0–23 when integer-only. */
  hour: number;
  styleId?: HourMarkerGlyphStyleId;
  /** Top-band layout override for line stroke. */
  colorOverride?: string;
  /** Filled disk behind the stroke (resolver: indicator-row–aware face; overrides catalog when set). */
  faceFillOverride?: string;
};

export type RadialWedgeGlyph = {
  kind: "radialWedge";
  /** Wedge bisector angle: civil fractional hour-of-day [0,24) from the semantic plan, or structural 0–23 when integer-only. */
  hour: number;
  styleId?: HourMarkerGlyphStyleId;
  /** Top-band layout override for wedge fill. */
  colorOverride?: string;
  /** When set, overrides catalog wedge stroke color (resolver supplies default for indicator-row contrast). */
  strokeColorOverride?: string;
  /** Full disk behind the wedge annulus (resolver-derived face; overrides catalog when set). */
  faceFillOverride?: string;
};
