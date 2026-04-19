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
  bestBlackOrWhiteForegroundForTwoBackgroundsCss,
  blackOrWhiteForegroundForBackgroundCss,
  deriveDarkerNatoActiveCellBackgroundFromEvenOdd,
  NATO_ACTIVE_CELL_DERIVED_DARKEN_SRGB_MUL,
  parseCssColorToRgba8888,
  rgbaForegroundWithAlpha,
  relativeLuminanceFromSrgb01,
} from "./contrastForegroundOnCssBackground.ts";

describe("blackOrWhiteForegroundForBackgroundCss", () => {
  it("falls back deterministically to white foreground when the format is unsupported", () => {
    expect(blackOrWhiteForegroundForBackgroundCss("hsl(0, 0%, 50%)")).toBe("#ffffff");
    expect(blackOrWhiteForegroundForBackgroundCss("not-a-color")).toBe("#ffffff");
    expect(blackOrWhiteForegroundForBackgroundCss("rgb(10 20 30)")).toBe("#ffffff");
  });

  it("chooses white text on a dark rgba background", () => {
    expect(blackOrWhiteForegroundForBackgroundCss("rgba(4, 22, 58, 0.99)")).toBe("#ffffff");
  });

  it("chooses black text on white", () => {
    expect(blackOrWhiteForegroundForBackgroundCss("#ffffff")).toBe("#000000");
  });

  it("chooses black text on a light gray background", () => {
    expect(blackOrWhiteForegroundForBackgroundCss("#e0e0e0")).toBe("#000000");
  });

  it("is deterministic for the same input", () => {
    const c = "rgba(128, 128, 128, 1)";
    expect(blackOrWhiteForegroundForBackgroundCss(c)).toBe(blackOrWhiteForegroundForBackgroundCss(c));
  });
});

describe("rgbaForegroundWithAlpha", () => {
  it("builds rgba from black", () => {
    expect(rgbaForegroundWithAlpha("#000000", 0.32)).toBe("rgba(0, 0, 0, 0.32)");
  });

  it("builds rgba from white", () => {
    expect(rgbaForegroundWithAlpha("#ffffff", 0.5)).toBe("rgba(255, 255, 255, 0.5)");
  });
});

describe("bestBlackOrWhiteForegroundForTwoBackgroundsCss", () => {
  it("prefers black when both backgrounds are light", () => {
    expect(bestBlackOrWhiteForegroundForTwoBackgroundsCss("#ffffff", "#eeeeee")).toBe("#000000");
  });

  it("prefers white when both backgrounds are dark", () => {
    expect(bestBlackOrWhiteForegroundForTwoBackgroundsCss("#000000", "#111111")).toBe("#ffffff");
  });
});

describe("relativeLuminanceFromSrgb01", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminanceFromSrgb01({ r: 0, g: 0, b: 0 })).toBe(0);
    expect(relativeLuminanceFromSrgb01({ r: 1, g: 1, b: 1 })).toBe(1);
  });
});

describe("deriveDarkerNatoActiveCellBackgroundFromEvenOdd", () => {
  it("averages channels then applies a fixed sRGB darken multiplier (deterministic)", () => {
    const out = deriveDarkerNatoActiveCellBackgroundFromEvenOdd("#ffffff", "#ffffff", "#fallback");
    expect(out).toBe(
      `rgba(${Math.round(255 * NATO_ACTIVE_CELL_DERIVED_DARKEN_SRGB_MUL)}, ${Math.round(255 * NATO_ACTIVE_CELL_DERIVED_DARKEN_SRGB_MUL)}, ${Math.round(255 * NATO_ACTIVE_CELL_DERIVED_DARKEN_SRGB_MUL)}, 1)`,
    );
    const px = parseCssColorToRgba8888(out);
    expect(px).toBeDefined();
    const lum = relativeLuminanceFromSrgb01({ r: px!.r / 255, g: px!.g / 255, b: px!.b / 255 });
    expect(lum).toBeLessThan(relativeLuminanceFromSrgb01({ r: 1, g: 1, b: 1 }));
  });

  it("returns fallback when a color cannot be parsed", () => {
    expect(deriveDarkerNatoActiveCellBackgroundFromEvenOdd("hsl(0,0%,50%)", "#fff", "rgba(1,2,3,0.4)")).toBe(
      "rgba(1,2,3,0.4)",
    );
  });
});
