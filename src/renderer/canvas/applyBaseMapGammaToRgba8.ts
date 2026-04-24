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
 * Deterministic per-channel **display-style gamma adjustment** on sRGB 8-bit samples in place.
 *
 * For each R/G/B byte `c` (0–255), the transform is:
 *
 * ```txt
 * c' = round( clamp( (c / 255)^γ, 0, 1 ) * 255 )
 * ```
 *
 * - **α is unchanged** (byte-for-byte).
 * - **γ = 1** is a no-op.
 * - **γ &lt; 1** brightens (lifts) midtones: e.g. mid gray moves toward white.
 * - **γ &gt; 1** deepens (darkens) midtones: e.g. mid gray moves toward black.
 *
 * This matches common “gamma” sliders in imaging tools: raise γ to add weight in darks (e.g. bring
 * out detail on Blue Marble) or lower γ to open shadows.
 */
export function applyBaseMapGammaToRgba8(
  rgba: Uint8ClampedArray,
  gamma: number,
): void {
  if (gamma === 1 || !Number.isFinite(gamma)) {
    return;
  }
  const n = rgba.length;
  for (let i = 0; i < n; i += 4) {
    const a = rgba[i + 3] ?? 255;
    if (a === 0) {
      continue;
    }
    for (const ch of [0, 1, 2] as const) {
      const c = rgba[i + ch]!;
      const t = c / 255;
      const o = 255 * Math.max(0, Math.min(1, Math.pow(t, gamma)));
      rgba[i + ch] = Math.round(o);
    }
  }
}
