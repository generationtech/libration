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
import { resolveTimezoneStripLetterPolicy } from "../config/topBandVisualPolicy.ts";
import { TOP_CHROME_STYLE } from "../config/topChromeStyle.ts";
import { createTopBandTextGlyph } from "./topBandTextGlyphFromPolicy.ts";

describe("createTopBandTextGlyph", () => {
  it("copies policy fields onto a TextGlyph", () => {
    const g = createTopBandTextGlyph("Z", resolveTimezoneStripLetterPolicy(TOP_CHROME_STYLE));
    expect(g.kind).toBe("text");
    expect(g.text).toBe("Z");
    expect(g.role).toBe("chromeZoneLabel");
    expect(g.fill).toBe(TOP_CHROME_STYLE.zoneText.letter);
    expect(g.typographyOverrides).toEqual({ fontWeight: 800 });
  });
});
