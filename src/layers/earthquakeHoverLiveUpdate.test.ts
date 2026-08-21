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
 * LIB-060 — earthquake hover labels over a prepared snapshot (no network).
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
  mapXFromLongitudeDeg,
  mapYFromLatitudeDeg,
} from "../core/equirectangularProjection";
import {
  DEFAULT_EARTHQUAKE_PRESENTATION,
  type EarthquakePresentation,
} from "../core/earthquakePresentation";
import { createTimeContext } from "../core/time";
import { runtimeIdForDynamicPointFeaturesSceneLayer } from "./dynamicPointFeaturesOverlayLayer";
import { isDynamicPointFeaturesPayload } from "./dynamicPointFeaturesPayload";
import { applyEarthquakePointerHoverToPayload } from "./earthquakeHoverAnnotation";
import { buildDynamicPointFeaturesRenderPlan } from "../renderer/renderPlan/sceneDynamicPointFeaturesPlan";
import {
  createDynamicDataLifecycleHost,
  produceEarthquakesLiveAcquisitionFromFetched,
  USGS_EARTHQUAKES_SOURCE_ID,
  type LiveHttpFetchFn,
} from "../lifecycle";
import { encodeUsgsShapedGeoJson } from "../lifecycle/earthquakesLiveTestSupport";

const NOW = 1_724_000_000_000;
const LAYER_ID = runtimeIdForDynamicPointFeaturesSceneLayer("earthquakes");
const VW = 1400;
const VH = 700;

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

function payloadFromPrepared(
  config: LibrationConfigV2,
  host: ReturnType<typeof createDynamicDataLifecycleHost>,
  productUtcMs = NOW,
) {
  const registry = createLayerRegistryFromConfig(v2ToAppConfig(config));
  const layer = registry.getLayers().find((l) => l.id === LAYER_ID);
  expect(layer).toBeDefined();
  const attachment = host.attachForProductInstant(productUtcMs);
  const state = layer!.getState(
    createTimeContext(productUtcMs, 0, false, {
      dynamicDataLifecycle: attachment,
    }),
  );
  return { registry, state, layer };
}

function hoverAt(
  payload: ReturnType<typeof applyEarthquakePointerHoverToPayload>,
  lonDeg: number,
  latDeg: number,
  showLabelOnHover: boolean,
) {
  return applyEarthquakePointerHoverToPayload(payload, {
    pointerSceneCss: {
      x: mapXFromLongitudeDeg(lonDeg, VW),
      y: mapYFromLatitudeDeg(latDeg, VH),
    },
    viewportWidthPx: VW,
    viewportHeightPx: VH,
    showLabelOnHover,
  });
}

function textItems(payload: ReturnType<typeof applyEarthquakePointerHoverToPayload>) {
  const plan = buildDynamicPointFeaturesRenderPlan({
    viewportWidthPx: VW,
    viewportHeightPx: VH,
    layerOpacity: 1,
    payload,
  });
  return plan.items.filter((i) => i.kind === "text");
}

describe("LIB-060 earthquake hover over one prepared view", () => {
  it("covers labels-off, below-threshold, duplicate suppression, hover-off, filters, and no fetch", () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("eq-060-no-acquisition");
    });
    const acquired = produceEarthquakesLiveAcquisitionFromFetched(
      {
        ok: true,
        bytes: encodeUsgsShapedGeoJson({
          generatedMs: NOW,
          features: [
            {
              id: "m31",
              lon: -120,
              lat: 35,
              mag: 3.1,
              place: "California",
              time: NOW - 30 * 60 * 1000,
              type: "earthquake",
            },
            {
              id: "m52",
              lon: 140,
              lat: 36,
              mag: 5.2,
              place: "Japan",
              time: NOW - 20 * 60 * 1000,
              type: "earthquake",
            },
            {
              id: "m28old",
              lon: 10,
              lat: 50,
              mag: 2.8,
              place: "Europe",
              time: NOW - 5 * 60 * 60 * 1000,
              type: "earthquake",
            },
            {
              id: "quarry",
              lon: -90,
              lat: 40,
              mag: 3.0,
              place: "quarry",
              time: NOW - 10 * 60 * 1000,
              type: "quarry blast",
            },
          ],
        }),
        contentType: "application/json",
        responseUrl: "https://earthquake.usgs.gov/test",
        status: 200,
      },
      {
        nowMs: () => NOW,
        versionIdFor: () => "eq-060-hover",
      },
    );
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) throw new Error("expected acquisition");

    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.pointFeaturesMaterializer.noteStoreEntry(acquired.entry);

    const factory = payloadFromPrepared(configWithPresentation(), host);
    expect(isDynamicPointFeaturesPayload(factory.state.data)).toBe(true);
    if (!isDynamicPointFeaturesPayload(factory.state.data)) {
      throw new Error("expected payload");
    }
    expect(factory.state.data.features.map((f) => f.id).sort()).toEqual([
      "m28old",
      "m31",
      "m52",
    ]);
    const unlabeled = factory.state.data.features.find((f) => f.id === "m31")!;
    const labeled = factory.state.data.features.find((f) => f.id === "m52")!;
    expect(unlabeled.label).toBeUndefined();
    expect(unlabeled.compactLabel).toBe("M3.1 · California");
    expect(labeled.label).toBe("M5.2 · Japan");
    expect(labeled.compactLabel).toBe("M5.2 · Japan");

    const below = hoverAt(factory.state.data, -120, 35, true);
    const belowFeat = below.features.find((f) => f.id === "m31")!;
    expect(belowFeat.hoverLabel).toBe("M3.1 · California");
    expect(belowFeat.label).toBeUndefined();
    const belowText = textItems(below);
    expect(belowText).toHaveLength(2);
    expect(belowText.some((t) => t.kind === "text" && t.text === "M3.1 · California")).toBe(
      true,
    );
    expect(belowText.some((t) => t.kind === "text" && t.text === "M5.2 · Japan")).toBe(
      true,
    );

    const dup = hoverAt(factory.state.data, 140, 36, true);
    const dupFeat = dup.features.find((f) => f.id === "m52")!;
    expect(dupFeat.hoverLabel).toBeUndefined();
    expect(dupFeat.label).toBe("M5.2 · Japan");
    const dupText = textItems(dup).filter(
      (t) => t.kind === "text" && t.text === "M5.2 · Japan",
    );
    expect(dupText).toHaveLength(1);

    const labelsOffState = payloadFromPrepared(
      configWithPresentation({ showLabels: false }),
      host,
    );
    expect(isDynamicPointFeaturesPayload(labelsOffState.state.data)).toBe(true);
    if (!isDynamicPointFeaturesPayload(labelsOffState.state.data)) {
      throw new Error("expected payload");
    }
    expect(labelsOffState.state.data.features.every((f) => f.label === undefined)).toBe(
      true,
    );
    const labelsOffHover = hoverAt(labelsOffState.state.data, 140, 36, true);
    expect(labelsOffHover.features.find((f) => f.id === "m52")?.hoverLabel).toBe(
      "M5.2 · Japan",
    );
    expect(textItems(labelsOffState.state.data)).toHaveLength(0);
    expect(textItems(labelsOffHover)).toHaveLength(1);

    const hoverOff = hoverAt(factory.state.data, -120, 35, false);
    expect(hoverOff.features.every((f) => f.hoverLabel === undefined)).toBe(true);
    expect(hoverOff).toBe(factory.state.data);

    const quarryHover = hoverAt(factory.state.data, -90, 40, true);
    expect(quarryHover.features.find((f) => f.id === "quarry")).toBeUndefined();
    expect(quarryHover.features.every((f) => f.hoverLabel === undefined)).toBe(
      true,
    );

    const aged = payloadFromPrepared(
      configWithPresentation({ maxAge: "1h" }),
      host,
    );
    expect(isDynamicPointFeaturesPayload(aged.state.data)).toBe(true);
    if (!isDynamicPointFeaturesPayload(aged.state.data)) {
      throw new Error("expected payload");
    }
    expect(aged.state.data.features.map((f) => f.id).sort()).toEqual([
      "m31",
      "m52",
    ]);
    const agedHover = hoverAt(aged.state.data, 10, 50, true);
    expect(agedHover.features.find((f) => f.id === "m28old")).toBeUndefined();
    expect(agedHover.features.every((f) => f.hoverLabel === undefined)).toBe(true);

    const typeOff = payloadFromPrepared(
      configWithPresentation({ earthquakesOnly: true }),
      host,
    );
    expect(isDynamicPointFeaturesPayload(typeOff.state.data)).toBe(true);
    if (!isDynamicPointFeaturesPayload(typeOff.state.data)) {
      throw new Error("expected payload");
    }
    expect(typeOff.state.data.features.some((f) => f.id === "quarry")).toBe(
      false,
    );

    const disabled = normalizeLibrationConfig({
      ...configWithPresentation(),
      layers: { ...DEFAULT_APP_CONFIG.layers, earthquakes: false },
    });
    const disabledReg = createLayerRegistryFromConfig(v2ToAppConfig(disabled));
    expect(disabledReg.getLayers().some((l) => l.id === LAYER_ID)).toBe(false);

    const emptyHover = applyEarthquakePointerHoverToPayload(
      { kind: "dynamicPointFeaturesEquirect", features: [] },
      {
        pointerSceneCss: { x: 10, y: 10 },
        viewportWidthPx: VW,
        viewportHeightPx: VH,
        showLabelOnHover: true,
      },
    );
    expect(emptyHover.features).toEqual([]);

    expect(fetchFn).not.toHaveBeenCalled();
    expect(DEFAULT_EARTHQUAKE_PRESENTATION.showLabelOnHover).toBe(true);
    host.dispose();
  });

  it("historical Demo and missing snapshot yield no hoverable markers", () => {
    const fetchFn: LiveHttpFetchFn = vi.fn(async () => {
      throw new Error("eq-060-no-acquisition-hist");
    });
    const acquired = produceEarthquakesLiveAcquisitionFromFetched(
      {
        ok: true,
        bytes: encodeUsgsShapedGeoJson({
          generatedMs: NOW,
          features: [
            {
              id: "m31",
              lon: -120,
              lat: 35,
              mag: 3.1,
              place: "California",
              time: NOW - 30 * 60 * 1000,
              type: "earthquake",
            },
          ],
        }),
        contentType: "application/json",
        responseUrl: "https://earthquake.usgs.gov/test",
        status: 200,
      },
      { nowMs: () => NOW, versionIdFor: () => "eq-060-hist" },
    );
    expect(acquired.ok).toBe(true);
    if (!acquired.ok) throw new Error("expected acquisition");

    const host = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    host.pointFeaturesMaterializer.noteStoreEntry(acquired.entry);

    const historicalMs = Date.UTC(2017, 7, 21, 18, 25, 30);
    const historical = payloadFromPrepared(
      configWithPresentation(),
      host,
      historicalMs,
    );
    const histAtt = host.attachForProductInstant(historicalMs, {
      wallClockUtcMs: NOW,
    });
    expect(histAtt.getPreparedPointFeatures(USGS_EARTHQUAKES_SOURCE_ID)).toBeNull();
    const histLayer = historical.layer!;
    const histState = histLayer.getState(
      createTimeContext(historicalMs, 0, false, {
        dynamicDataLifecycle: histAtt,
      }),
    );
    expect(histState.visible).toBe(false);
    expect(histState.data).toBeNull();

    const emptyHost = createDynamicDataLifecycleHost({
      earthquakesLiveFetchFn: fetchFn,
      setIntervalFn: () => 1,
      clearIntervalFn: () => undefined,
    });
    const missing = payloadFromPrepared(configWithPresentation(), emptyHost);
    expect(missing.state.visible).toBe(false);
    expect(missing.state.data).toBeNull();

    host.pointFeaturesMaterializer.clearAll();
    const removed = payloadFromPrepared(configWithPresentation(), host);
    expect(removed.state.visible).toBe(false);
    expect(removed.state.data).toBeNull();

    expect(fetchFn).not.toHaveBeenCalled();
    host.dispose();
    emptyHost.dispose();
  });
});
