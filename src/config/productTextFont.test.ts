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
  resolveBottomReadoutTextFontAssetId,
  resolveConfigUiTextFontAssetId,
  resolveDefaultProductTextFontAssetId,
  resolveEffectiveProductTextFontAssetId,
  resolvePinLabelTextFontAssetId,
} from "./productTextFont.ts";

describe("productTextFont", () => {
  it("resolveDefaultProductTextFontAssetId uses zeroes-two when global field is absent or invalid", () => {
    expect(resolveDefaultProductTextFontAssetId({})).toBe(DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID);
    expect(
      resolveDefaultProductTextFontAssetId({
        defaultTextFontAssetId: "bogus-id",
      } as { defaultTextFontAssetId?: string }),
    ).toBe(DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID);
  });

  it("resolveDefaultProductTextFontAssetId keeps valid global ids", () => {
    expect(
      resolveDefaultProductTextFontAssetId({
        defaultTextFontAssetId: "computer",
      }),
    ).toBe("computer");
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

  it("resolveEffectiveProductTextFontAssetId: omitted local and global uses canonical fallback", () => {
    expect(resolveEffectiveProductTextFontAssetId({}, undefined)).toBe(
      DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
    );
    expect(resolveEffectiveProductTextFontAssetId(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG, undefined)).toBe(
      DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
    );
  });

  it("resolveBottomReadoutTextFontAssetId: layout local override wins, else global, else zeroes-two", () => {
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
    expect(resolveBottomReadoutTextFontAssetId({})).toBe(DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID);
  });

  it("resolveConfigUiTextFontAssetId: layout local override wins, else global, else zeroes-two", () => {
    expect(
      resolveConfigUiTextFontAssetId({
        configUiFontAssetId: "kremlin",
        defaultTextFontAssetId: "computer",
      }),
    ).toBe("kremlin");
    expect(resolveConfigUiTextFontAssetId({ defaultTextFontAssetId: "computer" })).toBe("computer");
    expect(resolveConfigUiTextFontAssetId({})).toBe(DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID);
  });

  it("resolvePinLabelTextFontAssetId: presentation override wins, else global, else zeroes-two", () => {
    expect(
      resolvePinLabelTextFontAssetId(
        { defaultTextFontAssetId: "computer" },
        { pinTextFontAssetId: "dotmatrix-regular" },
      ),
    ).toBe("dotmatrix-regular");
    expect(resolvePinLabelTextFontAssetId({ defaultTextFontAssetId: "computer" }, {})).toBe("computer");
    expect(resolvePinLabelTextFontAssetId({}, {})).toBe(DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID);
  });
});
