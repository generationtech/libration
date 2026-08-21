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
 * DEV-only earthquake presentation visual fixture. Production never imports this
 * module. Recorded USGS-shaped points at a documented UTC so Layers → Earthquakes
 * filters can be exercised without USGS. Origin is fixture; never labeled live.
 */

import type { PreparedPointFeaturesView } from "../lifecycle/dynamicPointFeaturesMaterializer";
import { produceEarthquakesLiveAcquisitionFromFetched } from "../lifecycle/earthquakesAcquisition";

/** Product UTC for filter/age math in the DEV scenario. */
export const EARTHQUAKE_PRESENTATION_SCENARIO_UTC = "2026-08-21T16:00:00.000Z";

type ScenarioRow = {
  id: string;
  lon: number;
  lat: number;
  mag: number | null;
  place: string;
  ageMs: number;
  type: string;
};

/**
 * Representative mix: factory M2.5+ / 24h / earthquakes-only / labels 4.0+
 * should keep a readable global set, not every micro-event.
 */
const SCENARIO_ROWS: readonly ScenarioRow[] = [
  {
    id: "dev-eq-micro",
    lon: -118.2,
    lat: 34.05,
    mag: 0.8,
    place: "2 km N of Los Angeles, CA",
    ageMs: 20 * 60 * 1000,
    type: "earthquake",
  },
  {
    id: "dev-eq-small",
    lon: 28.97,
    lat: 41.01,
    mag: 1.5,
    place: "Istanbul, Turkey",
    ageMs: 2 * 60 * 60 * 1000,
    type: "earthquake",
  },
  {
    id: "dev-eq-factory-floor",
    lon: 142.37,
    lat: 38.15,
    mag: 2.5,
    place: "Off the east coast of Honshu, Japan",
    ageMs: 3 * 60 * 60 * 1000,
    type: "earthquake",
  },
  {
    id: "dev-eq-moderate",
    lon: -71.65,
    lat: -33.05,
    mag: 3.2,
    place: "25 km W of Valparaíso, Chile",
    ageMs: 8 * 60 * 60 * 1000,
    type: "earthquake",
  },
  {
    id: "dev-eq-label-floor",
    lon: -155.28,
    lat: 19.42,
    mag: 4.0,
    place: "12 km ENE of Pāhala, Hawaii",
    ageMs: 4 * 60 * 60 * 1000,
    type: "earthquake",
  },
  {
    id: "dev-eq-notable",
    lon: 28.23,
    lat: 38.41,
    mag: 4.6,
    place: "Aegean Sea",
    ageMs: 10 * 60 * 60 * 1000,
    type: "earthquake",
  },
  {
    id: "dev-eq-major",
    lon: 121.56,
    lat: 23.97,
    mag: 5.2,
    place: "Taiwan",
    ageMs: 1 * 60 * 60 * 1000,
    type: "earthquake",
  },
  {
    id: "dev-eq-large",
    lon: 179.4,
    lat: -16.5,
    mag: 6.1,
    place: "Fiji region",
    ageMs: 30 * 60 * 1000,
    type: "earthquake",
  },
  {
    id: "dev-eq-old",
    lon: -70.4,
    lat: -15.8,
    mag: 4.8,
    place: "southern Peru",
    ageMs: 25 * 60 * 60 * 1000,
    type: "earthquake",
  },
  {
    id: "dev-eq-quarry",
    lon: -87.9,
    lat: 37.8,
    mag: 2.8,
    place: "quarry blast near Evansville, IN",
    ageMs: 40 * 60 * 1000,
    type: "quarry blast",
  },
  {
    id: "dev-eq-explosion",
    lon: 13.4,
    lat: 52.5,
    mag: 3.1,
    place: "explosion, Germany",
    ageMs: 90 * 60 * 1000,
    type: "explosion",
  },
  {
    id: "dev-eq-dateline-west",
    lon: -179.6,
    lat: 51.8,
    mag: 4.4,
    place: "Near Islands, Alaska",
    ageMs: 6 * 60 * 60 * 1000,
    type: "earthquake",
  },
];

function encodeScenarioGeoJson(productUtcMs: number): Uint8Array {
  const collection = {
    type: "FeatureCollection",
    metadata: {
      generated: productUtcMs,
      url: "dev://earthquake-presentation-scenario",
      title: "USGS Earthquakes — DEV presentation fixture",
      status: 200,
      api: "1.6.0",
      count: SCENARIO_ROWS.length,
    },
    features: SCENARIO_ROWS.map((row) => ({
      type: "Feature",
      id: row.id,
      geometry: {
        type: "Point",
        coordinates: [row.lon, row.lat],
      },
      properties: {
        mag: row.mag,
        place: row.place,
        time: productUtcMs - row.ageMs,
        type: row.type,
        title: `M ${row.mag ?? "?"} - ${row.place}`,
      },
    })),
  };
  return new TextEncoder().encode(JSON.stringify(collection));
}

export function buildEarthquakePresentationPreparedPointFeaturesView(): PreparedPointFeaturesView {
  const productUtcMs = Date.parse(EARTHQUAKE_PRESENTATION_SCENARIO_UTC);
  const result = produceEarthquakesLiveAcquisitionFromFetched(
    {
      ok: true,
      bytes: encodeScenarioGeoJson(productUtcMs),
      contentType: "application/json",
      responseUrl: "dev://earthquake-presentation-scenario",
      status: 200,
    },
    {
      nowMs: () => productUtcMs,
      versionIdFor: () => "earthquake-presentation-dev",
    },
  );
  if (!result.ok) {
    throw new Error(
      "earthquake-presentation scenario: failed to build prepared earthquake features",
    );
  }
  const body = result.entry.record.body;
  if (body.kind !== "pointFeatures") {
    throw new Error("earthquake-presentation scenario: expected pointFeatures body");
  }
  const meta = result.entry.record.meta;
  return {
    sourceId: meta.sourceId,
    versionId: meta.versionId,
    features: body.features,
    validTimeMs: meta.validTimeMs,
    acquiredAtMs: meta.acquiredAtMs,
    freshness: "ready",
    origin: "fixture",
    devAllowFixturePaint: true,
    ...(meta.attribution !== undefined ? { attribution: meta.attribution } : {}),
    ...(meta.licenseNote !== undefined ? { licenseNote: meta.licenseNote } : {}),
  };
}
