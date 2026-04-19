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
 * Single product-level default bundled font: chrome text controls, bottom readouts, map pin labels,
 * and configuration UI (DOM bridge). Policy-only — no renderer imports.
 *
 * Precedence for a given surface: explicit local font override → {@link resolveDefaultProductTextFontAssetId}
 * → {@link DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID} (zeroes-two).
 *
 * Thin surface helpers ({@link resolveBottomReadoutTextFontAssetId}, {@link resolvePinLabelTextFontAssetId},
 * {@link resolveConfigUiTextFontAssetId}) all delegate to {@link resolveEffectiveProductTextFontAssetId} so
 * precedence is not duplicated in render or UI paths.
 */

import {
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
} from "./appConfig.ts";
import type { FontAssetId } from "../typography/fontAssetTypes.ts";

/** Layout fields that affect global default font resolution (subset of {@link DisplayChromeLayoutConfig}). */
export type ProductTextFontLayoutSlice = {
  /** Canonical v2 field: global default bundled font for product text surfaces. */
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

const SELECTABLE_FONT_IDS = new Set<string>(TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS);

function isSelectableProductFontId(id: string): id is FontAssetId {
  return SELECTABLE_FONT_IDS.has(id);
}

function readAuthoredGlobalDefault(layout: ProductTextFontLayoutSlice): FontAssetId | undefined {
  const primary = layout.defaultTextFontAssetId;
  if (typeof primary === "string" && isSelectableProductFontId(primary)) {
    return primary;
  }
  const legacy = layout.topBandTextChromeDefaultFontAssetId;
  if (typeof legacy === "string" && isSelectableProductFontId(legacy)) {
    return legacy;
  }
  return undefined;
}

/**
 * Effective global default bundled font: structured field when valid, otherwise
 * {@link DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID} (zeroes-two).
 */
export function resolveDefaultProductTextFontAssetId(layout: ProductTextFontLayoutSlice): FontAssetId {
  return readAuthoredGlobalDefault(layout) ?? DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;
}

/**
 * Resolves bundled font for a control with an optional local override: local wins, else
 * {@link resolveDefaultProductTextFontAssetId}.
 */
export function resolveEffectiveProductTextFontAssetId(
  layout: ProductTextFontLayoutSlice,
  localFontAssetId?: FontAssetId,
): FontAssetId {
  if (typeof localFontAssetId === "string" && isSelectableProductFontId(localFontAssetId)) {
    return localFontAssetId;
  }
  return resolveDefaultProductTextFontAssetId(layout);
}

/** Bottom readout: local override on layout → global default → zeroes-two. */
export function resolveBottomReadoutTextFontAssetId(layout: ProductTextFontLayoutSlice): FontAssetId {
  return resolveEffectiveProductTextFontAssetId(layout, layout.bottomReadoutFontAssetId);
}

/** Configuration panel DOM: local override on layout → global default → zeroes-two. */
export function resolveConfigUiTextFontAssetId(layout: ProductTextFontLayoutSlice): FontAssetId {
  return resolveEffectiveProductTextFontAssetId(layout, layout.configUiFontAssetId);
}

/** Map pin name + time labels: optional override on pin presentation → global default → zeroes-two. */
export function resolvePinLabelTextFontAssetId(
  layout: ProductTextFontLayoutSlice,
  pinPresentation: { pinTextFontAssetId?: FontAssetId },
): FontAssetId {
  return resolveEffectiveProductTextFontAssetId(layout, pinPresentation.pinTextFontAssetId);
}
