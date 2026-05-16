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

import { describe, expect, it } from "vitest";
import {
  DEFAULT_BASE_MAP_PRESENTATION,
} from "../config/baseMapPresentation";
import {
  SUBSTRATE_OVERLAY_READABILITY_LIFT_SCALE_MIN,
  deriveSubstrateOverlayReadabilityLiftScale01,
  intrinsicSubstrateReadabilityCatalogPenalty01,
  substratePresentationReadabilityPenalty01,
} from "./substrateOverlayReadabilityLiftScale";

describe("substratePresentationReadabilityPenalty01", () => {
  it("is zero at default presentation", () => {
    expect(substratePresentationReadabilityPenalty01(DEFAULT_BASE_MAP_PRESENTATION)).toBe(0);
  });

  it("increases with brightness and contrast above 1", () => {
    const a = substratePresentationReadabilityPenalty01({
      ...DEFAULT_BASE_MAP_PRESENTATION,
      brightness: 1.2,
    });
    const b = substratePresentationReadabilityPenalty01({
      ...DEFAULT_BASE_MAP_PRESENTATION,
      brightness: 1.2,
      contrast: 1.3,
    });
    expect(b).toBeGreaterThan(a);
  });

  it("reduces penalty when brightness is below 1 (dimmed base)", () => {
    const boosted = {
      brightness: 1.35,
      contrast: 1.25,
      gamma: 1,
      saturation: 1,
    };
    const brightPenalty = substratePresentationReadabilityPenalty01(boosted);
    const dimmedPenalty = substratePresentationReadabilityPenalty01({
      ...boosted,
      brightness: 0.55,
    });
    expect(dimmedPenalty).toBeLessThan(brightPenalty);
  });
});

describe("intrinsicSubstrateReadabilityCatalogPenalty01", () => {
  it("is zero without hints", () => {
    expect(intrinsicSubstrateReadabilityCatalogPenalty01(undefined)).toBe(0);
    expect(intrinsicSubstrateReadabilityCatalogPenalty01({})).toBe(0);
  });

  it("accumulates bounded penalties for relief, boundary-dense, chromatic-dense, bathymetry, fine-scale texture, label-dense, and etched-relief flags", () => {
    expect(intrinsicSubstrateReadabilityCatalogPenalty01({ reliefShaded: true })).toBeCloseTo(0.072, 10);
    expect(intrinsicSubstrateReadabilityCatalogPenalty01({ boundaryDense: true })).toBeCloseTo(0.055, 10);
    expect(intrinsicSubstrateReadabilityCatalogPenalty01({ chromaticDense: true })).toBeCloseTo(0.05, 10);
    expect(intrinsicSubstrateReadabilityCatalogPenalty01({ bathymetryShaded: true })).toBeCloseTo(0.048, 10);
    expect(intrinsicSubstrateReadabilityCatalogPenalty01({ fineScaleTexture: true })).toBeCloseTo(0.04, 10);
    expect(intrinsicSubstrateReadabilityCatalogPenalty01({ labelDense: true })).toBeCloseTo(0.052, 10);
    expect(intrinsicSubstrateReadabilityCatalogPenalty01({ etchedReliefDense: true })).toBeCloseTo(0.046, 10);
    expect(
      intrinsicSubstrateReadabilityCatalogPenalty01({ reliefShaded: true, boundaryDense: true }),
    ).toBeCloseTo(0.127, 10);
    expect(
      intrinsicSubstrateReadabilityCatalogPenalty01({
        reliefShaded: true,
        boundaryDense: true,
        chromaticDense: true,
      }),
    ).toBeCloseTo(0.177, 10);
    expect(
      intrinsicSubstrateReadabilityCatalogPenalty01({
        reliefShaded: true,
        bathymetryShaded: true,
      }),
    ).toBeCloseTo(0.12, 10);
    expect(
      intrinsicSubstrateReadabilityCatalogPenalty01({
        reliefShaded: true,
        fineScaleTexture: true,
      }),
    ).toBeCloseTo(0.112, 10);
  });

  it("caps intrinsic catalog penalties at 0.18 when all intrinsic flags are set", () => {
    expect(
      intrinsicSubstrateReadabilityCatalogPenalty01({
        reliefShaded: true,
        boundaryDense: true,
        chromaticDense: true,
        bathymetryShaded: true,
        fineScaleTexture: true,
        labelDense: true,
        etchedReliefDense: true,
      }),
    ).toBeCloseTo(0.18, 10);
  });
});

describe("deriveSubstrateOverlayReadabilityLiftScale01", () => {
  it("returns 1 for default presentation without catalog hint", () => {
    expect(deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION)).toBe(1);
  });

  it("clamps to minimum for extreme presentation boosts", () => {
    const s = deriveSubstrateOverlayReadabilityLiftScale01(
      {
        brightness: 2,
        contrast: 2,
        gamma: 2.5,
        saturation: 2,
      },
      { overlayOptimized: true },
    );
    expect(s).toBe(SUBSTRATE_OVERLAY_READABILITY_LIFT_SCALE_MIN);
  });

  it("scales below 1 at neutral presentation when relief, boundary, chromatic, bathymetry, fine-scale texture, label-dense, or etched-relief hints are set", () => {
    const r = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      reliefShaded: true,
    });
    const d = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      boundaryDense: true,
    });
    const c = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      chromaticDense: true,
    });
    const bathy = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      bathymetryShaded: true,
    });
    const fine = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      fineScaleTexture: true,
    });
    const labels = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      labelDense: true,
    });
    const etched = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      etchedReliefDense: true,
    });
    expect(r).toBeCloseTo(1 - 0.072, 10);
    expect(d).toBeCloseTo(1 - 0.055, 10);
    expect(c).toBeCloseTo(1 - 0.05, 10);
    expect(bathy).toBeCloseTo(1 - 0.048, 10);
    expect(fine).toBeCloseTo(1 - 0.04, 10);
    expect(labels).toBeCloseTo(1 - 0.052, 10);
    expect(etched).toBeCloseTo(1 - 0.046, 10);
  });

  it("combines chromatic and label-dense like political/geology families at neutral presentation", () => {
    const scale = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      chromaticDense: true,
      labelDense: true,
    });
    expect(scale).toBeCloseTo(1 - 0.05 - 0.052, 10);
  });

  it("combines relief and bathymetry like Blue Marble TB at neutral presentation", () => {
    const scale = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      reliefShaded: true,
      bathymetryShaded: true,
    });
    expect(scale).toBeCloseTo(1 - 0.12, 10);
  });

  it("combines relief and fine-scale texture like Blue Marble T at neutral presentation", () => {
    const scale = deriveSubstrateOverlayReadabilityLiftScale01(DEFAULT_BASE_MAP_PRESENTATION, {
      reliefShaded: true,
      fineScaleTexture: true,
    });
    expect(scale).toBeCloseTo(1 - 0.112, 10);
  });

  it("preserves more lift on dimmed bases than on bright bases for same contrast boost", () => {
    const shared = { contrast: 1.4, gamma: 1, saturation: 1 };
    const bright = deriveSubstrateOverlayReadabilityLiftScale01({
      brightness: 1.25,
      ...shared,
    });
    const dimmed = deriveSubstrateOverlayReadabilityLiftScale01({
      brightness: 0.6,
      ...shared,
    });
    expect(dimmed).toBeGreaterThan(bright);
  });

  it("applies overlayOptimized catalog hint on presentation boosts", () => {
    const base = deriveSubstrateOverlayReadabilityLiftScale01({
      brightness: 1.4,
      contrast: 1,
      gamma: 1,
      saturation: 1,
    });
    const opt = deriveSubstrateOverlayReadabilityLiftScale01(
      { brightness: 1.4, contrast: 1, gamma: 1, saturation: 1 },
      { overlayOptimized: true },
    );
    expect(opt).toBeLessThan(base);
  });
});
