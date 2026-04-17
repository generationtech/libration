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
  it("exposes stable instrument field colors for the fixed top strip", () => {
    expect(TOP_CHROME_STYLE.instrument.stripBackground.length).toBeGreaterThan(10);
    expect(TOP_CHROME_STYLE.zoneText.geographyCaption).toBe("rgba(255, 255, 255, 0.82)");
  });

  it("uses unified tick stroke width token", () => {
    expect(TOP_CHROME_STYLE.ticks.lineWidth).toBeGreaterThan(0);
    expect(TOP_CHROME_STYLE.ticks.presentTimeTickWidthMulTapeTick).toBeGreaterThan(1);
  });
});
