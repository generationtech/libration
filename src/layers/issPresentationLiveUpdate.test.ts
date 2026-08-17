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
 * LIB-039 — ISS presentation live-update: same prepared view, different config, different plan.
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
import { type IssOrbitalPresentation } from "../core/issOrbitalPresentation";
import { runtimeIdForDynamicTracksSceneLayer } from "./dynamicTracksOverlayLayer";
import { isDynamicTracksPayload } from "./dynamicTracksPayload";
import { buildDynamicTracksRenderPlan } from "../renderer/renderPlan/sceneDynamicTracksPlan";
import {
  ISS_ORBITAL_TRACK_SOURCE_ID,
  createDynamicDataLifecycleHost,
  produceIssOrbitalTrackLiveAcquisitionFromFetched,
  type LiveHttpFetchFn,
  type LiveHttpFetchOk,
} from "../lifecycle";

const SAMPLE_ISS_TLE_3LE = [
  "ISS (ZARYA)",
  "1 25544U 98067A   26218.05391056  .00003997  00000+0  79690-4 0  9990",
  "2 25544  51.6321  53.3065 0007216  17.1615 342.9616 15.49359774579487",
].join("\n");

const CENTER_MS = Date.UTC(2026, 7, 6, 1, 17, 0);
const TRACKS_LAYER_ID = runtimeIdForDynamicTracksSceneLayer("orbitalTracks");

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
    registry,
    state,
    payload: state.data,
    plan,
    versionId: state.metadata?.versionId,
  };
}

describe("LIB-039 ISS presentation live-update from one prepared view", () => {
  it("every presentation control changes RenderPlan from the same prepared ISS snapshot without acquisition", () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("iss-039-no-acquisition");
    });
    const acquired = produceIssOrbitalTrackLiveAcquisitionFromFetched(mockTleOk(), {
      nowMs: () => CENTER_MS,
      versionIdFor: () => "iss-039-prepared",
    });
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;

    const host = createDynamicDataLifecycleHost({
      orbitalTracksLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.tracksMaterializer.noteStoreEntry(acquired.entry);
    const preparedObject = host.attachForProductInstant(CENTER_MS).getPreparedTracks(
      ISS_ORBITAL_TRACK_SOURCE_ID,
    );
    expect(preparedObject).not.toBeNull();

    const baseline = planFromPrepared(configWithPresentation(), host);
    expect(baseline.versionId).toBe("iss-039-prepared");
    expect(baseline.payload.tracks[0]?.samples.length).toBeGreaterThan(20);
    const lineCount = baseline.plan.items.filter((i) => i.kind === "line").length;
    expect(lineCount).toBeGreaterThan(0);
    expect(baseline.plan.items.some((i) => i.kind === "text" && i.text === "ISS")).toBe(true);

    const trackOff = planFromPrepared(configWithPresentation({ trackEnabled: false }), host);
    expect(trackOff.versionId).toBe(baseline.versionId);
    expect(trackOff.payload).not.toBe(baseline.payload);
    expect(trackOff.plan.items.filter((i) => i.kind === "line")).toHaveLength(0);
    expect(trackOff.plan.items.some((i) => i.kind === "path2d")).toBe(true);
    expect(trackOff.plan.items.some((i) => i.kind === "text" && i.text === "ISS")).toBe(true);

    const pastOff = planFromPrepared(configWithPresentation({ pastEnabled: false }), host);
    expect(pastOff.payload.tracks[0]?.pastSamples ?? []).toHaveLength(0);
    expect((pastOff.payload.tracks[0]?.futureSamples ?? []).length).toBeGreaterThan(0);
    expect(pastOff.plan.items.some((i) => i.kind === "line")).toBe(true);

    const futureOff = planFromPrepared(configWithPresentation({ futureEnabled: false }), host);
    expect(futureOff.payload.tracks[0]?.futureSamples ?? []).toHaveLength(0);
    expect((futureOff.payload.tracks[0]?.pastSamples ?? []).length).toBeGreaterThan(0);

    const past15 = planFromPrepared(configWithPresentation({ pastMinutes: 15 }), host);
    const past60 = baseline.payload.tracks[0]?.pastSamples?.length ?? 0;
    const past15n = past15.payload.tracks[0]?.pastSamples?.length ?? 0;
    expect(past15n).toBeGreaterThan(1);
    expect(past15n).toBeLessThan(past60);

    const future15 = planFromPrepared(configWithPresentation({ futureMinutes: 15 }), host);
    const future30 = baseline.payload.tracks[0]?.futureSamples?.length ?? 0;
    const future15n = future15.payload.tracks[0]?.futureSamples?.length ?? 0;
    expect(future15n).toBeGreaterThan(1);
    expect(future15n).toBeLessThan(future30);

    const colors = planFromPrepared(
      configWithPresentation({ pastColor: "#ff0000", futureColor: "#00ff00" }),
      host,
    );
    const colorLines = colors.plan.items.filter((i) => i.kind === "line");
    expect(colorLines.some((i) => i.kind === "line" && /255,\s*0,\s*0/.test(i.stroke))).toBe(true);
    expect(colorLines.some((i) => i.kind === "line" && /0,\s*255,\s*0/.test(i.stroke))).toBe(true);

    const baseColor = planFromPrepared(configWithPresentation({ baseColor: "#aa33cc" }), host);
    const label = baseColor.plan.items.find((i) => i.kind === "text" && i.text === "ISS");
    expect(label?.kind).toBe("text");
    if (label?.kind === "text") {
      expect(label.fill).toMatch(/170,\s*51,\s*204/);
    }
    expect(baseColor.payload.presentation?.pastColor).toBe("#aa33cc");

    const thick = planFromPrepared(configWithPresentation({ lineThickness: "thick" }), host);
    const thin = planFromPrepared(configWithPresentation({ lineThickness: "thin" }), host);
    const thickLine = thick.plan.items.find((i) => i.kind === "line");
    const thinLine = thin.plan.items.find((i) => i.kind === "line");
    expect(thickLine?.kind).toBe("line");
    expect(thinLine?.kind).toBe("line");
    if (thickLine?.kind === "line" && thinLine?.kind === "line") {
      expect(thickLine.strokeWidthPx).toBeGreaterThan(thinLine.strokeWidthPx);
    }

    const silhouette = planFromPrepared(configWithPresentation({ glyphType: "silhouette" }), host);
    expect(
      silhouette.plan.items.some((i) => i.kind === "path2d" && i.pathKind === "descriptor"),
    ).toBe(true);
    expect(
      baseline.plan.items.some((i) => i.kind === "path2d" && i.pathKind === "path2d"),
    ).toBe(true);

    const large = planFromPrepared(configWithPresentation({ glyphSize: "extraLarge" }), host);
    expect(large.payload.presentation?.glyphSize).toBe("extraLarge");
    expect(large.plan.items).not.toEqual(baseline.plan.items);

    const dotColor = planFromPrepared(configWithPresentation({ dotColor: "#ff00aa" }), host);
    expect(
      dotColor.plan.items.some(
        (i) => i.kind === "path2d" && i.fill !== undefined && /255,\s*0,\s*170/.test(i.fill),
      ),
    ).toBe(true);

    const glyphColor = planFromPrepared(
      configWithPresentation({ glyphType: "silhouette", glyphColor: "#ffffff" }),
      host,
    );
    expect(
      glyphColor.plan.items.some(
        (i) =>
          i.kind === "path2d" &&
          i.pathKind === "descriptor" &&
          i.fill !== undefined &&
          /255,\s*255,\s*255/.test(i.fill),
      ),
    ).toBe(true);

    const labelOff = planFromPrepared(configWithPresentation({ labelEnabled: false }), host);
    expect(labelOff.plan.items.some((i) => i.kind === "text")).toBe(false);
    expect(labelOff.plan.items.some((i) => i.kind === "path2d")).toBe(true);

    const stillSameView = host.attachForProductInstant(CENTER_MS).getPreparedTracks(
      ISS_ORBITAL_TRACK_SOURCE_ID,
    );
    expect(stillSameView?.versionId).toBe(preparedObject?.versionId);
    expect(stillSameView?.tracks).toBe(preparedObject?.tracks);
    expect(fetchFn).not.toHaveBeenCalled();
    host.dispose();
  });
});
