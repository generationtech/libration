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

// ARCHITECTURE RULE:
// This file must not import from src/glyphs/** or src/renderer/**.

/**
 * Centralized presentation policy for bottom chrome floating readouts (roles, fills, optional letter spacing,
 * typography overrides). Geometry (x/y, font sizes from viewport) stays in {@link buildBottomChromeBandRenderPlan}.
 *
 * **Element → typography role** (mirrors top-band pattern; fills from {@link BottomChromeColorTokens}):
 *
 * | Readout              | Role               | Notes                                      |
 * | -------------------- | ------------------ | ------------------------------------------ |
 * | Left micro label     | `chromeZoneLabel`  | Weight 600; layout `leftMicroLabelLetterSpacingEm` |
 * | Reference time (primary) | `chromeHourPrimary`| Weight 700; zero extra tracking            |
 * | Right date line      | `chromeZoneLabel`  | Weight 700; fill matches primary time     |
 * | System-local info    | `chromeZoneLabel`  | Weight 600; subdued fill                   |
 */

import type { HourMarkerGlyphStyleId } from "./types/hourMarkerGlyphStyleIds.ts";
import type { ResolveTextStyleOverrides, TypographyRole } from "../typography/typographyTypes.ts";
import { BOTTOM_CHROME_STYLE } from "./bottomChromeStyle.ts";
import type { BottomChromeColorTokens } from "./bottomChromeStyle.ts";

/** Canvas text baselines for bottom-chrome policy (aligned with text glyph emission). */
export type BottomChromePolicyTextBaseline = "alphabetic" | "bottom" | "middle" | "top";

/** Presentation-only defaults for a bottom-chrome text glyph; layout lives in the band plan. */
export type BottomChromeTextVisualPolicy = {
  role: TypographyRole;
  glyphStyleId?: HourMarkerGlyphStyleId;
  fill?: string;
  typographyOverrides?: ResolveTextStyleOverrides;
  textBaseline?: BottomChromePolicyTextBaseline;
  /**
   * When set, passed through as `letterSpacingEm` on the emitted text glyph so spacing matches legacy readouts
   * (bypasses the hour-disk letter-spacing path in the glyph emitter).
   */
  letterSpacingEm?: number;
};

/** Subordinate informational line (system-local clock when shown). */
export function resolveBottomChromeSecondaryReadoutPolicy(
  colors: BottomChromeColorTokens,
): BottomChromeTextVisualPolicy {
  return {
    role: "chromeZoneLabel",
    fill: colors.secondaryReadout,
    typographyOverrides: { fontWeight: 600 },
    letterSpacingEm: 0,
  };
}

/** Reference-frame primary clock — weight 700 and zero extra tracking vs raw canvas defaults. */
export function resolveBottomChromeTimePolicy(colors: BottomChromeColorTokens): BottomChromeTextVisualPolicy {
  return {
    role: "chromeHourPrimary",
    fill: colors.primaryTime,
    typographyOverrides: { fontWeight: 700 },
    letterSpacingEm: 0,
  };
}

/** Micro label above primary clock — zone strip role with emphasis (600) and layout token letter spacing. */
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
