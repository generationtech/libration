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
// Types under src/config/types/ define policy/semantics. This module must not import from
// src/glyphs/** or src/renderer/**.

import type { NumericRepresentationMode } from "../appConfig.ts";
import type { HourMarkerGlyphStyleId } from "./hourMarkerGlyphStyleIds.ts";
import type { TypographyRole } from "../../typography/typographyTypes.ts";

/**
 * Which representation family is used for an hour marker. Broader than {@link NumericRepresentationMode}
 * (app config) so future modes can be declared without widening user-facing config yet.
 */
export type HourMarkerRepresentationMode =
  | "geometric"
  | "segment"
  | "dotmatrix"
  | "terminal"
  | "analogClock"
  | "radialWedge"
  | "radialLine";

/**
 * Declarative policy: mode + typography role for text paths + procedural/text style tokens.
 */
export type HourMarkerRepresentationSpec = {
  mode: HourMarkerRepresentationMode;
  textRole: TypographyRole;
  glyphStyleId: HourMarkerGlyphStyleId;
};

/**
 * Default hour-marker representation for the current user-facing {@link NumericRepresentationMode}.
 */
export function resolveDefaultHourMarkerRepresentationSpec(
  mode: NumericRepresentationMode,
): HourMarkerRepresentationSpec {
  switch (mode) {
    case "geometric":
      return {
        mode: "geometric",
        textRole: "chromeHourPrimary",
        glyphStyleId: "topBandHourDefault",
      };
    case "segment":
      return {
        mode: "segment",
        textRole: "chromeSegment",
        glyphStyleId: "topBandHourSegment",
      };
    case "dotmatrix":
      return {
        mode: "dotmatrix",
        textRole: "chromeDotMatrix",
        glyphStyleId: "topBandHourDotMatrix",
      };
    case "terminal":
      return {
        mode: "terminal",
        textRole: "chromeDenseMono",
        glyphStyleId: "topBandHourTerminal",
      };
    case "analogClock":
      return {
        mode: "analogClock",
        textRole: "chromeHourPrimary",
        glyphStyleId: "topBandHourAnalogClock",
      };
    case "radialLine":
      return {
        mode: "radialLine",
        textRole: "chromeHourPrimary",
        glyphStyleId: "topBandHourDefault",
      };
    case "radialWedge":
      return {
        mode: "radialWedge",
        textRole: "chromeHourPrimary",
        glyphStyleId: "topBandHourDefault",
      };
    default: {
      const _exhaustive: never = mode;
      return _exhaustive;
    }
  }
}

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
export function resolveTopBandAnnotationSpec(_kind: "noon" | "midnight"): HourMarkerRepresentationSpec {
  void _kind;
  return {
    mode: "geometric",
    textRole: "chromeZoneLabel",
    glyphStyleId: "topBandChromeAnnotation",
  };
}
