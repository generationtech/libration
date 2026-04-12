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
import type { TopChromePaletteId } from "./appConfig";
import { getTopChromeStyle, TOP_CHROME_STYLE } from "./topChromeStyle";

describe("getTopChromeStyle", () => {
  it('returns the same object as TOP_CHROME_STYLE for "neutral"', () => {
    expect(getTopChromeStyle("neutral")).toBe(TOP_CHROME_STYLE);
  });

  it("exposes geography caption token matching prior hardcoded caption color", () => {
    expect(TOP_CHROME_STYLE.zoneText.geographyCaption).toBe("rgba(255, 255, 255, 0.82)");
  });

  it("returns a full style for each palette id", () => {
    const palettes: TopChromePaletteId[] = ["neutral", "dark", "paper"];
    for (const t of palettes) {
      const st = getTopChromeStyle(t);
      expect(st.zoneText.letter.length).toBeGreaterThan(5);
      expect(st.zoneText.geographyCaption.length).toBeGreaterThan(5);
      expect(st.instrument.stripBackground.startsWith("rgba(")).toBe(true);
    }
  });
});
