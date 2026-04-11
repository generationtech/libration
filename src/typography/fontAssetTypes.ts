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
 * Runtime-facing font inventory types aligned with the Phase 1 generated manifest.
 * The app loads bundled JSON — it does not scan `src/assets/fonts/source` at runtime.
 */

/** Stable nominal id from the font pipeline (slug of source identity, not a display name). */
export type FontAssetId = string;

/** One font entry from {@link FontAssetManifest}; suitable for lookup and diagnostics. */
export type FontAssetRecord = {
  id: FontAssetId;
  displayName: string;
  relativeSourcePath: string;
  format: "ttf";
  sourceNames: {
    familyName?: string;
    subfamilyName?: string;
    postscriptName?: string;
  };
  metrics: {
    unitsPerEm?: number;
    ascender?: number;
    descender?: number;
    lineGap?: number;
  };
};

/** Shape of `fontAssetManifest.json` consumed at runtime. */
export type FontAssetManifest = {
  version: 1;
  generatedAtIso: string;
  fonts: FontAssetRecord[];
};
