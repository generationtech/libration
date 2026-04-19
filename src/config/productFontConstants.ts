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
 * Product text font policy: bundled selectable ids plus a single sentinel for “use the active
 * renderer/backend default font,” distinct from any repo font manifest entry.
 *
 * **Representation (Phase 1 decision):** config fields remain `string`-typed
 * {@link FontAssetId} values. The sentinel {@link PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID} is
 * the only non-bundled id allowed in product font override fields. It is validated in
 * normalization and resolved in {@link ./productTextFont.ts}; Canvas/DOM bridges map it without
 * registering a fake bundled face.
 *
 * **Persistence:** omitting `defaultTextFontAssetId` means “baseline is renderer default” (no
 * redundant explicit sentinel). Per-surface overrides may still store the sentinel when the user
 * explicitly picks renderer default for that surface.
 */

import type { FontAssetId } from "../typography/fontAssetTypes.ts";

/**
 * Bundled fonts exposed in UI for top-band hour markers and other surfaces that only list repo faces.
 * (Does not include {@link PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID}.)
 */
export const TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS: readonly FontAssetId[] = [
  "computer",
  "dotmatrix-regular",
  "dseg7modern-regular",
  "flip-clock",
  "kremlin",
  "zeroes-one",
  "zeroes-two",
];

/**
 * Sentinel: use the rendering environment’s default text font (Canvas 2D / browser stack semantics),
 * not a bundled manifest face.
 */
export const PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID: FontAssetId = "__rendererDefaultFont";

/** User-visible label for {@link PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID} in config selectors. */
export const PRODUCT_TEXT_RENDERER_DEFAULT_SELECT_LABEL = "Renderer default (environment)";

const _PRODUCT_TEXT_FONT_VALID_IDS = new Set<string>([
  PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
  ...TOP_BAND_HOUR_MARKER_SELECTABLE_FONT_IDS,
]);

/** Bundled hour-marker list ∪ renderer-default sentinel — valid for product text override fields. */
export function isValidProductTextFontChoiceId(id: string): id is FontAssetId {
  return _PRODUCT_TEXT_FONT_VALID_IDS.has(id);
}

/** Set reference for asserts / normalization (same membership as {@link isValidProductTextFontChoiceId}). */
export const PRODUCT_TEXT_FONT_VALID_ID_SET: ReadonlySet<string> = _PRODUCT_TEXT_FONT_VALID_IDS;
