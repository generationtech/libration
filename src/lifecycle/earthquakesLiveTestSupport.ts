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
 * Shared USGS GeoJSON HTTP mocks for earthquake tests. Production never imports this.
 */

import { USGS_EARTHQUAKES_LIVE_FEED_URL } from "./earthquakesAcquisition";
import type { LiveHttpFetchFn } from "./liveHttpAcquisitionTypes";

export type UsgsTestFeatureRow = {
  id: string;
  lon: number;
  lat: number;
  mag: number | null;
  place: string;
  time: number;
  type?: string;
};

export function defaultUsgsTestFeatures(nowMs: number): UsgsTestFeatureRow[] {
  return [
    {
      id: "us7000live1",
      lon: -118.45,
      lat: 34.05,
      mag: 3.4,
      place: "5 km NW of Beverly Hills, CA",
      time: nowMs - 600_000,
      type: "earthquake",
    },
    {
      id: "us7000live2",
      lon: 139.7,
      lat: 35.7,
      mag: 4.8,
      place: "Near Tokyo, Japan",
      time: nowMs - 1_200_000,
      type: "earthquake",
    },
  ];
}

export function encodeUsgsShapedGeoJson(overrides?: {
  generatedMs?: number;
  features?: UsgsTestFeatureRow[];
}): Uint8Array {
  const generatedMs = overrides?.generatedMs ?? 1_700_000_100_000;
  const rows = overrides?.features ?? defaultUsgsTestFeatures(generatedMs);
  const collection = {
    type: "FeatureCollection",
    metadata: {
      generated: generatedMs,
      url: USGS_EARTHQUAKES_LIVE_FEED_URL,
      title: "USGS Earthquakes — test",
      status: 200,
      api: "1.6.0",
      count: rows.length,
    },
    features: rows.map((r) => ({
      type: "Feature",
      id: r.id,
      geometry: {
        type: "Point",
        coordinates: [r.lon, r.lat],
      },
      properties: {
        mag: r.mag,
        place: r.place,
        time: r.time,
        type: r.type ?? "earthquake",
        title:
          r.mag === null
            ? r.place
            : `M ${r.mag.toFixed(1)} - ${r.place}`,
      },
    })),
  };
  return new TextEncoder().encode(JSON.stringify(collection));
}

export function mockUsgsJsonResponse(options: {
  body: Uint8Array;
  ok?: boolean;
  status?: number;
  contentType?: string | null;
}): Response {
  const ok = options.ok !== false;
  const status = options.status ?? (ok ? 200 : 500);
  const headers = new Headers();
  if (options.contentType !== null) {
    headers.set(
      "content-type",
      options.contentType ?? "application/json; charset=utf-8",
    );
  }
  return {
    ok,
    status,
    headers,
    url: USGS_EARTHQUAKES_LIVE_FEED_URL,
    arrayBuffer: async () =>
      options.body.buffer.slice(
        options.body.byteOffset,
        options.body.byteOffset + options.body.byteLength,
      ),
  } as Response;
}

export function usgsLiveOkFetch(nowMs: number): LiveHttpFetchFn {
  const bytes = encodeUsgsShapedGeoJson({
    generatedMs: nowMs,
    features: defaultUsgsTestFeatures(nowMs),
  });
  return async () => mockUsgsJsonResponse({ body: bytes });
}
