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
import { parseAndValidateBaseMapCatalog, type BaseMapCatalogFile } from "./baseMapCatalog";

const minimalValid: BaseMapCatalogFile = {
  version: 1,
  defaultEquirectBaseMapId: "a",
  entries: [
    {
      id: "a",
      label: "A",
      category: "reference",
      variantMode: "static",
      src: "/maps/a.jpg",
    },
  ],
};

describe("parseAndValidateBaseMapCatalog", () => {
  it("accepts a static entry", () => {
    const r = parseAndValidateBaseMapCatalog(minimalValid);
    expect(r.defaultEquirectBaseMapId).toBe("a");
    expect(r.definitions[0]!.variantMode).toBe("static");
  });

  it("accepts monthOfYear with 12 month rasters and legacy static", () => {
    const dir = "/maps/variants/x";
    const months = Array.from(
      { length: 12 },
      (_, i) => `${dir}/${String(i + 1).padStart(2, "0")}.jpg`,
    ) as [
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ];
    const file: BaseMapCatalogFile = {
      version: 1,
      defaultEquirectBaseMapId: "a",
      entries: [
        {
          id: "a",
          label: "A",
          category: "reference",
          variantMode: "static",
          src: "/maps/a.jpg",
        },
        {
          id: "x",
          label: "X",
          category: "terrain",
          variantMode: "monthOfYear",
          src: `${dir}/base.jpg`,
          legacyStaticSrc: "/maps/legacy.jpg",
          monthOfYear: {
            familyBaseSrc: `${dir}/base.jpg`,
            monthAssetSrcs: months,
            onboardedMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
          },
        },
      ],
    };
    const r = parseAndValidateBaseMapCatalog(file);
    expect(r.definitions.find((d) => d.id === "x")?.monthOfYear?.monthAssetSrcs).toHaveLength(12);
  });

  it("rejects duplicate ids", () => {
    const bad: BaseMapCatalogFile = {
      version: 1,
      defaultEquirectBaseMapId: "a",
      entries: [
        { id: "a", label: "A", category: "reference", variantMode: "static", src: "/a.jpg" },
        { id: "a", label: "B", category: "reference", variantMode: "static", src: "/b.jpg" },
      ],
    };
    expect(() => parseAndValidateBaseMapCatalog(bad)).toThrow(/Duplicate base-map/);
  });

  it("rejects invalid onboarded month", () => {
    const months = [
      "/m/01.jpg",
      "/m/02.jpg",
      "/m/03.jpg",
      "/m/04.jpg",
      "/m/05.jpg",
      "/m/06.jpg",
      "/m/07.jpg",
      "/m/08.jpg",
      "/m/09.jpg",
      "/m/10.jpg",
      "/m/11.jpg",
      "/m/12.jpg",
    ] as const;
    const bad: BaseMapCatalogFile = {
      version: 1,
      defaultEquirectBaseMapId: "a",
      entries: [
        { id: "a", label: "A", category: "reference", variantMode: "static", src: "/a.jpg" },
        {
          id: "b",
          label: "B",
          category: "terrain",
          variantMode: "monthOfYear",
          src: "/m/base.jpg",
          monthOfYear: {
            familyBaseSrc: "/m/base.jpg",
            monthAssetSrcs: months,
            onboardedMonths: [13],
          },
        },
      ],
    };
    expect(() => parseAndValidateBaseMapCatalog(bad)).toThrow(/1–12/);
  });

  it("rejects static entry with monthOfYear block", () => {
    const months = [
      "/m/01.jpg",
      "/m/02.jpg",
      "/m/03.jpg",
      "/m/04.jpg",
      "/m/05.jpg",
      "/m/06.jpg",
      "/m/07.jpg",
      "/m/08.jpg",
      "/m/09.jpg",
      "/m/10.jpg",
      "/m/11.jpg",
      "/m/12.jpg",
    ] as const;
    const bad: BaseMapCatalogFile = {
      version: 1,
      defaultEquirectBaseMapId: "a",
      entries: [
        {
          id: "a",
          label: "A",
          category: "reference",
          variantMode: "static",
          src: "/a.jpg",
          monthOfYear: {
            familyBaseSrc: "/m/base.jpg",
            monthAssetSrcs: months,
          },
        },
      ],
    };
    expect(() => parseAndValidateBaseMapCatalog(bad)).toThrow(/monthOfYear when variantMode is static/);
  });

  it("rejects default id missing from entries", () => {
    const bad: BaseMapCatalogFile = {
      version: 1,
      defaultEquirectBaseMapId: "missing",
      entries: [{ id: "a", label: "A", category: "reference", variantMode: "static", src: "/a.jpg" }],
    };
    expect(() => parseAndValidateBaseMapCatalog(bad)).toThrow(/not a catalog entry/);
  });
});
