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

import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { mergeFontDatabase, type MergeFontInput } from "./fontDb.ts";
import { buildFontManifest } from "./fontManifest.ts";
import type { FontAssetDb, FontAssetDbEntry } from "./fontTypes.ts";
import { computeFileIdentity, extractTtfMetadata } from "./fontMetadata.ts";
import { scanTtfFiles } from "./fontScan.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

const DEFAULT_SOURCE = join(repoRoot, "src/assets/fonts/source");
const DEFAULT_DB = join(repoRoot, "src/assets/fonts/generated/fontAssetDb.json");
const DEFAULT_MANIFEST = join(repoRoot, "src/assets/fonts/generated/fontAssetManifest.json");

type CliOptions = {
  source: string;
  db: string;
  manifest: string;
};

function parseArgs(argv: string[]): CliOptions {
  const opts: CliOptions = {
    source: DEFAULT_SOURCE,
    db: DEFAULT_DB,
    manifest: DEFAULT_MANIFEST,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
    if (a === "--source") {
      opts.source = argv[++i] ?? "";
      continue;
    }
    if (a === "--db") {
      opts.db = argv[++i] ?? "";
      continue;
    }
    if (a === "--manifest") {
      opts.manifest = argv[++i] ?? "";
      continue;
    }
    if (a.startsWith("-")) {
      console.error(`Unknown option: ${a}`);
      printHelp();
      process.exit(1);
    }
  }
  return opts;
}

function printHelp(): void {
  console.log(`Usage: npm run fonts:prep [-- --source <dir>] [--db <path>] [--manifest <path>]

Defaults:
  source:   ${DEFAULT_SOURCE}
  db:       ${DEFAULT_DB}
  manifest: ${DEFAULT_MANIFEST}
`);
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function isFontAssetDb(x: unknown): x is FontAssetDb {
  if (x === null || typeof x !== "object") {
    return false;
  }
  const o = x as Record<string, unknown>;
  return o.version === 1 && Array.isArray(o.fonts);
}

async function loadPreviousDb(dbPath: string): Promise<FontAssetDb | null> {
  try {
    const raw = await readFile(dbPath, "utf8");
    const parsed: unknown = JSON.parse(raw);
    if (!isFontAssetDb(parsed)) {
      console.warn(`Ignoring invalid font DB at ${dbPath} (expected version 1).`);
      return null;
    }
    return parsed;
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return null;
    }
    throw e;
  }
}

function stableJson(obj: unknown): string {
  return `${JSON.stringify(obj, null, 2)}\n`;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const previous = await loadPreviousDb(opts.db);
  const relPaths = await scanTtfFiles(opts.source);

  const inputs: MergeFontInput[] = [];
  for (const rel of relPaths) {
    const abs = join(opts.source, rel);
    const identity = await computeFileIdentity(abs);
    const oldEntry = previous?.fonts.find((f) => f.relativeSourcePath === rel);
    let extractedMetadata: FontAssetDbEntry["extractedMetadata"];
    if (oldEntry && oldEntry.fileInfo.contentHashSha256 === identity.contentHashSha256) {
      extractedMetadata = oldEntry.extractedMetadata;
    } else {
      extractedMetadata = await extractTtfMetadata(abs);
    }

    inputs.push({
      relativeSourcePath: rel,
      sourceFileName: basename(rel),
      sizeBytes: identity.sizeBytes,
      modifiedTimeIso: identity.modifiedTimeIso,
      contentHashSha256: identity.contentHashSha256,
      extractedMetadata,
    });
  }

  const nowIso = new Date().toISOString();
  const { db, hasStructuralChange } = mergeFontDatabase(previous, inputs, nowIso);

  const dbMissing = !(await pathExists(opts.db));
  const manifestMissing = !(await pathExists(opts.manifest));
  const shouldWrite = hasStructuralChange || dbMissing || manifestMissing;

  if (!shouldWrite) {
    console.log("Font asset DB and manifest are up to date; skipping writes.");
    return;
  }

  await mkdir(dirname(opts.db), { recursive: true });
  await mkdir(dirname(opts.manifest), { recursive: true });

  await writeFile(opts.db, stableJson(db), "utf8");
  const manifest = buildFontManifest(db, nowIso);
  await writeFile(opts.manifest, stableJson(manifest), "utf8");

  console.log(`Wrote ${opts.db} and ${opts.manifest} (${db.fonts.length} font(s)).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
