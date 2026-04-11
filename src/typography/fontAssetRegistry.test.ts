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
import { createFontAssetRegistry, loadBundledFontAssetRegistry } from "./fontAssetRegistry.ts";
import type { FontAssetManifest } from "./fontAssetTypes.ts";

const minimalManifest: FontAssetManifest = {
  version: 1,
  generatedAtIso: "2026-01-01T00:00:00.000Z",
  fonts: [
    {
      id: "alpha",
      displayName: "Alpha",
      relativeSourcePath: "a.ttf",
      format: "ttf",
      sourceNames: { familyName: "Alpha" },
      metrics: { unitsPerEm: 1000 },
    },
    {
      id: "beta",
      displayName: "Beta",
      relativeSourcePath: "b.ttf",
      format: "ttf",
      sourceNames: {},
      metrics: {},
    },
  ],
};

describe("createFontAssetRegistry", () => {
  it("getById returns undefined for unknown id", () => {
    const r = createFontAssetRegistry(minimalManifest);
    expect(r.getById("missing")).toBeUndefined();
    expect(r.has("missing")).toBe(false);
  });

  it("requireById throws with available IDs listed", () => {
    const r = createFontAssetRegistry(minimalManifest);
    expect(() => r.requireById("nope")).toThrow(/Font asset not found: "nope"/);
    expect(() => r.requireById("nope")).toThrow(/alpha, beta/);
  });

  it("getAll is deterministic and ordered like manifest", () => {
    const r = createFontAssetRegistry(minimalManifest);
    expect(r.getAll().map((f) => f.id)).toEqual(["alpha", "beta"]);
  });

  it("getAll returns a frozen array", () => {
    const r = createFontAssetRegistry(minimalManifest);
    expect(Object.isFrozen(r.getAll())).toBe(true);
  });
});

describe("loadBundledFontAssetRegistry", () => {
  it("matches deterministic snapshot from shipped manifest", () => {
    const a = loadBundledFontAssetRegistry();
    const b = loadBundledFontAssetRegistry();
    expect(JSON.stringify(a.getAll())).toEqual(JSON.stringify(b.getAll()));
    expect(a.getById("zeroes-one")?.displayName).toBe("zeroes one");
    expect(a.has("computer")).toBe(true);
  });
});

