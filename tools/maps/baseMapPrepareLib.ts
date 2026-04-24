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
 * Pure helpers for `prepareBaseMapFamily.ts` (month detection, snippets).
 * Kept deterministic and free of filesystem / ImageMagick side effects for tests.
 */

export type BaseMapPrepareCategory = "reference" | "political" | "terrain" | "scientific";

export type MonthAssignment = Readonly<{
  month1To12: number;
  /** Original filename only (basename). */
  sourceBasename: string;
}>;

export type MonthDetectionResult = Readonly<{
  assignments: readonly MonthAssignment[];
  /** Basenames that looked like TIFFs but had no detectable month. */
  skippedBasenames: readonly string[];
}>;

const TIFF_EXT = /\.(tif|tiff)$/i;

/** Blue Marble-style `YYYYMM` (year 19xx–20xx, month 01–12). */
const YYYYMM_REGEX = /(19|20)\d{2}(0[1-9]|1[0-2])/g;

/**
 * Detect civil month 1–12 from a TIFF basename, or `null`.
 * Prefers `YYYYMM` when present; otherwise token-bound `01`…`12` (not a substring of longer digit runs).
 */
export function detectMonthFromTiffBasename(basename: string): number | null {
  if (!TIFF_EXT.test(basename)) {
    return null;
  }
  const yyyymmMatches = [...basename.matchAll(YYYYMM_REGEX)];
  if (yyyymmMatches.length > 0) {
    const last = yyyymmMatches[yyyymmMatches.length - 1]!;
    return Number.parseInt(last[0]!.slice(-2), 10);
  }
  const stem = basename.replace(TIFF_EXT, "");
  const mUnderscore = stem.match(/(?:^|_|-)(0[1-9]|1[0-2])$/);
  if (mUnderscore) {
    return Number.parseInt(mUnderscore[1]!, 10);
  }
  const mToken = stem.match(/(?:^|[^0-9])(0[1-9]|1[0-2])(?:[^0-9]|$)/);
  if (mToken) {
    return Number.parseInt(mToken[1]!, 10);
  }
  return null;
}

export function isProbablyTiffBasename(basename: string): boolean {
  return TIFF_EXT.test(basename);
}

/**
 * Assign each matching basename to a month; duplicate months produce an error message (empty assignments).
 */
export function assignMonthsFromTiffBasenames(basenames: readonly string[]): MonthDetectionResult | string {
  const skipped: string[] = [];
  const byMonth = new Map<number, string>();

  for (const name of basenames) {
    if (!isProbablyTiffBasename(name)) {
      continue;
    }
    const m = detectMonthFromTiffBasename(name);
    if (m === null) {
      skipped.push(name);
      continue;
    }
    const prev = byMonth.get(m);
    if (prev !== undefined) {
      return `Duplicate month ${String(m).padStart(2, "0")}: "${prev}" and "${name}"`;
    }
    byMonth.set(m, name);
  }

  const assignments: MonthAssignment[] = [...byMonth.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([month1To12, sourceBasename]) => ({ month1To12, sourceBasename }));

  return { assignments, skippedBasenames: skipped };
}

export function defaultGlobMatcher(basename: string): boolean {
  return isProbablyTiffBasename(basename);
}

/** Minimal glob: only `*` → `.*`; `?` → `.`; case-insensitive match on basename. */
export function basenameMatchesGlob(basename: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${escaped}$`, "i").test(basename);
}

export type RegistrySnippetInput = Readonly<{
  familyId: string;
  variantDirUrl: string;
  onboardedMonths: readonly number[];
  label: string;
  category: BaseMapPrepareCategory;
  attribution: string;
  previewThumbnailSrc: string;
  /** Legacy flat catalog / fallback raster URL in the registry `src` field. */
  legacyFlatSrc: string;
  constPrefix: string;
}>;

function tsStringLiteral(s: string): string {
  return JSON.stringify(s);
}

/** Upper snake case suitable for a TS constant prefix (e.g. `equirect-world-v1` → `EQUIRECT_WORLD_V1`). */
export function toConstPrefixFromFamilyId(familyId: string): string {
  const cleaned = familyId.replace(/[^a-zA-Z0-9]+/g, "_").replace(/^_|_$/g, "");
  const upper = cleaned.toUpperCase();
  return upper !== "" ? upper : "BASE_MAP_FAMILY";
}

export function buildRegistrySnippet(input: RegistrySnippetInput): string {
  const p = input.constPrefix;
  const dir = input.variantDirUrl;
  const months = input.onboardedMonths;
  const monthList = months.join(", ");
  const lines: string[] = [];
  lines.push(`const ${p}_DIR = ${tsStringLiteral(dir)};`);
  lines.push("");
  lines.push(`/** Shipped months for this family — align with files under \`public/maps/variants/\`. */`);
  lines.push(`const ${p}_ONBOARDED_MONTHS: readonly number[] = [${monthList}];`);
  lines.push("");
  lines.push(`const ${p}_MONTH_SRCS = [`);
  for (let m = 1; m <= 12; m += 1) {
    const suffix = `${String(m).padStart(2, "0")}.jpg`;
    lines.push(`  \`${dir}/${suffix}\`,`);
  }
  lines.push(`] as const satisfies MonthOfYearFamilyPaths["monthAssetSrcs"];`);
  lines.push("");
  lines.push(`// Add inside DEFINITIONS (manual review):`);
  lines.push(`{`);
  lines.push(`  id: ${tsStringLiteral(input.familyId)},`);
  lines.push(`  variantMode: "monthOfYear",`);
  lines.push(`  src: ${tsStringLiteral(input.legacyFlatSrc)},`);
  lines.push(`  monthOfYear: {`);
  lines.push(`    familyBaseSrc: \`\${${p}_DIR}/base.jpg\`,`);
  lines.push(`    monthAssetSrcs: ${p}_MONTH_SRCS,`);
  lines.push(`    onboardedMonths: ${p}_ONBOARDED_MONTHS,`);
  lines.push(`  },`);
  lines.push(`  option: {`);
  lines.push(`    id: ${tsStringLiteral(input.familyId)},`);
  lines.push(`    label: ${tsStringLiteral(input.label)},`);
  lines.push(`    shortDescription: "<edit: one line for the base map selector>",`);
  lines.push(`    category: ${tsStringLiteral(input.category)},`);
  lines.push(`    previewThumbnailSrc: ${tsStringLiteral(input.previewThumbnailSrc)},`);
  lines.push(`    attribution: ${tsStringLiteral(input.attribution)},`);
  lines.push(`  },`);
  lines.push(`},`);
  return lines.join("\n");
}

export type ProvenanceSnippetInput = Readonly<{
  familyId: string;
  label: string;
  category: BaseMapPrepareCategory;
  attribution: string;
  sourceDirLabel: string;
}>;

export function buildProvenanceMarkdown(input: ProvenanceSnippetInput): string {
  const lines: string[] = [];
  lines.push(`## ${input.familyId}`);
  lines.push(`- Variant mode: monthOfYear`);
  lines.push(`- Label: ${input.label}`);
  lines.push(`- Category: ${input.category}`);
  lines.push(`- Family runtime directory: \`public/maps/variants/${input.familyId}/\``);
  lines.push(`- Files:`);
  lines.push(`  - \`base.jpg\` (from the month chosen as \`--base-month\`)`);
  lines.push(`  - \`01.jpg\` … \`12.jpg\` for onboarded months only; set \`onboardedMonths\` in the registry to match shipped files.`);
  lines.push(`- Preview: \`public/maps/previews/${input.familyId}-thumb.jpg\``);
  lines.push(`- Source directory (tooling): \`${input.sourceDirLabel}\``);
  lines.push(`- Attribution: ${input.attribution}`);
  lines.push(`- Notes: Prepared with \`npm run maps:prep\`. Month filenames supported: \`YYYYMM\` (e.g. NASA Blue Marble \`200401\`…\`200412\`) or token-bound \`01\`…\`12\` in the basename.`);
  return lines.join("\n");
}

export function formatMonthTable(assignments: readonly MonthAssignment[]): string {
  const header = "| Month | Source TIFF |";
  const sep = "| --- | --- |";
  const rows = assignments.map(
    (a) => `| ${String(a.month1To12).padStart(2, "0")} | ${a.sourceBasename} |`,
  );
  return [header, sep, ...rows].join("\n");
}
