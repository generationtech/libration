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
 * Per-provider display interpretation into canonical display IR.
 *
 * Provider differences belong here. Shared cloud-confidence transfer runs
 * after this, once. Do not bury calibration in Canvas or in Rec.601 luma.
 *
 * GIBS Band13: chromatic → 64³ colormap LUT; near-gray → warm-gray luma
 * branch. Meteosat IR108 and the EUMET ring use identity grayscale
 * (cold bright / warm dark). Production does not apply a ring black-point.
 *
 * canonicalIR01: 0 = warm / surface-like / low cloud evidence;
 *                1 = cold / high-cloud-like / strong cloud evidence.
 * This is not brightness temperature unless a later product inverts a
 * numeric field.
 */

import { canonicalIR01FromGibsRgb } from "./gibsBand13ColorMap";

export const CLOUD_IR_INTERPRETATION_KINDS = [
  "gibsBand13ColorMap",
  "meteosatIr108Gray",
  "eumetRingIr108Gray",
] as const;

export type CloudIrInterpretationKind = (typeof CLOUD_IR_INTERPRETATION_KINDS)[number];

/**
 * Former EUMET-ring black-point (LIB-071). Kept only for DEV comparison
 * (`cloudsRingCalibration=bp56`). Production uses identity grayscale.
 */
export const LEGACY_EUMET_RING_CANONICAL_IR_BLACK = 56;

export type RingCalibrationId = "identity" | "bp56";

export const PRODUCTION_RING_CALIBRATION_ID: RingCalibrationId = "identity";

let devRingCalibrationOverride: RingCalibrationId | null = null;

export function setDevRingCalibrationOverride(id: RingCalibrationId | null): void {
  devRingCalibrationOverride = id;
}

export function getActiveRingCalibration(): RingCalibrationId {
  return devRingCalibrationOverride ?? PRODUCTION_RING_CALIBRATION_ID;
}

export function parseRingCalibrationId(
  raw: string | null | undefined,
): RingCalibrationId | null {
  if (raw == null || raw === "") return null;
  const v = raw.trim().toLowerCase();
  if (v === "identity" || v === "bp0" || v === "production") return "identity";
  if (v === "bp56" || v === "legacy") return "bp56";
  return null;
}

export function isCloudIrInterpretationKind(
  value: unknown,
): value is CloudIrInterpretationKind {
  return (
    typeof value === "string" &&
    (CLOUD_IR_INTERPRETATION_KINDS as readonly string[]).includes(value)
  );
}

export function rec601Luma8(r: number, g: number, b: number): number {
  return Math.round(0.299 * r + 0.587 * g + 0.114 * b);
}

function clamp01(x: number): number {
  if (!Number.isFinite(x)) return 0;
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  return x;
}

/**
 * Meteosat `msg_fes:ir108` is inverted grayscale (cold bright / warm dark).
 * Identity into canonicalIR: luma 0 → 0, luma 255 → 1. No leftover +20 lift.
 */
export function canonicalIR01FromMeteosatIr108Gray(luma: number): number {
  if (!Number.isFinite(luma)) return 0;
  return clamp01(luma / 255);
}

/**
 * EUMET `mumi:worldcloudmap_ir108` grayscale. Same polarity and stretch as
 * Meteosat FES: identity luma/255. The former BP56 offset suppressed ordinary
 * cloud below the shared 0.30 confidence floor; the floor already keeps
 * typical clear (luma ~63–73) at confidence 0.
 */
export function canonicalIR01FromEumetRingIr108Gray(luma: number): number {
  if (!Number.isFinite(luma)) return 0;
  if (getActiveRingCalibration() === "bp56") {
    return clamp01(
      (luma - LEGACY_EUMET_RING_CANONICAL_IR_BLACK) /
        (255 - LEGACY_EUMET_RING_CANONICAL_IR_BLACK),
    );
  }
  return canonicalIR01FromMeteosatIr108Gray(luma);
}

export function canonicalIR01FromProviderRgb(
  kind: CloudIrInterpretationKind,
  r: number,
  g: number,
  b: number,
): number {
  if (kind === "gibsBand13ColorMap") {
    return canonicalIR01FromGibsRgb(r, g, b);
  }
  const luma = rec601Luma8(r, g, b);
  if (kind === "eumetRingIr108Gray") {
    return canonicalIR01FromEumetRingIr108Gray(luma);
  }
  return canonicalIR01FromMeteosatIr108Gray(luma);
}
