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

import type { NumericRepresentationMode } from "../config/appConfig.ts";
import {
  createTopBandTextGlyph,
  resolveTopBandAnnotationPolicy,
  resolveTopBandUpperNumeralPolicy,
} from "../config/topBandVisualPolicy.ts";
import type { TopChromeStyle } from "../renderer/topChromeStyle.ts";
import type { HourMarkerContent } from "./hourMarkerContent.ts";
import { resolveDefaultHourMarkerRepresentationSpec } from "./hourMarkerRepresentationDefaults.ts";
import type { HourMarkerRepresentationSpec } from "./hourMarkerRepresentation.ts";
import type { ResolveTextStyleOverrides } from "../typography/typographyTypes.ts";
import type { GlyphRenderable, TextGlyph } from "./glyphTypes.ts";
import type { TopBandAnnotationContent, TopBandHourNumeralContent } from "./topBandContent.ts";

function normalizeHour0To23(h: number): number {
  return ((h % 24) + 24) % 24;
}

/**
 * Authoritative hour-marker glyph construction from semantic content + representation policy.
 */
export function createHourMarkerGlyph(
  content: HourMarkerContent,
  spec: HourMarkerRepresentationSpec,
  textTypographyOverrides?: ResolveTextStyleOverrides,
  optionalMarkerColor?: string,
): GlyphRenderable {
  const structural = normalizeHour0To23(content.structuralHour0To23);
  const textExtras =
    textTypographyOverrides !== undefined && Object.keys(textTypographyOverrides).length > 0
      ? { typographyOverrides: textTypographyOverrides }
      : {};
  const textFill =
    optionalMarkerColor !== undefined ? { fill: optionalMarkerColor } : {};
  const proceduralColor =
    optionalMarkerColor !== undefined ? { colorOverride: optionalMarkerColor } : {};

  switch (spec.mode) {
    case "analogClock":
      return {
        kind: "clockFace",
        hour: structural,
        styleId: spec.glyphStyleId,
        showMinuteHand: false,
        ...proceduralColor,
      };
    case "geometric":
      return {
        kind: "text",
        text: content.displayLabel,
        role: spec.textRole,
        styleId: spec.glyphStyleId,
        ...textExtras,
        ...textFill,
      };
    case "radialLine":
      return {
        kind: "radialLine",
        hour: structural,
        styleId: spec.glyphStyleId,
        ...proceduralColor,
      };
    case "radialWedge":
      return {
        kind: "radialWedge",
        hour: structural,
        styleId: spec.glyphStyleId,
        ...proceduralColor,
      };
    case "segment":
    case "dotmatrix":
    case "terminal":
      return {
        kind: "text",
        text: content.displayLabel,
        role: spec.textRole,
        styleId: spec.glyphStyleId,
        ...textExtras,
        ...textFill,
      };
    default: {
      const _exhaustive: never = spec.mode;
      return _exhaustive;
    }
  }
}

/**
 * Convenience: padded 24h label + config defaults. For top-band disks with local12 labels,
 * prefer {@link createHourMarkerGlyph} with planner-resolved {@link HourMarkerContent}.
 */
export function createHourGlyph(hour: number, mode: NumericRepresentationMode): GlyphRenderable {
  const h = normalizeHour0To23(hour);
  return createHourMarkerGlyph(
    { structuralHour0To23: h, displayLabel: h.toString().padStart(2, "0") },
    resolveDefaultHourMarkerRepresentationSpec(mode),
  );
}

/** Top-band upper next-hour numeral (policy: role, glyph style, chrome fill; label from planner). */
export function createTopBandHourNumeralGlyph(
  content: TopBandHourNumeralContent,
  chromeStyle: TopChromeStyle,
): TextGlyph {
  return createTopBandTextGlyph(content.label, resolveTopBandUpperNumeralPolicy(chromeStyle));
}

/** Top-band noon/midnight crown (policy: role, glyph style, chrome fill). */
export function createTopBandAnnotationGlyph(
  content: TopBandAnnotationContent,
  chromeStyle: TopChromeStyle,
): TextGlyph {
  return createTopBandTextGlyph(content.label, resolveTopBandAnnotationPolicy(chromeStyle, content.kind));
}
