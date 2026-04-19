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
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_TIMEZONE_LETTER_ROW_ACTIVE_CELL_BACKGROUND_COLOR,
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN,
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD,
} from "./appConfig";
import {
  deriveDarkerNatoActiveCellBackgroundFromEvenOdd,
  parseCssColorToRgba8888,
  relativeLuminanceFromSrgb01,
} from "../color/contrastForegroundOnCssBackground.ts";
import { TOP_CHROME_STYLE, TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA } from "./topChromeStyle.ts";
import { resolveEffectiveTimezoneLetterRowArea } from "./topBandTimezoneLetterRowResolver";

describe("resolveEffectiveTimezoneLetterRowArea", () => {
  it("derives active cell from built-in even/odd defaults when no overrides are authored", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const expectedDerived = deriveDarkerNatoActiveCellBackgroundFromEvenOdd(
      DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN,
      DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD,
      DEFAULT_TIMEZONE_LETTER_ROW_ACTIVE_CELL_BACKGROUND_COLOR,
    );
    expect(eff.usesAuthoredCellBackgroundOverride).toBe(false);
    expect(eff.usesAuthoredActiveCellBackgroundOverride).toBe(false);
    expect(eff.usesAuthoredLetterForegroundOverride).toBe(false);
    expect(eff.effectiveBackgroundColorEven).toBe(DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN);
    expect(eff.effectiveBackgroundColorOdd).toBe(DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD);
    expect(eff.effectiveBackgroundColorActive).toBe(expectedDerived);
    expect(eff.effectiveBackgroundColorActive).not.toBe(TOP_CHROME_STYLE.timezoneTab.fillActive);
    expect(eff.effectiveBackgroundColorActive).not.toBe(DEFAULT_TIMEZONE_LETTER_ROW_ACTIVE_CELL_BACKGROUND_COLOR);
    expect(eff.effectiveLetterForegroundColor).toBe(TOP_CHROME_STYLE.zoneText.letter);
    expect(eff.effectiveLetterForegroundColorActiveCell).toBeUndefined();
  });

  it("applies cell background overrides to effective fills", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      timezoneLetterRowCellBackgroundColorEven: "#112233",
      timezoneLetterRowCellBackgroundColorOdd: "#445566",
    });
    expect(eff.effectiveBackgroundColorEven).toBe("#112233");
    expect(eff.effectiveBackgroundColorOdd).toBe("#445566");
    expect(eff.usesAuthoredActiveCellBackgroundOverride).toBe(false);
    const derived = deriveDarkerNatoActiveCellBackgroundFromEvenOdd(
      "#112233",
      "#445566",
      TOP_CHROME_STYLE.timezoneTab.fillActive,
    );
    expect(eff.effectiveBackgroundColorActive).toBe(derived);
    expect(eff.effectiveBackgroundColorActive).not.toBe(eff.effectiveBackgroundColorEven);
    expect(eff.effectiveBackgroundColorActive).not.toBe(eff.effectiveBackgroundColorOdd);
    const lumEven = relativeLuminanceFromSrgb01({ r: 0x11 / 255, g: 0x22 / 255, b: 0x33 / 255 });
    const lumOdd = relativeLuminanceFromSrgb01({ r: 0x44 / 255, g: 0x55 / 255, b: 0x66 / 255 });
    const px = parseCssColorToRgba8888(eff.effectiveBackgroundColorActive);
    expect(px).toBeDefined();
    const lumActive = relativeLuminanceFromSrgb01({
      r: px!.r / 255,
      g: px!.g / 255,
      b: px!.b / 255,
    });
    const lumPalette = Math.max(lumEven, lumOdd);
    expect(lumActive).toBeLessThan(lumPalette);
  });

  it("uses explicit active-cell background when authored", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      timezoneLetterRowCellBackgroundColorEven: "#112233",
      timezoneLetterRowCellBackgroundColorOdd: "#445566",
      timezoneLetterRowActiveCellBackgroundColor: "#fedcba",
    });
    expect(eff.usesAuthoredActiveCellBackgroundOverride).toBe(true);
    expect(eff.effectiveBackgroundColorActive).toBe("#fedcba");
  });

  it("derives automatic letter ink when cell backgrounds are authored and letter is not", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      timezoneLetterRowCellBackgroundColorEven: "#ffffff",
      timezoneLetterRowCellBackgroundColorOdd: "#ffffff",
    });
    expect(eff.usesAuthoredLetterForegroundOverride).toBe(false);
    expect(eff.effectiveLetterForegroundColor).toBe(
      `rgba(0, 0, 0, ${TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA})`,
    );
  });

  it("uses authored letter foreground when present", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      timezoneLetterRowCellBackgroundColorEven: "#ffffff",
      timezoneLetterRowLetterForegroundColor: "#ff00aa",
    });
    expect(eff.usesAuthoredLetterForegroundOverride).toBe(true);
    expect(eff.effectiveLetterForegroundColor).toBe("#ff00aa");
  });

  it("letter override wins over automatic contrast when both cell and letter overrides are set", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      timezoneLetterRowCellBackgroundColorEven: "#000000",
      timezoneLetterRowCellBackgroundColorOdd: "#000000",
      timezoneLetterRowLetterForegroundColor: "#00ff00",
    });
    expect(eff.effectiveLetterForegroundColor).toBe("#00ff00");
    expect(eff.effectiveLetterForegroundColorActiveCell).toBeUndefined();
  });

  it("splits automatic letter ink for the active column when it differs from the alternating-row pick", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      timezoneLetterRowCellBackgroundColorEven: "#aaaaaa",
      timezoneLetterRowCellBackgroundColorOdd: "#aaaaaa",
    });
    expect(eff.effectiveLetterForegroundColorActiveCell).toBeDefined();
    expect(eff.effectiveLetterForegroundColorActiveCell).not.toBe(eff.effectiveLetterForegroundColor);
  });

  it("falls back to the legacy active token when effective even/odd cannot be parsed for derivation", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      timezoneLetterRowCellBackgroundColorEven: "hsl(0, 0%, 50%)",
      timezoneLetterRowCellBackgroundColorOdd: "hsl(0, 0%, 60%)",
    });
    expect(eff.usesAuthoredCellBackgroundOverride).toBe(true);
    expect(eff.usesAuthoredActiveCellBackgroundOverride).toBe(false);
    expect(eff.effectiveBackgroundColorActive).toBe(DEFAULT_TIMEZONE_LETTER_ROW_ACTIVE_CELL_BACKGROUND_COLOR);
  });
});
