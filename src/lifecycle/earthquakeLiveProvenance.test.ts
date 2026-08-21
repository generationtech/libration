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
 * LIB-059 — earthquake provenance, snapshot-age bands, and no fixture-as-live.
 */

import { describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { createDynamicPointFeaturesOverlayLayer } from "../layers/dynamicPointFeaturesOverlayLayer";
import { isDynamicPointFeaturesPayload } from "../layers/dynamicPointFeaturesPayload";
import {
  EARTHQUAKE_SNAPSHOT_FRESH_MAX_AGE_MS,
  EARTHQUAKE_SNAPSHOT_STALE_MAX_AGE_MS,
  USGS_EARTHQUAKES_SOURCE_ID,
  createDynamicDataLifecycleHost,
  createEarthquakesLiveHttpAcquisitionAdapter,
  earthquakeConfigStatusHint,
  earthquakeConfigStatusHintCopy,
  earthquakeShouldPaint,
  earthquakeSnapshotFreshnessBandFromAgeMs,
  produceEarthquakesFixtureAcquisition,
  produceEarthquakesLiveAcquisitionFromFetched,
  resolveEarthquakeProvenance,
  type EarthquakeProvenance,
  type LiveHttpFetchFn,
} from "./index";
import {
  encodeUsgsShapedGeoJson,
  mockUsgsJsonResponse,
  usgsLiveOkFetch,
} from "./earthquakesLiveTestSupport";

const NOW = 1_724_000_000_000;

function liveBytes(nowMs: number = NOW): Uint8Array {
  return encodeUsgsShapedGeoJson({
    generatedMs: nowMs,
  });
}

function provenanceOf(options: {
  originStamp: "live" | "fixture";
  acquiredAtMs: number;
  productUtcMs: number;
  lifecycleState: "idle" | "loading" | "ready" | "stale" | "error";
  versionId?: string;
}): EarthquakeProvenance {
  return resolveEarthquakeProvenance({
    originStamp: options.originStamp,
    acquiredAtMs: options.acquiredAtMs,
    productUtcMs: options.productUtcMs,
    lifecycleState: options.lifecycleState,
    versionId: options.versionId ?? "eq-test",
  });
}

describe("LIB-059 earthquake snapshot freshness bands", () => {
  it("classifies ≤10 min fresh, 10–60 min stale, >60 min excessively stale", () => {
    expect(earthquakeSnapshotFreshnessBandFromAgeMs(0)).toBe("fresh");
    expect(
      earthquakeSnapshotFreshnessBandFromAgeMs(EARTHQUAKE_SNAPSHOT_FRESH_MAX_AGE_MS),
    ).toBe("fresh");
    expect(
      earthquakeSnapshotFreshnessBandFromAgeMs(
        EARTHQUAKE_SNAPSHOT_FRESH_MAX_AGE_MS + 1,
      ),
    ).toBe("stale");
    expect(
      earthquakeSnapshotFreshnessBandFromAgeMs(EARTHQUAKE_SNAPSHOT_STALE_MAX_AGE_MS),
    ).toBe("stale");
    expect(
      earthquakeSnapshotFreshnessBandFromAgeMs(
        EARTHQUAKE_SNAPSHOT_STALE_MAX_AGE_MS + 1,
      ),
    ).toBe("excessively-stale");
  });
});

describe("LIB-059 earthquake provenance", () => {
  it("stamps live origin and paints while fresh", () => {
    const result = produceEarthquakesLiveAcquisitionFromFetched(
      {
        ok: true,
        bytes: liveBytes(),
        contentType: "application/json",
        responseUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
        status: 200,
      },
      { nowMs: () => NOW, versionIdFor: () => "eq-live" },
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.origin).toBe("live");
    const p = provenanceOf({
      originStamp: "live",
      acquiredAtMs: NOW,
      productUtcMs: NOW,
      lifecycleState: "ready",
    });
    expect(p.origin).toBe("live");
    expect(p.freshnessBand).toBe("fresh");
    expect(earthquakeShouldPaint(p)).toBe(true);
  });

  it("stamps fixture origin and never paints it as live USGS data", () => {
    const result = produceEarthquakesFixtureAcquisition({
      nowMs: () => NOW,
      versionIdFor: () => "eq-fixture",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.origin).toBe("fixture");
    const p = provenanceOf({
      originStamp: "fixture",
      acquiredAtMs: NOW,
      productUtcMs: NOW,
      lifecycleState: "ready",
    });
    expect(p.origin).toBe("fixture");
    expect(earthquakeShouldPaint(p)).toBe(false);
  });

  it("marks last-good live snapshot as cached when lifecycle is stale", () => {
    const p = provenanceOf({
      originStamp: "live",
      acquiredAtMs: NOW,
      productUtcMs: NOW + 3 * 60 * 1000,
      lifecycleState: "stale",
    });
    expect(p.origin).toBe("cached-live");
    expect(p.freshnessBand).toBe("fresh");
    expect(earthquakeShouldPaint(p)).toBe(true);
  });

  it("suppresses an excessively stale live snapshot", () => {
    const p = provenanceOf({
      originStamp: "live",
      acquiredAtMs: NOW,
      productUtcMs: NOW + EARTHQUAKE_SNAPSHOT_STALE_MAX_AGE_MS + 1,
      lifecycleState: "stale",
    });
    expect(p.freshnessBand).toBe("excessively-stale");
    expect(earthquakeShouldPaint(p)).toBe(false);
  });
});

describe("LIB-059 status copy", () => {
  it("never labels fixture as live", () => {
    expect(earthquakeConfigStatusHintCopy("fixture")).toBe(
      "Earthquake data (DEV fixture)",
    );
    expect(earthquakeConfigStatusHintCopy("loading")).toBe(
      "Earthquake data loading…",
    );
    expect(earthquakeConfigStatusHintCopy("unavailable")).toBe(
      "Earthquake data unavailable",
    );
    expect(earthquakeConfigStatusHintCopy("live")).toBe("Earthquake data live");
    expect(
      earthquakeConfigStatusHintCopy("live", provenanceOf({
        originStamp: "live",
        acquiredAtMs: NOW,
        productUtcMs: NOW + 3 * 60 * 1000,
        lifecycleState: "ready",
      })),
    ).toBe("Earthquake data live · 3 min old");
    expect(
      earthquakeConfigStatusHintCopy("stale", provenanceOf({
        originStamp: "live",
        acquiredAtMs: NOW,
        productUtcMs: NOW + 22 * 60 * 1000,
        lifecycleState: "stale",
      })),
    ).toBe("Earthquake data stale · last update 22 min ago");
  });

  it("historical Demo wins over live/stale/unavailable", () => {
    expect(
      earthquakeConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: false,
        lifecycleState: "ready",
        provenance: provenanceOf({
          originStamp: "live",
          acquiredAtMs: NOW,
          productUtcMs: NOW,
          lifecycleState: "ready",
        }),
      }),
    ).toBeNull();
  });

  it("keeps DEV fixture status even when product time is not live-enough", () => {
    expect(
      earthquakeConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: false,
        lifecycleState: "ready",
        provenance: provenanceOf({
          originStamp: "fixture",
          acquiredAtMs: NOW,
          productUtcMs: NOW,
          lifecycleState: "ready",
        }),
      }),
    ).toBe("fixture");
  });
});

describe("LIB-059 production fallback", () => {
  it("first-ever live fetch failure is unavailable with no fixture", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("usgs-down");
    });
    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: fetchFn,
      nowMs: () => NOW,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureEarthquakesConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(fetchFn).toHaveBeenCalled();
      expect(host.lifecycle.getState(USGS_EARTHQUAKES_SOURCE_ID).state).toBe(
        "error",
      );
    });
    const att = host.attachForProductInstant(NOW);
    expect(att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID)).toBeNull();
    const layer = createDynamicPointFeaturesOverlayLayer({
      sceneLayerId: "earthquakes",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(NOW, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(false);
    expect(state.data).toBeNull();
    expect(
      earthquakeConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: true,
        lifecycleState: att.getLifecycleState(USGS_EARTHQUAKES_SOURCE_ID).state,
        provenance: null,
      }),
    ).toBe("unavailable");
    host.dispose();
  });

  it("keeps prior live snapshot as stale after a later poll failure", async () => {
    let calls = 0;
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return mockUsgsJsonResponse({ body: liveBytes() });
      }
      throw new Error("usgs-later-fail");
    });
    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: fetchFn,
      nowMs: () => NOW,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureEarthquakesConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(
        host.attachForProductInstant(NOW).getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });
    await host.acquisition.refreshNow(USGS_EARTHQUAKES_SOURCE_ID);
    expect(host.lifecycle.getState(USGS_EARTHQUAKES_SOURCE_ID).state).toBe(
      "stale",
    );
    const att = host.attachForProductInstant(NOW);
    const view = att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID);
    expect(view).not.toBeNull();
    expect(view!.origin).toBe("live");
    const layer = createDynamicPointFeaturesOverlayLayer({
      sceneLayerId: "earthquakes",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(NOW, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(true);
    expect(isDynamicPointFeaturesPayload(state.data)).toBe(true);
    expect(state.metadata?.earthquakeProvenance).toMatchObject({
      origin: "cached-live",
    });
    expect(
      earthquakeConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: true,
        lifecycleState: "stale",
        provenance: state.metadata?.earthquakeProvenance as EarthquakeProvenance,
      }),
    ).toBe("stale");
    host.dispose();
  });

  it("later live success returns live and updates the snapshot", async () => {
    let calls = 0;
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return mockUsgsJsonResponse({ body: liveBytes() });
      }
      if (calls === 2) {
        throw new Error("usgs-mid-fail");
      }
      return mockUsgsJsonResponse({
        body: encodeUsgsShapedGeoJson({
          generatedMs: NOW + 1,
          features: [
            {
              id: "us-recovered",
              lon: 10,
              lat: 20,
              mag: 5.1,
              place: "recovered event",
              time: NOW,
              type: "earthquake",
            },
          ],
        }),
      });
    });
    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: fetchFn,
      nowMs: () => NOW,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureEarthquakesConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(
        host.attachForProductInstant(NOW).getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });
    await host.acquisition.refreshNow(USGS_EARTHQUAKES_SOURCE_ID);
    expect(host.lifecycle.getState(USGS_EARTHQUAKES_SOURCE_ID).state).toBe(
      "stale",
    );
    await host.acquisition.refreshNow(USGS_EARTHQUAKES_SOURCE_ID);
    expect(host.lifecycle.getState(USGS_EARTHQUAKES_SOURCE_ID).state).toBe(
      "ready",
    );
    const view = host
      .attachForProductInstant(NOW)
      .getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID);
    expect(view?.features.some((f) => f.id === "us-recovered")).toBe(true);
    expect(view?.origin).toBe("live");
    host.dispose();
  });

  it("opt-in fixture fallback is not labeled live and does not paint", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockUsgsJsonResponse({ body: new Uint8Array(), ok: false, status: 503 }),
    );
    const adapter = createEarthquakesLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => NOW,
      useFixtureFallback: true,
      versionIdFor: () => "eq-opt-in-fixture",
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.origin).toBe("fixture");
    const host = createDynamicDataLifecycleHost({
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.pointFeaturesMaterializer.noteStoreEntry(result.entry);
    const att = host.attachForProductInstant(NOW);
    const layer = createDynamicPointFeaturesOverlayLayer({
      sceneLayerId: "earthquakes",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(NOW, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(false);
    expect(state.metadata?.reason).toBe("fixture-not-live");
    expect(
      earthquakeConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: true,
        lifecycleState: "ready",
        provenance: resolveEarthquakeProvenance({
          originStamp: "fixture",
          acquiredAtMs: NOW,
          productUtcMs: NOW,
          lifecycleState: "ready",
          versionId: "eq-opt-in-fixture",
        }),
      }),
    ).toBe("fixture");
    host.dispose();
  });

  it("times out a hung USGS request so loading can resolve", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async (_url, init) => {
      await new Promise<void>((_, reject) => {
        init?.signal?.addEventListener("abort", () => {
          reject(new DOMException("Aborted", "AbortError"));
        });
      });
      throw new Error("unreachable");
    });
    const adapter = createEarthquakesLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => NOW,
      timeoutMs: 40,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("timeout");
  });

  it("enable → live acquire paints without fixture substitution", async () => {
    const fetchFn = vi.fn(usgsLiveOkFetch(NOW));
    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: fetchFn,
      nowMs: () => NOW,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureEarthquakesConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(
        host.attachForProductInstant(NOW).getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID),
      ).not.toBeNull();
    });
    const att = host.attachForProductInstant(NOW);
    const view = att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID);
    expect(view?.origin).toBe("live");
    const layer = createDynamicPointFeaturesOverlayLayer({
      sceneLayerId: "earthquakes",
      sourceId: USGS_EARTHQUAKES_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(NOW, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(true);
    expect(state.metadata?.earthquakeProvenance).toMatchObject({
      origin: "live",
      freshnessBand: "fresh",
    });
    expect(
      earthquakeConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: true,
        lifecycleState: "loading",
        provenance: null,
      }),
    ).toBe("loading");
    host.dispose();
  });
});
