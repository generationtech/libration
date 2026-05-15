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

  it("applies overlayOptimized catalog hint", () => {
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
