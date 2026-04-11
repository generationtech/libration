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

import type {
  FontAssetDb,
  FontAssetDbEntry,
  FontAssetManifest,
  FontAssetManifestEntry,
} from "./fontTypes.ts";

export function buildFontManifest(db: FontAssetDb, generatedAtIso: string): FontAssetManifest {
  const fonts: FontAssetManifestEntry[] = [...db.fonts]
    .sort((a, b) => a.relativeSourcePath.localeCompare(b.relativeSourcePath, "en"))
    .map((e) => manifestEntryFromDb(e));

  return {
    version: 1,
    generatedAtIso,
    fonts,
  };
}

function manifestEntryFromDb(e: FontAssetDbEntry): FontAssetManifestEntry {
  const m = e.extractedMetadata;
  return {
    id: e.id,
    displayName: e.displayName,
    relativeSourcePath: e.relativeSourcePath,
    format: "ttf",
    sourceNames: {
      familyName: m.familyName,
      subfamilyName: m.subfamilyName,
      postscriptName: m.postscriptName,
    },
    metrics: {
      unitsPerEm: m.unitsPerEm,
      ascender: m.ascender,
      descender: m.descender,
      lineGap: m.lineGap,
    },
  };
}
