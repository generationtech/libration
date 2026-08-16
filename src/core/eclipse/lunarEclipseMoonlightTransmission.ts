/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

/**
 * Ordinary (white) moonlight transmission through Earth's shadow at the Moon.
 *
 * Coverage is the geometric fraction of the lunar apparent disc inside the
 * catalog penumbra and umbra circles. This is not atmospheric radiative
 * transfer and is independent of lunar phase.
 *
 *   transmission =
 *     (1 − penumbraFrac) · 1
 *     + (penumbraFrac − umbraFrac) · T_penumbra
 *     + umbraFrac · T_umbra
 *
 * T_penumbra is a slight reduction; T_umbra nearly extinguishes ordinary
 * white moonlight. Totality therefore follows full umbral coverage rather
 * than a contact-state switch.
 */

import { diskIntersectionFractionOfFirst } from "./circleOverlap";
import type { LunarEclipseLiveGeometry } from "./lunarEclipseTypes";

/** Residual ordinary moonlight while the disc is in penumbra only. */
export const LUNAR_ECLIPSE_PENUMBRA_TRANSMISSION = 0.78;
/** Residual ordinary moonlight while the disc is in umbra (including totality). */
export const LUNAR_ECLIPSE_UMBRA_TRANSMISSION = 0.05;

export type LunarEclipseDiscCoverage = {
  readonly penumbralCoverage01: number;
  readonly umbralCoverage01: number;
  readonly moonlightTransmission01: number;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function lunarEclipseDiscCoverage(
  geom: LunarEclipseLiveGeometry | null | undefined,
): LunarEclipseDiscCoverage {
  if (!geom || geom.phase === "none") {
    return {
      penumbralCoverage01: 0,
      umbralCoverage01: 0,
      moonlightTransmission01: 1,
    };
  }
  const k = geom.moonRadiusEarthRadii;
  const d = geom.axisDistanceEarthRadii;
  const penumbralCoverage01 = diskIntersectionFractionOfFirst(
    k,
    geom.penumbraRadiusEarthRadii,
    d,
  );
  const umbralCoverage01 =
    geom.umbraRadiusEarthRadii > 0
      ? diskIntersectionFractionOfFirst(k, geom.umbraRadiusEarthRadii, d)
      : 0;
  const penumbraOnly = Math.max(0, penumbralCoverage01 - umbralCoverage01);
  const uneclipsed = Math.max(0, 1 - penumbralCoverage01);
  const moonlightTransmission01 = clamp01(
    uneclipsed * 1 +
      penumbraOnly * LUNAR_ECLIPSE_PENUMBRA_TRANSMISSION +
      umbralCoverage01 * LUNAR_ECLIPSE_UMBRA_TRANSMISSION,
  );
  return { penumbralCoverage01, umbralCoverage01, moonlightTransmission01 };
}

export function lunarEclipseMoonlightTransmission(
  geom: LunarEclipseLiveGeometry | null | undefined,
): number {
  return lunarEclipseDiscCoverage(geom).moonlightTransmission01;
}
