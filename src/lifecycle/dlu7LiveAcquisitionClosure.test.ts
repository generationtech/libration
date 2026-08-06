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
 * DLU-7 — live acquisition track closure.
 * Smoke the four shipped consumers under durable sourceIds with offline fixture
 * fallback; prove host arm + resolve stay scrub-safe (no fetch on paint path).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import {
  GLOBAL_CLOUDS_IR_SOURCE_ID,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  USGS_EARTHQUAKES_SOURCE_ID,
  createDynamicDataLifecycleHost,
  getDynamicDataLifecycleAttachment,
  type LiveHttpFetchFn,
} from "./index";

const PRODUCT_MS = 1_700_000_700_000;

/** Offline / network-unavailable: live adapters must fall back to fixtures. */
const offlineFetch: LiveHttpFetchFn = async () => {
  throw new Error("offline-dlu7-closure");
};

describe("DLU-7 live acquisition closure", () => {
  const timers: Array<ReturnType<typeof setInterval>> = [];

  afterEach(() => {
    for (const handle of timers) {
      clearInterval(handle);
    }
    timers.length = 0;
  });

  it("documents the four durable consumer sourceIds (live track scope)", () => {
    expect(GLOBAL_CLOUDS_IR_SOURCE_ID).toBe("global-clouds-ir-v1");
    expect(USGS_EARTHQUAKES_SOURCE_ID).toBe("usgs-earthquakes-v1");
    expect(ISS_ORBITAL_TRACK_SOURCE_ID).toBe("iss-orbital-track-v1");
  });

  it("host arms all three live adapters with fixture fallback when offline", async () => {
    const fetchFn = vi.fn(offlineFetch);
    const host = createDynamicDataLifecycleHost({
      cloudsIrLiveFetchFn: fetchFn,
      earthquakesLiveFetchFn: fetchFn,
      orbitalTracksLiveFetchFn: fetchFn,
      nowMs: () => PRODUCT_MS,
      setIntervalFn: (handler, timeout) => {
        const handle = setInterval(handler, timeout);
        timers.push(handle);
        return handle;
      },
      clearIntervalFn: (handle) => {
        clearInterval(handle as ReturnType<typeof setInterval>);
      },
    });

    host.ensureGlobalCloudsIrConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });
    host.ensureEarthquakesConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });
    host.ensureOrbitalTracksConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });

    // Wait until materializers have fixture-backed prepared views (post-acquire).
    await vi.waitFor(() => {
      const att = host.attachForProductInstant(PRODUCT_MS);
      expect(att.getPreparedEquirectRaster(GLOBAL_CLOUDS_IR_SOURCE_ID)).not.toBeNull();
      expect(att.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID)).not.toBeNull();
      expect(att.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID)).not.toBeNull();
      expect(att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID)).not.toBeNull();
    });

    expect(fetchFn.mock.calls.length).toBeGreaterThanOrEqual(3);

    const clouds = await host.resolver.resolveSnapshot(
      GLOBAL_CLOUDS_IR_SOURCE_ID,
      PRODUCT_MS,
    );
    const quakes = await host.resolver.resolveSnapshot(
      USGS_EARTHQUAKES_SOURCE_ID,
      PRODUCT_MS,
    );
    const tracks = await host.resolver.resolveSnapshot(
      ISS_ORBITAL_TRACK_SOURCE_ID,
      PRODUCT_MS,
    );

    expect(clouds.status).toBe("ok");
    expect(clouds.snapshot?.meta.sourceId).toBe(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(clouds.snapshot?.meta.kind).toBe("equirectRaster");

    expect(quakes.status).toBe("ok");
    expect(quakes.snapshot?.meta.sourceId).toBe(USGS_EARTHQUAKES_SOURCE_ID);
    expect(quakes.snapshot?.meta.kind).toBe("pointFeatures");

    expect(tracks.status).toBe("ok");
    expect(tracks.snapshot?.meta.sourceId).toBe(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(tracks.snapshot?.meta.kind).toBe("tracks");

    const fetchCountAfterAcquire = fetchFn.mock.calls.length;

    // Scrub / paint path: TimeContext attachment resolve must not re-fetch.
    const attachment = host.attachForProductInstant(PRODUCT_MS);
    const ctx = createTimeContext(PRODUCT_MS, 16, false, {
      dynamicDataLifecycle: attachment,
    });
    const fromCtx = getDynamicDataLifecycleAttachment(ctx);
    expect(fromCtx).toBe(attachment);

    const resolvedClouds = await fromCtx!.resolveSnapshot(
      GLOBAL_CLOUDS_IR_SOURCE_ID,
    );
    const resolvedQuakes = await fromCtx!.resolveSnapshot(
      USGS_EARTHQUAKES_SOURCE_ID,
    );
    const resolvedTracks = await fromCtx!.resolveSnapshot(
      ISS_ORBITAL_TRACK_SOURCE_ID,
    );

    expect(resolvedClouds.status).toBe("ok");
    expect(resolvedQuakes.status).toBe("ok");
    expect(resolvedTracks.status).toBe("ok");
    expect(fetchFn.mock.calls.length).toBe(fetchCountAfterAcquire);

    // Model A cloud participation reads the same prepared opacity field (no extra sourceId).
    const opacity = fromCtx!.getPreparedCloudOpacity(GLOBAL_CLOUDS_IR_SOURCE_ID);
    expect(opacity).not.toBeNull();
    expect(opacity?.sourceId).toBe(GLOBAL_CLOUDS_IR_SOURCE_ID);

    host.dispose();
  });
});
