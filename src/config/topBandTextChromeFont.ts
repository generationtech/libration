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

/**
 * Central resolution for bundled font faces on top-band **text-oriented chrome** controls
 * (24-hour indicator entries, NATO zone letters, etc.): local override → global default →
 * {@link DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID}.
 *
 * ARCHITECTURE: config/policy only — no renderer or UI imports.
 */

import {
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
} from "./appConfig.ts";
import type { FontAssetId } from "../typography/fontAssetTypes.ts";

/** Slice of {@link DisplayChromeLayoutConfig} used for global top-band text chrome font resolution. */
export type TopBandTextChromeFontLayoutSlice = {
  topBandTextChromeDefaultFontAssetId?: FontAssetId;
};

const SELECTABLE_TOP_BAND_TEXT_CHROME_FONT_IDS = new Set<string>(TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS);

function isSelectableTopBandTextChromeFontId(id: string): id is FontAssetId {
  return SELECTABLE_TOP_BAND_TEXT_CHROME_FONT_IDS.has(id);
}

/**
 * Effective global default font for top-band text chrome: structured field when valid, otherwise
 * {@link DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID} (zeroes-two).
 */
export function resolveTopBandTextChromeDefaultFontAssetId(
  layout: TopBandTextChromeFontLayoutSlice,
): FontAssetId {
  const raw = layout.topBandTextChromeDefaultFontAssetId;
  if (typeof raw === "string" && isSelectableTopBandTextChromeFontId(raw)) {
    return raw;
  }
  return DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
}

/**
 * Resolves the bundled font for a control: optional local override wins; else {@link resolveTopBandTextChromeDefaultFontAssetId}.
 */
export function resolveEffectiveTopBandTextChromeFontAssetId(
  layout: TopBandTextChromeFontLayoutSlice,
  localFontAssetId?: FontAssetId,
): FontAssetId {
  if (typeof localFontAssetId === "string" && isSelectableTopBandTextChromeFontId(localFontAssetId)) {
    return localFontAssetId;
  }
  return resolveTopBandTextChromeDefaultFontAssetId(layout);
}
