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

import { defaultFontAssetRegistry, type FontAssetRegistry } from "./fontAssetRegistry.ts";
import { DEFAULT_TYPOGRAPHY_ROLE_SPECS, TYPOGRAPHY_ROLES } from "./typographyRoles.ts";
import type {
  ResolveTextStyleOverrides,
  ResolvedTextStyle,
  TypographyRole,
} from "./typographyTypes.ts";

/**
 * Maps a semantic role (+ optional overrides) to a normalized style using the manifest-backed registry.
 * Does not measure text or touch backends — only selects asset id + nominal metrics.
 */
export function resolveTextStyle(
  registry: FontAssetRegistry,
  role: TypographyRole,
  overrides?: ResolveTextStyleOverrides,
): ResolvedTextStyle {
  const spec = DEFAULT_TYPOGRAPHY_ROLE_SPECS[role];
  if (!spec) {
    throw new Error(
      `Unknown typography role: "${String(role)}". Known roles: ${TYPOGRAPHY_ROLES.join(", ")}`,
    );
  }

  const { fontSizeMultiplier, ...restOverrides } = overrides ?? {};
  const merged = { ...spec, ...restOverrides };
  const asset = registry.requireById(merged.fontAssetId);

  let fontSizePx = merged.fontSizePx;
  if (fontSizeMultiplier !== undefined && Number.isFinite(fontSizeMultiplier)) {
    fontSizePx *= fontSizeMultiplier;
  }

  return {
    role,
    fontAssetId: merged.fontAssetId,
    displayName: asset.displayName,
    fontSizePx,
    ...(merged.fontWeight !== undefined ? { fontWeight: merged.fontWeight } : {}),
    letterSpacingPx: merged.letterSpacingPx ?? 0,
    ...(merged.lineHeightPx !== undefined ? { lineHeightPx: merged.lineHeightPx } : {}),
    fontStyle: merged.fontStyle ?? "normal",
  };
}

/** Convenience: resolve against {@link defaultFontAssetRegistry}. */
export function resolveTypographyRole(
  role: TypographyRole,
  overrides?: ResolveTextStyleOverrides,
): ResolvedTextStyle {
  return resolveTextStyle(defaultFontAssetRegistry, role, overrides);
}