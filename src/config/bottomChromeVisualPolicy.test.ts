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
import { BOTTOM_CHROME_STYLE } from "./bottomChromeStyle";
import {
  createBottomChromeTextGlyph,
  resolveBottomChromeDatePolicy,
  resolveBottomChromeLabelPolicy,
  resolveBottomChromeTimePolicy,
} from "./bottomChromeVisualPolicy";

describe("bottomChromeVisualPolicy", () => {
  const colors = BOTTOM_CHROME_STYLE.colors;

  it("resolveBottomChromeTimePolicy uses chromeHourPrimary with primary time fill and weight 700", () => {
    const p = resolveBottomChromeTimePolicy(colors);
    expect(p.role).toBe("chromeHourPrimary");
    expect(p.fill).toBe(colors.primaryTime);
    expect(p.typographyOverrides?.fontWeight).toBe(700);
    expect(p.letterSpacingEm).toBe(0);
  });

  it("resolveBottomChromeLabelPolicy uses chromeZoneLabel with micro label fill and layout letter spacing", () => {
    const p = resolveBottomChromeLabelPolicy(colors);
    expect(p.role).toBe("chromeZoneLabel");
    expect(p.fill).toBe(colors.microLabel);
    expect(p.typographyOverrides?.fontWeight).toBe(600);
    expect(p.letterSpacingEm).toBe(BOTTOM_CHROME_STYLE.layout.leftMicroLabelLetterSpacingEm);
  });

  it("resolveBottomChromeDatePolicy uses chromeZoneLabel with primary time fill and weight 700", () => {
    const p = resolveBottomChromeDatePolicy(colors);
    expect(p.role).toBe("chromeZoneLabel");
    expect(p.fill).toBe(colors.primaryTime);
    expect(p.typographyOverrides?.fontWeight).toBe(700);
    expect(p.letterSpacingEm).toBe(0);
  });

  it("createBottomChromeTextGlyph maps policy into a TextGlyph for emitGlyphToRenderPlan", () => {
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
