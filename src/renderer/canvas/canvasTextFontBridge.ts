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
 * Canvas-only realization: maps backend-neutral {@link RenderFontStyle} to `CanvasRenderingContext2D.font`
 * and CSS `font-family` strings. Other renderers should not depend on this module.
 *
 * For manifest-backed `font.assetId`, the primary family matches {@link loadBundledFontFaces} registration
 * (manifest `sourceNames.familyName`, not marketing `displayName`).
 */

import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productTextFont.ts";
import type { ResolvedTextStyle } from "../../typography/typographyTypes.ts";
import type { RenderFontStyle, RenderTextItem } from "../renderPlan/renderPlanTypes.ts";
import { canvasCssFontFamilyStackForBundledAssetId } from "./bundledFontCanvasFamily.ts";

/** Minimal CSS family stack so Canvas 2D uses the host environment’s default sans-serif (not a bundled face). */
export const CANVAS_RENDERER_DEFAULT_FONT_FAMILY_STACK = "sans-serif";

function cssFontFamilyFromDisplayName(displayName: string): string {
  const escaped = displayName.includes(" ") ? `"${displayName.replace(/"/g, '\\"')}"` : displayName;
  return `${escaped}, system-ui, sans-serif`;
}

/**
 * CSS `font-family` value for Canvas: uses {@link RenderFontStyle.family} when set (transitional stack),
 * otherwise resolves bundled faces by {@link RenderFontStyle.assetId} to the same primary name as
 * {@link loadBundledFontFaces}. Unknown ids fall back to {@link RenderFontStyle.displayName}.
 */
export function canvasFontFamilyFromRenderTextFont(font: RenderFontStyle): string {
  if (font.family !== undefined && font.family.length > 0) {
    return font.family;
  }
  if (font.assetId === PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID) {
    return CANVAS_RENDERER_DEFAULT_FONT_FAMILY_STACK;
  }
  const bundled = canvasCssFontFamilyStackForBundledAssetId(font.assetId);
  if (bundled !== undefined) {
    return bundled;
  }
  return cssFontFamilyFromDisplayName(font.displayName);
}

/**
 * Full Canvas `font` shorthand. Matches the pre-bridge executor for {@link RenderFontStyle.style} `"normal"`
 * (`${weight} ${sizePx}px ${family}`); prepends `italic` only when style is `"italic"`.
 */
export function canvasFontStringFromRenderTextFont(font: RenderFontStyle): string {
  const w = font.weight;
  const weight = typeof w === "number" ? String(w) : w;
  const family = canvasFontFamilyFromRenderTextFont(font);
  const style = font.style ?? "normal";
  if (style === "italic") {
    return `italic ${weight} ${font.sizePx}px ${family}`;
  }
  return `${weight} ${font.sizePx}px ${family}`;
}

/** Convenience: font string for a plan text item. */
export function canvasFontStringFromRenderTextItem(item: RenderTextItem): string {
  return canvasFontStringFromRenderTextFont(item.font);
}

/** Maps {@link ResolvedTextStyle} to the same {@link RenderFontStyle} shape used at emission time. */
export function renderFontStyleFromResolvedTextStyle(resolved: ResolvedTextStyle): RenderFontStyle {
  const w = resolved.fontWeight ?? 400;
  return {
    assetId: resolved.fontAssetId,
    displayName: resolved.displayName,
    sizePx: resolved.fontSizePx,
    weight: typeof w === "number" ? w : w,
    style: resolved.fontStyle,
    ...(resolved.lineHeightPx !== undefined ? { lineHeightPx: resolved.lineHeightPx } : {}),
  };
}

/** Canvas `font` string for measuring text with the same weight/size/family as a resolved semantic style. */
export function canvasFontStringFromResolvedTextStyle(resolved: ResolvedTextStyle): string {
  return canvasFontStringFromRenderTextFont(renderFontStyleFromResolvedTextStyle(resolved));
}
