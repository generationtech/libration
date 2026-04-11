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

import type { HourMarkerGlyphStyleId } from "../config/types/hourMarkerGlyphStyleIds.ts";
import type {
  ClockFaceGlyphStyle,
  HourMarkerGlyphStyleSpec,
  RadialLineGlyphStyle,
  RadialWedgeGlyphStyle,
} from "./glyphStyleTypes.ts";
import {
  DEFAULT_ANALOG_FACE_FILL,
  DEFAULT_ANALOG_HAND_COLOR,
  DEFAULT_ANALOG_RING_COLOR,
  DEFAULT_RADIAL_LINE_COLOR,
  DEFAULT_RADIAL_WEDGE_FILL,
} from "../config/topBandHourMarkersDefaults.ts";

/** Centralized hour-marker glyph styles (no layout; deterministic units). */
const TOP_BAND_DEFAULT_CLOCK: ClockFaceGlyphStyle = {
  faceFill: DEFAULT_ANALOG_FACE_FILL,
  ringStroke: DEFAULT_ANALOG_RING_COLOR,
  handStroke: DEFAULT_ANALOG_HAND_COLOR,
  ringStrokeWidthPx: 1.25,
  handStrokeWidthPx: 2,
  handLengthRadiusFrac: 0.55,
  ringInsetFrac: 0,
  lineCap: "round",
};

const TOP_BAND_RADIAL_LINE: RadialLineGlyphStyle = {
  lineWidthPx: TOP_BAND_DEFAULT_CLOCK.handStrokeWidthPx,
  lengthRadiusFrac: 0.85,
  lineCap: "round",
  stroke: DEFAULT_RADIAL_LINE_COLOR,
};

const TOP_BAND_RADIAL_WEDGE: RadialWedgeGlyphStyle = {
  outerRadiusFrac: 0.95,
  innerRadiusFrac: 0.55,
  sweepAngleDeg: 20,
  fill: DEFAULT_RADIAL_WEDGE_FILL,
  stroke: "rgba(70, 140, 210, 0.45)",
  strokeWidthPx: 0.75,
};

const HOUR_MARKER_GLYPH_STYLES: Record<HourMarkerGlyphStyleId, HourMarkerGlyphStyleSpec> = {
  topBandHourDefault: {
    clockFace: TOP_BAND_DEFAULT_CLOCK,
    radialLine: TOP_BAND_RADIAL_LINE,
    radialWedge: TOP_BAND_RADIAL_WEDGE,
    text: {},
  },
  topBandHourSegment: {
    clockFace: TOP_BAND_DEFAULT_CLOCK,
    radialLine: TOP_BAND_RADIAL_LINE,
    radialWedge: TOP_BAND_RADIAL_WEDGE,
    text: { baselineShiftFrac: 0.03 },
  },
  topBandHourDotMatrix: {
    clockFace: TOP_BAND_DEFAULT_CLOCK,
    radialLine: TOP_BAND_RADIAL_LINE,
    radialWedge: TOP_BAND_RADIAL_WEDGE,
    text: { trackingPx: 0.35 },
  },
  topBandHourTerminal: {
    clockFace: TOP_BAND_DEFAULT_CLOCK,
    radialLine: TOP_BAND_RADIAL_LINE,
    radialWedge: TOP_BAND_RADIAL_WEDGE,
    text: { insetFrac: 0.06 },
  },
  topBandHourAnalogClock: {
    clockFace: TOP_BAND_DEFAULT_CLOCK,
    radialLine: TOP_BAND_RADIAL_LINE,
    radialWedge: TOP_BAND_RADIAL_WEDGE,
    text: {},
  },
  /** Upper next-hour row — slight inset / optical lift vs in-disk numerals. */
  topBandChromeUpperNumeral: {
    clockFace: TOP_BAND_DEFAULT_CLOCK,
    radialLine: TOP_BAND_RADIAL_LINE,
    radialWedge: TOP_BAND_RADIAL_WEDGE,
    text: { insetFrac: 0.02, baselineShiftFrac: -0.02 },
  },
  /** NOON / MIDNIGHT crown — light downward nudge for small caps in the annotation row. */
  topBandChromeAnnotation: {
    clockFace: TOP_BAND_DEFAULT_CLOCK,
    radialLine: TOP_BAND_RADIAL_LINE,
    radialWedge: TOP_BAND_RADIAL_WEDGE,
    text: { baselineShiftFrac: 0.02 },
  },
};

/**
 * Resolve tokenized style for an hour-marker glyph. Unknown ids should not occur at runtime;
 * callers default {@link HourMarkerGlyphStyleId} on glyphs before emission.
 */
export function resolveHourMarkerGlyphStyle(styleId: HourMarkerGlyphStyleId): HourMarkerGlyphStyleSpec {
  return HOUR_MARKER_GLYPH_STYLES[styleId];
}
