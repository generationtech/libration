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
import { DEFAULT_TYPOGRAPHY_ROLE_SPECS, TYPOGRAPHY_ROLES } from "./typographyRoles.ts";
import { resolveTextStyle, resolveTypographyRole } from "./typographyResolver.ts";
import type { TypographyRole } from "./typographyTypes.ts";

const bundled = loadBundledFontAssetRegistry();

describe("resolveTextStyle", () => {
  it("returns normalized style for each initial role", () => {
    for (const role of TYPOGRAPHY_ROLES) {
      const style = resolveTextStyle(bundled, role);
      expect(style.role).toBe(role);
      expect(style.fontAssetId).toBe(DEFAULT_TYPOGRAPHY_ROLE_SPECS[role].fontAssetId);
      expect(style.displayName).toBeTruthy();
      expect(style.letterSpacingPx).toBe(DEFAULT_TYPOGRAPHY_ROLE_SPECS[role].letterSpacingPx ?? 0);
      expect(style.fontStyle).toBe(DEFAULT_TYPOGRAPHY_ROLE_SPECS[role].fontStyle ?? "normal");
    }
  });

  it("applies overrides without mutating DEFAULT_TYPOGRAPHY_ROLE_SPECS", () => {
    const before = { ...DEFAULT_TYPOGRAPHY_ROLE_SPECS.chromeHourPrimary };
    const style = resolveTextStyle(bundled, "chromeHourPrimary", { fontSizePx: 99 });
    expect(style.fontSizePx).toBe(99);
    expect(DEFAULT_TYPOGRAPHY_ROLE_SPECS.chromeHourPrimary.fontSizePx).toBe(before.fontSizePx);
  });

  it("applies fontSizeMultiplier after resolved fontSizePx", () => {
    const style = resolveTextStyle(bundled, "chromeHourPrimary", {
      fontSizePx: 20,
      fontSizeMultiplier: 1.5,
    });
    expect(style.fontSizePx).toBe(30);
  });

  it("throws when override fontAssetId is missing from registry", () => {
    expect(() =>
      resolveTextStyle(bundled, "chromeHourPrimary", { fontAssetId: "definitely-not-in-manifest" }),
    ).toThrow(/Font asset not found/);
  });

  it("resolveTypographyRole uses default bundled registry", () => {
    const primary = resolveTypographyRole("chromeHourPrimary");
    expect(primary.fontAssetId).toBe("zeroes-one");
    expect(primary.displayName).toBe("zeroes one");
  });
});

describe("resolveTextStyle with minimal manifest", () => {
  const manifest: FontAssetManifest = {
    version: 1,
    generatedAtIso: "2026-01-01T00:00:00.000Z",
    fonts: [
      {
        id: "zeroes-one",
        displayName: "Z1",
        relativeSourcePath: "z.ttf",
        format: "ttf",
        sourceNames: {},
        metrics: {},
      },
      {
        id: "zeroes-two",
        displayName: "Z2",
        relativeSourcePath: "z2.ttf",
        format: "ttf",
        sourceNames: {},
        metrics: {},
      },
      {
        id: "dotmatrix-regular",
        displayName: "DM",
        relativeSourcePath: "d.ttf",
        format: "ttf",
        sourceNames: {},
        metrics: {},
      },
      {
        id: "computer",
        displayName: "C",
        relativeSourcePath: "c.ttf",
        format: "ttf",
        sourceNames: {},
        metrics: {},
      },
      {
        id: "dseg7modern-regular",
        displayName: "DSEG",
        relativeSourcePath: "seg.ttf",
        format: "ttf",
        sourceNames: {},
        metrics: {},
      },
    ],
  };

  it("resolves all roles when manifest contains required ids", () => {
    const reg = createFontAssetRegistry(manifest);
    for (const role of TYPOGRAPHY_ROLES) {
      expect(() => resolveTextStyle(reg, role)).not.toThrow();
    }
  });
});

describe("unknown role", () => {
  it("throws for invalid role at runtime", () => {
    expect(() => resolveTextStyle(bundled, "not-a-role" as TypographyRole)).toThrow(/Unknown typography role/);
  });
});
