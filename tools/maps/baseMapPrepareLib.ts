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

import { readFile, writeFile } from "node:fs/promises";

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
  constPrefix: string;
  /** When set to a non-empty string after trim, used as the `shortDescription` literal; otherwise the edit placeholder. */
  shortDescription?: string | null;
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

function shortDescriptionOptionLine(inputShort: string | null | undefined): string {
  const t = inputShort?.trim();
  if (t) {
    return `    shortDescription: ${tsStringLiteral(t)},`;
  }
  return `    shortDescription: "<edit: one line for the base map selector>",`;
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
  lines.push(`  src: \`\${${p}_DIR}/base.jpg\`,`);
  lines.push(`  monthOfYear: {`);
  lines.push(`    familyBaseSrc: \`\${${p}_DIR}/base.jpg\`,`);
  lines.push(`    monthAssetSrcs: ${p}_MONTH_SRCS,`);
  lines.push(`    onboardedMonths: ${p}_ONBOARDED_MONTHS,`);
  lines.push(`  },`);
  lines.push(`  option: {`);
  lines.push(`    id: ${tsStringLiteral(input.familyId)},`);
  lines.push(`    label: ${tsStringLiteral(input.label)},`);
  lines.push(shortDescriptionOptionLine(input.shortDescription));
  lines.push(`    category: ${tsStringLiteral(input.category)},`);
  lines.push(`    previewThumbnailSrc: ${tsStringLiteral(input.previewThumbnailSrc)},`);
  lines.push(`    attribution: ${tsStringLiteral(input.attribution)},`);
  lines.push(`  },`);
  lines.push(`},`);
  return lines.join("\n");
}

export type StaticRegistrySnippetInput = Readonly<{
  familyId: string;
  label: string;
  category: BaseMapPrepareCategory;
  attribution: string;
  /** Primary raster, e.g. /maps/equirect-single-v1.jpg */
  mainSrc: string;
  previewThumbnailSrc: string;
  shortDescription?: string | null;
}>;

/**
 * Registry snippet for a `variantMode: "static"` family: single `src`, no `monthOfYear` block.
 */
export function buildStaticRegistrySnippet(input: StaticRegistrySnippetInput): string {
  const lines: string[] = [];
  lines.push(`// Add inside DEFINITIONS (manual review):`);
  lines.push(`{`);
  lines.push(`  id: ${tsStringLiteral(input.familyId)},`);
  lines.push(`  variantMode: "static",`);
  lines.push(`  src: ${tsStringLiteral(input.mainSrc)},`);
  lines.push(`  option: {`);
  lines.push(`    id: ${tsStringLiteral(input.familyId)},`);
  lines.push(`    label: ${tsStringLiteral(input.label)},`);
  lines.push(shortDescriptionOptionLine(input.shortDescription));
  lines.push(`    category: ${tsStringLiteral(input.category)},`);
  lines.push(`    previewThumbnailSrc: ${tsStringLiteral(input.previewThumbnailSrc)},`);
  lines.push(`    attribution: ${tsStringLiteral(input.attribution)},`);
  lines.push(`  },`);
  lines.push(`},`);
  return lines.join("\n");
}

export type ProvenanceSnippetInput =
  | Readonly<{
      familyId: string;
      label: string;
      category: BaseMapPrepareCategory;
      attribution: string;
      sourceDirLabel: string;
      variantMode: "monthOfYear";
    }>
  | Readonly<{
      familyId: string;
      label: string;
      category: BaseMapPrepareCategory;
      attribution: string;
      sourceDirLabel: string;
      variantMode: "static";
    }>;

export function buildProvenanceMarkdown(input: ProvenanceSnippetInput): string {
  const lines: string[] = [];
  lines.push(`## ${input.familyId}`);
  if (input.variantMode === "static") {
    lines.push(`- Variant mode: static`);
    lines.push(`- Label: ${input.label}`);
    lines.push(`- Category: ${input.category}`);
    lines.push(`- Main raster: \`public/maps/${input.familyId}.jpg\``);
    lines.push(`- Preview: \`public/maps/previews/${input.familyId}-thumb.jpg\``);
    lines.push(`- Source directory (tooling): \`${input.sourceDirLabel}\``);
    lines.push(`- Attribution: ${input.attribution}`);
    lines.push(
      `- Notes: Prepared with \`npm run maps:prep -- --variant-mode static\`. One curated TIFF in \`--source-dir\` is converted to the public raster path above.`,
    );
    return lines.join("\n");
  }
  lines.push(`- Variant mode: monthOfYear`);
  lines.push(`- Label: ${input.label}`);
  lines.push(`- Category: ${input.category}`);
  lines.push(`- Family runtime directory: \`public/maps/variants/${input.familyId}/\``);
  lines.push(`- Files:`);
  lines.push(`  - \`base.jpg\` (from the month chosen as \`--base-month\`)`);
  lines.push(
    `  - \`01.jpg\` … \`12.jpg\` for onboarded months only; set \`onboardedMonths\` in the registry to match shipped files.`,
  );
  lines.push(
    `- Preview: \`public/maps/previews/${input.familyId}-thumb.jpg\` (thumbnail from \`--preview-month\`, defaulting to \`--base-month\`)`,
  );
  lines.push(`- Source directory (tooling): \`${input.sourceDirLabel}\``);
  lines.push(`- Attribution: ${input.attribution}`);
  lines.push(
    `- Notes: Prepared with \`npm run maps:prep\`. Month filenames supported: \`YYYYMM\` (e.g. NASA Blue Marble \`200401\`…\`200412\`) or token-bound \`01\`…\`12\` in the basename.`,
  );
  return lines.join("\n");
}

export type MonthOfYearPreviewPlanInput = Readonly<{
  /** \`--base-month\` */
  baseMonth1To12: number;
  /** \`--preview-month\` when passed; if omitted, preview tracks base month. */
  previewMonth1To12: number | undefined;
  /** Months with a shipped source TIFF. */
  detectedMonths1To12: readonly number[];
}>;

/**
 * Picks the calendar month 1–12 used for the preview thumbnail under \`monthOfYear\` mode.
 * Fails if the effective month is not in \`detectedMonths1To12\`.
 */
export function planMonthOfYearPreview(
  input: MonthOfYearPreviewPlanInput,
): { ok: true; effectivePreviewMonth1To12: number } | { ok: false; message: string; detectedMonths1To12: readonly number[] } {
  const { baseMonth1To12, previewMonth1To12, detectedMonths1To12 } = input;
  const effective = previewMonth1To12 !== undefined ? previewMonth1To12 : baseMonth1To12;
  const sorted = [...detectedMonths1To12].sort((a, b) => a - b);
  if (!detectedMonths1To12.includes(effective)) {
    return {
      ok: false,
      message: `Preview month ${String(effective)} is not in detected months: ${sorted.join(", ")}`,
      detectedMonths1To12: sorted,
    };
  }
  return { ok: true, effectivePreviewMonth1To12: effective };
}

export function formatMonthTable(assignments: readonly MonthAssignment[]): string {
  const header = "| Month | Source TIFF |";
  const sep = "| --- | --- |";
  const rows = assignments.map(
    (a) => `| ${String(a.month1To12).padStart(2, "0")} | ${a.sourceBasename} |`,
  );
  return [header, sep, ...rows].join("\n");
}

// --- Base map catalog JSON (for `src/assets/maps/base-map-catalog.json`) ---

export type CatalogJsonEntry = Readonly<Record<string, unknown>>;

export type CatalogFileOnDisk = Readonly<{
  version: number;
  defaultEquirectBaseMapId: string;
  entries: Record<string, unknown>[];
}>;

export type CatalogDefaultPresentationInput = {
  opacity?: number;
  brightness?: number;
  contrast?: number;
  saturation?: number;
  gamma?: number;
};

const DEFAULT_PRES: Required<CatalogDefaultPresentationInput> = {
  opacity: 1,
  brightness: 1,
  contrast: 1,
  saturation: 1,
  gamma: 1,
};

function monthSrcsFromVariantDir(variantDirUrl: string): string[] {
  return Array.from({ length: 12 }, (_, i) => `${variantDirUrl}/${String(i + 1).padStart(2, "0")}.jpg`);
}

export type MonthOfYearCatalogEntryInput = Readonly<{
  familyId: string;
  variantDirUrl: string;
  onboardedMonths: readonly number[];
  label: string;
  category: BaseMapPrepareCategory;
  attribution: string;
  shortDescription?: string | null;
  previewThumbnailSrc: string;
  /** Optional flat legacy URL after month walk fails; omit if same as using only `base.jpg` chain. */
  legacyStaticSrc?: string | null;
  recommendedRoles?: readonly string[];
  defaultPresentation?: CatalogDefaultPresentationInput;
  capabilities?: Readonly<{
    temporal?: boolean;
    overlayOptimized?: boolean;
    emissiveCompatible?: boolean;
    darkFriendly?: boolean;
    seasonal?: boolean;
  }>;
}>;

/**
 * One catalog row for a `variantMode: "monthOfYear"` family (suitable for JSON.stringify under `entries`).
 */
export function buildMonthOfYearCatalogEntryObject(input: MonthOfYearCatalogEntryInput): CatalogJsonEntry {
  const base = `${input.variantDirUrl}/base.jpg`;
  const desc =
    input.shortDescription?.trim() && input.shortDescription.trim() !== ""
      ? input.shortDescription.trim()
      : "Natural-color or terrain imagery with seasonal variation (edit in catalog as needed).";
  const ob = [...input.onboardedMonths].sort((a, b) => a - b);
  const cap = {
    temporal: true,
    overlayOptimized: input.capabilities?.overlayOptimized ?? false,
    emissiveCompatible: input.capabilities?.emissiveCompatible ?? false,
    darkFriendly: input.capabilities?.darkFriendly ?? false,
    seasonal: input.capabilities?.seasonal ?? true,
    ...input.capabilities,
  };
  const pres = { ...DEFAULT_PRES, ...input.defaultPresentation };
  return {
    id: input.familyId,
    label: input.label,
    shortDescription: desc,
    category: input.category,
    attribution: input.attribution,
    variantMode: "monthOfYear",
    src: base,
    ...(input.legacyStaticSrc?.trim() ? { legacyStaticSrc: input.legacyStaticSrc.trim() } : {}),
    previewThumbnailSrc: input.previewThumbnailSrc,
    monthOfYear: {
      familyBaseSrc: base,
      monthAssetSrcs: monthSrcsFromVariantDir(input.variantDirUrl),
      onboardedMonths: ob,
    },
    defaultPresentation: pres,
    capabilities: cap,
    recommendedRoles: input.recommendedRoles?.length
      ? [...input.recommendedRoles]
      : ["general"],
  };
}

export type StaticCatalogEntryInput = Readonly<{
  familyId: string;
  mainSrc: string;
  label: string;
  category: BaseMapPrepareCategory;
  attribution: string;
  shortDescription?: string | null;
  previewThumbnailSrc: string;
  transitionalPlaceholder?: true;
  recommendedRoles?: readonly string[];
  defaultPresentation?: CatalogDefaultPresentationInput;
  capabilities?: Readonly<{
    temporal?: boolean;
    overlayOptimized?: boolean;
    emissiveCompatible?: boolean;
    darkFriendly?: boolean;
    seasonal?: boolean;
  }>;
}>;

export function buildStaticCatalogEntryObject(input: StaticCatalogEntryInput): CatalogJsonEntry {
  const desc =
    input.shortDescription?.trim() && input.shortDescription.trim() !== ""
      ? input.shortDescription.trim()
      : "Static equirectangular map (edit short description in catalog as needed).";
  const cap = {
    temporal: false,
    overlayOptimized: input.capabilities?.overlayOptimized ?? true,
    emissiveCompatible: input.capabilities?.emissiveCompatible ?? false,
    darkFriendly: input.capabilities?.darkFriendly ?? true,
    seasonal: input.capabilities?.seasonal ?? false,
    ...input.capabilities,
  };
  return {
    id: input.familyId,
    label: input.label,
    shortDescription: desc,
    category: input.category,
    variantMode: "static",
    src: input.mainSrc,
    previewThumbnailSrc: input.previewThumbnailSrc,
    attribution: input.attribution,
    ...(input.transitionalPlaceholder ? { transitionalPlaceholder: true } : {}),
    defaultPresentation: { ...DEFAULT_PRES, ...input.defaultPresentation },
    capabilities: cap,
    recommendedRoles: input.recommendedRoles?.length
      ? [...input.recommendedRoles]
      : ["general"],
  };
}

export function formatCatalogEntryJsonBlock(entry: CatalogJsonEntry): string {
  return JSON.stringify(entry, null, 2);
}

/**
 * Inserts or replaces one `entries` item in `base-map-catalog.json` by `id` (2-space indent, trailing newline).
 * Does not validate beyond JSON parse/serialize; app-level validation is in the runtime loader tests.
 */
export async function upsertBaseMapCatalogEntryInFile(
  catalogPath: string,
  entry: CatalogJsonEntry,
): Promise<void> {
  const text = await readFile(catalogPath, "utf8");
  const data = JSON.parse(text) as CatalogFileOnDisk;
  if (!data.entries || !Array.isArray(data.entries)) {
    throw new Error(`Invalid catalog (missing entries): ${catalogPath}`);
  }
  const id = entry["id"];
  if (typeof id !== "string" || id.trim() === "") {
    throw new Error("Catalog entry must have a non-empty string `id`");
  }
  const idx = data.entries.findIndex((e) => e["id"] === id);
  if (idx >= 0) {
    data.entries[idx] = { ...entry } as Record<string, unknown>;
  } else {
    (data.entries as Record<string, unknown>[]).push({ ...entry } as Record<string, unknown>);
  }
  await writeFile(catalogPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}
