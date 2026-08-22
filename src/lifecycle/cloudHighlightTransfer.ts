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
 * Cloud-highlight appearance from provider display rasters.
 *
 * Production path:
 *   provider RGB → provider-specific canonicalIR01 → shared cloud-confidence
 *   transfer → RGB (248,250,252) with alpha = confidence × provider alpha.
 *
 * GIBS Band13 (GOES-East/West/Himawari): chromatic pixels use the 64³ LUT;
 * near-gray pixels invert along the warm-gray legend. Meteosat and the EUMET
 * ring stay grayscale stretches. Coverage (provider has data) is extracted
 * separately from provider alpha.
 * Cloud-confidence 0 is valid-clear, not no-data. Do not use output alpha as
 * observational authority. Not a formal cloud mask, optical depth, or
 * brightness-temperature product.
 */

import {
  canonicalIR01FromProviderRgb,
  rec601Luma8,
  type CloudIrInterpretationKind,
} from "./cloudIrInterpretation";
import { getActiveCloudsDisplayTransferId } from "./cloudsDisplayTransfer";
import {
  getActiveGibsGrayInterpretation,
  isGibsBand13NearGray,
} from "./gibsBand13ColorMap";

/** Factory highlight colour: restrained cool-white. */
export const CLOUD_HIGHLIGHT_RGB = {
  r: 248,
  g: 250,
  b: 252,
} as const;

export const CLOUD_HIGHLIGHT_TRANSFER_VERSION = "wx54-gibs-gray-v3";
export const LEGACY_GIBS_GRAY_TRANSFER_VERSION = "wx54-gibs-gray-legacy";

export const LEGACY_WX3_CLOUD_HIGHLIGHT_TRANSFER_VERSION = "wx3-ir-v1";
export const LEGACY_WX3_LUMA_LO = 100;
export const LEGACY_WX3_LUMA_HI = 195;
export const LEGACY_WX3_EUMET_IR_LUMA_LIFT = 12;
export const LEGACY_WX3_MSG_FES_IR_LUMA_LIFT = 20;

/**
 * Shared cloud-confidence knots on canonicalIR01.
 * Conservative vs the former Rec.601 smoothstep(100,195): warm/surface-like
 * values stay at 0; obvious cloud rises; cold tops approach 1.
 *
 * Between adjacent knots, confidence is C1-shaped smoothstep in the IR
 * interval, then linearly mapped onto the confidence interval.
 *
 *   canonicalIR01 <= 0.30 → 0
 *   0.30 .. 0.40 → 0 .. 0.12   (weak)
 *   0.40 .. 0.52 → 0.12 .. 0.45 (obvious decks)
 *   0.52 .. 0.68 → 0.45 .. 0.82 (high cloud)
 *   0.68 .. 0.82 → 0.82 .. 0.97 (deep convection)
 *   0.82 .. 1.00 → 0.97 .. 1.00
 */
export const CLOUD_CONFIDENCE_KNOTS: readonly {
  readonly ir01: number;
  readonly confidence: number;
}[] = [
  { ir01: 0.0, confidence: 0.0 },
  { ir01: 0.3, confidence: 0.0 },
  { ir01: 0.4, confidence: 0.12 },
  { ir01: 0.52, confidence: 0.45 },
  { ir01: 0.68, confidence: 0.82 },
  { ir01: 0.82, confidence: 0.97 },
  { ir01: 1.0, confidence: 1.0 },
];

export type CloudHighlightOutputMode = "confidence" | "canonicalIR" | "gibsGrayPath";

/** DEV classification tints. Production compose never uses this output. */
const GIBS_GRAY_PATH_NEAR_RGB = [160, 200, 220] as const;
const GIBS_GRAY_PATH_CHROMATIC_RGB = [220, 70, 140] as const;

export type CloudHighlightTransferOptions = Readonly<{
  interpretation: CloudIrInterpretationKind;
  output?: CloudHighlightOutputMode;
}>;

function smoothstep01(edge0: number, edge1: number, x: number): number {
  if (edge1 <= edge0) return x >= edge1 ? 1 : 0;
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function cloudConfidence01FromCanonicalIR(canonicalIR01: number): number {
  if (!Number.isFinite(canonicalIR01)) return 0;
  const x = Math.max(0, Math.min(1, canonicalIR01));
  const knots = CLOUD_CONFIDENCE_KNOTS;
  if (x <= knots[0]!.ir01) return knots[0]!.confidence;
  const last = knots[knots.length - 1]!;
  if (x >= last.ir01) return last.confidence;
  for (let i = 0; i < knots.length - 1; i++) {
    const a = knots[i]!;
    const b = knots[i + 1]!;
    if (x <= b.ir01) {
      const s = smoothstep01(a.ir01, b.ir01, x);
      return a.confidence + s * (b.confidence - a.confidence);
    }
  }
  return last.confidence;
}

export function activeCloudsTransferVersion(
  output: CloudHighlightOutputMode = "confidence",
): string {
  const id = getActiveCloudsDisplayTransferId();
  if (id === "legacy") return LEGACY_WX3_CLOUD_HIGHLIGHT_TRANSFER_VERSION;
  if (id === "canonicalIR" || output === "canonicalIR") {
    return `${CLOUD_HIGHLIGHT_TRANSFER_VERSION}-canonicalIR`;
  }
  if (id === "gibsGrayPath" || output === "gibsGrayPath") {
    return `${CLOUD_HIGHLIGHT_TRANSFER_VERSION}-gibsGrayPath`;
  }
  if (getActiveGibsGrayInterpretation() === "legacyLut") {
    return LEGACY_GIBS_GRAY_TRANSFER_VERSION;
  }
  return CLOUD_HIGHLIGHT_TRANSFER_VERSION;
}

function liftLegacyLuma(luma: number, lift: number): number {
  if (!Number.isFinite(luma)) return 0;
  return Math.max(0, Math.min(255, luma + lift));
}

/**
 * Former production Rec.601 path. Kept for DEV side-by-side (`cloudsTransfer=legacy`)
 * and authority-identity tests. Not the production interpretation.
 */
export function legacyWx3CloudHighlightAlpha01FromIrLuma(luma: number): number {
  if (!Number.isFinite(luma)) return 0;
  return smoothstep01(LEGACY_WX3_LUMA_LO, LEGACY_WX3_LUMA_HI, luma);
}

export function applyLegacyWx3CloudHighlightTransferInPlace(
  rgba: Uint8Array,
  interpretation: CloudIrInterpretationKind,
): void {
  const { r: hr, g: hg, b: hb } = CLOUD_HIGHLIGHT_RGB;
  const lift =
    interpretation === "eumetRingIr108Gray"
      ? LEGACY_WX3_EUMET_IR_LUMA_LIFT
      : interpretation === "meteosatIr108Gray"
        ? LEGACY_WX3_MSG_FES_IR_LUMA_LIFT
        : 0;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const srcA = rgba[i + 3]!;
    if (srcA === 0) {
      rgba[i] = 0;
      rgba[i + 1] = 0;
      rgba[i + 2] = 0;
      continue;
    }
    const raw = rec601Luma8(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!);
    const cloud01 = legacyWx3CloudHighlightAlpha01FromIrLuma(liftLegacyLuma(raw, lift));
    rgba[i] = hr;
    rgba[i + 1] = hg;
    rgba[i + 2] = hb;
    rgba[i + 3] = Math.round(cloud01 * (srcA / 255) * 255);
  }
}

function resolveOutputMode(options: CloudHighlightTransferOptions): CloudHighlightOutputMode {
  if (options.output === "canonicalIR") return "canonicalIR";
  if (options.output === "gibsGrayPath") return "gibsGrayPath";
  const id = getActiveCloudsDisplayTransferId();
  if (id === "canonicalIR") return "canonicalIR";
  if (id === "gibsGrayPath") return "gibsGrayPath";
  return "confidence";
}

function resolveUseLegacy(options: CloudHighlightTransferOptions): boolean {
  if (options.output === "canonicalIR" || options.output === "gibsGrayPath") {
    return false;
  }
  return getActiveCloudsDisplayTransferId() === "legacy";
}

/**
 * In-place provider RGBA → white/gray cloud-highlight RGBA (or DEV canonical-IR gray).
 * Provider alpha 0 remains 0. Production RGB never carries a science palette.
 */
export function applyCloudHighlightTransferInPlace(
  rgba: Uint8Array,
  options: CloudHighlightTransferOptions,
): void {
  if (resolveUseLegacy(options)) {
    applyLegacyWx3CloudHighlightTransferInPlace(rgba, options.interpretation);
    return;
  }
  const output = resolveOutputMode(options);
  const { r: hr, g: hg, b: hb } = CLOUD_HIGHLIGHT_RGB;
  const kind = options.interpretation;
  for (let i = 0; i + 3 < rgba.length; i += 4) {
    const srcA = rgba[i + 3]!;
    if (srcA === 0) {
      rgba[i] = 0;
      rgba[i + 1] = 0;
      rgba[i + 2] = 0;
      continue;
    }
    const srcR = rgba[i]!;
    const srcG = rgba[i + 1]!;
    const srcB = rgba[i + 2]!;
    if (output === "gibsGrayPath") {
      if (kind === "gibsBand13ColorMap") {
        if (isGibsBand13NearGray(srcR, srcG, srcB)) {
          rgba[i] = GIBS_GRAY_PATH_NEAR_RGB[0];
          rgba[i + 1] = GIBS_GRAY_PATH_NEAR_RGB[1];
          rgba[i + 2] = GIBS_GRAY_PATH_NEAR_RGB[2];
        } else {
          rgba[i] = GIBS_GRAY_PATH_CHROMATIC_RGB[0];
          rgba[i + 1] = GIBS_GRAY_PATH_CHROMATIC_RGB[1];
          rgba[i + 2] = GIBS_GRAY_PATH_CHROMATIC_RGB[2];
        }
      } else {
        const g = rec601Luma8(srcR, srcG, srcB);
        rgba[i] = g;
        rgba[i + 1] = g;
        rgba[i + 2] = g;
      }
      rgba[i + 3] = srcA;
      continue;
    }
    const ir01 = canonicalIR01FromProviderRgb(kind, srcR, srcG, srcB);
    if (output === "canonicalIR") {
      const g = Math.round(ir01 * 255);
      rgba[i] = g;
      rgba[i + 1] = g;
      rgba[i + 2] = g;
      rgba[i + 3] = srcA;
      continue;
    }
    const cloud01 = cloudConfidence01FromCanonicalIR(ir01);
    rgba[i] = hr;
    rgba[i + 1] = hg;
    rgba[i + 2] = hb;
    rgba[i + 3] = Math.round(cloud01 * (srcA / 255) * 255);
  }
}

export function applyLegacyWx3CloudHighlightTransfer(
  rgba: Uint8Array,
  interpretation: CloudIrInterpretationKind,
): Uint8Array {
  const out = rgba.slice();
  applyLegacyWx3CloudHighlightTransferInPlace(out, interpretation);
  return out;
}

export function applyCloudHighlightTransfer(
  rgba: Uint8Array,
  options: CloudHighlightTransferOptions,
): Uint8Array {
  const out = rgba.slice();
  applyCloudHighlightTransferInPlace(out, options);
  return out;
}

export { rec601Luma8 };
