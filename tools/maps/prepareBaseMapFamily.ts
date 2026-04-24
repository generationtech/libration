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
 * Curated TIFF ingestion: month-aware families into `public/maps/variants/<family-id>/`, or
 * a single static TIFF into `public/maps/<family-id>.jpg`. Prints registry and provenance
 * snippets for manual review (does not edit the registry or docs).
 */

import { execFileSync } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assignMonthsFromTiffBasenames,
  basenameMatchesGlob,
  buildProvenanceMarkdown,
  buildRegistrySnippet,
  buildStaticRegistrySnippet,
  defaultGlobMatcher,
  formatMonthTable,
  type BaseMapPrepareCategory,
  type MonthAssignment,
  planMonthOfYearPreview,
  toConstPrefixFromFamilyId,
} from "./baseMapPrepareLib.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

const CATEGORIES: readonly BaseMapPrepareCategory[] = ["reference", "political", "terrain", "scientific"];

type MapVariantMode = "static" | "monthOfYear";

type CliOptions = {
  familyId: string;
  sourceDir: string;
  label: string;
  category: BaseMapPrepareCategory;
  attribution: string;
  shortDescription: string | null;
  glob: string | null;
  variantMode: MapVariantMode;
  baseMonth: number;
  /** When set, overrides base month for the preview thumbnail (monthOfYear only). */
  previewMonth1To12: number | undefined;
  quality: number;
  thumbWidth: number;
  thumbHeight: number;
  dryRun: boolean;
};

function hasCliLongFlag(argv: string[], name: string): boolean {
  return argv.includes(`--${name}`);
}

function printHelp(): void {
  console.log(`Usage: npm run maps:prep -- [options]

Required:
  --family-id <id>           Registry id (e.g. equirect-world-topography-v1)
  --source-dir <path>        Directory containing source TIFFs
  --label <text>             UI label for BaseMapOption
  --category <name>          One of: ${CATEGORIES.join("|")}
  --attribution <text>       Attribution string for BaseMapOption

Optional:
  --short-description <t>    One line for the registry shortDescription (else edit placeholder in snippet)
  --variant-mode <m>         "monthOfYear" (default) or "static" (single TIFF family)
  --glob <pattern>           Basename glob (only * and ? wildcards). Default: *.tif / *.tiff
  --base-month <1-12>        Month for base.jpg (monthOfYear only, default: 10)
  --preview-month <1-12>     Thumbnail from this month's JPEG (monthOfYear only; default: --base-month)
  --quality <n>              JPEG quality for convert (default: 92)
  --thumb-width <n>          Preview width (default: 800)
  --thumb-height <n>         Preview height (default: 400)
  --dry-run                  Print plan and snippets only (no writes, no ImageMagick)

Examples:
  npm run maps:prep -- --family-id equirect-world-topography-v1 --source-dir ./in \\
    --label "World topography" --category terrain --attribution "NASA" \\
    --short-description "Terrain and relief for landforms and elevation context."

  npm run maps:prep -- --variant-mode monthOfYear --family-id equirect-world-topography-v1 \\
    --source-dir ./in --label "World topography" --category terrain --attribution "NASA" \\
    --base-month 7 --preview-month 3

  npm run maps:prep -- --variant-mode static --family-id equirect-terrain-snapshot-v1 \\
    --source-dir ./one-tiff --label "Terrain snapshot" --category terrain --attribution "Us"

Notes:
  - Uses ImageMagick \`convert\` (not \`magick\`) for JPEG output.
  - Does not modify src/config/baseMapAssetResolve.ts or docs automatically.
`);
}

function parseArgs(argv: string[]): CliOptions {
  const raw: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--help" || a === "-h") {
      printHelp();
      process.exit(0);
    }
    if (a === "--dry-run") {
      raw.dryRun = true;
      continue;
    }
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) {
        console.error(`Missing value for --${key}`);
        printHelp();
        process.exit(1);
      }
      i += 1;
      raw[key.replace(/-/g, "")] = next;
      continue;
    }
    console.error(`Unexpected argument: ${a}`);
    printHelp();
    process.exit(1);
  }

  const familyId = String(raw.familyid ?? "").trim();
  const sourceDir = String(raw.sourcedir ?? "").trim();
  const label = String(raw.label ?? "").trim();
  const categoryRaw = String(raw.category ?? "").trim() as BaseMapPrepareCategory;
  const attribution = String(raw.attribution ?? "").trim();
  const globRaw = raw.glob !== undefined ? String(raw.glob).trim() : null;
  const shortDescriptionRaw = raw.shortdescription !== undefined ? String(raw.shortdescription).trim() : null;
  const shortDescription = shortDescriptionRaw && shortDescriptionRaw !== "" ? shortDescriptionRaw : null;

  const variantModeStr = (raw.variantmode !== undefined ? String(raw.variantmode).trim() : "monthOfYear") as
    | "static"
    | "monthOfYear"
    | string;
  let variantMode: MapVariantMode;
  if (variantModeStr === "static" || variantModeStr === "monthOfYear") {
    variantMode = variantModeStr;
  } else {
    console.error(
      `Invalid --variant-mode "${variantModeStr}". Expected "static" or "monthOfYear" (default: monthOfYear).`,
    );
    process.exit(1);
  }

  if (!familyId || !sourceDir || !label || !categoryRaw || !attribution) {
    console.error("Missing required options (--family-id, --source-dir, --label, --category, --attribution).");
    printHelp();
    process.exit(1);
  }

  if (!CATEGORIES.includes(categoryRaw)) {
    console.error(`Invalid --category "${categoryRaw}". Expected one of: ${CATEGORIES.join(", ")}`);
    process.exit(1);
  }

  const baseMonthStr = raw.basemonth !== undefined ? String(raw.basemonth) : "10";
  const baseMonth = Number.parseInt(baseMonthStr, 10);
  if (!Number.isInteger(baseMonth) || baseMonth < 1 || baseMonth > 12) {
    console.error(`Invalid --base-month "${baseMonthStr}" (expected integer 1–12).`);
    process.exit(1);
  }

  let previewMonth1To12: number | undefined;
  if (raw.previewmonth !== undefined) {
    const pm = Number.parseInt(String(raw.previewmonth), 10);
    if (!Number.isInteger(pm) || pm < 1 || pm > 12) {
      console.error(`Invalid --preview-month (expected integer 1–12).`);
      process.exit(1);
    }
    previewMonth1To12 = pm;
  }

  const quality = raw.quality !== undefined ? Number.parseInt(String(raw.quality), 10) : 92;
  if (!Number.isFinite(quality) || quality < 1 || quality > 100) {
    console.error(`Invalid --quality (expected number 1–100).`);
    process.exit(1);
  }

  const thumbWidth = raw.thumbwidth !== undefined ? Number.parseInt(String(raw.thumbwidth), 10) : 800;
  const thumbHeight = raw.thumbheight !== undefined ? Number.parseInt(String(raw.thumbheight), 10) : 400;
  if (!Number.isInteger(thumbWidth) || thumbWidth < 1 || !Number.isInteger(thumbHeight) || thumbHeight < 1) {
    console.error(`Invalid --thumb-width / --thumb-height (expected positive integers).`);
    process.exit(1);
  }

  return {
    familyId,
    sourceDir,
    label,
    category: categoryRaw,
    attribution,
    shortDescription,
    glob: globRaw && globRaw !== "" ? globRaw : null,
    variantMode,
    baseMonth,
    previewMonth1To12,
    quality,
    thumbWidth,
    thumbHeight,
    dryRun: raw.dryRun === true,
  };
}

function assertConvertAvailable(): void {
  try {
    execFileSync("convert", ["-version"], { stdio: "pipe", encoding: "utf8" });
  } catch {
    console.error(
      "ImageMagick `convert` was not found or failed. Install imagemagick (use `convert`, not `magick`) or pass --dry-run.",
    );
    process.exit(1);
  }
}

function runConvert(args: readonly string[], dryRun: boolean): void {
  if (dryRun) {
    console.log(`[dry-run] convert ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(" ")}`);
    return;
  }
  execFileSync("convert", [...args], { stdio: "inherit" });
}

function assignmentByMonth(assignments: readonly MonthAssignment[]): Map<number, MonthAssignment> {
  return new Map(assignments.map((a) => [a.month1To12, a]));
}

function formatStaticTiffList(basenames: readonly string[]): string {
  if (basenames.length === 0) {
    return "(none)";
  }
  return basenames.map((b) => `"${b}"`).join(", ");
}

async function runStaticMapFamily(opts: CliOptions, absSource: string, tiffBasenames: readonly string[]): Promise<void> {
  if (tiffBasenames.length !== 1) {
    console.error(
      `--variant-mode static requires exactly one usable source TIFF in --source-dir (after --glob). Found ${String(tiffBasenames.length)}: ${formatStaticTiffList(tiffBasenames)}`,
    );
    process.exit(1);
  }

  const publicMapsDir = join(repoRoot, "public/maps");
  const previewsDirFs = join(publicMapsDir, "previews");
  const mainJpgFs = join(publicMapsDir, `${opts.familyId}.jpg`);
  const previewUrl = `/maps/previews/${opts.familyId}-thumb.jpg`;
  const previewFs = join(previewsDirFs, `${opts.familyId}-thumb.jpg`);
  const mainUrl = `/maps/${opts.familyId}.jpg`;
  const singleTiff = tiffBasenames[0]!;
  const sourceFs = join(absSource, singleTiff);

  console.log("\n## Static family (single TIFF)\n");
  console.log(`- Source: ${singleTiff}`);

  const outputFiles = [join("public/maps", `${opts.familyId}.jpg`), join("public/maps/previews", `${opts.familyId}-thumb.jpg`)];
  console.log("\n## Planned output files\n");
  for (const rel of outputFiles) {
    console.log(`- ${rel}`);
  }

  if (!opts.dryRun) {
    await mkdir(publicMapsDir, { recursive: true });
    await mkdir(previewsDirFs, { recursive: true });
  } else {
    console.log(`\n[dry-run] mkdir -p ${publicMapsDir}`);
    console.log(`[dry-run] mkdir -p ${previewsDirFs}`);
  }

  const q = String(opts.quality);
  const tw = String(opts.thumbWidth);
  const th = String(opts.thumbHeight);

  runConvert([sourceFs, "-quality", q, mainJpgFs], opts.dryRun);
  runConvert([mainJpgFs, "-thumbnail", `${tw}x${th}^`, "-gravity", "center", "-extent", `${tw}x${th}`, "-quality", q, previewFs], opts.dryRun);

  console.log("\n## TypeScript registry snippet (paste into baseMapAssetResolve.ts after manual review)\n");
  console.log(
    buildStaticRegistrySnippet({
      familyId: opts.familyId,
      label: opts.label,
      category: opts.category,
      attribution: opts.attribution,
      mainSrc: mainUrl,
      previewThumbnailSrc: previewUrl,
      shortDescription: opts.shortDescription,
    }),
  );

  console.log("\n## Markdown provenance snippet (paste into docs/map-asset-sources.md after manual review)\n");
  console.log(
    buildProvenanceMarkdown({
      familyId: opts.familyId,
      label: opts.label,
      category: opts.category,
      attribution: opts.attribution,
      sourceDirLabel: absSource,
      variantMode: "static",
    }),
  );
}

async function runMonthOfYearMapFamily(
  opts: CliOptions,
  absSource: string,
  tiffBasenames: readonly string[],
): Promise<void> {
  const assigned = assignMonthsFromTiffBasenames(tiffBasenames);
  if (typeof assigned === "string") {
    console.error(assigned);
    process.exit(1);
  }

  if (assigned.assignments.length === 0) {
    console.error(
      "No month files found: no TIFF basenames matched YYYYMM (e.g. 200401) or a token-bound 01…12 pattern.",
    );
    if (assigned.skippedBasenames.length > 0) {
      console.error("Skipped TIFFs (no month detected):");
      for (const s of assigned.skippedBasenames) {
        console.error(`  - ${s}`);
      }
    }
    process.exit(1);
  }

  const byMonth = assignmentByMonth(assigned.assignments);
  if (!byMonth.has(opts.baseMonth)) {
    const detected = assigned.assignments.map((a) => a.month1To12).join(", ");
    console.error(
      `--base-month ${opts.baseMonth} has no matching source TIFF. Detected months: ${detected}`,
    );
    process.exit(1);
  }

  const detectedMonthList = assigned.assignments.map((a) => a.month1To12);
  const previewPlan = planMonthOfYearPreview({
    baseMonth1To12: opts.baseMonth,
    previewMonth1To12: opts.previewMonth1To12,
    detectedMonths1To12: detectedMonthList,
  });
  if (!previewPlan.ok) {
    console.error(previewPlan.message);
    process.exit(1);
  }
  const effectivePreviewMonth = previewPlan.effectivePreviewMonth1To12;

  const variantDirFs = join(repoRoot, "public/maps/variants", opts.familyId);
  const previewsDirFs = join(repoRoot, "public/maps/previews");
  const variantDirUrl = `/maps/variants/${opts.familyId}`;
  const previewUrl = `/maps/previews/${opts.familyId}-thumb.jpg`;
  const previewFs = join(previewsDirFs, `${opts.familyId}-thumb.jpg`);
  const constPrefix = toConstPrefixFromFamilyId(opts.familyId);
  const onboardedMonths = assigned.assignments.map((a) => a.month1To12);
  const previewJpegFs = join(variantDirFs, `${String(effectivePreviewMonth).padStart(2, "0")}.jpg`);

  console.log("\n## Detected months\n");
  console.log(formatMonthTable(assigned.assignments));
  if (assigned.skippedBasenames.length > 0) {
    console.log("\n### Skipped TIFFs (no month token)\n");
    for (const s of assigned.skippedBasenames) {
      console.log(`- ${s}`);
    }
  }

  console.log(`\n## Preview thumbnail\n\nUsing month \`${String(effectivePreviewMonth).padStart(2, "0")}.jpg\` (preview month ${String(effectivePreviewMonth)}).\n`);

  const outputFiles: string[] = [];
  for (const a of assigned.assignments) {
    outputFiles.push(join("public/maps/variants", opts.familyId, `${String(a.month1To12).padStart(2, "0")}.jpg`));
  }
  outputFiles.push(join("public/maps/variants", opts.familyId, "base.jpg"));
  outputFiles.push(join("public/maps/previews", `${opts.familyId}-thumb.jpg`));

  console.log("\n## Planned output files\n");
  for (const rel of outputFiles.sort()) {
    console.log(`- ${rel}`);
  }

  if (onboardedMonths.length < 12) {
    console.warn(
      `\nWarning: only ${onboardedMonths.length}/12 months were detected. Set onboardedMonths explicitly in the registry; add missing TIFFs before claiming a full year.`,
    );
  }

  if (!opts.dryRun) {
    await mkdir(variantDirFs, { recursive: true });
    await mkdir(previewsDirFs, { recursive: true });
  } else {
    console.log(`\n[dry-run] mkdir -p ${variantDirFs}`);
    console.log(`[dry-run] mkdir -p ${previewsDirFs}`);
  }

  const q = String(opts.quality);
  const tw = String(opts.thumbWidth);
  const th = String(opts.thumbHeight);

  for (const a of assigned.assignments) {
    const srcFs = join(absSource, a.sourceBasename);
    const destName = `${String(a.month1To12).padStart(2, "0")}.jpg`;
    const destFs = join(variantDirFs, destName);
    runConvert([srcFs, "-quality", q, destFs], opts.dryRun);
  }

  const baseSrcFs = join(absSource, byMonth.get(opts.baseMonth)!.sourceBasename);
  const baseDestFs = join(variantDirFs, "base.jpg");
  runConvert([baseSrcFs, "-quality", q, baseDestFs], opts.dryRun);

  runConvert(
    [previewJpegFs, "-thumbnail", `${tw}x${th}^`, "-gravity", "center", "-extent", `${tw}x${th}`, "-quality", q, previewFs],
    opts.dryRun,
  );

  console.log("\n## TypeScript registry snippet (paste into baseMapAssetResolve.ts after manual review)\n");
  console.log(
    buildRegistrySnippet({
      familyId: opts.familyId,
      variantDirUrl,
      onboardedMonths,
      label: opts.label,
      category: opts.category,
      attribution: opts.attribution,
      previewThumbnailSrc: previewUrl,
      constPrefix,
      shortDescription: opts.shortDescription,
    }),
  );

  console.log("\n## Markdown provenance snippet (paste into docs/map-asset-sources.md after manual review)\n");
  console.log(
    buildProvenanceMarkdown({
      familyId: opts.familyId,
      label: opts.label,
      category: opts.category,
      attribution: opts.attribution,
      sourceDirLabel: absSource,
      variantMode: "monthOfYear",
    }),
  );
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const opts = parseArgs(argv);
  if (opts.variantMode === "static" && (hasCliLongFlag(argv, "base-month") || hasCliLongFlag(argv, "preview-month"))) {
    console.error(
      "In --variant-mode static, do not use --base-month or --preview-month (those apply only to monthOfYear).",
    );
    process.exit(1);
  }

  if (!opts.dryRun) {
    assertConvertAvailable();
  }

  const absSource = resolve(opts.sourceDir);
  let entries: string[];
  try {
    entries = await readdir(absSource);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    console.error(`Cannot read --source-dir: ${absSource} (${err.code ?? err.message})`);
    process.exit(1);
  }

  const tiffBasenames = entries.filter((name) => {
    if (opts.glob) {
      return basenameMatchesGlob(name, opts.glob);
    }
    return defaultGlobMatcher(name);
  });

  if (opts.variantMode === "static") {
    await runStaticMapFamily(opts, absSource, tiffBasenames);
  } else {
    await runMonthOfYearMapFamily(opts, absSource, tiffBasenames);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
