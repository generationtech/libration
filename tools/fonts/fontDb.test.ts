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

import { describe, expect, it } from "vitest";
import { allocateFontId, mergeFontDatabase, slugifyFontId, type MergeFontInput } from "./fontDb.ts";
import type { FontAssetDb, FontAssetDbEntry } from "./fontTypes.ts";

const iso = (s: string) => s;

function baseEntry(overrides: Partial<FontAssetDbEntry> = {}): FontAssetDbEntry {
  return {
    id: "a-font",
    relativeSourcePath: "a.ttf",
    sourceFileName: "a.ttf",
    displayName: "Custom Display",
    fileInfo: {
      sizeBytes: 10,
      modifiedTimeIso: iso("2020-01-01T00:00:00.000Z"),
      contentHashSha256: "aaa",
    },
    processingInfo: {
      firstSeenIso: iso("2020-01-01T00:00:00.000Z"),
      lastSeenIso: iso("2020-01-01T00:00:00.000Z"),
      lastProcessedIso: iso("2020-01-01T00:00:00.000Z"),
      status: "active",
    },
    extractedMetadata: { familyName: "Fam" },
    classification: { format: "ttf" },
    manualAnnotations: { note: "keep" },
    ...overrides,
  };
}

function input(overrides: Partial<MergeFontInput> = {}): MergeFontInput {
  return {
    relativeSourcePath: "a.ttf",
    sourceFileName: "a.ttf",
    sizeBytes: 10,
    modifiedTimeIso: iso("2020-01-01T00:00:00.000Z"),
    contentHashSha256: "aaa",
    extractedMetadata: { familyName: "Fam" },
    ...overrides,
  };
}

describe("mergeFontDatabase", () => {
  it("first run creates entries and marks structural change", () => {
    const { db, hasStructuralChange } = mergeFontDatabase(
      null,
      [
        input({
          relativeSourcePath: "sub/x.ttf",
          sourceFileName: "x.ttf",
          extractedMetadata: { familyName: "X" },
        }),
      ],
      iso("2025-01-01T12:00:00.000Z"),
    );
    expect(hasStructuralChange).toBe(true);
    expect(db.version).toBe(1);
    expect(db.fonts).toHaveLength(1);
    expect(db.fonts[0].relativeSourcePath).toBe("sub/x.ttf");
    expect(db.fonts[0].id).toBe("sub-x");
    expect(db.fonts[0].displayName).toBe("x");
  });

  it("second run with unchanged hash preserves displayName and entry identity", () => {
    const entry = baseEntry({
      displayName: "Zeroes One",
      relativeSourcePath: "zeroes one.ttf",
      sourceFileName: "zeroes one.ttf",
    });
    const prev: FontAssetDb = {
      version: 1,
      updatedAtIso: iso("2024-06-01T00:00:00.000Z"),
      fonts: [entry],
    };
    const { db, hasStructuralChange } = mergeFontDatabase(
      prev,
      [
        input({
          relativeSourcePath: "zeroes one.ttf",
          sourceFileName: "zeroes one.ttf",
          contentHashSha256: "aaa",
          extractedMetadata: { familyName: "Should Not Apply" },
        }),
      ],
      iso("2025-01-01T12:00:00.000Z"),
    );
    expect(hasStructuralChange).toBe(false);
    expect(db.fonts[0]).toBe(entry);
    expect(db.fonts[0].displayName).toBe("Zeroes One");
    expect(db.updatedAtIso).toBe(prev.updatedAtIso);
  });

  it("changed hash refreshes metadata but preserves displayName and id", () => {
    const entry = baseEntry({
      id: "stable-id",
      displayName: "My Label",
    });
    const prev: FontAssetDb = {
      version: 1,
      updatedAtIso: iso("2024-06-01T00:00:00.000Z"),
      fonts: [entry],
    };
    const { db, hasStructuralChange } = mergeFontDatabase(
      prev,
      [
        input({
          contentHashSha256: "bbb",
          sizeBytes: 99,
          modifiedTimeIso: iso("2025-02-02T00:00:00.000Z"),
          extractedMetadata: { familyName: "NewFam", unitsPerEm: 2048 },
        }),
      ],
      iso("2025-01-01T12:00:00.000Z"),
    );
    expect(hasStructuralChange).toBe(true);
    const next = db.fonts[0];
    expect(next.id).toBe("stable-id");
    expect(next.displayName).toBe("My Label");
    expect(next.manualAnnotations).toEqual({ note: "keep" });
    expect(next.fileInfo.contentHashSha256).toBe("bbb");
    expect(next.extractedMetadata.familyName).toBe("NewFam");
    expect(next.extractedMetadata.unitsPerEm).toBe(2048);
    expect(next.processingInfo.lastProcessedIso).toBe(iso("2025-01-01T12:00:00.000Z"));
  });

  it("removes entries for deleted source files", () => {
    const prev: FontAssetDb = {
      version: 1,
      updatedAtIso: iso("2024-06-01T00:00:00.000Z"),
      fonts: [baseEntry({ relativeSourcePath: "gone.ttf", sourceFileName: "gone.ttf" })],
    };
    const { db, hasStructuralChange } = mergeFontDatabase(prev, [], iso("2025-01-01T12:00:00.000Z"));
    expect(hasStructuralChange).toBe(true);
    expect(db.fonts).toHaveLength(0);
  });

  it("sorts fonts by relative path deterministically", () => {
    const { db } = mergeFontDatabase(
      null,
      [
        input({
          relativeSourcePath: "z.ttf",
          sourceFileName: "z.ttf",
          extractedMetadata: {},
        }),
        input({
          relativeSourcePath: "a.ttf",
          sourceFileName: "a.ttf",
          extractedMetadata: {},
        }),
      ],
      iso("2025-01-01T12:00:00.000Z"),
    );
    expect(db.fonts.map((f) => f.relativeSourcePath)).toEqual(["a.ttf", "z.ttf"]);
  });

  it("distinct paths can slugify to the same id base; allocateFontId suffixes", () => {
    expect(slugifyFontId("foo/bar.ttf")).toBe(slugifyFontId("foo-bar.ttf"));
    const used = new Set<string>(["foo-bar"]);
    expect(allocateFontId("foo-bar.ttf", used)).toBe("foo-bar-2");
    used.add("foo-bar-2");
    expect(allocateFontId("foo-bar.ttf", used)).toBe("foo-bar-3");
  });
});
