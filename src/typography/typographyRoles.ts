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

import type { TypographyRole, TypographyRoleSpec } from "./typographyTypes.ts";

/** Exhaustive list for integrity checks and error messages. */
export const TYPOGRAPHY_ROLES: readonly TypographyRole[] = [
  "chromeHourPrimary",
  "chromeHourEmphasis",
  "chromeZoneLabel",
  "chromeDenseMono",
  "chromeSegment",
  "chromeDotMatrix",
] as const;

/**
 * Default role → policy table. Values reference {@link FontAssetId} from the generated manifest, not paths.
 * Revise here when inventory or design tokens change; keep mappings centralized.
 */
export const DEFAULT_TYPOGRAPHY_ROLE_SPECS: Record<TypographyRole, TypographyRoleSpec> = {
  /** Primary hour numerals — geometric “Zeroes One”. */
  chromeHourPrimary: {
    fontAssetId: "zeroes-one",
    fontSizePx: 22,
    fontWeight: 800,
    letterSpacingPx: 0,
    fontStyle: "normal",
  },
  /** Emphasis hour treatment — geometric “Zeroes Two”. */
  chromeHourEmphasis: {
    fontAssetId: "zeroes-two",
    fontSizePx: 22,
    fontWeight: "normal",
    letterSpacingPx: 0,
    fontStyle: "normal",
  },
  /** Timezone / zone strip labels — distinct matrix face for legibility vs hour stack. */
  chromeZoneLabel: {
    fontAssetId: "dotmatrix-regular",
    fontSizePx: 13,
    fontWeight: "normal",
    letterSpacingPx: 0.5,
    fontStyle: "normal",
  },
  /** Dense monospace / terminal-style chrome. */
  chromeDenseMono: {
    fontAssetId: "computer",
    fontSizePx: 12,
    fontWeight: "normal",
    letterSpacingPx: 0,
    lineHeightPx: 14,
    fontStyle: "normal",
  },
  /** Seven-segment style segments (dials, labels). */
  chromeSegment: {
    fontAssetId: "dseg7modern-regular",
    fontSizePx: 18,
    fontWeight: "normal",
    letterSpacingPx: 0,
    fontStyle: "normal",
  },
  /** Dot-matrix hour / instrument numerals (distinct from zone strip labels). */
  chromeDotMatrix: {
    fontAssetId: "dotmatrix-regular",
    fontSizePx: 20,
    fontWeight: "normal",
    letterSpacingPx: 0.25,
    fontStyle: "normal",
  },
};
