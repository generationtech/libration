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
 * Screen-space Earth-shadow directional cue for an active lunar eclipse.
 * Presentation only: orientation comes from existing E3 shadow offsets.
 * The cue terminates at the Moon; it is not a terrestrial path or beam.
 */

import type { EclipseAlignmentIntensityId } from "./eclipseAlignmentAppearance";
import { eclipseAlignmentIntensityScale } from "./eclipseAlignmentAppearance";
import { lunarEclipseMoonlightTransmission } from "./lunarEclipseMoonlightTransmission";
import type { LunarEclipseLiveGeometry } from "./lunarEclipseTypes";

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

/**
 * Continuous cue strength from disc/shadow coverage (1 − moonlight
 * transmission). Zero before P1 / after P4. Not a contact-label switch.
 */
export function lunarEarthShadowCueStrength01(
  geom: LunarEclipseLiveGeometry | null | undefined,
): number {
  if (!geom || geom.phase === "none") {
    return 0;
  }
  return clamp01(1 - lunarEclipseMoonlightTransmission(geom));
}

/** Outside-disc length in Moon radii. About 1.2–1.8 glyph diameters. */
export function lunarEarthShadowCueLengthMoonRadii(
  intensity: EclipseAlignmentIntensityId,
): number {
  const scale = eclipseAlignmentIntensityScale(intensity);
  return 2.4 * scale.width;
}

export type LunarEarthShadowCueAppearance = {
  readonly offsetEastMoonRadii: number;
  readonly offsetNorthMoonRadii: number;
  readonly strength01: number;
  readonly lengthMoonRadii: number;
  readonly alphaScale: number;
};
