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
 * LIB-041 — multi-orbit ISS horizons from a local TLE, no network.
 */

import { describe, expect, it, vi } from "vitest";
import { createLayerRegistryFromConfig } from "../app/bootstrap";
import { DEFAULT_APP_CONFIG } from "../config/appConfig";
import {
  applyIssOrbitalPresentationToScene,
  applyLayerEnableFlagsToScene,
  buildDefaultSceneConfigFromLayerFlags,
} from "../config/v2/sceneConfig";
import {
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
  v2ToAppConfig,
  type LibrationConfigV2,
} from "../config/v2/librationConfig";
import { createTimeContext } from "../core/time";
import {
  issOrbitalPeriodMsFromTleLine2,
  resolveIssOrbitHorizonMs,
} from "../core/issOrbitHorizon";
import { type IssOrbitalPresentation } from "../core/issOrbitalPresentation";
import { runtimeIdForDynamicTracksSceneLayer } from "../layers/dynamicTracksOverlayLayer";
import { isDynamicTracksPayload } from "../layers/dynamicTracksPayload";
import { buildDynamicTracksRenderPlan } from "../renderer/renderPlan/sceneDynamicTracksPlan";
import {
  ISS_ORBITAL_TRACK_SAMPLE_STEP_MS,
  ISS_ORBITAL_TRACK_SOURCE_ID,
  createDynamicDataLifecycleHost,
  getIssPresentationTrackSamples,
  issOrbitalPeriodMsFromTle,
  produceIssOrbitalTrackLiveAcquisitionFromFetched,
  propagateIssGroundTrackFromTle,
  propagateIssPositionAtTime,
  resetIssPresentationTrackCacheForTests,
  type LiveHttpFetchFn,
  type LiveHttpFetchOk,
} from "../lifecycle";

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

const CENTER_MS = Date.UTC(2026, 7, 6, 1, 17, 0);
const TRACKS_LAYER_ID = runtimeIdForDynamicTracksSceneLayer("orbitalTracks");
const PERIOD_MS = issOrbitalPeriodMsFromTleLine2(TLE.line2)!;

function mockTleOk(): LiveHttpFetchOk {
  return {
    ok: true,
    bytes: new TextEncoder().encode(SAMPLE_ISS_TLE_3LE),
    contentType: "text/plain",
    responseUrl: "https://celestrak.org/NORAD/elements/gp.php?CATNR=25544&FORMAT=tle",
    status: 200,
  };
}

function configWithPresentation(patch: Partial<IssOrbitalPresentation> = {}): LibrationConfigV2 {
  const draft = defaultLibrationConfigV2();
  draft.layers = { ...DEFAULT_APP_CONFIG.layers, orbitalTracks: true };
  const scene = applyLayerEnableFlagsToScene(
    draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers),
    draft.layers,
  );
  draft.scene = applyIssOrbitalPresentationToScene(scene, patch);
  return normalizeLibrationConfig(draft);
}

function planFromPrepared(
  config: LibrationConfigV2,
  host: ReturnType<typeof createDynamicDataLifecycleHost>,
) {
  const registry = createLayerRegistryFromConfig(v2ToAppConfig(config));
  const layer = registry.getLayers().find((l) => l.id === TRACKS_LAYER_ID);
  expect(layer).toBeDefined();
  const attachment = host.attachForProductInstant(CENTER_MS);
  const state = layer!.getState(
    createTimeContext(CENTER_MS, 0, false, { dynamicDataLifecycle: attachment }),
  );
  expect(isDynamicTracksPayload(state.data)).toBe(true);
  if (!isDynamicTracksPayload(state.data)) {
    throw new Error("expected dynamic tracks payload");
  }
  const plan = buildDynamicTracksRenderPlan({
    viewportWidthPx: 1800,
    viewportHeightPx: 900,
    layerOpacity: 1,
    payload: state.data,
  });
  return {
    state,
    payload: state.data,
    plan,
    versionId: state.metadata?.versionId,
  };
}

function lineStrokeAlpha(stroke: string): number {
  const match = stroke.match(/rgba\(\s*[\d.]+,\s*[\d.]+,\s*[\d.]+,\s*([\d.]+)\s*\)/);
  return match ? Number(match[1]) : Number.NaN;
}

function lineStrokeRgb(stroke: string): string | null {
  const match = stroke.match(/rgba\(\s*([\d.]+),\s*([\d.]+),\s*([\d.]+)/);
  return match ? `${match[1]},${match[2]},${match[3]}` : null;
}

describe("LIB-041 ISS multi-orbit local track", () => {
  it("covers ±3 orbital periods around product UTC with a monotonic sample train", () => {
    const lookback = resolveIssOrbitHorizonMs("3orbits", PERIOD_MS);
    const lookahead = resolveIssOrbitHorizonMs("3orbits", PERIOD_MS);
    const result = propagateIssGroundTrackFromTle(TLE, {
      centerTimeMs: CENTER_MS,
      lookbackMs: lookback,
      lookaheadMs: lookahead,
      sampleStepMs: ISS_ORBITAL_TRACK_SAMPLE_STEP_MS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const first = result.samples[0]!;
    const last = result.samples[result.samples.length - 1]!;
    expect(first.timeMs).toBe(CENTER_MS - lookback);
    expect(last.timeMs).toBeGreaterThanOrEqual(CENTER_MS + lookahead - ISS_ORBITAL_TRACK_SAMPLE_STEP_MS);
    expect(last.timeMs).toBeLessThanOrEqual(CENTER_MS + lookahead);
    expect(first.timeMs).toBeLessThanOrEqual(CENTER_MS - 2.95 * PERIOD_MS);
    expect(last.timeMs).toBeGreaterThanOrEqual(CENTER_MS + 2.95 * PERIOD_MS);
    for (let i = 1; i < result.samples.length; i += 1) {
      expect(result.samples[i]!.timeMs).toBeGreaterThan(result.samples[i - 1]!.timeMs);
    }
    const expectedCount =
      Math.floor((lookback + lookahead) / ISS_ORBITAL_TRACK_SAMPLE_STEP_MS) + 1;
    expect(result.samples.length).toBeGreaterThan(expectedCount - 3);
    expect(result.samples.length).toBeLessThan(expectedCount + 3);
    const marker = propagateIssPositionAtTime(TLE, CENTER_MS);
    expect(marker.ok).toBe(true);
    if (marker.ok) {
      expect(marker.sample.timeMs).toBe(CENTER_MS);
    }
  });

  it("does not fetch a TLE when the horizon expands from 60 min to 6 orbits", () => {
    resetIssPresentationTrackCacheForTests();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("iss-041-no-acquisition");
    });
    const acquired = produceIssOrbitalTrackLiveAcquisitionFromFetched(mockTleOk(), {
      nowMs: () => CENTER_MS,
      versionIdFor: () => "iss-041-prepared",
    });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.tracksMaterializer.noteStoreEntry(acquired.entry);
    const prepared = host.attachForProductInstant(CENTER_MS).getPreparedTracks(
      ISS_ORBITAL_TRACK_SOURCE_ID,
    );
    expect(prepared?.versionId).toBe("iss-041-prepared");

    const minutes = planFromPrepared(configWithPresentation(), host);
    const six = planFromPrepared(
      configWithPresentation({ pastHorizon: "6orbits", futureHorizon: "6orbits" }),
      host,
    );
    expect(six.versionId).toBe(minutes.versionId);
    expect(six.payload.tracks[0]?.samples.length ?? 0).toBeGreaterThan(
      minutes.payload.tracks[0]?.samples.length ?? 0,
    );
    const sixPast = six.payload.tracks[0]?.pastSamples ?? [];
    const sixFuture = six.payload.tracks[0]?.futureSamples ?? [];
    expect(sixPast[0]!.timeMs).toBeLessThanOrEqual(CENTER_MS - 5.9 * PERIOD_MS);
    expect(sixFuture[sixFuture.length - 1]!.timeMs).toBeGreaterThanOrEqual(
      CENTER_MS + 5.9 * PERIOD_MS,
    );
    const still = host.attachForProductInstant(CENTER_MS).getPreparedTracks(
      ISS_ORBITAL_TRACK_SOURCE_ID,
    );
    expect(still?.versionId).toBe(prepared?.versionId);
    expect(still?.tracks).toBe(prepared?.tracks);
    expect(fetchFn).not.toHaveBeenCalled();
    host.dispose();
  });

  it("keeps past and future horizons independent", () => {
    resetIssPresentationTrackCacheForTests();
    const acquired = produceIssOrbitalTrackLiveAcquisitionFromFetched(mockTleOk(), {
      nowMs: () => CENTER_MS,
      versionIdFor: () => "iss-041-asym",
    });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: async () => {
        throw new Error("iss-041-no-acquisition");
      },
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.tracksMaterializer.noteStoreEntry(acquired.entry);
    const longPast = planFromPrepared(
      configWithPresentation({ pastHorizon: "6orbits", futureHorizon: "1orbit" }),
      host,
    );
    const past = longPast.payload.tracks[0]?.pastSamples ?? [];
    const future = longPast.payload.tracks[0]?.futureSamples ?? [];
    expect(past[0]!.timeMs).toBeLessThanOrEqual(CENTER_MS - 5.9 * PERIOD_MS);
    expect(future[future.length - 1]!.timeMs).toBeLessThanOrEqual(CENTER_MS + 1.05 * PERIOD_MS);
    expect(future[future.length - 1]!.timeMs).toBeGreaterThan(CENTER_MS + 0.9 * PERIOD_MS);
    host.dispose();
  });

  it("fades farther orbits without changing configured hue", () => {
    resetIssPresentationTrackCacheForTests();
    const acquired = produceIssOrbitalTrackLiveAcquisitionFromFetched(mockTleOk(), {
      nowMs: () => CENTER_MS,
      versionIdFor: () => "iss-041-fade",
    });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: async () => {
        throw new Error("iss-041-no-acquisition");
      },
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.tracksMaterializer.noteStoreEntry(acquired.entry);
    const painted = planFromPrepared(
      configWithPresentation({
        pastHorizon: "3orbits",
        futureHorizon: "3orbits",
        pastColor: "#ff0000",
        futureColor: "#00ff00",
      }),
      host,
    );
    const pastRed = painted.plan.items.flatMap((i) =>
      i.kind === "line" && lineStrokeRgb(i.stroke) === "255,0,0" ? [i] : [],
    );
    const futureGreen = painted.plan.items.flatMap((i) =>
      i.kind === "line" && lineStrokeRgb(i.stroke) === "0,255,0" ? [i] : [],
    );
    expect(pastRed.length).toBeGreaterThan(10);
    expect(futureGreen.length).toBeGreaterThan(10);
    const pastAlphas = [...new Set(pastRed.map((i) => lineStrokeAlpha(i.stroke)))].sort(
      (a, b) => b - a,
    );
    expect(pastAlphas.length).toBeGreaterThan(1);
    for (let i = 1; i < pastAlphas.length; i += 1) {
      expect(pastAlphas[i]!).toBeLessThan(pastAlphas[i - 1]!);
    }
    for (const line of pastRed) {
      expect(lineStrokeRgb(line.stroke)).toBe("255,0,0");
    }
    for (const line of futureGreen) {
      expect(lineStrokeRgb(line.stroke)).toBe("0,255,0");
    }
    host.dispose();
  });

  it("does not emit a world-spanning line across repeated dateline crossings", () => {
    resetIssPresentationTrackCacheForTests();
    const lookback = resolveIssOrbitHorizonMs("3orbits", PERIOD_MS);
    const samples = getIssPresentationTrackSamples({
      tle: TLE,
      productUtcMs: CENTER_MS,
      lookbackMs: lookback,
      lookaheadMs: lookback,
    });
    expect(samples).not.toBeNull();
    const wraps = samples!.filter((s, i) => {
      if (i === 0) return false;
      return Math.abs(s.lonDeg - samples![i - 1]!.lonDeg) > 180;
    });
    expect(wraps.length).toBeGreaterThan(1);
    const acquired = produceIssOrbitalTrackLiveAcquisitionFromFetched(mockTleOk(), {
      nowMs: () => CENTER_MS,
      versionIdFor: () => "iss-041-seam",
    });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: async () => {
        throw new Error("iss-041-no-acquisition");
      },
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.tracksMaterializer.noteStoreEntry(acquired.entry);
    const painted = planFromPrepared(
      configWithPresentation({ pastHorizon: "3orbits", futureHorizon: "3orbits" }),
      host,
    );
    const lines = painted.plan.items.filter((i) => i.kind === "line");
    expect(lines.length).toBeGreaterThan(20);
    for (const line of lines) {
      if (line.kind !== "line") continue;
      expect(Math.abs(line.x2 - line.x1)).toBeLessThan(900);
    }
    expect(painted.plan.items.filter((i) => i.kind === "path2d").length).toBeGreaterThanOrEqual(1);
    expect(painted.plan.items.filter((i) => i.kind === "text" && i.text === "ISS")).toHaveLength(1);
    host.dispose();
  });

  it("silhouette glyph color reaches the foreground fill/stroke without rematerializing", () => {
    resetIssPresentationTrackCacheForTests();
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("iss-041-no-acquisition");
    });
    const acquired = produceIssOrbitalTrackLiveAcquisitionFromFetched(mockTleOk(), {
      nowMs: () => CENTER_MS,
      versionIdFor: () => "iss-041-glyph",
    });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;
    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.tracksMaterializer.noteStoreEntry(acquired.entry);
    const magenta = planFromPrepared(
      configWithPresentation({ glyphType: "silhouette", glyphColor: "#ff00ff" }),
      host,
    );
    const green = planFromPrepared(
      configWithPresentation({ glyphType: "silhouette", glyphColor: "#00ff00" }),
      host,
    );
    const magFg = magenta.plan.items.filter(
      (i) =>
        i.kind === "path2d" &&
        i.pathKind === "descriptor" &&
        i.fill !== undefined &&
        /255,\s*0,\s*255/.test(i.fill),
    );
    const greenFg = green.plan.items.filter(
      (i) =>
        i.kind === "path2d" &&
        i.pathKind === "descriptor" &&
        i.fill !== undefined &&
        /0,\s*255,\s*0/.test(i.fill),
    );
    expect(magFg.length).toBe(1);
    expect(greenFg.length).toBe(1);
    if (magFg[0]?.kind === "path2d" && greenFg[0]?.kind === "path2d") {
      expect(magFg[0].stroke).toMatch(/255,\s*0,\s*255/);
      expect(greenFg[0].stroke).toMatch(/0,\s*255,\s*0/);
      expect(magFg[0].fill).not.toBe(greenFg[0].fill);
    }
    expect(magenta.versionId).toBe("iss-041-glyph");
    expect(green.versionId).toBe(magenta.versionId);
    expect(fetchFn).not.toHaveBeenCalled();
    host.dispose();
  });

  it("6+6 local SGP4 stays comfortably under 50 ms", () => {
    resetIssPresentationTrackCacheForTests();
    const lookback = resolveIssOrbitHorizonMs("6orbits", PERIOD_MS);
    const t0 = performance.now();
    const samples = getIssPresentationTrackSamples({
      tle: TLE,
      productUtcMs: CENTER_MS,
      lookbackMs: lookback,
      lookaheadMs: lookback,
    });
    const elapsed = performance.now() - t0;
    expect(samples).not.toBeNull();
    expect(samples!.length).toBeGreaterThan(500);
    expect(samples!.length).toBeLessThan(600);
    expect(elapsed).toBeLessThan(50);
    expect(issOrbitalPeriodMsFromTle(TLE)).toBeCloseTo(PERIOD_MS, 6);
  });
});
