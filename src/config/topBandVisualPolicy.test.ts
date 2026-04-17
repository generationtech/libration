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

import { describe, expect, it } from "vitest";
import {
  getDefaultTopBandRowVisibilityPolicy,
  hourMarkerRepresentationSpecForTopBandEffectiveSelection,
  resolveTopBandAnnotationPolicy,
  resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection,
  resolveTopBandUpperNumeralPolicy,
  resolveTimezoneStripCaptionPolicy,
  resolveTimezoneStripLetterPolicy,
  shouldRenderTopBandUpperNumerals,
} from "./topBandVisualPolicy.ts";
import { TOP_CHROME_STYLE } from "./topChromeStyle.ts";

describe("topBandVisualPolicy", () => {
  it("resolveTopBandUpperNumeralPolicy matches representation defaults + chrome fill", () => {
    const p = resolveTopBandUpperNumeralPolicy(TOP_CHROME_STYLE);
    expect(p.role).toBe("chromeHourEmphasis");
    expect(p.glyphStyleId).toBe("topBandChromeUpperNumeral");
    expect(p.fill).toBe(TOP_CHROME_STYLE.topHourNumeral.color);
    expect(p.typographyOverrides).toBeUndefined();
  });

  it("resolveTopBandAnnotationPolicy is stable for noon vs midnight (kind ignored for visuals)", () => {
    const noon = resolveTopBandAnnotationPolicy(TOP_CHROME_STYLE, "noon");
    const midnight = resolveTopBandAnnotationPolicy(TOP_CHROME_STYLE, "midnight");
    expect(noon).toEqual(midnight);
    expect(noon.role).toBe("chromeZoneLabel");
    expect(noon.glyphStyleId).toBe("topBandChromeAnnotation");
    expect(noon.fill).toBe(TOP_CHROME_STYLE.markerAnnotation.color);
  });

  it("resolveTimezoneStripLetterPolicy and caption policy use zone text fills and weights", () => {
    const letter = resolveTimezoneStripLetterPolicy(TOP_CHROME_STYLE);
    expect(letter.role).toBe("chromeZoneLabel");
    expect(letter.fill).toBe(TOP_CHROME_STYLE.zoneText.letter);
    expect(letter.typographyOverrides).toEqual({ fontWeight: 800 });

    const cap = resolveTimezoneStripCaptionPolicy(TOP_CHROME_STYLE);
    expect(cap.role).toBe("chromeZoneLabel");
    expect(cap.fill).toBe(TOP_CHROME_STYLE.zoneText.geographyCaption);
    expect(cap.typographyOverrides).toEqual({ fontWeight: 600 });
    expect(cap.textBaseline).toBe("top");
  });

  it("timezone letter and caption policies read distinct zone text fills from chrome tokens", () => {
    expect(resolveTimezoneStripLetterPolicy(TOP_CHROME_STYLE).fill).toBe(TOP_CHROME_STYLE.zoneText.letter);
    expect(resolveTimezoneStripCaptionPolicy(TOP_CHROME_STYLE).fill).toBe(
      TOP_CHROME_STYLE.zoneText.geographyCaption,
    );
  });

  it("shouldRenderTopBandUpperNumerals matches current gate (positive height, meets floor)", () => {
    expect(
      shouldRenderTopBandUpperNumerals({ upperNumeralH: 0, upperRowMinPx: 0 }),
    ).toBe(false);
    expect(
      shouldRenderTopBandUpperNumerals({ upperNumeralH: 14, upperRowMinPx: 0 }),
    ).toBe(true);
    expect(
      shouldRenderTopBandUpperNumerals({ upperNumeralH: 14, upperRowMinPx: 14 }),
    ).toBe(true);
    expect(
      shouldRenderTopBandUpperNumerals({ upperNumeralH: 3, upperRowMinPx: 5 }),
    ).toBe(false);
  });

  it("getDefaultTopBandRowVisibilityPolicy exposes layout upper row floor", () => {
    const pol = getDefaultTopBandRowVisibilityPolicy();
    expect(pol.upperNumeralMinHeightPx).toBe(0);
  });

  it("hourMarkerRepresentationSpecForTopBandEffectiveSelection is text-canonical vs glyph from mode", () => {
    expect(
      hourMarkerRepresentationSpecForTopBandEffectiveSelection({
        kind: "text",
        fontAssetId: "computer",
        sizeMultiplier: 1,
      }),
    ).toEqual({
      mode: "geometric",
      textRole: "chromeHourPrimary",
      glyphStyleId: "topBandHourDefault",
    });
    expect(
      hourMarkerRepresentationSpecForTopBandEffectiveSelection({
        kind: "glyph",
        glyphMode: "radialWedge",
        sizeMultiplier: 1,
      }).mode,
    ).toBe("radialWedge");
  });

  it("resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection is glyph-empty, text from selection", () => {
    expect(
      resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection({
        kind: "glyph",
        glyphMode: "analogClock",
        sizeMultiplier: 1,
      }),
    ).toBeUndefined();
    expect(
      resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection({
        kind: "text",
        fontAssetId: undefined,
        sizeMultiplier: 1,
      }),
    ).toBeUndefined();
    expect(
      resolveTopBandHourMarkerTextTypographyOverridesFromEffectiveSelection({
        kind: "text",
        fontAssetId: "computer",
        sizeMultiplier: 1.5,
      }),
    ).toEqual({ fontAssetId: "computer", fontSizeMultiplier: 1.5 });
  });
});
