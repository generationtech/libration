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
 * LIB-035 — ISS current marker is SGP4 at product UTC, not the future track tip.
 */

import { describe, expect, it } from "vitest";
import { createTimeContext } from "../core/time";
import { createDynamicTracksOverlayLayer } from "../layers/dynamicTracksOverlayLayer";
import { isDynamicTracksPayload } from "../layers/dynamicTracksPayload";
import { buildDynamicTracksRenderPlan } from "../renderer/renderPlan/sceneDynamicTracksPlan";
import {
  ISS_ORBITAL_TRACK_LOOKAHEAD_MS,
  ISS_ORBITAL_TRACK_LOOKBACK_MS,
  ISS_ORBITAL_TRACK_SAMPLE_STEP_MS,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  createDynamicDataLifecycleHost,
  issTleEpochUnixMs,
  parseIssTleBytes,
  produceIssOrbitalTrackLiveAcquisitionFromFetched,
  propagateIssGroundTrackFromTle,
  propagateIssPositionAtTime,
  resolveIssCurrentSample,
  type LiveHttpFetchOk,
} from "./index";

const SAMPLE_ISS_TLE_3LE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
].join("\n");

const CENTER_MS = Date.UTC(2026, 7, 6, 1, 17, 0);

const TLE = {
  name: "ISS (ZARYA)",
  line1: "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  line2: "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
};

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

describe("LIB-035 ISS current-position model", () => {
  it("uses a -60 / +30 minute track window", () => {
    expect(ISS_ORBITAL_TRACK_LOOKBACK_MS).toBe(60 * 60 * 1000);
    expect(ISS_ORBITAL_TRACK_LOOKAHEAD_MS).toBe(30 * 60 * 1000);
    expect(ISS_ORBITAL_TRACK_SAMPLE_STEP_MS).toBe(2 * 60 * 1000);
  });

  it("current sample equals direct SGP4 at product UTC, not last track sample", () => {
    const track = propagateIssGroundTrackFromTle(TLE, { centerTimeMs: CENTER_MS });
    expect(track.ok).toBe(true);
    if (!track.ok) return;

    const first = track.samples[0]!;
    const last = track.samples[track.samples.length - 1]!;
    expect(first.timeMs).toBe(CENTER_MS - ISS_ORBITAL_TRACK_LOOKBACK_MS);
    expect(last.timeMs).toBe(CENTER_MS + ISS_ORBITAL_TRACK_LOOKAHEAD_MS);

    const direct = propagateIssPositionAtTime(TLE, CENTER_MS);
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;

    const resolved = resolveIssCurrentSample(
      { samples: track.samples, properties: { tleName: TLE.name, tleLine1: TLE.line1, tleLine2: TLE.line2 } },
      CENTER_MS,
    );
    expect(resolved).not.toBeNull();
    expect(resolved!.timeMs).toBe(CENTER_MS);
    expect(resolved!.latDeg).toBeCloseTo(direct.sample.latDeg, 8);
    expect(resolved!.lonDeg).toBeCloseTo(direct.sample.lonDeg, 8);

    expect(last.timeMs).toBeGreaterThan(CENTER_MS);
    expect(haversineKm(resolved!, last)).toBeGreaterThan(100);
    expect(first.timeMs).toBeLessThan(CENTER_MS);
  });

  it("moves with product time without a new TLE, and is deterministic at the same UTC", () => {
    const at0 = propagateIssPositionAtTime(TLE, CENTER_MS);
    const at10 = propagateIssPositionAtTime(TLE, CENTER_MS + 10_000);
    const at30 = propagateIssPositionAtTime(TLE, CENTER_MS + 30_000);
    const at60 = propagateIssPositionAtTime(TLE, CENTER_MS + 60_000);
    const again = propagateIssPositionAtTime(TLE, CENTER_MS);
    expect(at0.ok && at10.ok && at30.ok && at60.ok && again.ok).toBe(true);
    if (!at0.ok || !at10.ok || !at30.ok || !at60.ok || !again.ok) return;

    expect(haversineKm(at0.sample, at10.sample)).toBeGreaterThan(5);
    expect(haversineKm(at0.sample, at30.sample)).toBeGreaterThan(
      haversineKm(at0.sample, at10.sample),
    );
    expect(haversineKm(at0.sample, at60.sample)).toBeGreaterThan(
      haversineKm(at0.sample, at30.sample),
    );
    expect(again.sample.latDeg).toBe(at0.sample.latDeg);
    expect(again.sample.lonDeg).toBe(at0.sample.lonDeg);
  });

  it("layer payload currentPosition matches SGP4 and RenderPlan labels the current marker ISS", async () => {
    const parsed = parseIssTleBytes(new TextEncoder().encode(SAMPLE_ISS_TLE_3LE));
    expect(parsed.ok).toBe(true);
    const fetched: LiveHttpFetchOk = {
      ok: true,
      status: 200,
      bytes: new TextEncoder().encode(SAMPLE_ISS_TLE_3LE),
      contentType: "text/plain",
      responseUrl: "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=TLE",
    };
    const result = produceIssOrbitalTrackLiveAcquisitionFromFetched(fetched, {
      nowMs: () => CENTER_MS,
      versionIdFor: () => "iss-current-test",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: async () => {
        throw new Error("unused");
      },
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.acquisition.registerAdapter({
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
      acquire: async () => result,
    });
    host.tracksMaterializer.noteStoreEntry(result.entry);
    const att = host.attachForProductInstant(CENTER_MS);
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    });
    const state = layer.getState(
      createTimeContext(CENTER_MS, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(isDynamicTracksPayload(state.data)).toBe(true);
    if (!isDynamicTracksPayload(state.data)) return;

    const direct = propagateIssPositionAtTime(TLE, CENTER_MS);
    expect(direct.ok).toBe(true);
    if (!direct.ok) return;
    expect(state.data.currentPosition).toBeDefined();
    expect(state.data.currentPosition!.latDeg).toBeCloseTo(direct.sample.latDeg, 5);
    expect(state.data.currentPosition!.lonDeg).toBeCloseTo(direct.sample.lonDeg, 5);
    const last = state.data.tracks[0]!.samples[state.data.tracks[0]!.samples.length - 1]!;
    expect(state.data.currentPosition!.timeMs).not.toBe(last.timeMs);

    const plan = buildDynamicTracksRenderPlan({
      viewportWidthPx: 1800,
      viewportHeightPx: 900,
      layerOpacity: 1,
      payload: state.data,
    });
    const labels = plan.items.filter((i) => i.kind === "text");
    expect(labels).toHaveLength(1);
    if (labels[0]!.kind === "text") {
      expect(labels[0].text).toBe("ISS");
    }
    const discs = plan.items.filter((i) => i.kind === "path2d");
    expect(discs.length).toBe(2);

    const t0 = performance.now();
    for (let i = 0; i < 2_000; i += 1) {
      propagateIssPositionAtTime(TLE, CENTER_MS);
    }
    expect(performance.now() - t0).toBeLessThan(250);

    const epoch = issTleEpochUnixMs(TLE);
    expect(epoch).not.toBeNull();
    expect(Math.abs(epoch! - CENTER_MS)).toBeLessThan(24 * 60 * 60 * 1000);

    host.dispose();
  });

  it("places one current marker near the dateline on the visible strip", () => {
    const payload = {
      kind: "dynamicTracksEquirect" as const,
      tracks: [
        {
          id: "iss",
          label: "ISS",
          samples: [
            { lonDeg: 170, latDeg: 10, timeMs: CENTER_MS - 120_000 },
            { lonDeg: 175, latDeg: 11, timeMs: CENTER_MS - 60_000 },
            { lonDeg: -175, latDeg: 12, timeMs: CENTER_MS + 60_000 },
            { lonDeg: -170, latDeg: 13, timeMs: CENTER_MS + 120_000 },
          ],
        },
      ],
      currentPosition: { lonDeg: -179, latDeg: 11.5, timeMs: CENTER_MS },
    };
    const plan = buildDynamicTracksRenderPlan({
      viewportWidthPx: 1800,
      viewportHeightPx: 900,
      layerOpacity: 1,
      payload,
    });
    const texts = plan.items.filter((i) => i.kind === "text");
    expect(texts).toHaveLength(1);
    if (texts[0]!.kind === "text") {
      expect(texts[0].x).toBeGreaterThanOrEqual(0);
      expect(texts[0].x).toBeLessThanOrEqual(1800);
      expect(texts[0].text).toBe("ISS");
    }
  });
});
