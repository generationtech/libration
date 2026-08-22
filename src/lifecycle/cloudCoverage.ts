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
 * Clouds observational coverage is independent of derived cloud highlight.
 *
 * coverageMask: the provider has valid observational data at this pixel.
 * qualityWeight: how geometrically desirable that observation is (separate module).
 * cloudSignal:  the IR-derived highlight alpha for that valid observation.
 *
 * A valid-clear observation is coverage > 0 with cloudSignal == 0. That is
 * not the same as no-data (coverage == 0). Quality == 0 is also not no-data.
 * Provider alpha owns coverage; the highlight transfer must not redefine it;
 * viewing geometry must not punch coverage holes.
 */

import {
  applyCloudHighlightTransfer,
  type CloudHighlightTransferOptions,
} from "./cloudHighlightTransfer";

/**
 * Provider alpha at or above this value is valid coverage.
 * Production uses > 0 (any non-zero provider sample). GIBS disk edges are
 * typically A=64–128 on the last pixel; A=0 remains no-data. Do not treat
 * tiny interpolation alpha as a second policy unless a measured edge
 * artifact requires a higher floor.
 */
export const CLOUDS_COVERAGE_PROVIDER_ALPHA_MIN = 1;

export function providerAlphaHasCloudsCoverage(providerAlpha: number): boolean {
  return providerAlpha >= CLOUDS_COVERAGE_PROVIDER_ALPHA_MIN;
}

/**
 * One byte per pixel: 0 = no data, 255 = valid observation.
 * Reads provider alpha before any highlight transfer overwrites it.
 */
export function extractCloudsCoverageMask(providerRgba: Uint8Array): Uint8Array {
  const pixelCount = Math.floor(providerRgba.length / 4);
  const mask = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    mask[i] = providerAlphaHasCloudsCoverage(providerRgba[i * 4 + 3]!) ? 255 : 0;
  }
  return mask;
}

/**
 * Authoritative clear: the source owns this pixel and reports no cloud.
 * Distinct from no-data, which is also cloudSignal == 0.
 */
export function isCloudsAuthoritativeClear(
  coverage: number,
  cloudSignalAlpha: number,
): boolean {
  return coverage > 0 && cloudSignalAlpha === 0;
}

export type CloudsSourcePlanes = Readonly<{
  coverageMask: Uint8Array;
  cloudRgba: Uint8Array;
}>;

/**
 * Split a provider RGBA IR raster into coverage and derived cloud signal.
 * Coverage is taken from provider alpha; cloud signal uses the existing
 * IR highlight transfer (unchanged appearance curve).
 */
export function materializeCloudsSourcePlanes(
  providerRgba: Uint8Array,
  options: CloudHighlightTransferOptions = {},
): CloudsSourcePlanes {
  const coverageMask = extractCloudsCoverageMask(providerRgba);
  const cloudRgba = applyCloudHighlightTransfer(providerRgba, options);
  return { coverageMask, cloudRgba };
}
