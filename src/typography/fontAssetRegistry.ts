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

import type { FontAssetId, FontAssetManifest, FontAssetRecord } from "./fontAssetTypes.ts";
import bundledManifest from "../assets/fonts/generated/fontAssetManifest.json";

/** Read-only view over manifest data — no filesystem or source rescan at runtime. */
export type FontAssetRegistry = {
  getAll(): readonly FontAssetRecord[];
  getById(id: FontAssetId): FontAssetRecord | undefined;
  requireById(id: FontAssetId): FontAssetRecord;
  has(id: FontAssetId): boolean;
};

function assertManifestShape(raw: unknown): asserts raw is FontAssetManifest {
  if (
    typeof raw !== "object" ||
    raw === null ||
    !("version" in raw) ||
    (raw as FontAssetManifest).version !== 1 ||
    !("fonts" in raw) ||
    !Array.isArray((raw as FontAssetManifest).fonts)
  ) {
    throw new Error("Invalid font asset manifest: expected version 1 and a fonts array.");
  }
}

/**
 * Builds an immutable registry from a parsed manifest (e.g. tests or alternate bundles).
 */
export function createFontAssetRegistry(manifest: FontAssetManifest): FontAssetRegistry {
  assertManifestShape(manifest);
  const byId = new Map<FontAssetId, FontAssetRecord>();
  for (const font of manifest.fonts) {
    byId.set(font.id, font);
  }

  const all = Object.freeze([...manifest.fonts]) as readonly FontAssetRecord[];

  return {
    getAll: () => all,
    getById: (id) => byId.get(id),
    requireById: (id) => {
      const r = byId.get(id);
      if (!r) {
        const available = [...byId.keys()].sort((a, b) => a.localeCompare(b, "en")).join(", ");
        throw new Error(`Font asset not found: "${id}". Available IDs: ${available}`);
      }
      return r;
    },
    has: (id) => byId.has(id),
  };
}

/** Loads the bundled Phase 1 manifest into a registry (deterministic, same inputs → same registry). */
export function loadBundledFontAssetRegistry(): FontAssetRegistry {
  return createFontAssetRegistry(bundledManifest as FontAssetManifest);
}

/** Default app registry from shipped `fontAssetManifest.json`. */
export const defaultFontAssetRegistry: FontAssetRegistry = loadBundledFontAssetRegistry();
