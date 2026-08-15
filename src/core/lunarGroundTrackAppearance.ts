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
 * Persisted RGB identity for lunar ground-track polylines.
 * Alpha / veil remain plan-builder policy, not user color.
 */

import { parseCssColorToRgba8888 } from "../color/contrastForegroundOnCssBackground";

/** LIB-004 cool stroke `rgb(170, 205, 240)` as canonical `#rrggbb`. */
export const DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR = "#aacdf0";

export const DEFAULT_LUNAR_GROUND_TRACK_PAST_COLOR = DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR;
export const DEFAULT_LUNAR_GROUND_TRACK_FUTURE_COLOR = DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR;

function toHexRrggbb(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Maps unknown persisted/UI color values onto lowercase `#rrggbb`.
 * Unparseable input becomes {@link DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR}.
 * Alpha in `rgba()` is discarded: stroke opacity is plan-builder policy.
 */
export function normalizeLunarGroundTrackStrokeCss(raw: unknown): string {
  if (typeof raw !== "string") {
    return DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR;
  }
  const parsed = parseCssColorToRgba8888(raw);
  if (!parsed) {
    return DEFAULT_LUNAR_GROUND_TRACK_STROKE_COLOR;
  }
  return toHexRrggbb(parsed.r, parsed.g, parsed.b);
}
