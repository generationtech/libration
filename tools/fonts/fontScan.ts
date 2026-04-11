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

import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/**
 * Recursively collect `.ttf` paths under `rootDir`, as POSIX-style paths relative to `rootDir`.
 * Deterministic: directories and files sorted by `localeCompare` at each level.
 */
export async function scanTtfFiles(rootDir: string): Promise<string[]> {
  const out: string[] = [];

  async function walk(current: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === "ENOENT") {
        return;
      }
      throw e;
    }

    entries.sort((a, b) => a.name.localeCompare(b.name, "en"));

    for (const ent of entries) {
      const abs = join(current, ent.name);
      if (ent.isDirectory()) {
        await walk(abs);
      } else if (ent.isFile() && ent.name.toLowerCase().endsWith(".ttf")) {
        const rel = relative(rootDir, abs);
        out.push(toPosixPath(rel));
      }
    }
  }

  await walk(rootDir);
  out.sort((a, b) => a.localeCompare(b, "en"));
  return out;
}

function toPosixPath(p: string): string {
  if (sep === "\\") {
    return p.split(sep).join("/");
  }
  return p;
}
