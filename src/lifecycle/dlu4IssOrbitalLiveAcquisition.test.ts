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
 * DLU-4 — live ISS orbital track acquisition under durable `iss-orbital-track-v1`.
 * Prove TLE parse, SGP4 ground-track propagate, live HTTP adapter, fixture
 * fallback, host wiring, and no fetch on resolve / paint path.
 */

import { describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { createDynamicTracksOverlayLayer } from "../layers/dynamicTracksOverlayLayer";
import { isDynamicTracksPayload } from "../layers/dynamicTracksPayload";
import {
  ISS_ORBITAL_TRACK_LIVE_FEED_URL,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  createDynamicDataLifecycleHost,
  createIssOrbitalTrackLiveHttpAcquisitionAdapter,
  getDynamicTracksSourceCatalogEntry,
  parseIssTleBytes,
  produceIssOrbitalTrackLiveAcquisitionFromFetched,
  propagateIssGroundTrackFromTle,
  type LiveHttpFetchFn,
  type LiveHttpFetchOk,
} from "./index";

/**
 * Recorded CelesTrak-shaped 3LE for ISS (NORAD 25544).
 * Epoch ~2026 day 218 (≈ Aug 6) — used with matching centerTimeMs in tests.
 */
const SAMPLE_ISS_TLE_3LE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
].join("\n");

/** Center time near the sample TLE epoch (2026-08-06 ~01:17 UTC). */
const SAMPLE_TLE_CENTER_MS = Date.UTC(2026, 7, 6, 1, 17, 0);

function encodeIssTle(text: string = SAMPLE_ISS_TLE_3LE): Uint8Array {
  return new TextEncoder().encode(text);
}

function mockTleResponse(options: {
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
      options.contentType ?? "text/plain; charset=UTF-8",
    );
  }
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

describe("DLU-4 live ISS orbital track acquisition", () => {
  it("catalog still exposes durable sourceId (not the live feed URL)", () => {
    const entry = getDynamicTracksSourceCatalogEntry(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(entry).not.toBeNull();
    expect(entry!.sourceId).toBe("iss-orbital-track-v1");
    expect(entry!.sourceId.includes("://")).toBe(false);
    expect(ISS_ORBITAL_TRACK_LIVE_FEED_URL.startsWith("https://")).toBe(true);
    expect(entry!.attribution.toLowerCase()).toContain("celestrak");
  });

  it("parses CelesTrak 3LE text into name + two element lines", () => {
    const parsed = parseIssTleBytes(encodeIssTle());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.name).toContain("ISS");
    expect(parsed.line1.startsWith("1 ")).toBe(true);
    expect(parsed.line2.startsWith("2 ")).toBe(true);
    expect(parsed.line1).toContain("25544");
  });

  it("parses 2LE without a name line", () => {
    const twoLe = [
      "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
      "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
    ].join("\n");
    const parsed = parseIssTleBytes(encodeIssTle(twoLe));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.line1.startsWith("1 ")).toBe(true);
    expect(parsed.line2.startsWith("2 ")).toBe(true);
  });

  it("rejects empty or malformed TLE bodies", () => {
    expect(parseIssTleBytes(new Uint8Array())).toEqual({
      ok: false,
      error: "empty tle body",
    });
    expect(parseIssTleBytes(encodeIssTle("not a tle"))).toEqual({
      ok: false,
      error: "expected at least two TLE lines",
    });
    expect(
      parseIssTleBytes(
        encodeIssTle("X 25544\nY 25544  51.6321  53.3065 0007216"),
      ),
    ).toEqual({
      ok: false,
      error: "invalid TLE line prefixes",
    });
  });

  it("propagates SGP4 ground-track samples within ISS inclination band", () => {
    const parsed = parseIssTleBytes(encodeIssTle());
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const track = propagateIssGroundTrackFromTle(parsed, {
      centerTimeMs: SAMPLE_TLE_CENTER_MS,
      lookbackMs: 20 * 60 * 1000,
      lookaheadMs: 0,
      sampleStepMs: 2 * 60 * 1000,
    });
    expect(track.ok).toBe(true);
    if (!track.ok) return;
    expect(track.samples.length).toBeGreaterThanOrEqual(5);
    for (const s of track.samples) {
      expect(s.lonDeg).toBeGreaterThanOrEqual(-180);
      expect(s.lonDeg).toBeLessThanOrEqual(180);
      expect(s.latDeg).toBeGreaterThanOrEqual(-52.5);
      expect(s.latDeg).toBeLessThanOrEqual(52.5);
      expect(Number.isFinite(s.timeMs)).toBe(true);
    }
  });

  it("live adapter maps TLE HTTP bytes to store entry under durable sourceId", async () => {
    const bytes = encodeIssTle();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({ body: bytes }),
    );
    const adapter = createIssOrbitalTrackLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => SAMPLE_TLE_CENTER_MS,
      versionIdFor: () => "iss-track-live-test-1",
      useFixtureFallback: false,
      lookbackMs: 20 * 60 * 1000,
      lookaheadMs: 0,
      sampleStepMs: 2 * 60 * 1000,
    });

    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.sourceId).toBe(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(result.entry.record.meta.versionId).toBe("iss-track-live-test-1");
    expect(result.entry.record.body.kind).toBe("tracks");
    if (result.entry.record.body.kind === "tracks") {
      expect(result.entry.record.body.tracks.length).toBe(1);
      expect(result.entry.record.body.tracks[0]!.samples.length).toBeGreaterThanOrEqual(
        5,
      );
    }
    expect(result.entry.record.meta.attribution).toBeTruthy();
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const callUrl = (fetchFn as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(callUrl).toBe(ISS_ORBITAL_TRACK_LIVE_FEED_URL);
  });

  it("live adapter may still fall back to fixture when tests opt in", async () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({
        body: new Uint8Array(),
        ok: false,
        status: 503,
      }),
    );
    const adapter = createIssOrbitalTrackLiveHttpAcquisitionAdapter({
      fetchFn,
      nowMs: () => 1_700_000_400_000,
      versionIdFor: () => "iss-track-fixture-fallback",
      useFixtureFallback: true,
    });

    const result = await adapter.acquire();
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.versionId).toBe(
      "iss-track-fixture-fallback",
    );
    expect(result.entry.record.body.kind).toBe("tracks");
    if (result.entry.record.body.kind === "tracks") {
      expect(result.entry.record.body.tracks[0]!.samples.length).toBeGreaterThanOrEqual(
        5,
      );
    }
  });

  it("produceIssOrbitalTrackLiveAcquisitionFromFetched stamps catalog attribution", () => {
    const fetched: LiveHttpFetchOk = {
      ok: true,
      bytes: encodeIssTle(),
      contentType: "text/plain",
      responseUrl: ISS_ORBITAL_TRACK_LIVE_FEED_URL,
      status: 200,
    };
    const result = produceIssOrbitalTrackLiveAcquisitionFromFetched(fetched, {
      nowMs: () => SAMPLE_TLE_CENTER_MS,
      versionIdFor: () => "from-fetched",
      lookbackMs: 10 * 60 * 1000,
      lookaheadMs: 0,
      sampleStepMs: 2 * 60 * 1000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.validTimeMs).toBe(SAMPLE_TLE_CENTER_MS);
    expect(result.entry.record.meta.attribution?.toLowerCase()).toContain(
      "celestrak",
    );
  });

  it("host arms live consumer, materializes tracks, resolve does not re-fetch", async () => {
    const bytes = encodeIssTle();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () =>
      mockTleResponse({ body: bytes }),
    );
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });

    host.ensureOrbitalTracksConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });

    await vi.waitFor(() => {
      expect(
        host
          .attachForProductInstant(SAMPLE_TLE_CENTER_MS)
          .getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID),
      ).not.toBeNull();
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    const fetchesAfterArm = (fetchFn as ReturnType<typeof vi.fn>).mock.calls
      .length;

    const att = host.attachForProductInstant(SAMPLE_TLE_CENTER_MS);
    const view = att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(view).not.toBeNull();
    expect(view!.tracks.length).toBe(1);
    expect(view!.tracks[0]!.samples.length).toBeGreaterThanOrEqual(5);

    const resolved = await att.resolveSnapshot(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(resolved.status).toBe("ok");
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      fetchesAfterArm,
    );

    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
      opacity: 0.95,
    });
    const resolveSpy = vi.spyOn(att, "resolveSnapshot");
    const state = layer.getState(
      createTimeContext(SAMPLE_TLE_CENTER_MS, 0, false, {
        dynamicDataLifecycle: att,
      }),
    );
    expect(state.visible).toBe(true);
    expect(isDynamicTracksPayload(state.data)).toBe(true);
    expect(resolveSpy).not.toHaveBeenCalled();
    expect((fetchFn as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      fetchesAfterArm,
    );

    host.dispose();
  });
});
