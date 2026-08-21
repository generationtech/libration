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
 * LIB-059 — earthquake presentation live-update: same prepared snapshot, no fetch.
 */

import { describe, expect, it, vi } from "vitest";
import { createLayerRegistryFromConfig } from "../app/bootstrap";
import { DEFAULT_APP_CONFIG } from "../config/appConfig";
import {
  applyEarthquakePresentationToScene,
  applyLayerEnableFlagsToScene,
  buildDefaultSceneConfigFromLayerFlags,
} from "../config/v2/sceneConfig";
import {
  defaultLibrationConfigV2,
  normalizeLibrationConfig,
  v2ToAppConfig,
  type LibrationConfigV2,
} from "../config/v2/librationConfig";
import {
  DEFAULT_EARTHQUAKE_PRESENTATION,
  type EarthquakePresentation,
} from "../core/earthquakePresentation";
import { createTimeContext } from "../core/time";
import { runtimeIdForDynamicPointFeaturesSceneLayer } from "./dynamicPointFeaturesOverlayLayer";
import { isDynamicPointFeaturesPayload } from "./dynamicPointFeaturesPayload";
import { buildDynamicPointFeaturesRenderPlan } from "../renderer/renderPlan/sceneDynamicPointFeaturesPlan";
import {
  createDynamicDataLifecycleHost,
  produceEarthquakesLiveAcquisitionFromFetched,
  type LiveHttpFetchFn,
} from "../lifecycle";
import { encodeUsgsShapedGeoJson } from "../lifecycle/earthquakesLiveTestSupport";

const NOW = 1_724_000_000_000;
const LAYER_ID = runtimeIdForDynamicPointFeaturesSceneLayer("earthquakes");

function configWithPresentation(
  patch: Partial<EarthquakePresentation> = {},
): LibrationConfigV2 {
  const draft = defaultLibrationConfigV2();
  draft.layers = { ...DEFAULT_APP_CONFIG.layers, earthquakes: true };
  const scene = applyLayerEnableFlagsToScene(
    draft.scene ?? buildDefaultSceneConfigFromLayerFlags(draft.layers),
    draft.layers,
  );
  draft.scene = applyEarthquakePresentationToScene(scene, patch);
  return normalizeLibrationConfig(draft);
}

function planFromPrepared(
  config: LibrationConfigV2,
  host: ReturnType<typeof createDynamicDataLifecycleHost>,
) {
  const registry = createLayerRegistryFromConfig(v2ToAppConfig(config));
  const layer = registry.getLayers().find((l) => l.id === LAYER_ID);
  expect(layer).toBeDefined();
  const attachment = host.attachForProductInstant(NOW);
  const state = layer!.getState(
    createTimeContext(NOW, 0, false, { dynamicDataLifecycle: attachment }),
  );
  expect(isDynamicPointFeaturesPayload(state.data)).toBe(true);
  if (!isDynamicPointFeaturesPayload(state.data)) {
    throw new Error("expected dynamic point-features payload");
  }
  const plan = buildDynamicPointFeaturesRenderPlan({
    viewportWidthPx: 1400,
    viewportHeightPx: 700,
    layerOpacity: 1,
    payload: state.data,
  });
  return {
    registry,
    state,
    payload: state.data,
    plan,
    versionId: state.metadata?.versionId,
    labels: state.data.features
      .map((f) => f.label)
      .filter((label): label is string => typeof label === "string"),
    ids: state.data.features.map((f) => f.id),
  };
}

describe("LIB-059 earthquake presentation live-update from one prepared view", () => {
  it("filters, labels, and types change RenderPlan from the same snapshot without acquisition", () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("eq-059-no-acquisition");
    });
    const acquired = produceEarthquakesLiveAcquisitionFromFetched(
      {
        ok: true,
        bytes: encodeUsgsShapedGeoJson({
          generatedMs: NOW,
          features: [
            {
              id: "m05",
              lon: -120,
              lat: 35,
              mag: 0.5,
              place: "micro",
              time: NOW - 30 * 60 * 1000,
              type: "earthquake",
            },
            {
              id: "m32recent",
              lon: -155,
              lat: 19,
              mag: 3.2,
              place: "recent moderate",
              time: NOW - 30 * 60 * 1000,
              type: "earthquake",
            },
            {
              id: "m25",
              lon: 10,
              lat: 40,
              mag: 2.5,
              place: "factory floor",
              time: NOW - 3 * 60 * 60 * 1000,
              type: "earthquake",
            },
            {
              id: "m46",
              lon: 140,
              lat: 38,
              mag: 4.6,
              place: "label floor",
              time: NOW - 6 * 60 * 60 * 1000,
              type: "earthquake",
            },
            {
              id: "m60",
              lon: -70,
              lat: -30,
              mag: 6.0,
              place: "major",
              time: NOW - 25 * 60 * 60 * 1000,
              type: "earthquake",
            },
            {
              id: "quarry",
              lon: -88,
              lat: 38,
              mag: 3.1,
              place: "blast",
              time: NOW - 20 * 60 * 1000,
              type: "quarry blast",
            },
          ],
        }),
        contentType: "application/json",
        responseUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
        status: 200,
      },
      { nowMs: () => NOW, versionIdFor: () => "eq-059-prepared" },
    );
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) return;

    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.pointFeaturesMaterializer.noteStoreEntry(acquired.entry);

    const factory = planFromPrepared(configWithPresentation(), host);
    expect(factory.versionId).toBe("eq-059-prepared");
    expect(factory.ids.sort()).toEqual(["m25", "m32recent", "m46"]);
    expect(factory.labels).toEqual(["M4.6 · label floor"]);
    expect(factory.plan.items.filter((i) => i.kind === "path2d").length).toBeGreaterThan(
      0,
    );
    expect(factory.plan.items.some((i) => i.kind === "text")).toBe(true);

    const allMag = planFromPrepared(
      configWithPresentation({ minMagnitude: "all", earthquakesOnly: false }),
      host,
    );
    expect(allMag.versionId).toBe("eq-059-prepared");
    expect(allMag.ids).toContain("m05");
    expect(allMag.ids).toContain("quarry");
    expect(allMag.ids).not.toContain("m60");

    const recent = planFromPrepared(
      configWithPresentation({ maxAge: "1h" }),
      host,
    );
    expect(recent.ids).toEqual(["m32recent"]);

    const labelsOff = planFromPrepared(
      configWithPresentation({ showLabels: false }),
      host,
    );
    expect(labelsOff.ids.sort()).toEqual(["m25", "m32recent", "m46"]);
    expect(labelsOff.labels).toEqual([]);
    expect(labelsOff.plan.items.some((i) => i.kind === "text")).toBe(false);

    const followLabels = planFromPrepared(
      configWithPresentation({ labelMinMagnitude: "follow" }),
      host,
    );
    expect(followLabels.ids.sort()).toEqual(["m25", "m32recent", "m46"]);
    expect(followLabels.labels.length).toBe(3);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(DEFAULT_EARTHQUAKE_PRESENTATION.minMagnitude).toBe("2.5");
    host.dispose();
  });
});
