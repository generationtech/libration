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
 * One product-UTC astronomical state for the planetary illumination raster.
 * Solar, lunar, and lunar-eclipse transmission are evaluated together so a
 * frame cannot mix a new subsolar point with a stale moonlight scalar.
 */

import type { LunarEclipseLiveGeometry } from "./eclipse/lunarEclipseTypes";
import { lunarEclipseMoonlightTransmission } from "./eclipse/lunarEclipseMoonlightTransmission";
import { approximateLunarPhase } from "./lunarPhase";
import { sublunarPoint } from "./sublunarPoint";
import { subsolarPoint } from "./subsolarPoint";

export type IlluminationFrameState = {
  readonly productUtcMs: number;
  readonly subsolarLatDeg: number;
  readonly subsolarLonDeg: number;
  readonly sublunarLatDeg: number;
  readonly sublunarLonDeg: number;
  readonly lunarIlluminatedFraction: number;
  /** 0–1 scalar on ordinary moonlight; 1 when no lunar eclipse is active. */
  readonly moonlightTransmission01: number;
};

export function buildIlluminationFrameState(
  productUtcMs: number,
  lunarGeometry: LunarEclipseLiveGeometry | null | undefined,
): IlluminationFrameState {
  const sun = subsolarPoint(productUtcMs);
  const moon = sublunarPoint(productUtcMs);
  const phase = approximateLunarPhase(productUtcMs);
  return {
    productUtcMs,
    subsolarLatDeg: sun.latDeg,
    subsolarLonDeg: sun.lonDeg,
    sublunarLatDeg: moon.latDeg,
    sublunarLonDeg: moon.lonDeg,
    lunarIlluminatedFraction: phase.illuminatedFraction,
    moonlightTransmission01: lunarEclipseMoonlightTransmission(lunarGeometry),
  };
}

/**
 * Deterministic identity of the time-varying astronomy that feeds one raster
 * build. There is no illumination time bucket; the identity changes with the
 * exact product instant.
 */
export function illuminationAstronomyIdentity(state: IlluminationFrameState): string {
  return [
    state.productUtcMs,
    state.subsolarLatDeg.toFixed(6),
    state.subsolarLonDeg.toFixed(6),
    state.sublunarLatDeg.toFixed(6),
    state.sublunarLonDeg.toFixed(6),
    state.lunarIlluminatedFraction.toFixed(6),
    state.moonlightTransmission01.toFixed(8),
  ].join("|");
}
