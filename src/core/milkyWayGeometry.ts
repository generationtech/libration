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
 * Terrestrial zenith projection of the Galactic plane, approximate Milky Way band,
 * sparse width ribs, and Galactic center/anticenter. Cached celestial samples plus
 * per-frame GAST / night-side tagging.
 */

import { subsolarPoint } from "./subsolarPoint";
import { solarAltitudeDegFromSurfaceSunDotProduct } from "./solarTwilight";
import {
  MILKY_WAY_AUTHORITY_VERSION,
  equatorRaDecFromEqjVector,
  galacticDirectionEqj,
  eqjToEquatorOfDateMatrix,
} from "./milkyWayGalactic";
import {
  milkyWayBandHalfWidthDeg,
  type MilkyWayBandWidthId,
} from "./milkyWayPresentation";
import {
  isPlanetaryEphemerisSupportedUtc,
  planetaryGastDeg,
} from "./planetaryEphemeris";
import { wrapSigned180, type PlanetarySubpointDeg } from "./planetarySubpoint";

/** Closed Galactic longitude sampling for plane and band edges. */
export const MILKY_WAY_LONGITUDE_STEP_DEG = 2;
/** Sparse ribs: one connector every 20° of Galactic longitude. */
export const MILKY_WAY_RIB_STEP_DEG = 20;

export type MilkyWayTaggedPoint = PlanetarySubpointDeg & {
  readonly night: boolean;
  readonly lDeg: number;
};

export type MilkyWayRib = {
  readonly lDeg: number;
  readonly points: readonly MilkyWayTaggedPoint[];
};

export type MilkyWayGeometry = {
  readonly plane: readonly MilkyWayTaggedPoint[];
  readonly northEdge: readonly MilkyWayTaggedPoint[];
  readonly southEdge: readonly MilkyWayTaggedPoint[];
  readonly ribs: readonly MilkyWayRib[];
  readonly galacticCenter: MilkyWayTaggedPoint | null;
  readonly galacticAnticenter: MilkyWayTaggedPoint | null;
};

type EqjCatalog = {
  plane: ReturnType<typeof galacticDirectionEqj>[];
  north: ReturnType<typeof galacticDirectionEqj>[];
  south: ReturnType<typeof galacticDirectionEqj>[];
  ribNorth: ReturnType<typeof galacticDirectionEqj>[];
  ribPlane: ReturnType<typeof galacticDirectionEqj>[];
  ribSouth: ReturnType<typeof galacticDirectionEqj>[];
  lPlane: number[];
  lRib: number[];
  center: ReturnType<typeof galacticDirectionEqj>;
  anticenter: ReturnType<typeof galacticDirectionEqj>;
  halfWidthDeg: number;
};

type CachedEqd = {
  key: string;
  plane: { raDeg: number; decDeg: number }[];
  north: { raDeg: number; decDeg: number }[];
  south: { raDeg: number; decDeg: number }[];
  ribNorth: { raDeg: number; decDeg: number }[];
  ribPlane: { raDeg: number; decDeg: number }[];
  ribSouth: { raDeg: number; decDeg: number }[];
  center: { raDeg: number; decDeg: number };
  anticenter: { raDeg: number; decDeg: number };
};

const eqdCache = new Map<string, CachedEqd>();
const CACHE_LIMIT = 12;

let eqjCatalog: EqjCatalog | null = null;

function longitudeSamples(stepDeg: number, closed: boolean): number[] {
  const out: number[] = [];
  for (let l = 0; l < 360; l += stepDeg) {
    out.push(l);
  }
  if (closed) {
    out.push(360);
  }
  return out;
}

function buildEqjCatalog(halfWidthDeg: number): EqjCatalog {
  const lPlane = longitudeSamples(MILKY_WAY_LONGITUDE_STEP_DEG, true);
  const lRib = longitudeSamples(MILKY_WAY_RIB_STEP_DEG, false);
  return {
    halfWidthDeg,
    lPlane,
    lRib,
    plane: lPlane.map((l) => galacticDirectionEqj(l, 0)),
    north: lPlane.map((l) => galacticDirectionEqj(l, halfWidthDeg)),
    south: lPlane.map((l) => galacticDirectionEqj(l, -halfWidthDeg)),
    ribNorth: lRib.map((l) => galacticDirectionEqj(l, halfWidthDeg)),
    ribPlane: lRib.map((l) => galacticDirectionEqj(l, 0)),
    ribSouth: lRib.map((l) => galacticDirectionEqj(l, -halfWidthDeg)),
    center: galacticDirectionEqj(0, 0),
    anticenter: galacticDirectionEqj(180, 0),
  };
}

function catalogFor(halfWidthDeg: number): EqjCatalog {
  if (!eqjCatalog || eqjCatalog.halfWidthDeg !== halfWidthDeg) {
    eqjCatalog = buildEqjCatalog(halfWidthDeg);
  }
  return eqjCatalog;
}

function utcDateKey(utcMs: number): string {
  const d = new Date(utcMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function cacheKey(utcMs: number, halfWidthDeg: number): string {
  return `${MILKY_WAY_AUTHORITY_VERSION}|${utcDateKey(utcMs)}|b${halfWidthDeg}`;
}

function projectEqjList(
  vectors: readonly ReturnType<typeof galacticDirectionEqj>[],
  eqjToEqd: NonNullable<ReturnType<typeof eqjToEquatorOfDateMatrix>>,
): { raDeg: number; decDeg: number }[] {
  const out: { raDeg: number; decDeg: number }[] = [];
  for (const v of vectors) {
    const eq = equatorRaDecFromEqjVector(v, eqjToEqd);
    if (eq) {
      out.push(eq);
    }
  }
  return out;
}

function cachedEqd(utcMs: number, halfWidthDeg: number): CachedEqd | null {
  const key = cacheKey(utcMs, halfWidthDeg);
  const hit = eqdCache.get(key);
  if (hit) {
    return hit;
  }
  const eqjToEqd = eqjToEquatorOfDateMatrix(utcMs);
  if (!eqjToEqd) {
    return null;
  }
  const cat = catalogFor(halfWidthDeg);
  const center = equatorRaDecFromEqjVector(cat.center, eqjToEqd);
  const anticenter = equatorRaDecFromEqjVector(cat.anticenter, eqjToEqd);
  if (!center || !anticenter) {
    return null;
  }
  const entry: CachedEqd = {
    key,
    plane: projectEqjList(cat.plane, eqjToEqd),
    north: projectEqjList(cat.north, eqjToEqd),
    south: projectEqjList(cat.south, eqjToEqd),
    ribNorth: projectEqjList(cat.ribNorth, eqjToEqd),
    ribPlane: projectEqjList(cat.ribPlane, eqjToEqd),
    ribSouth: projectEqjList(cat.ribSouth, eqjToEqd),
    center,
    anticenter,
  };
  eqdCache.set(key, entry);
  if (eqdCache.size > CACHE_LIMIT) {
    const first = eqdCache.keys().next().value;
    if (typeof first === "string") {
      eqdCache.delete(first);
    }
  }
  return entry;
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
 * Geometric night at a geographic point using the existing subsolar authority
 * (same surface-sun identity as illumination). Horizon = 0°; no refraction.
 */
export function geographicPointIsNight(
  latDeg: number,
  lonDeg: number,
  subsolarLatDeg: number,
  subsolarLonDeg: number,
): boolean {
  const dot = surfaceSunDotProduct(latDeg, lonDeg, subsolarLatDeg, subsolarLonDeg);
  return solarAltitudeDegFromSurfaceSunDotProduct(dot) < 0;
}

function tagPoint(
  raDec: { raDeg: number; decDeg: number },
  gastDeg: number,
  lDeg: number,
  subLat: number,
  subLon: number,
  tagNight: boolean,
): MilkyWayTaggedPoint {
  const p = {
    latDeg: Math.max(-90, Math.min(90, raDec.decDeg)),
    lonDeg: wrapSigned180(raDec.raDeg - gastDeg),
  };
  return {
    ...p,
    lDeg,
    night: tagNight ? geographicPointIsNight(p.latDeg, p.lonDeg, subLat, subLon) : false,
  };
}

function tagPolyline(
  raDecs: readonly { raDeg: number; decDeg: number }[],
  lons: readonly number[],
  gastDeg: number,
  subLat: number,
  subLon: number,
  tagNight: boolean,
): MilkyWayTaggedPoint[] {
  const n = Math.min(raDecs.length, lons.length);
  const out: MilkyWayTaggedPoint[] = [];
  for (let i = 0; i < n; i += 1) {
    out.push(tagPoint(raDecs[i]!, gastDeg, lons[i]! % 360, subLat, subLon, tagNight));
  }
  return out;
}

/**
 * Zenith-projection Milky Way geometry at `utcMs`.
 * Celestial EQD samples rebuild at most once per UTC date and band width;
 * Earth rotation is applied as a GAST longitude shift every call.
 */
export function sampleMilkyWayGeometry(
  utcMs: number,
  bandWidth: MilkyWayBandWidthId,
  options: { tagNight: boolean } = { tagNight: true },
): MilkyWayGeometry | null {
  if (!isPlanetaryEphemerisSupportedUtc(utcMs)) {
    return null;
  }
  const halfWidth = milkyWayBandHalfWidthDeg(bandWidth);
  const eqd = cachedEqd(utcMs, halfWidth);
  const gast = planetaryGastDeg(utcMs);
  if (!eqd || gast === null) {
    return null;
  }
  const cat = catalogFor(halfWidth);
  const sub = options.tagNight ? subsolarPoint(utcMs) : { latDeg: 0, lonDeg: 0 };
  const tagNight = options.tagNight;
  const plane = tagPolyline(eqd.plane, cat.lPlane, gast, sub.latDeg, sub.lonDeg, tagNight);
  const northEdge = tagPolyline(eqd.north, cat.lPlane, gast, sub.latDeg, sub.lonDeg, tagNight);
  const southEdge = tagPolyline(eqd.south, cat.lPlane, gast, sub.latDeg, sub.lonDeg, tagNight);
  const ribs: MilkyWayRib[] = [];
  for (let i = 0; i < cat.lRib.length; i += 1) {
    const n = eqd.ribNorth[i];
    const p = eqd.ribPlane[i];
    const s = eqd.ribSouth[i];
    if (!n || !p || !s) {
      continue;
    }
    const lDeg = cat.lRib[i]!;
    ribs.push({
      lDeg,
      points: [
        tagPoint(s, gast, lDeg, sub.latDeg, sub.lonDeg, tagNight),
        tagPoint(p, gast, lDeg, sub.latDeg, sub.lonDeg, tagNight),
        tagPoint(n, gast, lDeg, sub.latDeg, sub.lonDeg, tagNight),
      ],
    });
  }
  return {
    plane,
    northEdge,
    southEdge,
    ribs,
    galacticCenter: tagPoint(eqd.center, gast, 0, sub.latDeg, sub.lonDeg, tagNight),
    galacticAnticenter: tagPoint(eqd.anticenter, gast, 180, sub.latDeg, sub.lonDeg, tagNight),
  };
}

export function resetMilkyWayGeometryCacheForTests(): void {
  eqdCache.clear();
  eqjCatalog = null;
}
