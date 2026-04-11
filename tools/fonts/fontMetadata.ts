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

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { parse as parseFont } from "opentype.js";
import type { FontAssetDbEntry } from "./fontTypes.ts";

export type FileIdentity = {
  sizeBytes: number;
  modifiedTimeIso: string;
  contentHashSha256: string;
};

export async function computeFileIdentity(absPath: string): Promise<FileIdentity> {
  const [buf, st] = await Promise.all([readFile(absPath), stat(absPath)]);
  const contentHashSha256 = createHash("sha256").update(buf).digest("hex");
  return {
    sizeBytes: st.size,
    modifiedTimeIso: st.mtime.toISOString(),
    contentHashSha256,
  };
}

export async function extractTtfMetadata(
  absPath: string,
  buffer?: Buffer,
): Promise<FontAssetDbEntry["extractedMetadata"]> {
  let buf = buffer;
  if (!buf) {
    buf = await readFile(absPath);
  }

  try {
    const font = parseFont(toArrayBuffer(buf), { lowMemory: true });
    const familyName = nonEmpty(font.getEnglishName("fontFamily"));
    const subfamilyName = nonEmpty(font.getEnglishName("fontSubfamily"));
    const postscriptName = nonEmpty(font.getEnglishName("postScriptName"));

    const hhea = font.tables.hhea as { lineGap?: number } | undefined;
    const lineGap = typeof hhea?.lineGap === "number" ? hhea.lineGap : undefined;

    return {
      familyName,
      subfamilyName,
      postscriptName,
      unitsPerEm: font.unitsPerEm,
      ascender: font.ascender,
      descender: font.descender,
      lineGap,
    };
  } catch {
    return {};
  }
}

function nonEmpty(s: string | undefined | null): string | undefined {
  if (s == null || s.trim() === "") {
    return undefined;
  }
  return s.trim();
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
}

/** Default display label from a filename stem (e.g. `DSEG7Modern-Regular` → `DSEG7Modern Regular`). */
export function defaultDisplayNameFromStem(stem: string): string {
  const spaced = stem.replace(/[-_]+/g, " ").replace(/\s+/g, " ").trim();
  return spaced || stem;
}
