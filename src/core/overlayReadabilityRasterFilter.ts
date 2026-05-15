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
 * Maps derived overlay readability (solar night veil) to a bounded CSS filter fragment for
 * full-viewport raster {@link imageBlit} items. Execution stays in the canvas executor; values are
 * resolved upstream on the payload / plan builder only.
 */

export function mergeCssFilterParts(a: string | undefined, b: string | undefined): string | undefined {
  const parts = [a, b].filter((s) => s !== undefined && String(s).trim() !== "") as string[];
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join(" ");
}

export type OverlayReadabilityCssFilterOptions = Readonly<{
  /**
   * Attenuates lift when the base map is already bright/contrasted (substrate-aware readability).
   * Defaults to 1.
   */
  liftScale01?: number;
}>;

/**
 * Small brightness/contrast lift when `nightVeil01` is high so static overlays stay readable
 * over darkened substrate; no-op near zero veil.
 */
export function overlayReadabilityCssFilterAppend(
  nightVeil01: number,
  options?: OverlayReadabilityCssFilterOptions,
): string | undefined {
  if (!Number.isFinite(nightVeil01)) {
    return undefined;
  }
  const rawLift = Math.max(0, Math.min(1, nightVeil01));
  const liftScale = Math.max(0, Math.min(1, options?.liftScale01 ?? 1));
  const v = rawLift * liftScale;
  if (v < 1e-4) {
    return undefined;
  }
  const brightness = 1 + 0.14 * v;
  const contrast = 1 + 0.12 * v;
  return `brightness(${brightness.toFixed(3)}) contrast(${contrast.toFixed(3)})`;
}
