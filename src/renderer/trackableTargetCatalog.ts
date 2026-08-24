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
 * Per-frame tracking catalog from the same layer payloads used to paint
 * city pins, current-planet glyphs, and Milky Way tagged points. Coordinates
 * here are the authoritative mapped positions for resolution and UI; they
 * are not a second geography or ephemeris path.
 */

import type { PlanetaryBodyId } from "../core/planetaryBodies";
import {
  MILKY_WAY_POINT_LABELS,
  type MilkyWayPointId,
  type TrackableMapObjectCanonicalPosition,
} from "../core/trackableMapObject";
import type { TrackableTargetAvailability } from "../core/trackingSelection";
import { isCityPinsPayload } from "../layers/cityPinsPayload";
import { isMilkyWayPayload } from "../layers/milkyWayPayload";
import { isPlanetaryObjectsPayload } from "../layers/planetaryObjectsPayload";
import type { RenderableLayerState } from "./types";

export type TrackableCityCatalogEntry = {
  readonly id: string;
  readonly name: string;
  readonly lonDeg: number;
  readonly latDeg: number;
};

export type TrackablePlanetCatalogEntry = {
  readonly id: PlanetaryBodyId;
  readonly displayName: string;
  readonly lonDeg: number;
  readonly latDeg: number;
};

export type TrackableMilkyWayPointCatalogEntry = {
  readonly id: MilkyWayPointId;
  readonly label: string;
  readonly lonDeg: number;
  readonly latDeg: number;
};

export type TrackableTargetCatalog = {
  readonly cities: readonly TrackableCityCatalogEntry[];
  readonly planets: readonly TrackablePlanetCatalogEntry[];
  readonly milkyWayPoints: readonly TrackableMilkyWayPointCatalogEntry[];
};

function finiteLonLat(lonDeg: number, latDeg: number): boolean {
  return Number.isFinite(lonDeg) && Number.isFinite(latDeg);
}

export function collectTrackableTargetCatalog(
  layers: readonly RenderableLayerState[],
): TrackableTargetCatalog {
  const cities: TrackableCityCatalogEntry[] = [];
  const planets: TrackablePlanetCatalogEntry[] = [];
  const milkyWayPoints: TrackableMilkyWayPointCatalogEntry[] = [];
  for (const layer of layers) {
    if (layer.visible === false) {
      continue;
    }
    const data = layer.data;
    if (isCityPinsPayload(data)) {
      for (const city of data.cities) {
        if (city.id.length === 0 || !finiteLonLat(city.lonDeg, city.latDeg)) {
          continue;
        }
        cities.push({
          id: city.id,
          name: city.name,
          lonDeg: city.lonDeg,
          latDeg: city.latDeg,
        });
      }
      continue;
    }
    if (isPlanetaryObjectsPayload(data)) {
      for (const body of data.bodies) {
        if (!body.showCurrent || body.current === null) {
          continue;
        }
        if (!finiteLonLat(body.current.lonDeg, body.current.latDeg)) {
          continue;
        }
        planets.push({
          id: body.id,
          displayName: body.displayName,
          lonDeg: body.current.lonDeg,
          latDeg: body.current.latDeg,
        });
      }
      continue;
    }
    if (!isMilkyWayPayload(data) || !data.supported || data.geometry === null) {
      continue;
    }
    const geom = data.geometry;
    const pres = data.presentation;
    if (
      pres.galacticCenterEnabled &&
      geom.galacticCenter &&
      finiteLonLat(geom.galacticCenter.lonDeg, geom.galacticCenter.latDeg)
    ) {
      milkyWayPoints.push({
        id: "galacticCenter",
        label: MILKY_WAY_POINT_LABELS.galacticCenter,
        lonDeg: geom.galacticCenter.lonDeg,
        latDeg: geom.galacticCenter.latDeg,
      });
    }
    if (
      pres.galacticAnticenterEnabled &&
      geom.galacticAnticenter &&
      finiteLonLat(geom.galacticAnticenter.lonDeg, geom.galacticAnticenter.latDeg)
    ) {
      milkyWayPoints.push({
        id: "galacticAnticenter",
        label: MILKY_WAY_POINT_LABELS.galacticAnticenter,
        lonDeg: geom.galacticAnticenter.lonDeg,
        latDeg: geom.galacticAnticenter.latDeg,
      });
    }
  }
  return { cities, planets, milkyWayPoints };
}

export function trackableTargetAvailabilityFromCatalog(
  catalog: TrackableTargetCatalog,
  issAvailable: boolean,
): TrackableTargetAvailability {
  return {
    moon: true,
    sun: true,
    iss: issAvailable,
    cities: new Set(catalog.cities.map((city) => city.id)),
    planets: new Set(catalog.planets.map((planet) => planet.id)),
    milkyWayPoints: new Set(catalog.milkyWayPoints.map((point) => point.id)),
  };
}

export function trackableAuthoritativeMapsFromCatalog(catalog: TrackableTargetCatalog): {
  readonly cities: ReadonlyMap<string, TrackableMapObjectCanonicalPosition>;
  readonly planets: ReadonlyMap<PlanetaryBodyId, TrackableMapObjectCanonicalPosition>;
  readonly milkyWayPoints: ReadonlyMap<MilkyWayPointId, TrackableMapObjectCanonicalPosition>;
} {
  const cities = new Map<string, TrackableMapObjectCanonicalPosition>();
  const planets = new Map<PlanetaryBodyId, TrackableMapObjectCanonicalPosition>();
  const milkyWayPoints = new Map<MilkyWayPointId, TrackableMapObjectCanonicalPosition>();
  for (const city of catalog.cities) {
    cities.set(city.id, { lonDeg: city.lonDeg, latDeg: city.latDeg });
  }
  for (const planet of catalog.planets) {
    planets.set(planet.id, { lonDeg: planet.lonDeg, latDeg: planet.latDeg });
  }
  for (const point of catalog.milkyWayPoints) {
    milkyWayPoints.set(point.id, { lonDeg: point.lonDeg, latDeg: point.latDeg });
  }
  return { cities, planets, milkyWayPoints };
}

export function trackingTargetUiCatalogKey(catalog: TrackableTargetCatalog): string {
  const cities = catalog.cities.map((city) => `${city.id}\t${city.name}`).join("\n");
  const planets = catalog.planets
    .map((planet) => `${planet.id}\t${planet.displayName}`)
    .join("\n");
  const milkyWayPoints = catalog.milkyWayPoints
    .map((point) => `${point.id}\t${point.label}`)
    .join("\n");
  return `${cities}\n--\n${planets}\n--\n${milkyWayPoints}`;
}
