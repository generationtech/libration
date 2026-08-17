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

import { describe, expect, it } from "vitest";
import { createTimeContext } from "../core/time";
import {
  DEFAULT_ISS_ORBITAL_PRESENTATION,
  type IssOrbitalPresentation,
} from "../core/issOrbitalPresentation";
import { createDynamicTracksOverlayLayer } from "./dynamicTracksOverlayLayer";
import { isDynamicTracksPayload } from "./dynamicTracksPayload";
import {
  ISS_ORBITAL_TRACK_SOURCE_ID,
  createDynamicDataLifecycleHost,
  produceIssOrbitalTrackFixtureAcquisition,
  produceIssOrbitalTrackLiveAcquisitionFromFetched,
  type LiveHttpFetchOk,
} from "../lifecycle";

const SAMPLE_ISS_TLE_3LE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
].join("\n");

const CENTER_MS = Date.UTC(2026, 7, 6, 1, 17, 0);

function mockTleOk(): LiveHttpFetchOk {
  return {
    ok: true,
    bytes: new TextEncoder().encode(SAMPLE_ISS_TLE_3LE),
    contentType: "text/plain",
    responseUrl: "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle",
    status: 200,
  };
}

async function liveLayer(presentation?: IssOrbitalPresentation) {
  const fetched = mockTleOk();
  const result = produceIssOrbitalTrackLiveAcquisitionFromFetched(fetched, {
    nowMs: () => CENTER_MS,
    versionIdFor: () => "iss-pres-live",
  });
  expect(result.ok).toBe(true);
  if (!result.ok) {
    throw new Error("expected live acquisition");
  }
  const host = createDynamicDataLifecycleHost({
    setIntervalFn: () => 1,
    clearIntervalFn: () => undefined,
  });
  host.tracksMaterializer.noteStoreEntry(result.entry);
  const att = host.attachForProductInstant(CENTER_MS);
  const layer = createDynamicTracksOverlayLayer({
    sceneLayerId: "orbitalTracks",
    sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
    ...(presentation !== undefined ? { presentation } : {}),
  });
  const state = layer.getState(
    createTimeContext(CENTER_MS, 0, false, { dynamicDataLifecycle: att }),
  );
  return { host, state };
}

describe("LIB-038 ISS overlay presentation", () => {
  it("default payload keeps the ISS label and both temporal segments", async () => {
    const { host, state } = await liveLayer();
    expect(isDynamicTracksPayload(state.data)).toBe(true);
    if (!isDynamicTracksPayload(state.data)) return;
    expect(state.data.presentation).toEqual(DEFAULT_ISS_ORBITAL_PRESENTATION);
    expect(state.data.tracks[0]?.label).toBe("ISS");
    expect((state.data.tracks[0]?.pastSamples ?? []).length).toBeGreaterThan(2);
    expect((state.data.tracks[0]?.futureSamples ?? []).length).toBeGreaterThan(2);
    host.dispose();
  });

  it("past duration 15 min trims samples older than the window", async () => {
    const { host, state } = await liveLayer({
      ...DEFAULT_ISS_ORBITAL_PRESENTATION,
      pastMinutes: 15,
    });
    expect(isDynamicTracksPayload(state.data)).toBe(true);
    if (!isDynamicTracksPayload(state.data)) return;
    for (const sample of state.data.tracks[0]?.pastSamples ?? []) {
      expect(sample.timeMs).toBeGreaterThanOrEqual(CENTER_MS - 15 * 60_000);
      expect(sample.timeMs).toBeLessThanOrEqual(CENTER_MS);
    }
    host.dispose();
  });

  it("track-off still exposes the current marker samples for heading", async () => {
    const { host, state } = await liveLayer({
      ...DEFAULT_ISS_ORBITAL_PRESENTATION,
      trackEnabled: false,
    });
    expect(isDynamicTracksPayload(state.data)).toBe(true);
    if (!isDynamicTracksPayload(state.data)) return;
    expect(state.data.currentPosition).toBeDefined();
    expect(state.data.tracks[0]?.pastSamples).toEqual([]);
    expect(state.data.tracks[0]?.futureSamples).toEqual([]);
    host.dispose();
  });

  it("labelEnabled false omits the ISS label on the overlay", async () => {
    const { host, state } = await liveLayer({
      ...DEFAULT_ISS_ORBITAL_PRESENTATION,
      labelEnabled: false,
    });
    expect(isDynamicTracksPayload(state.data)).toBe(true);
    if (!isDynamicTracksPayload(state.data)) return;
    expect(state.data.tracks[0]?.label).toBeUndefined();
    host.dispose();
  });

  it("historical product time stays invisible regardless of presentation", () => {
    const result = produceIssOrbitalTrackLiveAcquisitionFromFetched(mockTleOk(), {
      nowMs: () => CENTER_MS,
      versionIdFor: () => "iss-pres-hist",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const host = createDynamicDataLifecycleHost({
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.tracksMaterializer.noteStoreEntry(result.entry);
    const historicalMs = Date.UTC(2017, 7, 21, 18, 25, 30);
    const att = host.attachForProductInstant(historicalMs, {
      wallClockUtcMs: CENTER_MS,
    });
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
      presentation: {
        ...DEFAULT_ISS_ORBITAL_PRESENTATION,
        trackEnabled: true,
        glyphType: "silhouette",
        glyphSize: "extraLarge",
        labelEnabled: true,
      },
    });
    const state = layer.getState(
      createTimeContext(historicalMs, 0, true, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(false);
    host.dispose();
  });

  it("fixture snapshots stay suppressed when presentation options change", () => {
    const result = produceIssOrbitalTrackFixtureAcquisition({
      nowMs: () => CENTER_MS,
      versionIdFor: () => "iss-pres-fixture",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const host = createDynamicDataLifecycleHost({
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.tracksMaterializer.noteStoreEntry(result.entry);
    const att = host.attachForProductInstant(CENTER_MS);
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: ISS_ORBITAL_TRACK_SOURCE_ID,
      presentation: {
        ...DEFAULT_ISS_ORBITAL_PRESENTATION,
        glyphType: "silhouette",
        trackEnabled: true,
      },
    });
    const state = layer.getState(
      createTimeContext(CENTER_MS, 0, false, { dynamicDataLifecycle: att }),
    );
    expect(state.visible).toBe(false);
    expect(state.metadata?.reason).toBe("iss-fixture-suppressed");
    host.dispose();
  });
});
