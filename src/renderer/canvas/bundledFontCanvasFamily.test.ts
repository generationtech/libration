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
import { createFontAssetRegistry, loadBundledFontAssetRegistry } from "../../typography/fontAssetRegistry.ts";
import type { FontAssetManifest } from "../../typography/fontAssetTypes.ts";
import {
  canvasCssFontFamilyStackForBundledAssetId,
  canvasCssPrimaryFamilyForBundledRecord,
  formatCssFontFamilyStack,
} from "./bundledFontCanvasFamily.ts";

describe("bundledFontCanvasFamily", () => {
  const bundled = loadBundledFontAssetRegistry();

  it("formatCssFontFamilyStack quotes names with spaces", () => {
    expect(formatCssFontFamilyStack("Zeroes One")).toBe(`"Zeroes One", system-ui, sans-serif`);
  });

  it("uses familyName from manifest for computer (displayName differs in casing)", () => {
    const rec = bundled.requireById("computer");
    expect(rec.displayName).toBe("COMPUTER");
    expect(canvasCssPrimaryFamilyForBundledRecord(rec)).toBe("Computer");
    expect(canvasCssFontFamilyStackForBundledAssetId("computer", bundled)).toBe(
      `Computer, system-ui, sans-serif`,
    );
  });

  it("bundled hour-marker font ids map to distinct primary families", () => {
    const ids = [
      "computer",
      "dotmatrix-regular",
      "dseg7modern-regular",
      "flip-clock",
      "kremlin",
      "zeroes-one",
      "zeroes-two",
    ] as const;
    const families = ids.map((id) =>
      canvasCssPrimaryFamilyForBundledRecord(bundled.requireById(id)),
    );
    expect(new Set(families).size).toBe(families.length);
  });

  it("canvasCssFontFamilyStackForBundledAssetId returns undefined for unknown id", () => {
    const empty = createFontAssetRegistry({ version: 1, generatedAtIso: "", fonts: [] });
    expect(canvasCssFontFamilyStackForBundledAssetId("computer", empty)).toBeUndefined();
  });

  it("every manifest font has a non-empty primary family", () => {
    const m = bundledManifest as FontAssetManifest;
    for (const f of m.fonts) {
      expect(canvasCssPrimaryFamilyForBundledRecord(f).length).toBeGreaterThan(0);
    }
  });
});
