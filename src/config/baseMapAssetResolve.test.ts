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
  DEFAULT_EQUIRECT_BASE_MAP_ID,
  resolveEquirectBaseMapAsset,
  resolveEquirectBaseMapImageSrc,
} from "./baseMapAssetResolve";

describe("baseMapAssetResolve month-aware integration", () => {
  it("static families resolve the same path regardless of product instant", () => {
    const ms = Date.UTC(2030, 0, 1);
    expect(resolveEquirectBaseMapImageSrc("equirect-world-political-v1", { productInstantMs: ms })).toBe(
      "/maps/world-equirectangular-political.jpg",
    );
    expect(resolveEquirectBaseMapImageSrc(DEFAULT_EQUIRECT_BASE_MAP_ID, { productInstantMs: ms })).toBe(
      "/maps/world-equirectangular.jpg",
    );
  });

  it("month-aware topography resolves the month file from UTC civil month of product instant", () => {
    const july = Date.UTC(2024, 6, 15);
    expect(resolveEquirectBaseMapImageSrc("equirect-world-topography-v1", { productInstantMs: july })).toBe(
      "/maps/variants/equirect-world-topography-v1/07.jpg",
    );
  });

  it("unknown ids still resolve to the global default map raster", () => {
    const ms = Date.UTC(2024, 6, 15);
    expect(resolveEquirectBaseMapImageSrc("not-a-real-family", { productInstantMs: ms })).toBe(
      "/maps/world-equirectangular.jpg",
    );
  });

  it("exposes catalog src as family base for month-aware assets", () => {
    const asset = resolveEquirectBaseMapAsset("equirect-world-topography-v1");
    expect(asset.src).toBe("/maps/variants/equirect-world-topography-v1/base.jpg");
    expect(asset.variantMode).toBe("monthOfYear");
  });

  it("aliases the same canonical topography family id for resolution", () => {
    const ms = Date.UTC(2024, 8, 1);
    expect(resolveEquirectBaseMapImageSrc("equirect-world-topo-v1", { productInstantMs: ms })).toBe(
      "/maps/variants/equirect-world-topography-v1/09.jpg",
    );
  });
});
