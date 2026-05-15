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
 * Composition-aware overlay readability frame: derives terminator / night veil signals from
 * subsolar geometry only (v1 — no emissive sampling, no SceneConfig fields).
 */

import { illuminationNightVeil01FromSolarAltitudeDeg } from "./nightVeilFromSolarAltitude";
import { subsolarPoint } from "./subsolarPoint";
import { solarAltitudeDegFromSurfaceSunDotProduct } from "./solarTwilight";

const SAMPLE_LAT_DEG = [-67.5, -22.5, 22.5, 67.5] as const;
const SAMPLE_LON_DEG = [-135, -45, 45, 135] as const;

/** Per-frame subsolar-derived veil field for overlay legibility; may be attached on the render tick time object. */
export interface OverlayReadabilityFrame {
  readonly globalNightVeil01: number;
  nightVeil01At(latDeg: number, lonDeg: number): number;
}

function surfaceSunDotProduct(
  latDeg: number,
  lonDeg: number,
  subsolarLatDeg: number,
  subsolarLonDeg: number,
): number {
  const lat = (latDeg * Math.PI) / 180;
  const lon = (lonDeg * Math.PI) / 180;
  const latS = (subsolarLatDeg * Math.PI) / 180;
  const lonS = (subsolarLonDeg * Math.PI) / 180;
  return (
    Math.cos(lat) * Math.cos(latS) * Math.cos(lon - lonS) + Math.sin(lat) * Math.sin(latS)
  );
}

/**
 * Global average night veil (coarse lat/lon samples) plus point queries for markers.
 */
export function computeOverlayReadabilityFrameFromTimeMs(nowMs: number): OverlayReadabilityFrame {
  const { latDeg: subLat, lonDeg: subLon } = subsolarPoint(nowMs);
  let sum = 0;
  let n = 0;
  for (const lat of SAMPLE_LAT_DEG) {
    for (const lon of SAMPLE_LON_DEG) {
      const d = surfaceSunDotProduct(lat, lon, subLat, subLon);
      const alt = solarAltitudeDegFromSurfaceSunDotProduct(d);
      sum += illuminationNightVeil01FromSolarAltitudeDeg(alt);
      n += 1;
    }
  }
  const globalNightVeil01 = n > 0 ? sum / n : 0;
  return {
    globalNightVeil01,
    nightVeil01At(latDeg: number, lonDeg: number): number {
      const d = surfaceSunDotProduct(latDeg, lonDeg, subLat, subLon);
      return illuminationNightVeil01FromSolarAltitudeDeg(solarAltitudeDegFromSurfaceSunDotProduct(d));
    },
  };
}

/**
 * Reuses `overlayReadabilityFrame` on the time object when the shell attached one for this tick;
 * otherwise computes from `now` (for tests and narrow callers).
 */
export function getOverlayReadabilityFrameOrCompute(time: {
  now: number;
  overlayReadabilityFrame?: OverlayReadabilityFrame;
}): OverlayReadabilityFrame {
  return time.overlayReadabilityFrame ?? computeOverlayReadabilityFrameFromTimeMs(time.now);
}
