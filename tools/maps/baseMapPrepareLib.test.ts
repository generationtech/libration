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
import {
  assignMonthsFromTiffBasenames,
  basenameMatchesGlob,
  buildProvenanceMarkdown,
  buildRegistrySnippet,
  detectMonthFromTiffBasename,
  formatMonthTable,
  toConstPrefixFromFamilyId,
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
      legacyFlatSrc: "/maps/equirect-test-v1-legacy-equirect.jpg",
      constPrefix: "EQUIRECT_TEST_V1",
    });
    expect(s).toContain("id: \"equirect-test-v1\"");
    expect(s).toContain("EQUIRECT_TEST_V1_ONBOARDED_MONTHS: readonly number[] = [1, 6, 12]");
    expect(s).toContain("/maps/variants/equirect-test-v1/01.jpg");
    expect(s).toContain("/maps/variants/equirect-test-v1/12.jpg");
    expect(s).toContain('attribution: "Credit \\"Us\\"",');
    expect(s).toContain("category: \"terrain\"");
  });
});

describe("buildProvenanceMarkdown", () => {
  it("includes headings and paths", () => {
    const m = buildProvenanceMarkdown({
      familyId: "equirect-test-v1",
      label: "Test",
      category: "scientific",
      attribution: "NASA",
      sourceDirLabel: "/tmp/source",
    });
    expect(m).toContain("## equirect-test-v1");
    expect(m).toContain("`public/maps/variants/equirect-test-v1/`");
    expect(m).toContain("`public/maps/previews/equirect-test-v1-thumb.jpg`");
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
