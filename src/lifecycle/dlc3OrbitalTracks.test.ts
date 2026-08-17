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

import { describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { createDynamicTracksOverlayLayer } from "../layers/dynamicTracksOverlayLayer";
import { isDynamicTracksPayload } from "../layers/dynamicTracksPayload";
import {
  ISS_ORBITAL_TRACK_LIVE_FEED_URL,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  createDynamicDataLifecycleHost,
  getDynamicTracksSourceCatalogEntry,
  produceIssOrbitalTrackFixtureAcquisition,
  type LiveHttpFetchFn,
} from "./index";

const SAMPLE_ISS_TLE_3LE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
].join("\n");

const SAMPLE_TLE_CENTER_MS = Date.UTC(2026, 7, 6, 1, 17, 0);

function mockTleOk(): Response {
  const body = new TextEncoder().encode(SAMPLE_ISS_TLE_3LE);
  const headers = new Headers();
  headers.set("content-type", "text/plain; charset=UTF-8");
  return {
    ok: true,
    status: 200,
    headers,
    url: ISS_ORBITAL_TRACK_LIVE_FEED_URL,
    arrayBuffer: async () =>
      body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength),
  } as Response;
}

describe("DLC-3 ISS orbital tracks consumer boundary", () => {
  it("catalog exposes durable sourceId with attribution (not a CDN URL)", () => {
    const entry = getDynamicTracksSourceCatalogEntry(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(entry).not.toBeNull();
    expect(entry!.sourceId).toBe("iss-orbital-track-v1");
    expect(entry!.kind).toBe("tracks");
    expect(entry!.attribution.length).toBeGreaterThan(20);
    expect(entry!.sourceId.includes("://")).toBe(false);
  });

  it("fixture acquisition yields real-format ISS-shaped GeoJSON timed LineString bytes", () => {
    const result = produceIssOrbitalTrackFixtureAcquisition({
      nowMs: () => 1_700_000_000_000,
      versionIdFor: () => "iss-track-test-1",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.entry.record.meta.sourceId).toBe(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(result.entry.record.body.kind).toBe("tracks");
    if (result.entry.record.body.kind === "tracks") {
      expect(result.entry.record.body.tracks.length).toBe(1);
      expect(result.entry.record.body.tracks[0]!.samples.length).toBeGreaterThanOrEqual(5);
    }
    expect(result.entry.payloadBytes?.byteLength).toBeGreaterThan(40);
    const text = new TextDecoder().decode(result.entry.payloadBytes);
    const parsed = JSON.parse(text) as {
      type: string;
      features: Array<{
        geometry: { type: string; coordinates: unknown[] };
        properties: { times?: unknown[] };
      }>;
    };
    expect(parsed.type).toBe("FeatureCollection");
    expect(Array.isArray(parsed.features)).toBe(true);
    expect(parsed.features[0]!.geometry.type).toBe("LineString");
    expect(parsed.features[0]!.geometry.coordinates.length).toBeGreaterThanOrEqual(5);
    expect(Array.isArray(parsed.features[0]!.properties.times)).toBe(true);
    expect(result.entry.record.meta.attribution).toBeTruthy();
  });

  it("host arms consumer, materializes sync view, and scrub resolve does not re-acquire", async () => {
    const acquireSpy = vi.fn();
    const timers: Array<{ id: number; handler: () => void }> = [];
    let nextTimerId = 1;
    // Avoid real network: injectable CelesTrak TLE bytes (production has no fixture fallback).
    const orbitalTracksLiveFetchFn: LiveHttpFetchFn = vi.fn(async () => mockTleOk());
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn,
      nowMs: () => SAMPLE_TLE_CENTER_MS,
      setIntervalFn: (handler) => {
        const id = nextTimerId++;
        timers.push({ id, handler });
        return id;
      },
      clearIntervalFn: (handle) => {
        const idx = timers.findIndex((t) => t.id === handle);
        if (idx >= 0) timers.splice(idx, 1);
      },
    });

    const originalRegister = host.acquisition.registerAdapter.bind(host.acquisition);
    host.acquisition.registerAdapter = (adapter) => {
      originalRegister({
        sourceId: adapter.sourceId,
        acquire: async (signal) => {
          acquireSpy();
          return adapter.acquire(signal);
        },
      });
    };

    host.ensureOrbitalTracksConsumer({
      intervalMs: 60_000,
      runImmediately: true,
    });

    await vi.waitFor(() => {
      const att = host.attachForProductInstant(SAMPLE_TLE_CENTER_MS);
      expect(att.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID)).not.toBeNull();
    });

    const acquiresAfterArm = acquireSpy.mock.calls.length;
    expect(acquiresAfterArm).toBeGreaterThanOrEqual(1);
    expect(orbitalTracksLiveFetchFn).toHaveBeenCalled();

    const productA = SAMPLE_TLE_CENTER_MS;
    const productB = productA + 3_600_000;
    const attA = host.attachForProductInstant(productA);
    const attB = host.attachForProductInstant(productB);
    const viewA = attA.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID);
    const viewB = attB.getPreparedTracks(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(viewA).not.toBeNull();
    expect(viewB).not.toBeNull();
    expect(viewA!.tracks[0]!.samples.length).toBeGreaterThan(0);
    expect(acquireSpy.mock.calls.length).toBe(acquiresAfterArm);

    const resolved = await attA.resolveSnapshot(ISS_ORBITAL_TRACK_SOURCE_ID);
    expect(resolved.status).toBe("ok");
    expect(acquireSpy.mock.calls.length).toBe(acquiresAfterArm);

    host.dispose();
  });

  it("Model B layer getState reads prepared view sync and never calls resolveSnapshot", async () => {
    const orbitalTracksLiveFetchFn: LiveHttpFetchFn = vi.fn(async () => mockTleOk());
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn,
      nowMs: () => SAMPLE_TLE_CENTER_MS,
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

    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
      opacity: 0.95,
    });

    const attachment = host.attachForProductInstant(SAMPLE_TLE_CENTER_MS);
    const resolveSpy = vi.spyOn(attachment, "resolveSnapshot");
    const time = createTimeContext(SAMPLE_TLE_CENTER_MS, 0, false, {
      dynamicDataLifecycle: attachment,
    });
    const state = layer.getState(time);
    expect(state.visible).toBe(true);
    expect(isDynamicTracksPayload(state.data)).toBe(true);
    if (isDynamicTracksPayload(state.data)) {
      expect(state.data.tracks.length).toBeGreaterThan(0);
      expect(state.data.tracks[0]!.samples[0]!.lonDeg).toBeDefined();
    }
    expect(resolveSpy).not.toHaveBeenCalled();

    const cold = layer.getState(createTimeContext(SAMPLE_TLE_CENTER_MS, 0, false));
    expect(cold.visible).toBe(false);

    host.dispose();
  });
});
