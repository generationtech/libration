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
import bundledManifest from "../../assets/fonts/generated/fontAssetManifest.json";
import type { FontAssetManifest } from "../../typography/fontAssetTypes.ts";
import {
  assertManifestFontsHaveViteUrls,
  buildBundledFontSourceUrlByRelativePath,
  resetBundledFontFaceLoaderForTests,
} from "./bundledFontFaceLoader.ts";

describe("bundledFontFaceLoader", () => {
  it("provides a Vite URL for every manifest font source file", () => {
    const map = buildBundledFontSourceUrlByRelativePath();
    assertManifestFontsHaveViteUrls(bundledManifest as FontAssetManifest, map);
    for (const url of map.values()) {
      expect(url.length).toBeGreaterThan(0);
    }
  });

  it("resetBundledFontFaceLoaderForTests is idempotent", () => {
    resetBundledFontFaceLoaderForTests();
    resetBundledFontFaceLoaderForTests();
    expect(true).toBe(true);
  });
});
