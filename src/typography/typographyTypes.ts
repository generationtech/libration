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

import type { FontAssetId } from "./fontAssetTypes.ts";

/** Semantic labels for chrome text — callers use roles, not raw filenames or family strings. */
export type TypographyRole =
  | "chromeHourPrimary"
  | "chromeHourEmphasis"
  | "chromeZoneLabel"
  | "chromeDenseMono"
  | "chromeSegment"
  | "chromeDotMatrix";

/**
 * Policy for a semantic role: which font asset and nominal text metrics to use.
 * Backends interpret these without embedding Canvas/DOM-specific behavior.
 */
export type TypographyRoleSpec = {
  fontAssetId: FontAssetId;
  fontSizePx: number;
  fontWeight?: number | "normal" | "bold";
  letterSpacingPx?: number;
  lineHeightPx?: number;
  fontStyle?: "normal" | "italic";
};

/**
 * Normalized result of resolving a role + optional overrides.
 * Suitable for later conversion into backend-specific draw instructions (Canvas, RTX, etc.).
 */
export type ResolvedTextStyle = {
  role: TypographyRole;
  fontAssetId: FontAssetId;
  /** From manifest; descriptive only — identity is {@link fontAssetId}. */
  displayName: string;
  fontSizePx: number;
  fontWeight?: number | "normal" | "bold";
  letterSpacingPx: number;
  lineHeightPx?: number;
  fontStyle: "normal" | "italic";
};

/** Allowed override fields for {@link resolveTextStyle}; intentionally narrow (no full theming layer yet). */
export type ResolveTextStyleOverrides = Partial<
  Pick<
    TypographyRoleSpec,
    "fontAssetId" | "fontSizePx" | "letterSpacingPx" | "fontWeight" | "fontStyle" | "lineHeightPx"
  >
> & {
  /** Applied after role + resolved `fontSizePx`; multiplies nominal size (e.g. hour-disk layout scale). */
  fontSizeMultiplier?: number;
};
