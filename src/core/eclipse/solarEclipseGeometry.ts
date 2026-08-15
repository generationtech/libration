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

import { evaluateBesselianElements } from "./besselianElements";
import {
  centralPathWidthKm,
  isCentralShadowOnEarth,
  penumbraIntersectsEarth,
  shadowAxisIntersection,
  shadowOutlineRing,
  umbralRadiusInObserverPlane,
  type GeographicPoint,
} from "./besselianGeographic";
import type {
  CentralShadowKind,
  SolarEclipseEvent,
  SolarEclipseLiveGeometry,
} from "./solarEclipseTypes";

const CENTERLINE_STEP_MS = 120_000;
const centerlineCache = new Map<string, readonly GeographicPoint[]>();

function sampleCenterline(event: SolarEclipseEvent): readonly GeographicPoint[] {
  const cached = centerlineCache.get(event.id);
  if (cached) {
    return cached;
  }
  if (event.subtype === "partial") {
    centerlineCache.set(event.id, []);
    return [];
  }
  const pts: GeographicPoint[] = [];
  for (let t = event.globalStartMs; t <= event.globalEndMs; t += CENTERLINE_STEP_MS) {
    const el = evaluateBesselianElements(event.besselian, t);
    if (!el.insideElementWindow || !isCentralShadowOnEarth(el)) {
      continue;
    }
    const hit = shadowAxisIntersection(el);
    if (hit?.onEarth) {
      pts.push({ latDeg: hit.latDeg, lonDeg: hit.lonDeg });
    }
  }
  const ge = evaluateBesselianElements(event.besselian, event.greatestEclipseUtcMs);
  const geHit = isCentralShadowOnEarth(ge) ? shadowAxisIntersection(ge) : null;
  if (geHit?.onEarth && pts.length > 0) {
    let nearest = 0;
    let best = Infinity;
    for (let i = 0; i < pts.length; i += 1) {
      const d = Math.hypot(pts[i]!.latDeg - geHit.latDeg, pts[i]!.lonDeg - geHit.lonDeg);
      if (d < best) {
        best = d;
        nearest = i;
      }
    }
    pts.splice(nearest, 0, { latDeg: geHit.latDeg, lonDeg: geHit.lonDeg });
  }
  centerlineCache.set(event.id, pts);
  return pts;
}

export function solarEclipseGeometryAt(
  event: SolarEclipseEvent,
  utcMs: number,
): SolarEclipseLiveGeometry | null {
  if (utcMs < event.globalStartMs || utcMs > event.globalEndMs) {
    return null;
  }
  const el = evaluateBesselianElements(event.besselian, utcMs);
  if (!el.insideElementWindow || !penumbraIntersectsEarth(el)) {
    return null;
  }
  const axis = isCentralShadowOnEarth(el) ? shadowAxisIntersection(el) : null;
  const hasCentral = axis?.onEarth === true && event.subtype !== "partial";
  let centralShadowKind: CentralShadowKind | null = null;
  let centralBand: readonly GeographicPoint[] = [];
  let pathWidthKm: number | null = null;
  if (hasCentral && axis) {
    const l2p = umbralRadiusInObserverPlane(el, axis.zeta);
    centralShadowKind = l2p < 0 ? "umbra" : "antumbra";
    centralBand = shadowOutlineRing(el, "umbra", 3);
    const w = centralPathWidthKm(el, axis.zeta, axis.rho);
    pathWidthKm = Number.isFinite(w) ? w : null;
  }
  const partialRegion = shadowOutlineRing(el, "penumbra", 5);
  return {
    centralPoint: hasCentral && axis ? { latDeg: axis.latDeg, lonDeg: axis.lonDeg } : null,
    centralShadowKind,
    centerline: hasCentral ? sampleCenterline(event) : [],
    centralBand,
    partialRegion,
    pathWidthKm,
  };
}

export function resetSolarEclipseGeometryCacheForTests(): void {
  centerlineCache.clear();
}
