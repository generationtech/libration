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
 * Canvas realization: maps manifest-backed {@link FontAssetRecord} data to CSS `font-family` primary names
 * and stacks. Used by {@link canvasTextFontBridge.ts} and {@link bundledFontFaceLoader.ts} so registration
 * and drawing use the same family string.
 */

import type { FontAssetId, FontAssetRecord } from "../../typography/fontAssetTypes.ts";
import { defaultFontAssetRegistry, type FontAssetRegistry } from "../../typography/fontAssetRegistry.ts";

/**
 * Primary CSS font-family name for a bundled face: prefers `sourceNames.familyName` (matches TTF name
 * tables / {@link FontFace} registration), then PostScript name, then display label.
 */
export function canvasCssPrimaryFamilyForBundledRecord(record: FontAssetRecord): string {
  const raw =
    record.sourceNames.familyName?.trim() ||
    record.sourceNames.postscriptName?.trim() ||
    record.displayName.trim();
  return raw;
}

/** Builds `primary, system-ui, sans-serif` with quoting rules for Canvas/CSS. */
export function formatCssFontFamilyStack(primaryFamilyName: string): string {
  const escaped = primaryFamilyName.includes(" ")
    ? `"${primaryFamilyName.replace(/"/g, '\\"')}"`
    : primaryFamilyName;
  return `${escaped}, system-ui, sans-serif`;
}

/**
 * Full stack for a known bundled id, or `undefined` if the id is absent from the registry
 * (e.g. sentinel {@link RENDER_PLAN_SYSTEM_UI_STACK_ASSET_ID}).
 */
export function canvasCssFontFamilyStackForBundledAssetId(
  assetId: FontAssetId,
  registry: FontAssetRegistry = defaultFontAssetRegistry,
): string | undefined {
  const rec = registry.getById(assetId);
  if (!rec) {
    return undefined;
  }
  return formatCssFontFamilyStack(canvasCssPrimaryFamilyForBundledRecord(rec));
}
