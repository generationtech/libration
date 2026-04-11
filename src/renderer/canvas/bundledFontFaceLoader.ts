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
 * Browser/Tauri WebView: loads bundled `.ttf` files via {@link FontFace} so Canvas 2D text uses real faces.
 * Planning stays identity-based (`fontAssetId`); this module is backend-only realization.
 */

import type { FontAssetManifest } from "../../typography/fontAssetTypes.ts";
import {
  defaultFontAssetRegistry,
  type FontAssetRegistry,
} from "../../typography/fontAssetRegistry.ts";
import { canvasCssPrimaryFamilyForBundledRecord } from "./bundledFontCanvasFamily.ts";

/** Linux/Vite: `*.ttf` does not match `COMPUTER.TTF`; include uppercase extension. */
const FONT_GLOB = {
  ...import.meta.glob("../../assets/fonts/source/*.ttf", {
    eager: true,
    query: "?url",
    import: "default",
  }),
  ...import.meta.glob("../../assets/fonts/source/*.TTF", {
    eager: true,
    query: "?url",
    import: "default",
  }),
} as Record<string, string>;

/** Maps manifest `relativeSourcePath` (e.g. `COMPUTER.TTF`) to Vite-resolved asset URL. Keys are lowercased — Vite glob basenames may differ in case from the manifest on disk. */
export function buildBundledFontSourceUrlByRelativePath(): Map<string, string> {
  const m = new Map<string, string>();
  for (const [viteKey, url] of Object.entries(FONT_GLOB)) {
    const slash = viteKey.lastIndexOf("/");
    const base = slash >= 0 ? viteKey.slice(slash + 1) : viteKey;
    m.set(base.toLowerCase(), url);
  }
  return m;
}

let loadPromise: Promise<void> | undefined;

/**
 * Registers every font from the bundled manifest with `document.fonts` using the same primary family names
 * as {@link canvasCssPrimaryFamilyForBundledRecord}. Safe to call multiple times (loads once).
 */
export async function loadBundledFontFaces(
  registry: FontAssetRegistry = defaultFontAssetRegistry,
): Promise<void> {
  if (loadPromise !== undefined) {
    return loadPromise;
  }
  if (typeof FontFace === "undefined" || typeof document === "undefined" || !document.fonts) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  const urlByPath = buildBundledFontSourceUrlByRelativePath();
  const tasks: Promise<void>[] = [];

  for (const record of registry.getAll()) {
    const url = urlByPath.get(record.relativeSourcePath.toLowerCase());
    if (!url) {
      if (import.meta.env.DEV) {
        // eslint-disable-next-line no-console -- dev-only missing-asset signal
        console.warn(
          `[libration:fonts] No Vite URL for bundled font source "${record.relativeSourcePath}" (id ${record.id})`,
        );
      }
      continue;
    }
    const family = canvasCssPrimaryFamilyForBundledRecord(record);
    const face = new FontFace(family, `url(${JSON.stringify(url)})`);
    tasks.push(
      face.load().then(() => {
        document.fonts.add(face);
      }),
    );
  }

  loadPromise = Promise.all(tasks).then(() => undefined);
  return loadPromise;
}

/** Test hook: reset module singleton between tests. */
export function resetBundledFontFaceLoaderForTests(): void {
  loadPromise = undefined;
}

/** Test hook: manifest-driven assertion that every shipped font has a Vite URL. */
export function assertManifestFontsHaveViteUrls(
  manifest: FontAssetManifest,
  urlByPath: Map<string, string>,
): void {
  for (const f of manifest.fonts) {
    if (!urlByPath.has(f.relativeSourcePath.toLowerCase())) {
      throw new Error(`Missing Vite URL for font source: ${f.relativeSourcePath} (id ${f.id})`);
    }
  }
}
