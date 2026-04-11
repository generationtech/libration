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

import type { RenderFontStyle, RenderTextItem } from "../renderPlan/renderPlanTypes.ts";
import { canvasCssFontFamilyStackForBundledAssetId } from "./bundledFontCanvasFamily.ts";

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
