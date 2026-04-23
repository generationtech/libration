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
 * Runtime equirect base map URLs that failed to decode (4xx, etc.). Drives
 * {@link import("../config/baseMapAssetResolve").resolveEquirectBaseMapImageSrc} exclusion
 * for month lookback and global fallbacks — local to the base map path only.
 */
const equirectBaseMapImageLoadFailures = new Set<string>();

export function addEquirectBaseMapImageLoadFailure(src: string): void {
  const t = src.trim();
  if (t !== "") {
    equirectBaseMapImageLoadFailures.add(t);
  }
}

export function getEquirectBaseMapImageSrcExclusionSetForResolve(): ReadonlySet<string> {
  return equirectBaseMapImageLoadFailures;
}

export function __clearEquirectBaseMapImageExclusionsForTests(): void {
  equirectBaseMapImageLoadFailures.clear();
}
