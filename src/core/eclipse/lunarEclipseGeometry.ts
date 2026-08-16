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
 * Circular Earth-shadow geometry at the Moon from NASA catalog magnitudes,
 * gamma, and contact durations (LIB-013). Canvas must not evaluate this.
 *
 * Moon radius k = 0.2725076 (IAU value used by the NASA lunar canon).
 * Danjon umbral enlargement is already in the published magnitudes, so recovered
 * f1/f2 include it. Contact instants stored on the event remain the authority;
 * this module interpolates separation with constant along-track speed.
 */

import type {
  LunarEclipseEvent,
  LunarEclipseLiveGeometry,
  LunarEclipsePhase,
} from "./lunarEclipseTypes";

/** IAU Moon/Earth equatorial radius ratio used by NASA's lunar canon. */
export const IAU_MOON_EARTH_RADIUS_RATIO = 0.2725076;

function recoveredShadowRadii(event: LunarEclipseEvent): {
  f1: number;
  f2: number;
  k: number;
} {
  const k = IAU_MOON_EARTH_RADIUS_RATIO;
  const absG = Math.abs(event.gamma);
  const f1 = k * (2 * event.penumbralMagnitude - 1) + absG;
  const f2 = k * (2 * event.umbralMagnitude - 1) + absG;
  return { f1, f2, k };
}

function alongTrackSpeedEarthRadiiPerMs(event: LunarEclipseEvent): number {
  const { f1, k } = recoveredShadowRadii(event);
  const absG = Math.abs(event.gamma);
  const dP1 = f1 + k;
  const xP1 = Math.sqrt(Math.max(0, dP1 * dP1 - absG * absG));
  const halfPenMs =
    event.p1UtcMs !== null && event.p4UtcMs !== null
      ? (event.p4UtcMs - event.p1UtcMs) / 2
      : event.penumbralDurationMinutes !== null
        ? (event.penumbralDurationMinutes * 60_000) / 2
        : null;
  if (halfPenMs !== null && halfPenMs > 0 && xP1 > 0) {
    return xP1 / halfPenMs;
  }
  const { f2 } = recoveredShadowRadii(event);
  const dU1 = f2 + k;
  const xU1 = Math.sqrt(Math.max(0, dU1 * dU1 - absG * absG));
  const halfParMs =
    event.u1UtcMs !== null && event.u4UtcMs !== null
      ? (event.u4UtcMs - event.u1UtcMs) / 2
      : event.partialDurationMinutes !== null
        ? (event.partialDurationMinutes * 60_000) / 2
        : null;
  if (halfParMs !== null && halfParMs > 0 && xU1 > 0) {
    return xU1 / halfParMs;
  }
  return 0;
}

function phaseFromDistances(d: number, f1: number, f2: number, k: number): LunarEclipsePhase {
  if (d >= f1 + k - 1e-9) {
    return "none";
  }
  if (d >= f2 + k - 1e-9) {
    return "penumbral";
  }
  if (f2 > k && d <= f2 - k + 1e-9) {
    return "total-umbral";
  }
  return "partial-umbral";
}

export function lunarEclipseGeometryAt(
  event: LunarEclipseEvent,
  utcMs: number,
): LunarEclipseLiveGeometry {
  const { f1, f2, k } = recoveredShadowRadii(event);
  const absG = Math.abs(event.gamma);
  const v = alongTrackSpeedEarthRadiiPerMs(event);
  const alongTrackEarthRadii = v * (utcMs - event.greatestEclipseUtcMs);
  const axisDistanceEarthRadii = Math.sqrt(
    absG * absG + alongTrackEarthRadii * alongTrackEarthRadii,
  );
  const penumbralMagnitude = (f1 + k - axisDistanceEarthRadii) / (2 * k);
  const umbralMagnitude = (f2 + k - axisDistanceEarthRadii) / (2 * k);
  return {
    phase: phaseFromDistances(axisDistanceEarthRadii, f1, f2, k),
    gamma: event.gamma,
    axisDistanceEarthRadii,
    alongTrackEarthRadii,
    penumbraRadiusEarthRadii: f1,
    umbraRadiusEarthRadii: f2,
    moonRadiusEarthRadii: k,
    penumbralMagnitude,
    umbralMagnitude,
    shadowOffsetEastMoonRadii: -alongTrackEarthRadii / k,
    shadowOffsetNorthMoonRadii: -event.gamma / k,
    penumbraRadiusMoonRadii: f1 / k,
    umbraRadiusMoonRadii: f2 / k,
  };
}
