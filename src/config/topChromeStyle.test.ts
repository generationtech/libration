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
import { TOP_CHROME_STYLE } from "./topChromeStyle";

describe("TOP_CHROME_STYLE", () => {
  it("exposes geography caption token matching prior hardcoded caption color", () => {
    expect(TOP_CHROME_STYLE.zoneText.geographyCaption).toBe("rgba(255, 255, 255, 0.82)");
  });

  it("exposes full instrument tokens for the built-in top strip", () => {
    expect(TOP_CHROME_STYLE.zoneText.letter.length).toBeGreaterThan(5);
    expect(TOP_CHROME_STYLE.zoneText.geographyCaption.length).toBeGreaterThan(5);
    expect(TOP_CHROME_STYLE.instrument.stripBackground.startsWith("rgba(")).toBe(true);
  });
});
