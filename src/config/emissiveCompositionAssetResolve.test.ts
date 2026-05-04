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
  DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID,
  parseAndValidateEmissiveCompositionCatalog,
  resolveEmissiveCompositionAsset,
  resolveEmissiveCompositionAssetIdToCanonicalId,
  SUPPORTED_EMISSIVE_COMPOSITION_ASSET_IDS,
} from "./emissiveCompositionAssetResolve";

describe("emissive composition asset resolver", () => {
  it("resolves the default catalog id to itself with equirect contract fields", () => {
    expect(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID).toBe("equirect-world-night-lights-viirs-v1");
    const a = resolveEmissiveCompositionAsset(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID);
    expect(a.id).toBe(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID);
    expect(a.projectionId).toBe("equirectangular");
    expect(a.orientation).toBe("north-up");
    expect(a.hasPadding).toBe(false);
    expect(a.extent).toEqual({ minLat: -90, maxLat: 90, minLon: -180, maxLon: 180 });
    expect(a.src).toMatch(/^\/maps\/composition\//);
    expect(a.transitionalPlaceholder).toBe(true);
  });

  it("falls back to the default id for unknown and blank ids", () => {
    expect(resolveEmissiveCompositionAssetIdToCanonicalId("")).toBe(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID);
    expect(resolveEmissiveCompositionAssetIdToCanonicalId("   ")).toBe(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID);
    expect(resolveEmissiveCompositionAssetIdToCanonicalId("not-a-catalog-id")).toBe(
      DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID,
    );
    expect(resolveEmissiveCompositionAsset("not-a-catalog-id").id).toBe(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID);
  });

  it("accepts trimmed known ids", () => {
    expect(resolveEmissiveCompositionAssetIdToCanonicalId(`  ${DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID}  `)).toBe(
      DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID,
    );
  });

  it("exposes a bounded supported-id list from the bundled catalog", () => {
    expect(SUPPORTED_EMISSIVE_COMPOSITION_ASSET_IDS).toContain(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID);
    expect(SUPPORTED_EMISSIVE_COMPOSITION_ASSET_IDS.length).toBeGreaterThanOrEqual(1);
  });

  it("resolved assets carry no render-plan or backend execution semantics", () => {
    const a = resolveEmissiveCompositionAsset(DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID);
    const keys = new Set(Object.keys(a));
    for (const forbidden of ["kind", "items", "rasterPatch", "opacity", "layerId"]) {
      expect(keys.has(forbidden)).toBe(false);
    }
    expect(typeof a.src).toBe("string");
  });
});

describe("parseAndValidateEmissiveCompositionCatalog", () => {
  it("rejects duplicate ids", () => {
    expect(() =>
      parseAndValidateEmissiveCompositionCatalog({
        version: 1,
        defaultEmissiveCompositionAssetId: "a",
        entries: [
          { id: "a", label: "A", src: "/a.jpg" },
          { id: "a", label: "B", src: "/b.jpg" },
        ],
      }),
    ).toThrow(/Duplicate emissive composition asset id/);
  });

  it("rejects default id missing from entries", () => {
    expect(() =>
      parseAndValidateEmissiveCompositionCatalog({
        version: 1,
        defaultEmissiveCompositionAssetId: "missing",
        entries: [{ id: "a", label: "A", src: "/a.jpg" }],
      }),
    ).toThrow(/defaultEmissiveCompositionAssetId/);
  });
});
