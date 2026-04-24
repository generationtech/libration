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
import { buildGammaRasterCacheKey } from "./canvasGammaRasterCache";

describe("buildGammaRasterCacheKey", () => {
  it("changes when gamma changes (same src and dimensions)", () => {
    const a = buildGammaRasterCacheKey("https://e/x.jpg", 1920, 1080, 1.0);
    const b = buildGammaRasterCacheKey("https://e/x.jpg", 1920, 1080, 1.1);
    expect(a).not.toBe(b);
  });

  it("changes when natural dimensions change", () => {
    const a = buildGammaRasterCacheKey("https://e/x.jpg", 800, 400, 1.1);
    const b = buildGammaRasterCacheKey("https://e/x.jpg", 801, 400, 1.1);
    expect(a).not.toBe(b);
  });

  it("changes when src changes", () => {
    const a = buildGammaRasterCacheKey("a.jpg", 100, 100, 1.2);
    const b = buildGammaRasterCacheKey("b.jpg", 100, 100, 1.2);
    expect(a).not.toBe(b);
  });

  it("is stable for the same parameters", () => {
    const a = buildGammaRasterCacheKey("a.jpg", 10, 20, 1.2000001);
    const b = buildGammaRasterCacheKey("a.jpg", 10, 20, 1.2);
    expect(a).toBe(b);
  });
});
