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

/**
 * Thin integration surface for chrome typography (Phase 2): semantic roles and manifest-backed styles.
 * Prefer these exports in app/renderer code so paths stay stable if `src/typography/` is reorganized.
 */
export {
  createFontAssetRegistry,
  defaultFontAssetRegistry,
  loadBundledFontAssetRegistry,
} from "../typography/fontAssetRegistry.ts";
export type { FontAssetRegistry } from "../typography/fontAssetRegistry.ts";
export type { FontAssetId, FontAssetManifest, FontAssetRecord } from "../typography/fontAssetTypes.ts";
export { DEFAULT_TYPOGRAPHY_ROLE_SPECS, TYPOGRAPHY_ROLES } from "../typography/typographyRoles.ts";
export { resolveTextStyle, resolveTypographyRole } from "../typography/typographyResolver.ts";
export type {
  ResolveTextStyleOverrides,
  ResolvedTextStyle,
  TypographyRole,
  TypographyRoleSpec,
} from "../typography/typographyTypes.ts";
