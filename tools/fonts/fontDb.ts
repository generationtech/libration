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

import { basename } from "node:path";
import type { FontAssetDb, FontAssetDbEntry } from "./fontTypes.ts";
import { defaultDisplayNameFromStem } from "./fontMetadata.ts";

/** Input for merge: one scanned file with computed identity and optional pre-extracted metadata. */
export type MergeFontInput = {
  relativeSourcePath: string;
  sourceFileName: string;
  sizeBytes: number;
  modifiedTimeIso: string;
  contentHashSha256: string;
  extractedMetadata: FontAssetDbEntry["extractedMetadata"];
};

export function slugifyFontId(relativeSourcePath: string): string {
  const withoutExt = relativeSourcePath.replace(/\.ttf$/i, "");
  const normalized = withoutExt.replace(/\\/g, "/").toLowerCase();
  const slug = normalized
    .replace(/[^a-z0-9/]+/g, "-")
    .replace(/\//g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "font";
}

export function allocateFontId(relativeSourcePath: string, usedIds: Set<string>): string {
  let base = slugifyFontId(relativeSourcePath);
  if (!usedIds.has(base)) {
    return base;
  }
  let n = 2;
  while (usedIds.has(`${base}-${n}`)) {
    n += 1;
  }
  return `${base}-${n}`;
}

export type MergeFontDatabaseResult = {
  db: FontAssetDb;
  /** True if DB content differs meaningfully from `previous` (new/removed/changed hash or metadata refresh). */
  hasStructuralChange: boolean;
};

/**
 * Incrementally merge scanned fonts into the persistent DB.
 * - Unchanged (path + hash): preserve entry verbatim (no churn).
 * - Changed hash at same path: preserve `id`, `displayName`, `manualAnnotations`; refresh file + extracted metadata.
 * - New path: new entry with allocated id and default display name.
 * - Paths absent from scan: dropped (no tombstones).
 */
export function mergeFontDatabase(
  previous: FontAssetDb | null,
  sortedInputs: MergeFontInput[],
  nowIso: string,
): MergeFontDatabaseResult {
  const oldByPath = new Map<string, FontAssetDbEntry>();
  if (previous) {
    for (const e of previous.fonts) {
      oldByPath.set(e.relativeSourcePath, e);
    }
  }

  const usedIds = new Set<string>();
  for (const e of previous?.fonts ?? []) {
    usedIds.add(e.id);
  }

  const nextFonts: FontAssetDbEntry[] = [];
  let hasStructuralChange = previous === null;

  for (const input of sortedInputs) {
    const old = oldByPath.get(input.relativeSourcePath);
    const sameHash =
      old !== undefined && old.fileInfo.contentHashSha256 === input.contentHashSha256;

    if (old && sameHash) {
      nextFonts.push(old);
      continue;
    }

    hasStructuralChange = true;

    if (old && !sameHash) {
      nextFonts.push(
        entryForChangedFile({
          old,
          input,
          nowIso,
        }),
      );
      continue;
    }

    const id = allocateFontId(input.relativeSourcePath, usedIds);
    usedIds.add(id);
    const stem = basename(input.relativeSourcePath).replace(/\.ttf$/i, "");
    const displayName = defaultDisplayNameFromStem(stem);

    nextFonts.push({
      id,
      relativeSourcePath: input.relativeSourcePath,
      sourceFileName: input.sourceFileName,
      displayName,
      fileInfo: {
        sizeBytes: input.sizeBytes,
        modifiedTimeIso: input.modifiedTimeIso,
        contentHashSha256: input.contentHashSha256,
      },
      processingInfo: {
        firstSeenIso: nowIso,
        lastSeenIso: nowIso,
        lastProcessedIso: nowIso,
        status: "active",
      },
      extractedMetadata: { ...input.extractedMetadata },
      classification: { format: "ttf" },
    });
  }

  if (previous && previous.fonts.length !== nextFonts.length) {
    hasStructuralChange = true;
  } else if (previous) {
    const oldPaths = new Set(previous.fonts.map((f) => f.relativeSourcePath));
    const newPaths = new Set(nextFonts.map((f) => f.relativeSourcePath));
    for (const p of oldPaths) {
      if (!newPaths.has(p)) {
        hasStructuralChange = true;
        break;
      }
    }
  }

  nextFonts.sort((a, b) => a.relativeSourcePath.localeCompare(b.relativeSourcePath, "en"));

  const db: FontAssetDb = {
    version: 1,
    updatedAtIso: hasStructuralChange ? nowIso : (previous?.updatedAtIso ?? nowIso),
    fonts: nextFonts,
  };

  return { db, hasStructuralChange };
}

function entryForChangedFile(opts: {
  old: FontAssetDbEntry;
  input: MergeFontInput;
  nowIso: string;
}): FontAssetDbEntry {
  const { old, input, nowIso } = opts;
  return {
    ...old,
    displayName: old.displayName,
    manualAnnotations: old.manualAnnotations,
    sourceFileName: input.sourceFileName,
    fileInfo: {
      sizeBytes: input.sizeBytes,
      modifiedTimeIso: input.modifiedTimeIso,
      contentHashSha256: input.contentHashSha256,
    },
    processingInfo: {
      ...old.processingInfo,
      lastSeenIso: nowIso,
      lastProcessedIso: nowIso,
      status: "active",
    },
    extractedMetadata: { ...input.extractedMetadata },
    classification: { format: "ttf" },
  };
}

