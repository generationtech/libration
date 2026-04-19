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
import { DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG, DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID } from "./appConfig.ts";
import {
  resolveEffectiveTopBandTextChromeFontAssetId,
  resolveTopBandTextChromeDefaultFontAssetId,
} from "./topBandTextChromeFont.ts";

describe("topBandTextChromeFont", () => {
  it("resolveTopBandTextChromeDefaultFontAssetId uses zeroes-two when global field is absent or invalid", () => {
    expect(resolveTopBandTextChromeDefaultFontAssetId({})).toBe(DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID);
    expect(
      resolveTopBandTextChromeDefaultFontAssetId({
        topBandTextChromeDefaultFontAssetId: "bogus-id",
      } as { topBandTextChromeDefaultFontAssetId?: string }),
    ).toBe(DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID);
  });

  it("resolveTopBandTextChromeDefaultFontAssetId keeps valid global ids", () => {
    expect(
      resolveTopBandTextChromeDefaultFontAssetId({
        topBandTextChromeDefaultFontAssetId: "computer",
      }),
    ).toBe("computer");
  });

  it("resolveEffectiveTopBandTextChromeFontAssetId: local override wins over global", () => {
    expect(
      resolveEffectiveTopBandTextChromeFontAssetId(
        { topBandTextChromeDefaultFontAssetId: "computer" },
        "flip-clock",
      ),
    ).toBe("flip-clock");
  });

  it("resolveEffectiveTopBandTextChromeFontAssetId: omitted local uses global default", () => {
    expect(
      resolveEffectiveTopBandTextChromeFontAssetId(
        { topBandTextChromeDefaultFontAssetId: "computer" },
        undefined,
      ),
    ).toBe("computer");
  });

  it("resolveEffectiveTopBandTextChromeFontAssetId: omitted local and global uses canonical fallback", () => {
    expect(resolveEffectiveTopBandTextChromeFontAssetId({}, undefined)).toBe(
      DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
    );
    expect(
      resolveEffectiveTopBandTextChromeFontAssetId(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG, undefined),
    ).toBe(DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID);
  });
});
