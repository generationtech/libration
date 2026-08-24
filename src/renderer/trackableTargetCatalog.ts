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
 * Per-frame city and planet tracking catalog from the same layer payloads
 * used to paint pins and current-planet glyphs. Coordinates here are the
 * authoritative mapped positions for resolution and UI; they are not a
 * second geography or ephemeris path.
 */

import type { PlanetaryBodyId } from "../core/planetaryBodies";
import type {
  TrackableMapObjectCanonicalPosition,
} from "../core/trackableMapObject";
import type { TrackableTargetAvailability } from "../core/trackingSelection";
import { isCityPinsPayload } from "../layers/cityPinsPayload";
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

export type TrackableTargetCatalog = {
  readonly cities: readonly TrackableCityCatalogEntry[];
  readonly planets: readonly TrackablePlanetCatalogEntry[];
};

function finiteLonLat(lonDeg: number, latDeg: number): boolean {
  return Number.isFinite(lonDeg) && Number.isFinite(latDeg);
}

export function collectTrackableTargetCatalog(
  layers: readonly RenderableLayerState[],
): TrackableTargetCatalog {
  const cities: TrackableCityCatalogEntry[] = [];
  const planets: TrackablePlanetCatalogEntry[] = [];
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
    }
  }
  return { cities, planets };
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
  };
}

export function trackableAuthoritativeMapsFromCatalog(catalog: TrackableTargetCatalog): {
  readonly cities: ReadonlyMap<string, TrackableMapObjectCanonicalPosition>;
  readonly planets: ReadonlyMap<PlanetaryBodyId, TrackableMapObjectCanonicalPosition>;
} {
  const cities = new Map<string, TrackableMapObjectCanonicalPosition>();
  const planets = new Map<PlanetaryBodyId, TrackableMapObjectCanonicalPosition>();
  for (const city of catalog.cities) {
    cities.set(city.id, { lonDeg: city.lonDeg, latDeg: city.latDeg });
  }
  for (const planet of catalog.planets) {
    planets.set(planet.id, { lonDeg: planet.lonDeg, latDeg: planet.latDeg });
  }
  return { cities, planets };
}

export function trackingTargetUiCatalogKey(catalog: TrackableTargetCatalog): string {
  const cities = catalog.cities.map((city) => `${city.id}\t${city.name}`).join("\n");
  const planets = catalog.planets
    .map((planet) => `${planet.id}\t${planet.displayName}`)
    .join("\n");
  return `${cities}\n--\n${planets}`;
}
