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
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN,
  DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD,
} from "./appConfig";
import { TOP_CHROME_STYLE, TOP_CHROME_ZONE_LETTER_AUTOMATIC_FOREGROUND_ALPHA } from "./topChromeStyle.ts";
import { resolveEffectiveTimezoneLetterRowArea } from "./topBandTimezoneLetterRowResolver";

describe("resolveEffectiveTimezoneLetterRowArea", () => {
  it("matches shipped defaults when no overrides are authored", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    expect(eff.usesAuthoredCellBackgroundOverride).toBe(false);
    expect(eff.usesAuthoredLetterForegroundOverride).toBe(false);
    expect(eff.effectiveBackgroundColorEven).toBe(DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_EVEN);
    expect(eff.effectiveBackgroundColorOdd).toBe(DEFAULT_TIMEZONE_LETTER_ROW_CELL_BACKGROUND_COLOR_ODD);
    expect(eff.effectiveLetterForegroundColor).toBe(TOP_CHROME_STYLE.zoneText.letter);
  });

  it("applies cell background overrides to effective fills", () => {
    const eff = resolveEffectiveTimezoneLetterRowArea({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      timezoneLetterRowCellBackgroundColorEven: "#112233",
      timezoneLetterRowCellBackgroundColorOdd: "#445566",
    });
    expect(eff.effectiveBackgroundColorEven).toBe("#112233");
    expect(eff.effectiveBackgroundColorOdd).toBe("#445566");
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
  });
});
