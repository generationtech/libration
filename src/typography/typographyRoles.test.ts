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
import { loadBundledFontAssetRegistry } from "./fontAssetRegistry.ts";
import { DEFAULT_TYPOGRAPHY_ROLE_SPECS, TYPOGRAPHY_ROLES } from "./typographyRoles.ts";
import type { TypographyRole } from "./typographyTypes.ts";

describe("DEFAULT_TYPOGRAPHY_ROLE_SPECS integrity", () => {
  const registry = loadBundledFontAssetRegistry();

  it("lists every role exactly once", () => {
    const rolesFromTable = Object.keys(DEFAULT_TYPOGRAPHY_ROLE_SPECS) as TypographyRole[];
    expect(rolesFromTable.sort()).toEqual([...TYPOGRAPHY_ROLES].sort());
  });

  it("every spec references a font present in the bundled manifest", () => {
    for (const role of TYPOGRAPHY_ROLES) {
      const id = DEFAULT_TYPOGRAPHY_ROLE_SPECS[role].fontAssetId;
      expect(registry.has(id), `role ${role} → ${id}`).toBe(true);
    }
  });

  it("chromeDotMatrix maps to dotmatrix-regular (hour markers, not zone labels)", () => {
    expect(DEFAULT_TYPOGRAPHY_ROLE_SPECS.chromeDotMatrix.fontAssetId).toBe("dotmatrix-regular");
  });
});
