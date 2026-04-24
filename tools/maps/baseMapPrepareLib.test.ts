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
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  assignMonthsFromTiffBasenames,
  basenameMatchesGlob,
  buildMonthOfYearCatalogEntryObject,
  buildProvenanceMarkdown,
  buildRegistrySnippet,
  buildStaticCatalogEntryObject,
  buildStaticRegistrySnippet,
  detectMonthFromTiffBasename,
  formatCatalogEntryJsonBlock,
  formatMonthTable,
  planMonthOfYearPreview,
  toConstPrefixFromFamilyId,
  upsertBaseMapCatalogEntryInFile,
} from "./baseMapPrepareLib.ts";

describe("detectMonthFromTiffBasename", () => {
  it("reads Blue Marble YYYYMM from basename", () => {
    expect(detectMonthFromTiffBasename("world.200401.rgb.tif")).toBe(1);
    expect(detectMonthFromTiffBasename("bmng_200412_topo.tiff")).toBe(12);
    expect(detectMonthFromTiffBasename("prefix200406suffix.tif")).toBe(6);
  });

  it("reads token-bound two-digit months when no YYYYMM", () => {
    expect(detectMonthFromTiffBasename("relief_03.tif")).toBe(3);
    expect(detectMonthFromTiffBasename("map-07.tiff")).toBe(7);
    expect(detectMonthFromTiffBasename("09_equirect.tif")).toBe(9);
  });

  it("returns null for non-tiff or undetected", () => {
    expect(detectMonthFromTiffBasename("readme.txt")).toBe(null);
    expect(detectMonthFromTiffBasename("opaque.tif")).toBe(null);
  });
});

describe("assignMonthsFromTiffBasenames", () => {
  it("sorts assignments by month", () => {
    const r = assignMonthsFromTiffBasenames(["b_200403.tif", "a_200401.tif", "c_200402.tif"]);
    expect(typeof r).not.toBe("string");
    if (typeof r === "string") {
      return;
    }
    expect(r.assignments.map((x) => x.month1To12)).toEqual([1, 2, 3]);
    expect(r.assignments[0]!.sourceBasename).toBe("a_200401.tif");
  });

  it("errors on duplicate months", () => {
    const r = assignMonthsFromTiffBasenames(["a_200401.tif", "b_200401.tif"]);
    expect(r).toMatch(/Duplicate month 01/);
  });

  it("records skipped basenames", () => {
    const r = assignMonthsFromTiffBasenames(["200401.tif", "nope.tif"]);
    expect(typeof r).not.toBe("string");
    if (typeof r === "string") {
      return;
    }
    expect(r.skippedBasenames).toEqual(["nope.tif"]);
  });
});

describe("basenameMatchesGlob", () => {
  it("matches * and ?", () => {
    expect(basenameMatchesGlob("a.tif", "*.tif")).toBe(true);
    expect(basenameMatchesGlob("a.tiff", "*.tif")).toBe(false);
    expect(basenameMatchesGlob("x.tif", "?.tif")).toBe(true);
  });
});

describe("toConstPrefixFromFamilyId", () => {
  it("normalizes to upper snake", () => {
    expect(toConstPrefixFromFamilyId("equirect-world-topography-v1")).toBe("EQUIRECT_WORLD_TOPOGRAPHY_V1");
  });
});

describe("buildRegistrySnippet", () => {
  it("includes family id, paths, and onboarded months", () => {
    const s = buildRegistrySnippet({
      familyId: "equirect-test-v1",
      variantDirUrl: "/maps/variants/equirect-test-v1",
      onboardedMonths: [1, 6, 12],
      label: "Test map",
      category: "terrain",
      attribution: "Credit \"Us\"",
      previewThumbnailSrc: "/maps/previews/equirect-test-v1-thumb.jpg",
      constPrefix: "EQUIRECT_TEST_V1",
    });
    expect(s).toContain("id: \"equirect-test-v1\"");
    expect(s).toContain("EQUIRECT_TEST_V1_ONBOARDED_MONTHS: readonly number[] = [1, 6, 12]");
    expect(s).toMatch(/^\s*src: `\$\{EQUIRECT_TEST_V1_DIR\}\/base\.jpg`/m);
    expect(s).not.toMatch(/legacy-equirect|legacy.*\.jpg/);
    expect(s).toContain("/maps/variants/equirect-test-v1/01.jpg");
    expect(s).toContain("/maps/variants/equirect-test-v1/12.jpg");
    expect(s).toContain('attribution: "Credit \\"Us\\"",');
    expect(s).toContain("category: \"terrain\"");
  });

  it("uses provided shortDescription when given", () => {
    const s = buildRegistrySnippet({
      familyId: "equirect-test-v1",
      variantDirUrl: "/maps/variants/equirect-test-v1",
      onboardedMonths: [1],
      label: "L",
      category: "reference",
      attribution: "A",
      previewThumbnailSrc: "/p.jpg",
      constPrefix: "EQUIRECT_TEST_V1",
      shortDescription: "One line for the UI.",
    });
    expect(s).toContain('shortDescription: "One line for the UI."');
    expect(s).not.toContain("<edit: one line for the base map selector>");
  });

  it("retains the edit placeholder when shortDescription is omitted", () => {
    const s = buildRegistrySnippet({
      familyId: "equirect-test-v1",
      variantDirUrl: "/maps/variants/equirect-test-v1",
      onboardedMonths: [1],
      label: "L",
      category: "reference",
      attribution: "A",
      previewThumbnailSrc: "/p.jpg",
      constPrefix: "EQUIRECT_TEST_V1",
    });
    expect(s).toContain("shortDescription: \"<edit: one line for the base map selector>\"");
  });
});

describe("buildProvenanceMarkdown", () => {
  it("includes headings and paths for monthOfYear", () => {
    const m = buildProvenanceMarkdown({
      familyId: "equirect-test-v1",
      label: "Test",
      category: "scientific",
      attribution: "NASA",
      sourceDirLabel: "/tmp/source",
      variantMode: "monthOfYear",
    });
    expect(m).toContain("## equirect-test-v1");
    expect(m).toContain("- Variant mode: monthOfYear");
    expect(m).toContain("`public/maps/variants/equirect-test-v1/`");
    expect(m).toContain("`public/maps/previews/equirect-test-v1-thumb.jpg`");
    expect(m).toContain("`--preview-month`");
  });

  it("includes static paths and no variant directory", () => {
    const m = buildProvenanceMarkdown({
      familyId: "equirect-static-v1",
      label: "S",
      category: "terrain",
      attribution: "X",
      sourceDirLabel: "/x",
      variantMode: "static",
    });
    expect(m).toContain("- Variant mode: static");
    expect(m).toContain("`public/maps/equirect-static-v1.jpg`");
    expect(m).toContain("npm run maps:prep -- --variant-mode static");
    expect(m).not.toContain("`public/maps/variants/");
  });
});

describe("buildStaticRegistrySnippet", () => {
  it("emits static variant, single src, and no monthOfYear", () => {
    const s = buildStaticRegistrySnippet({
      familyId: "equirect-static-v1",
      label: "Snap",
      category: "political",
      attribution: "Us",
      mainSrc: "/maps/equirect-static-v1.jpg",
      previewThumbnailSrc: "/maps/previews/equirect-static-v1-thumb.jpg",
    });
    expect(s).toContain('variantMode: "static"');
    expect(s).toContain('src: "/maps/equirect-static-v1.jpg"');
    expect(s).not.toContain("monthOfYear");
    expect(s).toContain('id: "equirect-static-v1"');
  });

  it("applies shortDescription when provided", () => {
    const s = buildStaticRegistrySnippet({
      familyId: "a-v1",
      label: "L",
      category: "reference",
      attribution: "A",
      mainSrc: "/maps/a-v1.jpg",
      previewThumbnailSrc: "/t.jpg",
      shortDescription: "Static one-liner",
    });
    expect(s).toContain('shortDescription: "Static one-liner"');
  });
});

describe("planMonthOfYearPreview", () => {
  it("defaults preview month to base month when --preview-month omitted", () => {
    const p = planMonthOfYearPreview({
      baseMonth1To12: 3,
      previewMonth1To12: undefined,
      detectedMonths1To12: [1, 2, 3, 4],
    });
    expect(p).toEqual({ ok: true, effectivePreviewMonth1To12: 3 });
  });

  it("fails with detected months when preview is not available", () => {
    const p = planMonthOfYearPreview({
      baseMonth1To12: 3,
      previewMonth1To12: 8,
      detectedMonths1To12: [1, 2, 3, 4],
    });
    expect(p.ok).toBe(false);
    if (p.ok) {
      return;
    }
    expect(p.message).toMatch(/Preview month 8/);
    expect(p.message).toMatch(/1, 2, 3, 4/);
    expect(p.detectedMonths1To12).toEqual([1, 2, 3, 4]);
  });
});

describe("formatMonthTable", () => {
  it("renders a markdown table", () => {
    const t = formatMonthTable([
      { month1To12: 1, sourceBasename: "a.tif" },
      { month1To12: 12, sourceBasename: "b.tiff" },
    ]);
    expect(t).toContain("| 01 | a.tif |");
    expect(t).toContain("| 12 | b.tiff |");
  });
});

describe("catalog JSON helpers", () => {
  it("buildMonthOfYearCatalogEntryObject lists 12 month URLs and base", () => {
    const o = buildMonthOfYearCatalogEntryObject({
      familyId: "equirect-test-v1",
      variantDirUrl: "/maps/variants/equirect-test-v1",
      onboardedMonths: [1, 3, 6],
      label: "T",
      category: "terrain",
      attribution: "X",
      previewThumbnailSrc: "/maps/previews/equirect-test-v1-thumb.jpg",
    });
    expect(o.variantMode).toBe("monthOfYear");
    expect((o.monthOfYear as { monthAssetSrcs: string[] }).monthAssetSrcs).toHaveLength(12);
    expect((o.monthOfYear as { familyBaseSrc: string }).familyBaseSrc).toBe(
      "/maps/variants/equirect-test-v1/base.jpg",
    );
    expect(formatCatalogEntryJsonBlock(o)).toContain('"id": "equirect-test-v1"');
  });

  it("buildStaticCatalogEntryObject is static-only", () => {
    const o = buildStaticCatalogEntryObject({
      familyId: "equirect-static-v1",
      mainSrc: "/maps/equirect-static-v1.jpg",
      label: "S",
      category: "political",
      attribution: "U",
      previewThumbnailSrc: "/maps/previews/x-thumb.jpg",
    });
    expect(o.variantMode).toBe("static");
    expect(o).not.toHaveProperty("monthOfYear");
  });

  it("upsertBaseMapCatalogEntryInFile replaces by id", async () => {
    const dir = await mkdtemp(join(tmpdir(), "libration-map-"));
    const path = join(dir, "base-map-catalog.json");
    const initial = {
      version: 1,
      defaultEquirectBaseMapId: "a",
      entries: [{ id: "a", label: "A", extra: 1 }],
    };
    await writeFile(path, JSON.stringify(initial, null, 2), "utf8");
    await upsertBaseMapCatalogEntryInFile(path, { id: "a", label: "A2", newField: true });
    const out = JSON.parse(await readFile(path, "utf8")) as { entries: { id: string }[] };
    expect(out.entries).toHaveLength(1);
    expect(out.entries[0]!.label).toBe("A2");
    expect(out.entries[0]!.id).toBe("a");
    await rm(dir, { recursive: true, force: true });
  });
});
