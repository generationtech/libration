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
import { BOTTOM_CHROME_STYLE } from "../config/bottomChromeStyle";
import { resolveBottomChromeTimePolicy } from "../config/bottomChromeVisualPolicy";
import { createBottomChromeTextGlyph } from "./bottomChromeTextGlyphFromPolicy.ts";

describe("createBottomChromeTextGlyph", () => {
  it("maps policy into a TextGlyph for emitGlyphToRenderPlan", () => {
    const colors = BOTTOM_CHROME_STYLE.colors;
    const p = resolveBottomChromeTimePolicy(colors);
    const shadow = {
      color: "rgba(0,0,0,1)",
      blurPx: 1,
      offsetXPx: 0,
      offsetYPx: 0,
    };
    const g = createBottomChromeTextGlyph("12:00", p, { textAlign: "left", shadow });
    expect(g.kind).toBe("text");
    expect(g.text).toBe("12:00");
    expect(g.role).toBe("chromeHourPrimary");
    expect(g.fill).toBe(colors.primaryTime);
    expect(g.typographyOverrides?.fontWeight).toBe(700);
    expect(g.letterSpacingEm).toBe(0);
    expect(g.textAlign).toBe("left");
    expect(g.shadow).toEqual(shadow);
  });
});
