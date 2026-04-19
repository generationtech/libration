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
 * Centralized presentation policy for top-band text/glyphs (fills, roles, glyph style tokens, optional
 * typography overrides). Layout (x/y, row heights, font size) stays in stack planners and layout metrics.
 *
 * Inputs use {@link EffectiveTopBandHourMarkerSelection}; `resolveEffectiveTopBandHourMarkers` is the layered
 * contract (behavior/content/realization) derived from `chrome.layout.hourMarkers`.
 */

import type { EffectiveTopBandHourMarkerSelection } from "./appConfig.ts";
import type { HourMarkerGlyphStyleId } from "./types/hourMarkerGlyphStyleIds.ts";
import {
  resolveDefaultHourMarkerRepresentationSpec,
  resolveTopBandAnnotationSpec,
  resolveTopBandHourNumeralSpec,
  type HourMarkerRepresentationSpec,
} from "./types/hourMarkerRepresentationSpec.ts";
import type { ResolveTextStyleOverrides, TypographyRole } from "../typography/typographyTypes.ts";
import type { TopChromeStyle } from "./topChromeStyle.ts";
import { TOP_CHROME_CIRCLE_STACK_LAYOUT } from "./topChromeStyle.ts";

/** Canvas text baselines used for top-band policy (aligned with text glyph emission). */
export type TopBandPolicyTextBaseline = "alphabetic" | "bottom" | "middle" | "top";

/** Presentation-only defaults for a top-band text glyph; geometry lives in planners. */
export type TopBandTextVisualPolicy = {
  role: TypographyRole;
  glyphStyleId?: HourMarkerGlyphStyleId;
  fill?: string;
  typographyOverrides?: ResolveTextStyleOverrides;
  textBaseline?: TopBandPolicyTextBaseline;
};

/** Documents the layout floor for the upper numeral row (mirrors {@link TOP_CHROME_CIRCLE_STACK_LAYOUT.upperRowMinPx}). */
export type TopBandRowVisibilityPolicy = {
  upperNumeralMinHeightPx: number;
};

export function getDefaultTopBandRowVisibilityPolicy(): TopBandRowVisibilityPolicy {
  return { upperNumeralMinHeightPx: TOP_CHROME_CIRCLE_STACK_LAYOUT.upperRowMinPx };
}

/**
 * Whether upper next-hour numerals should be emitted for the current stack metrics.
 * Preserves prior behavior: draw only when the solver allocated positive height for the upper row, and the
 * allocated height meets the configured floor (currently 0 px, so any positive height qualifies).
 */
export function shouldRenderTopBandUpperNumerals(args: {
  upperNumeralH: number;
  upperRowMinPx: number;
}): boolean {
  return args.upperNumeralH > 0 && args.upperNumeralH >= args.upperRowMinPx;
}

export function resolveTopBandUpperNumeralPolicy(chrome: TopChromeStyle): TopBandTextVisualPolicy {
  const spec = resolveTopBandHourNumeralSpec();
  return {
    role: spec.textRole,
    glyphStyleId: spec.glyphStyleId,
    fill: chrome.topHourNumeral.color,
  };
}

export function resolveTopBandAnnotationPolicy(
  chrome: TopChromeStyle,
  _kind: "noon" | "midnight",
): TopBandTextVisualPolicy {
  void _kind;
  const spec = resolveTopBandAnnotationSpec("noon");
  return {
    role: spec.textRole,
    glyphStyleId: spec.glyphStyleId,
    fill: chrome.markerAnnotation.color,
  };
}

/** NATO / structural zone letter in the timezone strip (single column glyph). */
export function resolveTimezoneStripLetterPolicy(chrome: TopChromeStyle): TopBandTextVisualPolicy {
  return {
    role: "chromeZoneLabel",
    fill: chrome.zoneText.letter,
    typographyOverrides: { fontWeight: 800, letterSpacingPx: 0 },
  };
}

/** Small geography caption under the active column’s letter. */
export function resolveTimezoneStripCaptionPolicy(chrome: TopChromeStyle): TopBandTextVisualPolicy {
  return {
    role: "chromeZoneLabel",
    fill: chrome.zoneText.geographyCaption,
    typographyOverrides: { fontWeight: 600 },
    textBaseline: "top",
  };
}

/**
 * Canonical hour-marker representation for top-band disk interiors: text uses one typography role +
 * style token; font and size come from {@link EffectiveTopBandHourMarkerSelection}. Glyph uses
 * {@link resolveDefaultHourMarkerRepresentationSpec} for the selected procedural mode only.
 */
export function hourMarkerRepresentationSpecForTopBandEffectiveSelection(
  sel: EffectiveTopBandHourMarkerSelection,
): HourMarkerRepresentationSpec {
  if (sel.kind === "glyph") {
    return resolveDefaultHourMarkerRepresentationSpec(sel.glyphMode);
  }
  return {
    mode: "geometric",
    textRole: "chromeHourPrimary",
    glyphStyleId: "topBandHourDefault",
  };
}

/**
 * Typography overrides for top-band hour-disk text from the effective selection only (no layout bridges).
 */
export function resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection(
  sel: EffectiveTopBandHourMarkerSelection,
): ResolveTextStyleOverrides | undefined {
  if (sel.kind !== "text") {
    return undefined;
  }
  const out: ResolveTextStyleOverrides = {};
  if (sel.fontAssetId !== undefined) {
    out.fontAssetId = sel.fontAssetId;
  }
  if (sel.sizeMultiplier !== 1.0) {
    out.fontSizeMultiplier = sel.sizeMultiplier;
  }
  if (Object.keys(out).length === 0) {
    return undefined;
  }
  return out;
}
