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

import type { HourMarkerRepresentationSpec } from "./hourMarkerRepresentation.ts";

/**
 * Text-backed representation for upper next-hour numerals (this phase: typographic only).
 */
export function resolveTopBandHourNumeralSpec(): HourMarkerRepresentationSpec {
  return {
    mode: "geometric",
    textRole: "chromeHourEmphasis",
    glyphStyleId: "topBandChromeUpperNumeral",
  };
}

/**
 * Text-backed representation for noon/midnight annotations (this phase: typographic only).
 */
export function resolveTopBandAnnotationSpec(
  _kind: "noon" | "midnight",
): HourMarkerRepresentationSpec {
  void _kind;
  return {
    mode: "geometric",
    textRole: "chromeZoneLabel",
    glyphStyleId: "topBandChromeAnnotation",
  };
}
