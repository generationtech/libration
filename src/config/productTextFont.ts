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
 * Product-level default text font policy: bundled faces and {@link PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID}
 * (renderer/backend default — not a manifest font). Applies to chrome text, bottom readouts, map pin labels,
 * and configuration UI (DOM bridge). Policy-only — no renderer imports.
 *
 * **Precedence for a surface**
 * 1. Explicit local font override (bundled id or renderer-default sentinel), when valid
 * 2. Explicit product-wide `defaultTextFontAssetId`, when valid
 * 3. {@link PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID} (baseline; omitting the global field means this)
 * 4. Defensive: bundled zeroes-two (`DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID` in appConfig) only where a
 *    code path cannot represent renderer default — resolution here does not fall back to zeroes-two.
 *
 * Thin surface helpers delegate to {@link resolveEffectiveProductTextFontAssetId} so precedence stays
 * centralized.
 */

import {
  PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
  isValidProductTextFontChoiceId,
} from "./productFontConstants.ts";
import type { FontAssetId } from "../typography/fontAssetTypes.ts";

export { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "./productFontConstants.ts";

/** Layout fields that affect global default font resolution (subset of {@link DisplayChromeLayoutConfig}). */
export type ProductTextFontLayoutSlice = {
  /** Canonical v2 field: global default font for product text surfaces (bundled id or renderer-default sentinel). */
  defaultTextFontAssetId?: FontAssetId;
  /**
   * Legacy persisted key (pre–product-wide rename). Accepted by resolvers for raw objects; normalized
   * documents use {@link defaultTextFontAssetId} only.
   */
  topBandTextChromeDefaultFontAssetId?: FontAssetId;
  /** Optional local override for the lower-left bottom readout only. */
  bottomReadoutFontAssetId?: FontAssetId;
  /** Optional local override for configuration panel UI (DOM) only. */
  configUiFontAssetId?: FontAssetId;
};

function readAuthoredGlobalDefault(layout: ProductTextFontLayoutSlice): FontAssetId | undefined {
  const primary = layout.defaultTextFontAssetId;
  if (typeof primary === "string" && isValidProductTextFontChoiceId(primary)) {
    return primary;
  }
  const legacy = layout.topBandTextChromeDefaultFontAssetId;
  if (typeof legacy === "string" && isValidProductTextFontChoiceId(legacy)) {
    return legacy;
  }
  return undefined;
}

/**
 * Effective global default font: valid structured field when set; otherwise
 * {@link PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID} (renderer baseline — not zeroes-two).
 */
export function resolveDefaultProductTextFontAssetId(layout: ProductTextFontLayoutSlice): FontAssetId {
  return readAuthoredGlobalDefault(layout) ?? PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID;
}

/**
 * Resolves font choice for a control with an optional local override: local wins when valid, else
 * {@link resolveDefaultProductTextFontAssetId}.
 */
export function resolveEffectiveProductTextFontAssetId(
  layout: ProductTextFontLayoutSlice,
  localFontAssetId?: FontAssetId,
): FontAssetId {
  if (typeof localFontAssetId === "string" && isValidProductTextFontChoiceId(localFontAssetId)) {
    return localFontAssetId;
  }
  return resolveDefaultProductTextFontAssetId(layout);
}

/** Bottom readout: local override on layout → global default → renderer default. */
export function resolveBottomReadoutTextFontAssetId(layout: ProductTextFontLayoutSlice): FontAssetId {
  return resolveEffectiveProductTextFontAssetId(layout, layout.bottomReadoutFontAssetId);
}

/** Configuration panel DOM: local override on layout → global default → renderer default. */
export function resolveConfigUiTextFontAssetId(layout: ProductTextFontLayoutSlice): FontAssetId {
  return resolveEffectiveProductTextFontAssetId(layout, layout.configUiFontAssetId);
}

/** Reference pin city-name line: optional override → global default → renderer default. */
export function resolvePinCityNameTextFontAssetId(
  layout: ProductTextFontLayoutSlice,
  pinPresentation: { pinCityNameFontAssetId?: FontAssetId },
): FontAssetId {
  return resolveEffectiveProductTextFontAssetId(layout, pinPresentation.pinCityNameFontAssetId);
}

/** Reference pin date/time line: optional override → global default → renderer default. */
export function resolvePinDateTimeTextFontAssetId(
  layout: ProductTextFontLayoutSlice,
  pinPresentation: { pinDateTimeFontAssetId?: FontAssetId },
): FontAssetId {
  return resolveEffectiveProductTextFontAssetId(layout, pinPresentation.pinDateTimeFontAssetId);
}

/**
 * Strips {@link PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID} from typography overrides so
 * {@link resolveTextStyle} can use the role’s bundled face for metrics; emit paths still pass the
 * sentinel through {@link glyphs/glyphToRenderPlan.ts!emitTextGlyph} for the final Canvas font.
 */
export function omitRendererDefaultSentinelFromTypographyOverrides<T extends { fontAssetId?: FontAssetId }>(
  overrides: T | undefined,
): Omit<T, "fontAssetId"> | undefined {
  if (!overrides) {
    return undefined;
  }
  if (overrides.fontAssetId !== PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID) {
    return overrides;
  }
  const { fontAssetId: _omit, ...rest } = overrides;
  return Object.keys(rest).length > 0 ? (rest as Omit<T, "fontAssetId">) : undefined;
}
