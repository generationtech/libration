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

/** Persistent working store (manual fields + derived metadata). */
export type FontAssetDb = {
  version: 1;
  updatedAtIso: string;
  fonts: FontAssetDbEntry[];
};

export type FontProcessingStatus = "active";

export type FontAssetDbEntry = {
  id: string;
  relativeSourcePath: string;
  sourceFileName: string;

  /** User-editable; preserved by merge when path/hash stable. */
  displayName: string;

  fileInfo: {
    sizeBytes: number;
    modifiedTimeIso: string;
    contentHashSha256: string;
  };

  processingInfo: {
    firstSeenIso: string;
    lastSeenIso: string;
    lastProcessedIso: string;
    status: FontProcessingStatus;
  };

  extractedMetadata: {
    familyName?: string;
    subfamilyName?: string;
    postscriptName?: string;
    unitsPerEm?: number;
    ascender?: number;
    descender?: number;
    lineGap?: number;
  };

  classification: {
    format: "ttf";
  };

  /** Reserved for future manual annotations; copied forward by merge. */
  manualAnnotations?: Record<string, unknown>;
};

/** Generated runtime-facing manifest. */
export type FontAssetManifest = {
  version: 1;
  generatedAtIso: string;
  fonts: FontAssetManifestEntry[];
};

export type FontAssetManifestEntry = {
  id: string;
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
