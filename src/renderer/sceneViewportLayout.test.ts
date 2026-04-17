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
import { cloneHourMarkersConfig } from "../config/appConfig";
import { createTimeContext } from "../core/time";
import { buildDisplayChromeState } from "./displayChrome";
import {
  clampedTopChromeReservedHeightPx,
  sceneLayerViewport,
} from "./sceneViewportLayout";

describe("sceneViewportLayout", () => {
  it("clamps reserved top height to the viewport height", () => {
    expect(clampedTopChromeReservedHeightPx(480, 120)).toBe(120);
    expect(clampedTopChromeReservedHeightPx(480, 900)).toBe(480);
    expect(clampedTopChromeReservedHeightPx(480, -5)).toBe(0);
  });

  it("derives scene layer viewport height from full viewport minus reserved top", () => {
    const full = { width: 640, height: 480, devicePixelRatio: 2 };
    const scene = sceneLayerViewport(full, 88);
    expect(scene).toMatchObject({
      width: 640,
      height: 392,
      devicePixelRatio: 2,
    });
    expect(88 + scene.height).toBe(full.height);
  });
});

describe("scene viewport vs display chrome top band", () => {
  it("keeps scene extent aligned with topBand.height and moves the strip up when indicator entries are hidden", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 1920, height: 1080, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };

    const baseline = buildDisplayChromeState({ time, viewport, frame });
    const hidden = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayChromeLayout: {
        hourMarkers: {
          ...cloneHourMarkersConfig(baseline.displayChromeLayout.hourMarkers),
          indicatorEntriesAreaVisible: false,
        },
      },
    });

    const reservedFull = baseline.topBand.height;
    const reservedHidden = hidden.topBand.height;

    expect(reservedHidden).toBeLessThan(reservedFull);
    expect(reservedFull).toBe(baseline.topBand.height);

    const sceneFull = sceneLayerViewport(viewport, reservedFull);
    const sceneHidden = sceneLayerViewport(viewport, reservedHidden);

    expect(sceneFull.height + reservedFull).toBe(viewport.height);
    expect(sceneHidden.height + reservedHidden).toBe(viewport.height);
    expect(sceneHidden.height).toBeGreaterThan(sceneFull.height);

    expect(reservedFull).toBeGreaterThan(0);
    expect(reservedHidden).toBeGreaterThan(0);
    expect(sceneFull.height).toBeGreaterThan(0);
    expect(sceneHidden.height).toBeGreaterThan(0);
  });
});
