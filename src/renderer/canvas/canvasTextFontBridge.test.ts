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
  canvasFontFamilyFromRenderTextFont,
  canvasFontStringFromRenderTextFont,
} from "./canvasTextFontBridge.ts";
import {
  RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID,
  type RenderFontStyle,
} from "../renderPlan/renderPlanTypes.ts";

function baseFont(overrides: Partial<RenderFontStyle>): RenderFontStyle {
  return {
    assetId: "zeroes-one",
    displayName: "zeroes one",
    sizePx: 14,
    weight: 400,
    style: "normal",
    ...overrides,
  };
}

describe("canvasTextFontBridge", () => {
  it("canvasFontFamilyFromRenderTextFont prefers explicit family when set (Canvas stack)", () => {
    const stack = "system-ui, -apple-system, Segoe UI, sans-serif";
    expect(
      canvasFontFamilyFromRenderTextFont(
        baseFont({
          assetId: RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID,
          displayName: "System UI stack",
          family: stack,
        }),
      ),
    ).toBe(stack);
  });

  it("canvasFontFamilyFromRenderTextFont uses manifest primary family for bundled assetId (not displayName)", () => {
    expect(canvasFontFamilyFromRenderTextFont(baseFont({ displayName: "zeroes one", family: undefined }))).toBe(
      `"Zeroes One", system-ui, sans-serif`,
    );
  });

  it("canvasFontStringFromRenderTextFont matches legacy shape for normal style (no leading keyword)", () => {
    expect(canvasFontStringFromRenderTextFont(baseFont({ weight: 600, sizePx: 12 }))).toBe(
      `600 12px "Zeroes One", system-ui, sans-serif`,
    );
  });

  it("canvasFontStringFromRenderTextFont prefixes italic when style is italic", () => {
    expect(canvasFontStringFromRenderTextFont(baseFont({ style: "italic" }))).toBe(
      `italic 400 14px "Zeroes One", system-ui, sans-serif`,
    );
  });

  it("canvasFontFamilyFromRenderTextFont falls back to displayName when assetId is not in manifest", () => {
    expect(
      canvasFontFamilyFromRenderTextFont(
        baseFont({ assetId: "not-a-bundled-font", displayName: "Fallback Name" }),
      ),
    ).toBe(`"Fallback Name", system-ui, sans-serif`);
  });
});
