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
 * LIB-036 — ISS provenance, TLE freshness bands, and no fixture-as-live.
 */

import { describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { createDynamicTracksOverlayLayer } from "../layers/dynamicTracksOverlayLayer";
import { isDynamicTracksPayload } from "../layers/dynamicTracksPayload";
import {
  ISS_ORBITAL_TRACK_LIVE_FEED_URL,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  ISS_ORIGIN_PROPERTY,
  ISS_TLE_DEGRADED_MAX_AGE_MS,
  ISS_TLE_FRESH_MAX_AGE_MS,
  ISS_TLE_LINE1_PROPERTY,
  ISS_TLE_LINE2_PROPERTY,
  createDynamicDataLifecycleHost,
  createIssOrbitalTrackLiveHttpAcquisitionAdapter,
  issConfigStatusHint,
  issTleEpochUnixMs,
  issTleFreshnessBandFromAgeMs,
  issTrackShouldPaint,
  parseIssTleBytes,
  produceIssOrbitalTrackFixtureAcquisition,
  produceIssOrbitalTrackLiveAcquisitionFromFetched,
  propagateIssPositionAtTime,
  resolveIssCurrentSample,
  resolveIssTrackProvenance,
  type IssTrackProvenance,
  type LiveHttpFetchFn,
  type LiveHttpFetchOk,
} from "./index";

const SAMPLE_ISS_TLE_3LE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
].join("\n");

const TLE = {
  name: "ISS (ZARYA)",
  line1: "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  line2: "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
};

const EPOCH_MS = issTleEpochUnixMs(TLE)!;

function encodeIssTle(text: string = SAMPLE_ISS_TLE_3LE): Uint8Array {
  return new TextEncoder().encode(text);
}

function mockTleResponse(options: {
  body: Uint8Array;
  ok?: boolean;
  status?: number;
}): Response {
  const ok = options.ok !== false;
  const status = options.status ?? (ok ? 200 : 500);
  const headers = new Headers();
  headers.set("content-type", "text/plain; charset=UTF-8");
  return {
    ok,
    status,
    headers,
    url: ISS_ORBITAL_TRACK_LIVE_FEED_URL,
    arrayBuffer: async () =>
      options.body.buffer.slice(
        options.body.byteOffset,
        options.body.byteOffset + options.body.byteLength,
      ),
  } as Response;
}

function liveFetched(): LiveHttpFetchOk {
  return {
    ok: true,
    status: 200,
    bytes: encodeIssTle(),
    contentType: "text/plain",
    responseUrl: ISS_ORBITAL_TRACK_LIVE_FEED_URL,
  };
}

function haversineKm(
  a: { latDeg: number; lonDeg: number },
  b: { latDeg: number; lonDeg: number },
): number {
  const R = 6371;
  const dLat = ((b.latDeg - a.latDeg) * Math.PI) / 180;
  const dLon = ((b.lonDeg - a.lonDeg) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latDeg * Math.PI) / 180) *
      Math.cos((b.latDeg * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function provenanceOf(
  properties: Readonly<Record<string, unknown>> | undefined,
  productUtcMs: number,
  lifecycleState: "idle" | "loading" | "ready" | "stale" | "error",
  acquiredAtMs = productUtcMs,
): IssTrackProvenance {
  return resolveIssTrackProvenance({
    track: { properties },
    acquiredAtMs,
    productUtcMs,
    lifecycleState,
  });
}

describe("LIB-036 ISS TLE freshness bands", () => {
  it("classifies ≤18h fresh, 18–48h degraded, >48h excessively stale", () => {
    expect(issTleFreshnessBandFromAgeMs(0)).toBe("fresh");
    expect(issTleFreshnessBandFromAgeMs(ISS_TLE_FRESH_MAX_AGE_MS)).toBe("fresh");
    expect(issTleFreshnessBandFromAgeMs(ISS_TLE_FRESH_MAX_AGE_MS + 1)).toBe(
      "degraded",
    );
    expect(issTleFreshnessBandFromAgeMs(ISS_TLE_DEGRADED_MAX_AGE_MS)).toBe(
      "degraded",
    );
    expect(issTleFreshnessBandFromAgeMs(ISS_TLE_DEGRADED_MAX_AGE_MS + 1)).toBe(
      "excessively-stale",
    );
    expect(issTleFreshnessBandFromAgeMs(-60_000)).toBe("fresh");
  });
});

describe("LIB-036 ISS provenance", () => {
  it("stamps live TLE origin, epoch, acquisition, age, and SGP4 product UTC", () => {
    const productUtcMs = EPOCH_MS + 60 * 60 * 1000;
    const result = produceIssOrbitalTrackLiveAcquisitionFromFetched(liveFetched(), {
      nowMs: () => productUtcMs,
      versionIdFor: () => "iss-prov-live",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.body.kind).toBe("tracks");
    if (result.entry.record.body.kind !== "tracks") return;
    const track = result.entry.record.body.tracks[0]!;
    expect(track.properties?.[ISS_ORIGIN_PROPERTY]).toBe("live-tle");
    expect(typeof track.properties?.[ISS_TLE_LINE1_PROPERTY]).toBe("string");
    const p = provenanceOf(track.properties, productUtcMs, "ready");
    expect(p.origin).toBe("live-tle");
    expect(p.tleEpochUtcMs).toBe(EPOCH_MS);
    expect(p.acquiredAtMs).toBe(productUtcMs);
    expect(p.ageMs).toBe(60 * 60 * 1000);
    expect(p.freshnessBand).toBe("fresh");
    expect(p.propagatedProductUtcMs).toBe(productUtcMs);
    expect(issTrackShouldPaint(p)).toBe(true);
  });

  it("stamps fixture origin and never paints it as the current ISS", () => {
    const result = produceIssOrbitalTrackFixtureAcquisition({
      nowMs: () => EPOCH_MS,
      versionIdFor: () => "iss-prov-fixture",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    if (result.entry.record.body.kind !== "tracks") return;
    const track = result.entry.record.body.tracks[0]!;
    expect(track.properties?.[ISS_ORIGIN_PROPERTY]).toBe("fixture");
    const p = provenanceOf(track.properties, EPOCH_MS, "ready");
    expect(p.origin).toBe("fixture");
    expect(p.tleEpochUtcMs).toBeNull();
    expect(p.freshnessBand).toBeNull();
    expect(issTrackShouldPaint(p)).toBe(false);
  });

  it("marks last-good live TLE as cached when lifecycle is stale, and still paints while fresh", () => {
    const productUtcMs = EPOCH_MS + 2 * 60 * 60 * 1000;
    const p = provenanceOf(
      {
        [ISS_ORIGIN_PROPERTY]: "live-tle",
        [ISS_TLE_LINE1_PROPERTY]: TLE.line1,
        [ISS_TLE_LINE2_PROPERTY]: TLE.line2,
      },
      productUtcMs,
      "stale",
    );
    expect(p.origin).toBe("cached-live-tle");
    expect(p.freshnessBand).toBe("fresh");
    expect(issTrackShouldPaint(p)).toBe(true);
  });

  it("paints degraded TLE but not as live; suppresses excessively stale", () => {
    const degraded = provenanceOf(
      {
        [ISS_ORIGIN_PROPERTY]: "live-tle",
        [ISS_TLE_LINE1_PROPERTY]: TLE.line1,
        [ISS_TLE_LINE2_PROPERTY]: TLE.line2,
      },
      EPOCH_MS + 24 * 60 * 60 * 1000,
      "ready",
    );
    expect(degraded.freshnessBand).toBe("degraded");
    expect(issTrackShouldPaint(degraded)).toBe(true);
    expect(
      issConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: true,
        lifecycleState: "ready",
        provenance: degraded,
      }),
    ).toBe("degraded");

    const stale = provenanceOf(
      {
        [ISS_ORIGIN_PROPERTY]: "live-tle",
        [ISS_TLE_LINE1_PROPERTY]: TLE.line1,
        [ISS_TLE_LINE2_PROPERTY]: TLE.line2,
      },
      EPOCH_MS + 49 * 60 * 60 * 1000,
      "ready",
    );
    expect(stale.freshnessBand).toBe("excessively-stale");
    expect(issTrackShouldPaint(stale)).toBe(false);
    expect(
      issConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: true,
        lifecycleState: "ready",
        provenance: stale,
      }),
    ).toBe("unavailable");
  });

  it("marker remains SGP4 at product UTC, not track endpoints", () => {
    const productUtcMs = EPOCH_MS + 10 * 60 * 1000;
    const result = produceIssOrbitalTrackLiveAcquisitionFromFetched(liveFetched(), {
      nowMs: () => productUtcMs,
      versionIdFor: () => "iss-prov-marker",
    });
    expect(result.ok).toBe(true);
    if (!result.ok || result.entry.record.body.kind !== "tracks") return;
    const track = result.entry.record.body.tracks[0]!;
    const direct = propagateIssPositionAtTime(TLE, productUtcMs);
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    const resolved = resolveIssCurrentSample(track, productUtcMs);
    expect(resolved).not.toBeNull();
    expect(resolved!.timeMs).toBe(productUtcMs);
    expect(resolved!.latDeg).toBeCloseTo(direct.sample.latDeg, 8);
    expect(resolved!.lonDeg).toBeCloseTo(direct.sample.lonDeg, 8);
    const last = track.samples[track.samples.length - 1]!;
    const first = track.samples[0]!;
    expect(haversineKm(resolved!, last)).toBeGreaterThan(50);
    expect(first.timeMs).toBeLessThan(productUtcMs);
  });
});

describe("LIB-036 production ISS fallback", () => {
  it("live adapter does not store fixture when CelesTrak fails (default)", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({ body: new Uint8Array(), ok: false, status: 503 }),
    );
    const adapter = createIssOrbitalTrackLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => EPOCH_MS,
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(false);
  });

  it("host production path leaves ISS unavailable when CelesTrak fails with empty cache", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("celestrak-down");
    });
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => EPOCH_MS,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureOrbitalTracksConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(fetchFn).toHaveBeenCalled();
      expect(host.lifecycle.getState(ISS_ORBITAL_TRACK_SOURCE_ID).state).toBe(
        "error",
      );
    });
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
        lifecycleState: att.getLifecycleState(ISS_ORBITAL_TRACK_SOURCE_ID).state,
        provenance: null,
      }),
    ).toBe("unavailable");
    host.dispose();
  });

  it("opt-in fixture fallback still works for tests and is not labeled live", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({ body: new Uint8Array(), ok: false, status: 503 }),
    );
    const adapter = createIssOrbitalTrackLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => EPOCH_MS,
      useFixtureFallback: true,
      versionIdFor: () => "iss-opt-in-fixture",
    });
    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok || result.entry.record.body.kind !== "tracks") return;
    expect(result.entry.record.body.tracks[0]!.properties?.[ISS_ORIGIN_PROPERTY]).toBe(
      "fixture",
    );
    const p = provenanceOf(
      result.entry.record.body.tracks[0]!.properties,
      EPOCH_MS,
      "ready",
    );
    expect(p.origin).toBe("fixture");
    expect(issTrackShouldPaint(p)).toBe(false);
  });

  it("enable → live acquire → overlay visible without re-toggle; overlay is not fixture", async () => {
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
        host.attachForProductInstant(EPOCH_MS).getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID),
      ).not.toBeNull();
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const att = host.attachForProductInstant(EPOCH_MS);
    const view = att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(view).not.toBeNull();
    expect(view!.tracks[0]!.properties?.[ISS_ORIGIN_PROPERTY]).toBe("live-tle");
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(EPOCH_MS, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(true);
    expect(isDynamicTracksPayload(state.data)).toBe(true);
    expect(state.metadata?.issProvenance).toMatchObject({
      origin: "live-tle",
      freshnessBand: "fresh",
      propagatedProductUtcMs: EPOCH_MS,
    });
    host.dispose();
  });

  it("keeps last-good live TLE as cached after a later CelesTrak failure", async () => {
    let calls = 0;
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      calls += 1;
      if (calls === 1) {
        return mockTleResponse({ body: encodeIssTle() });
      }
      throw new Error("celestrak-later-fail");
    });
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => EPOCH_MS,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.ensureOrbitalTracksConsumer({ runImmediately: true });
    await vi.waitFor(() => {
      expect(
        host.attachForProductInstant(EPOCH_MS).getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID),
      ).not.toBeNull();
    });
    await host.acquisition.refreshNow(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(host.lifecycle.getState(ISS_ORBITAL_TRACK_SOURCE_ID).state).toBe(
      "stale",
    );
    const att = host.attachForProductInstant(EPOCH_MS);
    const view = att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(view).not.toBeNull();
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(EPOCH_MS, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(true);
    expect(state.metadata?.issProvenance).toMatchObject({
      origin: "cached-live-tle",
      freshnessBand: "fresh",
    });
    expect(
      issConfigStatusHint({
        enabled: true,
        productTimeLiveEnough: true,
        lifecycleState: "stale",
        provenance: state.metadata?.issProvenance as IssTrackProvenance,
      }),
    ).toBe("degraded");
    host.dispose();
  });

  it("suppresses overlay when TLE age exceeds 48h; historical product time still hides ISS", async () => {
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
        host.attachForProductInstant(EPOCH_MS).getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID),
      ).not.toBeNull();
    });
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    });
    const staleMs = EPOCH_MS + ISS_TLE_DEGRADED_MAX_AGE_MS + 60_000;
    const staleAtt = host.attachForProductInstant(staleMs);
    const staleState = layer.getState(
      createTimeContext(staleMs, 0, false, { dynamicDataLifecycle: staleAtt }),
    );
    expect(staleState.visible).toBe(false);
    expect(staleState.metadata?.reason).toBe("iss-excessively-stale");

    const historicalMs = Date.UTC(2017, 7, 21, 18, 25, 30);
    const histAtt = host.attachForProductInstant(historicalMs, {
      wallClockUtcMs: EPOCH_MS,
    });
    expect(histAtt.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID)).toBeNull();
    const histState = layer.getState(
      createTimeContext(historicalMs, 0, true, {
        dynamicDataLifecycle: histAtt,
      }),
    );
    expect(histState.visible).toBe(false);
    host.dispose();
  });

  it("fixture overlay is suppressed even if a fixture snapshot is stored", () => {
    const result = produceIssOrbitalTrackFixtureAcquisition({
      nowMs: () => EPOCH_MS,
      versionIdFor: () => "iss-fixture-overlay",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const host = createDynamicDataLifecycleHost({
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.tracksMaterializer.noteStoreEntry(result.entry);
    const att = host.attachForProductInstant(EPOCH_MS);
    expect(att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID)).not.toBeNull();
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(EPOCH_MS, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(false);
    expect(state.metadata?.reason).toBe("iss-fixture-suppressed");
    host.dispose();
  });
});

describe("LIB-036 parse still accepts CelesTrak 3LE", () => {
  it("parses the sample 3LE", () => {
    const parsed = parseIssTleBytes(encodeIssTle());
    expect(parsed.ok).toBe(true);
  });
});
