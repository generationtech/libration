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

import {
  blackOrWhiteForegroundForBackgroundCss,
  rgbaForegroundWithAlpha,
} from "../color/contrastForegroundOnCssBackground.ts";
import type { DisplayChromeLayoutConfig } from "./appConfig.ts";
import { DEFAULT_TICK_TAPE_AREA_BACKGROUND_COLOR } from "./appConfig.ts";
import { TOP_CHROME_STYLE, TOP_CHROME_TICK_TAPE_CONTRAST_INK_ALPHAS } from "./topChromeStyle.ts";

function hasTickTapeBackgroundAuthorOverride(layout: DisplayChromeLayoutConfig): boolean {
  const raw = layout.tickTapeAreaBackgroundColor;
  return typeof raw === "string" && raw.trim() !== "";
}

/**
 * Resolved 24-hour tickmarks tape: background fill plus generic tape tick/baseline strokes.
 * The thick present-time tick core on the tape reads {@link tapeTickStroke} when
 * {@link usesAuthoredTapeBackgroundOverride} is true so it matches ordinary tape ticks; the present-time halo and
 * non-tape reference-meridian map strokes stay on dedicated chrome tokens elsewhere.
 */
export type EffectiveTickTapeArea = {
  /** True when {@link DisplayChromeLayoutConfig.tickTapeAreaBackgroundColor} is a non-empty string. */
  usesAuthoredTapeBackgroundOverride: boolean;
  effectiveBackgroundColor: string;
  /**
   * WCAG-style black/white contrast choice against {@link effectiveBackgroundColor} — used when rebuilding tape ink
   * under an authored background override (same helper family as indicator entries).
   */
  effectiveForegroundColor: "#000000" | "#ffffff";
  /** Ordinary tape ticks + (when override) thick present-time tick core — same contrast-derived stroke family. */
  tapeTickStroke: string;
  tapeBaselineStroke: string;
};

/**
 * Resolves tape band fill and generic tick-rail ink from {@link DisplayChromeLayoutConfig}.
 * When no tape background override is authored, tick/baseline strokes match {@link TOP_CHROME_STYLE.ticks} exactly
 * so shipped appearance is unchanged.
 */
export function resolveEffectiveTickTapeArea(layout: DisplayChromeLayoutConfig): EffectiveTickTapeArea {
  const st = TOP_CHROME_STYLE;
  const usesAuthoredTapeBackgroundOverride = hasTickTapeBackgroundAuthorOverride(layout);
  const effectiveBackgroundColor = usesAuthoredTapeBackgroundOverride
    ? layout.tickTapeAreaBackgroundColor!.trim()
    : DEFAULT_TICK_TAPE_AREA_BACKGROUND_COLOR;
  const effectiveForegroundColor =
    blackOrWhiteForegroundForBackgroundCss(effectiveBackgroundColor);

  if (!usesAuthoredTapeBackgroundOverride) {
    return {
      usesAuthoredTapeBackgroundOverride: false,
      effectiveBackgroundColor,
      effectiveForegroundColor,
      tapeTickStroke: st.ticks.stroke,
      tapeBaselineStroke: st.ticks.baseline,
    };
  }

  return {
    usesAuthoredTapeBackgroundOverride: true,
    effectiveBackgroundColor,
    effectiveForegroundColor,
    tapeTickStroke: rgbaForegroundWithAlpha(
      effectiveForegroundColor,
      TOP_CHROME_TICK_TAPE_CONTRAST_INK_ALPHAS.tickStroke,
    ),
    tapeBaselineStroke: rgbaForegroundWithAlpha(
      effectiveForegroundColor,
      TOP_CHROME_TICK_TAPE_CONTRAST_INK_ALPHAS.baselineStroke,
    ),
  };
}
