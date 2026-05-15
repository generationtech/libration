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
 * Upstream heuristic: scale overlay readability lift (cssFilter + vector strokes) from the
 * resolved base-map presentation and optional catalog capabilities. No raster sampling.
 */

import type { BaseMapPresentationConfig } from "../config/baseMapPresentation";

/** Optional coarse hints from {@link BaseMapCatalogEntry.capabilities}. */
export type SubstrateReadabilityCatalogHint = Readonly<{
  /** Substrate already tuned for overlays — attenuate extra lift slightly. */
  overlayOptimized?: boolean;
  /** Intentionally dark-friendly substrate — allow a touch more lift (capped at 1). */
  darkFriendly?: boolean;
  /** Topo/hillshade-style relief (catalog `capabilities.reliefShaded`). */
  reliefShaded?: boolean;
  /** Dense linework substrate (catalog `capabilities.boundaryDense`). */
  boundaryDense?: boolean;
}>;

/** Upper bound on combined (presentation + intrinsic catalog) readability penalty → lift floor. */
export const SUBSTRATE_OVERLAY_READABILITY_COMBINED_PENALTY_MAX = 0.78;

/** Minimum overlay lift scale so vectors stay usable on bright bases. */
export const SUBSTRATE_OVERLAY_READABILITY_LIFT_SCALE_MIN = 0.35;

/** Maximum overlay lift scale (full v1.1-style lift). */
export const SUBSTRATE_OVERLAY_READABILITY_LIFT_SCALE_MAX = 1;

function clamp01(x: number): number {
  if (!Number.isFinite(x)) {
    return 0;
  }
  return Math.max(0, Math.min(1, x));
}

/** User dimming (brightness below default) reduces presentation-derived penalty so overlays retain lift. */
const PRESENTATION_DIMMING_STRENGTH = 0.42;
/** Normalize dimming so mid-range pulls are perceptible before hitting zero brightness. */
const PRESENTATION_DIMMING_BRIGHTNESS_SPAN = 0.85;

/**
 * Maps excess presentation above defaults to a reduction factor, before intrinsic catalog penalties.
 * Defaults (brightness/contrast/gamma/saturation all 1) yield 0.
 * Brightness **below** 1 scales the penalty down (more overlay lift on dimmed bases).
 */
export function substratePresentationReadabilityPenalty01(
  presentation: BaseMapPresentationConfig,
): number {
  const b = Math.max(0, presentation.brightness - 1);
  const c = Math.max(0, presentation.contrast - 1);
  const g = Math.max(0, presentation.gamma - 1);
  const s = Math.max(0, presentation.saturation - 1);
  let raw = 0.22 * b + 0.2 * c + 0.08 * g + 0.06 * s;
  const bright = Number.isFinite(presentation.brightness) ? presentation.brightness : 1;
  const dim01 = clamp01((1 - Math.min(1, bright)) / PRESENTATION_DIMMING_BRIGHTNESS_SPAN);
  raw *= 1 - PRESENTATION_DIMMING_STRENGTH * dim01;
  return Math.max(0, Math.min(SUBSTRATE_OVERLAY_READABILITY_COMBINED_PENALTY_MAX, raw));
}

/** Baseline penalty from catalog flags (applies even when presentation is neutral). */
export function intrinsicSubstrateReadabilityCatalogPenalty01(
  hint: SubstrateReadabilityCatalogHint | null | undefined,
): number {
  if (!hint) {
    return 0;
  }
  let p = 0;
  if (hint.reliefShaded) {
    p += 0.072;
  }
  if (hint.boundaryDense) {
    p += 0.055;
  }
  return Math.max(0, Math.min(0.18, p));
}

function catalogHintMultiplier(hint: SubstrateReadabilityCatalogHint | null | undefined): number {
  if (!hint) {
    return 1;
  }
  let m = 1;
  if (hint.overlayOptimized) {
    /** Stronger presentation penalty → less overlay lift on overlay-tuned substrates. */
    m *= 1.1;
  }
  if (hint.darkFriendly) {
    /** Slightly weaker penalty → a touch more lift on intentionally dark-friendly families. */
    m *= 0.95;
  }
  return Math.max(0.85, Math.min(1.25, m));
}

/**
 * 1 = apply full overlay readability lift at a given veil; lower values attenuate lift when the
 * base map is already bright / contrasted (presentation), catalog-marked (overlay tuning,
 * relief, dense linework), or a combination.
 */
export function deriveSubstrateOverlayReadabilityLiftScale01(
  presentation: BaseMapPresentationConfig,
  catalogHint?: SubstrateReadabilityCatalogHint | null,
): number {
  const presentationPenalty =
    substratePresentationReadabilityPenalty01(presentation) * catalogHintMultiplier(catalogHint);
  const intrinsicPenalty = intrinsicSubstrateReadabilityCatalogPenalty01(catalogHint);
  const combined = Math.min(SUBSTRATE_OVERLAY_READABILITY_COMBINED_PENALTY_MAX, intrinsicPenalty + presentationPenalty);
  const scale = 1 - clamp01(combined);
  return Math.max(
    SUBSTRATE_OVERLAY_READABILITY_LIFT_SCALE_MIN,
    Math.min(SUBSTRATE_OVERLAY_READABILITY_LIFT_SCALE_MAX, scale),
  );
}
