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
 * DLU-3 — live USGS earthquakes acquisition under durable `usgs-earthquakes-v1`.
 * Prove GeoJSON parse, live HTTP adapter, fixture fallback, host wiring, and
 * no fetch on resolve / paint path.
 */

import { describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { createDynamicPointFeaturesOverlayLayer } from "../layers/dynamicPointFeaturesOverlayLayer";
import { isDynamicPointFeaturesPayload } from "../layers/dynamicPointFeaturesPayload";
import {
  USGS_EARTHQUAKES_LIVE_FEED_URL,
  USGS_EARTHQUAKES_SOURCE_ID,
  createDynamicDataLifecycleHost,
  createEarthquakesLiveHttpAcquisitionAdapter,
  getDynamicPointFeaturesSourceCatalogEntry,
  parseUsgsEarthquakesGeoJsonBytes,
  produceEarthquakesLiveAcquisitionFromFetched,
  type LiveHttpFetchFn,
  type LiveHttpFetchOk,
} from "./index";

function encodeUsgsShapedGeoJson(overrides?: {
  generatedMs?: number;
  features?: Array<{
    id: string;
    lon: number;
    lat: number;
    mag: number;
    place: string;
    time: number;
  }>;
}): Uint8Array {
  const generatedMs = overrides?.generatedMs ?? 1_700_000_100_000;
  const rows = overrides?.features ?? [
    {
      id: "us7000live1",
      lon: -118.45,
      lat: 34.05,
      mag: 3.4,
      place: "5 km NW of Beverly Hills, CA",
      time: generatedMs - 600_000,
    },
    {
      id: "us7000live2",
      lon: 139.7,
      lat: 35.7,
      mag: 4.8,
      place: "Near Tokyo, Japan",
      time: generatedMs - 1_200_000,
    },
  ];
  const collection = {
    type: "FeatureCollection",
    metadata: {
      generated: generatedMs,
      url: USGS_EARTHQUAKES_LIVE_FEED_URL,
      title: "USGS Earthquakes — DLU-3 test",
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
        type: "earthquake",
        title: `M ${r.mag.toFixed(1)} - ${r.place}`,
      },
    })),
  };
  return new TextEncoder().encode(JSON.stringify(collection));
}

function mockJsonResponse(options: {
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

describe("DLU-3 live USGS earthquakes acquisition", () => {
  it("catalog still exposes durable sourceId (not the live feed URL)", () => {
    const entry = getDynamicPointFeaturesSourceCatalogEntry(USGS_EARTHQUAKES_SOURCE_ID);
    expect(entry).not.toBeNull();
    expect(entry!.sourceId).toBe("usgs-earthquakes-v1");
    expect(entry!.sourceId.includes("://")).toBe(false);
    expect(USGS_EARTHQUAKES_LIVE_FEED_URL.startsWith("https://")).toBe(true);
    expect(entry!.attribution.toLowerCase()).toContain("usgs");
  });

  it("parses USGS-shaped GeoJSON FeatureCollection into point features", () => {
    const bytes = encodeUsgsShapedGeoJson({
      generatedMs: 1_700_000_200_000,
    });
    const parsed = parseUsgsEarthquakesGeoJsonBytes(bytes);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.features.length).toBe(2);
    expect(parsed.generatedMs).toBe(1_700_000_200_000);
    expect(parsed.features[0]).toMatchObject({
      id: "us7000live1",
      lonDeg: -118.45,
      latDeg: 34.05,
    });
    expect(parsed.features[0]!.properties?.mag).toBe(3.4);
  });

  it("rejects non-FeatureCollection bodies", () => {
    const bad = new TextEncoder().encode(JSON.stringify({ type: "Feature" }));
    expect(parseUsgsEarthquakesGeoJsonBytes(bad)).toEqual({
      ok: false,
      error: "expected FeatureCollection",
    });
  });

  it("skips non-Point geometries and keeps valid points", () => {
    const mixed = new TextEncoder().encode(
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            id: "line-1",
            geometry: {
              type: "LineString",
              coordinates: [
                [0, 0],
                [1, 1],
              ],
            },
            properties: {},
          },
          {
            type: "Feature",
            id: "pt-1",
            geometry: { type: "Point", coordinates: [10, 20] },
            properties: { mag: 2.1, time: 1_700_000_000_000 },
          },
        ],
      }),
    );
    const parsed = parseUsgsEarthquakesGeoJsonBytes(mixed);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.features).toHaveLength(1);
    expect(parsed.features[0]!.id).toBe("pt-1");
  });

  it("live adapter maps HTTP bytes to store entry under durable sourceId", async () => {
    const bytes = encodeUsgsShapedGeoJson();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockJsonResponse({ body: bytes }),
    );
    const adapter = createEarthquakesLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => 1_700_000_300_000,
      versionIdFor: () => "earthquakes-live-test-1",
      useFixtureFallback: false,
    });

    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.sourceId).toBe(USGS_EARTHQUAKES_SOURCE_ID);
    expect(result.entry.record.meta.versionId).toBe("earthquakes-live-test-1");
    expect(result.entry.record.body.kind).toBe("pointFeatures");
    if (result.entry.record.body.kind === "pointFeatures") {
      expect(result.entry.record.body.features.length).toBe(2);
    }
    expect(result.entry.record.meta.attribution).toBeTruthy();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const callUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(callUrl).toBe(USGS_EARTHQUAKES_LIVE_FEED_URL);
  });

  it("live adapter falls back to fixture when HTTP fails (non-abort)", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockJsonResponse({
        body: new Uint8Array(),
        ok: false,
        status: 503,
      }),
    );
    const adapter = createEarthquakesLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => 1_700_000_400_000,
      versionIdFor: () => "earthquakes-fixture-fallback",
      useFixtureFallback: true,
    });

    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.versionId).toBe(
      "earthquakes-fixture-fallback",
    );
    expect(result.entry.record.body.kind).toBe("pointFeatures");
    if (result.entry.record.body.kind === "pointFeatures") {
      expect(result.entry.record.body.features.length).toBeGreaterThanOrEqual(3);
    }
  });

  it("produceEarthquakesLiveAcquisitionFromFetched stamps catalog attribution", () => {
    const bytes = encodeUsgsShapedGeoJson({ generatedMs: 1_700_000_500_000 });
    const fetched: LiveHttpFetchOk = {
      ok: true,
      bytes,
      contentType: "application/json",
      responseUrl: USGS_EARTHQUAKES_LIVE_FEED_URL,
      status: 200,
    };
    const result = produceEarthquakesLiveAcquisitionFromFetched(fetched, {
      nowMs: () => 1_700_000_500_100,
      versionIdFor: () => "from-fetched",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.validTimeMs).toBe(1_700_000_500_000);
    expect(result.entry.record.meta.attribution).toContain("USGS");
  });

  it("host arms live consumer, materializes points, resolve does not re-fetch", async () => {
    const bytes = encodeUsgsShapedGeoJson();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockJsonResponse({ body: bytes }),
    );
    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });

    host.ensureEarthquakesConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });

    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(1_700_000_000_000)
          .getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const fetchesAfterArm = (fetchFn as ReturnType<typeof vi.fn>).mock.calls
      .length;

    const att = host.attachForProductInstant(1_700_000_000_000);
    const view = att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID);
    expect(view).not.toBeNull();
    expect(view!.features.length).toBe(2);
    expect(view!.features[0]!.id).toBe("us7000live1");

    const resolved = await att.resolveSnapshot(USGS_EARTHQUAKES_SOURCE_ID);
    expect(resolved.status).toBe("ok");
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      fetchesAfterArm,
    );

    const layer = createDynamicPointFeaturesOverlayLayer({
      sceneLayerId: "earthquakes",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
      opacity: 0.95,
    });
    const resolveSpy = vi.spyOn(att, "resolveSnapshot");
    const state = layer.getState(
      createTimeContext(1_700_000_000_000, 0, false, {
        dynamicDataLifecycle: att,
      }),
    );
    expect(state.visible).toBe(true);
    expect(isDynamicPointFeaturesPayload(state.data)).toBe(true);
    expect(resolveSpy).not.toHaveBeenCalled();
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      fetchesAfterArm,
    );

    host.dispose();
  });
});
