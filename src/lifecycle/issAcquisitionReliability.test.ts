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
 * LIB-040 — ISS acquisition reliability: immediate first fetch, timeout,
 * ordered live failover, in-session cache re-enable, no fixture-as-live.
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { createDynamicTracksOverlayLayer } from "../layers/dynamicTracksOverlayLayer";
import { isDynamicTracksPayload } from "../layers/dynamicTracksPayload";
import {
  ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS,
  ISS_ORBITAL_TRACK_LIVE_FEED_URL,
  ISS_ORBITAL_TRACK_SECONDARY_LIVE_FEED_URL,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  ISS_ORIGIN_PROPERTY,
  ISS_TLE_ACQUIRE_TIMEOUT_MS,
  ISS_TLE_FAILURE_RETRY_MS,
  ISS_TLE_LIVE_PROVIDERS,
  ISS_TLE_PROVIDER_PROPERTY,
  armDynamicLifecycleConsumers,
  createDynamicDataLifecycleHost,
  createIssOrbitalTrackLiveHttpAcquisitionAdapter,
  issConfigStatusHint,
  parseIssTleBytes,
  produceIssOrbitalTrackLiveAcquisitionFromFetched,
  propagateIssGroundTrackFromTle,
  propagateIssPositionAtTime,
  type DynamicLifecycleConsumerFlags,
  type LiveHttpFetchFn,
  type LiveHttpFetchOk,
} from "./index";

const SAMPLE_ISS_TLE_3LE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
].join("\n");

const EPOCH_MS = Date.UTC(2026, 7, 6, 1, 17, 0);
const WALL_MS = 1_724_000_000_000;
const HISTORICAL_MS = Date.UTC(2017, 7, 21, 18, 25, 30);

function encodeIssTle(text: string = SAMPLE_ISS_TLE_3LE): Uint8Array {
  return new TextEncoder().encode(text);
}

function mockTleResponse(options: {
  body: Uint8Array;
  ok?: boolean;
  status?: number;
  url?: string;
}): Response {
  const ok = options.ok !== false;
  const status = options.status ?? (ok ? 200 : 500);
  const headers = new Headers();
  headers.set("content-type", "text/plain; charset=UTF-8");
  return {
    ok,
    status,
    headers,
    url: options.url ?? ISS_ORBITAL_TRACK_LIVE_FEED_URL,
    arrayBuffer: async () =>
      options.body.buffer.slice(
        options.body.byteOffset,
        options.body.byteOffset + options.body.byteLength,
      ),
  } as Response;
}

function hangingFetch(): LiveHttpFetchFn {
  return (_url, init) =>
    new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => {
        reject(new DOMException("The operation was aborted.", "AbortError"));
      });
    });
}

const ALL_OFF: DynamicLifecycleConsumerFlags = {
  cloudsIrOverlay: false,
  cloudParticipationOn: false,
  earthquakes: false,
  orbitalTracks: false,
};

describe("LIB-040 ISS acquisition reliability", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("catalog TLE refresh is 2 hours, not 1 minute", () => {
    expect(ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS).toBe(
      2 * 60 * 60 * 1000,
    );
    expect(ISS_TLE_ACQUIRE_TIMEOUT_MS).toBe(8_000);
    expect(ISS_TLE_FAILURE_RETRY_MS).toBe(5 * 60 * 1000);
    expect(ISS_TLE_LIVE_PROVIDERS.map((p) => p.id)).toEqual([
      "celestrak",
      "wheretheiss-at",
    ]);
    expect(ISS_TLE_LIVE_PROVIDERS[1]!.url).toBe(
      ISS_ORBITAL_TRACK_SECONDARY_LIVE_FEED_URL,
    );
  });

  it("fresh enable invokes acquire immediately without advancing the periodic interval", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({ body: encodeIssTle() }),
    );
    const intervalHandlers: Array<() => void> = [];
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => EPOCH_MS,
      setIntervalFn: (handler) => {
        intervalHandlers.push(handler);
        return 1;
      },
      clearIntervalFn: () => undefined,
    });
    host.ensureOrbitalTracksConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(fetchFn).toHaveBeenCalled();
    });
    expect(intervalHandlers).toHaveLength(1);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(String((fetchFn as ReturnType<typeof vi.fn>).mock.calls[0]![0])).toBe(
      ISS_ORBITAL_TRACK_LIVE_FEED_URL,
    );
    host.dispose();
  });

  it("scheduled refresh does not drive first-paint: runImmediately false waits for the interval", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({ body: encodeIssTle() }),
    );
    let tick: (() => void) | undefined;
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => EPOCH_MS,
      setIntervalFn: (handler) => {
        tick = handler;
        return 1;
      },
      clearIntervalFn: () => undefined,
    });
    host.ensureOrbitalTracksConsumer({ runImmediately: false });
    expect(fetchFn).not.toHaveBeenCalled();
    tick?.();
    await vi.waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });
    host.dispose();
  });

  it("acquisition success stores a live snapshot and paints ISS", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({ body: encodeIssTle() }),
    );
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => EPOCH_MS,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureOrbitalTracksConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(EPOCH_MS)
          .getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID),
      ).not.toBeNull();
    });
    const att = host.attachForProductInstant(EPOCH_MS);
    const view = att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(view!.tracks[0]!.properties?.[ISS_ORIGIN_PROPERTY]).toBe("live-tle");
    expect(view!.tracks[0]!.properties?.[ISS_TLE_PROVIDER_PROPERTY]).toBe(
      "celestrak",
    );
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(EPOCH_MS, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(true);
    expect(isDynamicTracksPayload(state.data)).toBe(true);
    host.dispose();
  });

  it("primary 403 fails over to secondary in the same cycle with WTIA provenance", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async (url) => {
      if (String(url).includes("celestrak")) {
        return mockTleResponse({
          body: new Uint8Array(),
          ok: false,
          status: 403,
        });
      }
      return mockTleResponse({
        body: encodeIssTle(),
        url: ISS_ORBITAL_TRACK_SECONDARY_LIVE_FEED_URL,
      });
    });
    const adapter = createIssOrbitalTrackLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => EPOCH_MS,
      versionIdFor: () => "iss-wtia",
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok || result.entry.record.body.kind !== "tracks") return;
    expect(fetchFn).toHaveBeenCalledTimes(2);
    const calls = (fetchFn as ReturnType<typeof vi.fn>).mock.calls;
    expect(String(calls[0]![0])).toBe(ISS_ORBITAL_TRACK_LIVE_FEED_URL);
    expect(String(calls[1]![0])).toBe(
      ISS_ORBITAL_TRACK_SECONDARY_LIVE_FEED_URL,
    );
    expect(result.entry.record.body.tracks[0]!.properties?.[ISS_TLE_PROVIDER_PROPERTY]).toBe(
      "wheretheiss-at",
    );
    expect(result.entry.record.body.tracks[0]!.properties?.[ISS_ORIGIN_PROPERTY]).toBe(
      "live-tle",
    );
    expect(result.entry.record.meta.attribution?.toLowerCase()).toContain(
      "where the iss at",
    );
  });

  it("all live providers failing leaves ISS unavailable with no fixture", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("all-providers-down");
    });
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => EPOCH_MS,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
      setTimeoutFn: () => 1,
      clearTimeoutFn: () => undefined,
    });
    host.ensureOrbitalTracksConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(host.lifecycle.getState(ISS_ORBITAL_TRACK_SOURCE_ID).state).toBe(
        "error",
      );
    });
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(
      2,
    );
    const att = host.attachForProductInstant(EPOCH_MS);
    expect(att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID)).toBeNull();
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(EPOCH_MS, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(false);
    expect(state.data).toBeNull();
    expect(
      issConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: true,
        lifecycleState: "error",
        provenance: null,
      }),
    ).toBe("unavailable");
    host.dispose();
  });

  it("re-enable with a usable in-memory live TLE presents immediately without waiting for refresh", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({ body: encodeIssTle() }),
    );
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => EPOCH_MS,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureOrbitalTracksConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(EPOCH_MS)
          .getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID),
      ).not.toBeNull();
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    host.stopOrbitalTracksConsumer();
    const afterDisable = host
      .attachForProductInstant(EPOCH_MS)
      .getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(afterDisable).not.toBeNull();
    host.ensureOrbitalTracksConsumer({ runImmediately: true });
    const att = host.attachForProductInstant(EPOCH_MS);
    expect(att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID)).not.toBeNull();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(EPOCH_MS, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(true);
    host.dispose();
  });

  it("provider hang times out and fails over in the same cycle", async () => {
    vi.useFakeTimers();
    const fetchFn: LiveHttpFetchFn = vi.fn(async (url, init) => {
      if (String(url).includes("celestrak")) {
        return hangingFetch()(url, init);
      }
      return mockTleResponse({
        body: encodeIssTle(),
        url: ISS_ORBITAL_TRACK_SECONDARY_LIVE_FEED_URL,
      });
    });
    const adapter = createIssOrbitalTrackLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => EPOCH_MS,
      timeoutMs: 40,
      versionIdFor: () => "iss-timeout-failover",
    });
    const pending = adapter.acquire();
    await vi.advanceTimersByTimeAsync(40);
    const result = await pending;
    expect(result.ok).toBe(true);
    if (!result.ok || result.entry.record.body.kind !== "tracks") return;
    expect(result.entry.record.body.tracks[0]!.properties?.[ISS_TLE_PROVIDER_PROPERTY]).toBe(
      "wheretheiss-at",
    );
  });

  it("historical product time does not acquire; return to live re-arms immediately", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({ body: encodeIssTle() }),
    );
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => WALL_MS,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    armDynamicLifecycleConsumers(host, {
      ...ALL_OFF,
      orbitalTracks: true,
      productTimeLiveEnough: false,
    });
    expect(fetchFn).not.toHaveBeenCalled();
    expect(host.acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(
      false,
    );
    expect(
      issConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: false,
        lifecycleState: "idle",
        provenance: null,
      }),
    ).toBeNull();

    armDynamicLifecycleConsumers(host, {
      ...ALL_OFF,
      orbitalTracks: true,
      productTimeLiveEnough: true,
    });
    await vi.waitFor(() => {
      expect(fetchFn).toHaveBeenCalled();
    });
    expect(host.acquisition.isPeriodicActive(ISS_ORBITAL_TRACK_SOURCE_ID)).toBe(
      true,
    );
    const historical = host.attachForProductInstant(HISTORICAL_MS, {
      wallClockUtcMs: WALL_MS,
    });
    expect(historical.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID)).toBeNull();
    host.dispose();
  });

  it("parse + one SGP4 sample + full track generation are tiny vs network", () => {
    const t0 = performance.now();
    const parsed = parseIssTleBytes(encodeIssTle());
    const tParse = performance.now();
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const sample = propagateIssPositionAtTime(parsed, EPOCH_MS);
    const tSample = performance.now();
    expect(sample.ok).toBe(true);
    const track = propagateIssGroundTrackFromTle(parsed, {
      centerTimeMs: EPOCH_MS,
    });
    const tTrack = performance.now();
    expect(track.ok).toBe(true);
    const fetched: LiveHttpFetchOk = {
      ok: true,
      bytes: encodeIssTle(),
      contentType: "text/plain",
      responseUrl: ISS_ORBITAL_TRACK_LIVE_FEED_URL,
      status: 200,
    };
    const produced = produceIssOrbitalTrackLiveAcquisitionFromFetched(fetched, {
      nowMs: () => EPOCH_MS,
      versionIdFor: () => "iss-cost",
    });
    const tProduce = performance.now();
    expect(produced.ok).toBe(true);
    expect(tParse - t0).toBeLessThan(20);
    expect(tSample - tParse).toBeLessThan(20);
    expect(tTrack - tSample).toBeLessThan(50);
    expect(tProduce - tTrack).toBeLessThan(50);
  });

  it("failure retry is scheduled at 5 minutes, not the 2-hour cadence", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("iss-fail-retry");
    });
    const timeouts: number[] = [];
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => EPOCH_MS,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
      setTimeoutFn: (_handler, timeout) => {
        timeouts.push(timeout);
        return 1;
      },
      clearTimeoutFn: () => undefined,
    });
    host.ensureOrbitalTracksConsumer({
      intervalMs: ISS_ORBITAL_TRACK_DEFAULT_REFRESH_INTERVAL_MS,
      runImmediately: true,
    });
    await vi.waitFor(() => {
      expect(timeouts).toContain(ISS_TLE_FAILURE_RETRY_MS);
    });
    host.dispose();
  });
});
