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
 * Centralized presentation policy for bottom chrome floating readouts (roles, fills, optional letter spacing,
 * typography overrides). Geometry (x/y, font sizes from viewport) stays in {@link buildBottomChromeBandRenderPlan}.
 *
 * **Element → typography role** (mirrors top-band pattern; fills from {@link BottomChromeColorTokens}):
 *
 * | Readout              | Role               | Notes                                      |
 * | -------------------- | ------------------ | ------------------------------------------ |
 * | Left micro label     | `chromeZoneLabel`  | Weight 600; layout `leftMicroLabelLetterSpacingEm` |
 * | Local time (primary) | `chromeHourPrimary`| Weight 700; zero extra tracking            |
 * | Right date line      | `chromeZoneLabel`  | Weight 700; fill matches primary time     |
 */

import type { TextGlyph } from "../glyphs/glyphTypes.ts";
import type { HourMarkerGlyphStyleId } from "../glyphs/glyphStyleTypes.ts";
import type { RenderTextShadowStyle } from "../renderer/renderPlan/renderPlanTypes.ts";
import type { ResolveTextStyleOverrides, TypographyRole } from "../typography/typographyTypes.ts";
import { BOTTOM_CHROME_STYLE } from "./bottomChromeStyle.ts";
import type { BottomChromeColorTokens } from "./bottomChromeStyle.ts";

/** Presentation-only defaults for a bottom-chrome text glyph; layout lives in the band plan. */
export type BottomChromeTextVisualPolicy = {
  role: TypographyRole;
  glyphStyleId?: HourMarkerGlyphStyleId;
  fill?: string;
  typographyOverrides?: ResolveTextStyleOverrides;
  textBaseline?: TextGlyph["textBaseline"];
  /**
   * When set, passed through to {@link TextGlyph.letterSpacingEm} so spacing matches legacy readouts
   * (bypasses the hour-disk letter-spacing path in {@link emitGlyphToRenderPlan}).
   */
  letterSpacingEm?: number;
};

/** Local time — matches prior weight (700) and zero extra tracking vs raw canvas defaults. */
export function resolveBottomChromeTimePolicy(colors: BottomChromeColorTokens): BottomChromeTextVisualPolicy {
  return {
    role: "chromeHourPrimary",
    fill: colors.primaryTime,
    typographyOverrides: { fontWeight: 700 },
    letterSpacingEm: 0,
  };
}

/** Micro label — zone strip role with emphasis (600) and layout token letter spacing. */
export function resolveBottomChromeLabelPolicy(colors: BottomChromeColorTokens): BottomChromeTextVisualPolicy {
  return {
    role: "chromeZoneLabel",
    fill: colors.microLabel,
    typographyOverrides: { fontWeight: 600 },
    letterSpacingEm: BOTTOM_CHROME_STYLE.layout.leftMicroLabelLetterSpacingEm,
  };
}

/** Right date — same face weight as the primary clock (700); fill follows primary time token. */
export function resolveBottomChromeDatePolicy(colors: BottomChromeColorTokens): BottomChromeTextVisualPolicy {
  return {
    role: "chromeZoneLabel",
    fill: colors.primaryTime,
    typographyOverrides: { fontWeight: 700 },
    letterSpacingEm: 0,
  };
}

export function createBottomChromeTextGlyph(
  text: string,
  policy: BottomChromeTextVisualPolicy,
  options: {
    textAlign: "left" | "center" | "right";
    shadow: RenderTextShadowStyle;
  },
): TextGlyph {
  const glyph: TextGlyph = {
    kind: "text",
    text,
    role: policy.role,
    textAlign: options.textAlign,
    shadow: options.shadow,
  };
  if (policy.glyphStyleId !== undefined) {
    glyph.styleId = policy.glyphStyleId;
  }
  if (policy.fill !== undefined) {
    glyph.fill = policy.fill;
  }
  if (policy.typographyOverrides !== undefined && Object.keys(policy.typographyOverrides).length > 0) {
    glyph.typographyOverrides = policy.typographyOverrides;
  }
  if (policy.textBaseline !== undefined) {
    glyph.textBaseline = policy.textBaseline;
  }
  if (policy.letterSpacingEm !== undefined) {
    glyph.letterSpacingEm = policy.letterSpacingEm;
  }
  return glyph;
}
