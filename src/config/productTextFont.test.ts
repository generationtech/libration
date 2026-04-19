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
import { DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG } from "./appConfig.ts";
import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "./productFontConstants.ts";
import {
  omitRendererDefaultSentinelFromTypographyOverrides,
  resolveBottomReadoutTextFontAssetId,
  resolveConfigUiTextFontAssetId,
  resolveDefaultProductTextFontAssetId,
  resolveEffectiveProductTextFontAssetId,
  resolvePinCityNameTextFontAssetId,
  resolvePinDateTimeTextFontAssetId,
} from "./productTextFont.ts";

describe("productTextFont", () => {
  it("resolveDefaultProductTextFontAssetId uses renderer-default sentinel when global field is absent or invalid", () => {
    expect(resolveDefaultProductTextFontAssetId({})).toBe(PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID);
    expect(
      resolveDefaultProductTextFontAssetId({
        defaultTextFontAssetId: "bogus-id",
      } as { defaultTextFontAssetId?: string }),
    ).toBe(PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID);
  });

  it("resolveDefaultProductTextFontAssetId keeps valid global ids (bundled and renderer sentinel)", () => {
    expect(
      resolveDefaultProductTextFontAssetId({
        defaultTextFontAssetId: "computer",
      }),
    ).toBe("computer");
    expect(
      resolveDefaultProductTextFontAssetId({
        defaultTextFontAssetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
      }),
    ).toBe(PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID);
  });

  it("accepts legacy topBandTextChromeDefaultFontAssetId until migrated away", () => {
    expect(
      resolveDefaultProductTextFontAssetId({
        topBandTextChromeDefaultFontAssetId: "computer",
      }),
    ).toBe("computer");
  });

  it("prefers defaultTextFontAssetId over legacy when both are valid", () => {
    expect(
      resolveDefaultProductTextFontAssetId({
        defaultTextFontAssetId: "flip-clock",
        topBandTextChromeDefaultFontAssetId: "computer",
      }),
    ).toBe("flip-clock");
  });

  it("resolveEffectiveProductTextFontAssetId: local override wins over global", () => {
    expect(
      resolveEffectiveProductTextFontAssetId({ defaultTextFontAssetId: "computer" }, "flip-clock"),
    ).toBe("flip-clock");
  });

  it("resolveEffectiveProductTextFontAssetId: omitted local uses global default", () => {
    expect(
      resolveEffectiveProductTextFontAssetId({ defaultTextFontAssetId: "computer" }, undefined),
    ).toBe("computer");
  });

  it("resolveEffectiveProductTextFontAssetId: omitted local and global uses renderer baseline", () => {
    expect(resolveEffectiveProductTextFontAssetId({}, undefined)).toBe(
      PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
    );
    expect(
      resolveEffectiveProductTextFontAssetId(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG, undefined),
    ).toBe(PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID);
  });

  it("resolveBottomReadoutTextFontAssetId: layout local override wins, else global, else renderer baseline", () => {
    expect(
      resolveBottomReadoutTextFontAssetId({
        bottomReadoutFontAssetId: "flip-clock",
        defaultTextFontAssetId: "computer",
      }),
    ).toBe("flip-clock");
    expect(
      resolveBottomReadoutTextFontAssetId({
        defaultTextFontAssetId: "computer",
      }),
    ).toBe("computer");
    expect(resolveBottomReadoutTextFontAssetId({})).toBe(PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID);
  });

  it("resolveConfigUiTextFontAssetId: layout local override wins, else global, else renderer baseline", () => {
    expect(
      resolveConfigUiTextFontAssetId({
        configUiFontAssetId: "kremlin",
        defaultTextFontAssetId: "computer",
      }),
    ).toBe("kremlin");
    expect(resolveConfigUiTextFontAssetId({ defaultTextFontAssetId: "computer" })).toBe("computer");
    expect(resolveConfigUiTextFontAssetId({})).toBe(PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID);
  });

  it("resolvePinCityNameTextFontAssetId: presentation override wins, else global, else renderer baseline", () => {
    expect(
      resolvePinCityNameTextFontAssetId(
        { defaultTextFontAssetId: "computer" },
        { pinCityNameFontAssetId: "dotmatrix-regular" },
      ),
    ).toBe("dotmatrix-regular");
    expect(resolvePinCityNameTextFontAssetId({ defaultTextFontAssetId: "computer" }, {})).toBe("computer");
    expect(resolvePinCityNameTextFontAssetId({}, {})).toBe(PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID);
  });

  it("resolvePinDateTimeTextFontAssetId: presentation override wins, else global, else renderer baseline", () => {
    expect(
      resolvePinDateTimeTextFontAssetId(
        { defaultTextFontAssetId: "computer" },
        { pinDateTimeFontAssetId: "flip-clock" },
      ),
    ).toBe("flip-clock");
    expect(resolvePinDateTimeTextFontAssetId({ defaultTextFontAssetId: "computer" }, {})).toBe("computer");
    expect(resolvePinDateTimeTextFontAssetId({}, {})).toBe(PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID);
  });

  it("omitRendererDefaultSentinelFromTypographyOverrides strips sentinel only", () => {
    expect(omitRendererDefaultSentinelFromTypographyOverrides(undefined)).toBeUndefined();
    expect(
      omitRendererDefaultSentinelFromTypographyOverrides({
        fontAssetId: "computer",
      }),
    ).toEqual({ fontAssetId: "computer" });
    expect(
      omitRendererDefaultSentinelFromTypographyOverrides({
        fontAssetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
      }),
    ).toBeUndefined();
    expect(
      omitRendererDefaultSentinelFromTypographyOverrides({
        fontAssetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
        fontSizeMultiplier: 1.2,
      }),
    ).toEqual({ fontSizeMultiplier: 1.2 });
  });
});
