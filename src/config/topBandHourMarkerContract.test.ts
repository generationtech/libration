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
  cloneHourMarkersConfig,
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  effectiveTopBandHourMarkerSelection,
  LEGACY_TOP_BAND_TEXT_MODE_TO_FONT_ASSET_ID,
} from "./appConfig";
import { normalizeDisplayChromeLayout } from "./v2/librationConfig";

function normLay(
  hourMarkers: typeof DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers,
) {
  return normalizeDisplayChromeLayout({
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    hourMarkers,
  });
}

describe("top-band hour marker contract", () => {
  describe("normalizeDisplayChromeLayout (structured hourMarkers only)", () => {
    it("does not read unknown flat property names — only hourMarkers defines hour markers", () => {
      const lay = normalizeDisplayChromeLayout({
        // Obsolete flat-field name; must not influence `hourMarkers`.
        hourMarkerNumericRepresentation: "segment",
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "dseg7modern-regular", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      });
      expect(lay.hourMarkers.realization).toEqual({
        kind: "text",
        fontAssetId: "dseg7modern-regular",
        appearance: {},
      });
    });

    it("missing hourMarkers yields default structured hour markers", () => {
      expect(normalizeDisplayChromeLayout({}).hourMarkers).toEqual(
        DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers,
      );
    });
  });

  describe("effectiveTopBandHourMarkerSelection", () => {
    it("non-baseline text → font in effective selection", () => {
      expect(
        effectiveTopBandHourMarkerSelection(
          normLay({
            realization: { kind: "text", fontAssetId: "dseg7modern-regular", appearance: {} },
            layout: { sizeMultiplier: 1 },
          }),
        ),
      ).toEqual({ kind: "text", fontAssetId: "dseg7modern-regular", sizeMultiplier: 1 });
    });

    it("text + explicit font → font-first result", () => {
      expect(
        effectiveTopBandHourMarkerSelection(
          normLay({
            realization: { kind: "text", fontAssetId: "computer", appearance: {} },
            layout: { sizeMultiplier: 1 },
          }),
        ),
      ).toEqual({ kind: "text", fontAssetId: "computer", sizeMultiplier: 1 });
    });

    it("glyph realization → glyph-first result", () => {
      expect(
        effectiveTopBandHourMarkerSelection(
          normLay({
            realization: { kind: "radialLine", appearance: {} },
            layout: { sizeMultiplier: 1 },
          }),
        ),
      ).toEqual({ kind: "glyph", glyphMode: "radialLine", sizeMultiplier: 1 });
    });

    it("does not thread legacy realization.color (colors are appearance-only)", () => {
      expect(
        effectiveTopBandHourMarkerSelection(
          normLay({
            realization: {
              kind: "text",
              fontAssetId: "computer",
              appearance: { color: "#aabbcc" },
            },
            layout: { sizeMultiplier: 1 },
          }),
        ),
      ).toEqual({
        kind: "text",
        fontAssetId: "computer",
        sizeMultiplier: 1,
      });
      expect(
        effectiveTopBandHourMarkerSelection(
          normLay({
            realization: { kind: "radialWedge", appearance: { fillColor: "rgb(1, 2, 3)" } },
            layout: { sizeMultiplier: 1 },
          }),
        ),
      ).toEqual({
        kind: "glyph",
        glyphMode: "radialWedge",
        sizeMultiplier: 1,
      });
    });

    it("canonical default text realization → undefined font (typography role only)", () => {
      expect(
        effectiveTopBandHourMarkerSelection(
          normLay(cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers)),
        ),
      ).toEqual({ kind: "text", fontAssetId: undefined, sizeMultiplier: 1.25 });
    });
  });
});

describe("LEGACY_TOP_BAND_TEXT_MODE_TO_FONT_ASSET_ID", () => {
  it("matches the text-mode → font asset reference map", () => {
    expect(LEGACY_TOP_BAND_TEXT_MODE_TO_FONT_ASSET_ID).toEqual({
      geometric: "zeroes-one",
      segment: "dseg7modern-regular",
      dotmatrix: "dotmatrix-regular",
      terminal: "computer",
    });
  });
});
