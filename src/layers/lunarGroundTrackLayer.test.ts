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
import { sublunarPoint } from "../core/sublunarPoint";
import { resetLunarGroundTrackCacheForTests } from "../core/lunarGroundTrack";
import type { OverlayReadabilityFrame } from "../core/overlayReadabilityFrame";
import { createLunarGroundTrackLayer } from "./lunarGroundTrackLayer";
import { isLunarGroundTrackPayload } from "./lunarGroundTrackPayload";

const fakeFrame: OverlayReadabilityFrame = {
  globalNightVeil01: 0.5,
  globalEmissiveLegibilityPressure01: 0,
  globalReadabilityVeil01: 0.8,
  substrateOverlayReadabilityLiftScale01: 0.9,
  nightVeil01At: () => 0,
  readabilityVeil01At: () => 0,
};

const NOW = Date.UTC(2026, 8, 7, 16, 0, 0, 0);

describe("createLunarGroundTrackLayer", () => {
  it("emits a payload whose current point matches sublunarPoint(now)", () => {
    resetLunarGroundTrackCacheForTests();
    const layer = createLunarGroundTrackLayer({});
    const st = layer.getState(
      createTimeContext(NOW, 0, true, { overlayReadabilityFrame: fakeFrame }),
    );
    expect(isLunarGroundTrackPayload(st.data)).toBe(true);
    if (!isLunarGroundTrackPayload(st.data)) {
      return;
    }
    const moon = sublunarPoint(NOW);
    expect(st.data.current.latDeg).toBeCloseTo(moon.latDeg, 12);
    expect(st.data.current.lonDeg).toBeCloseTo(moon.lonDeg, 12);
    expect(st.data.readability?.nightVeil01).toBe(0.8);
    expect(st.data.pastColor).toBe("#aacdf0");
    expect(st.data.futureColor).toBe("#aacdf0");
  });

  it("changes geometry when product time changes and stays stable when paused", () => {
    resetLunarGroundTrackCacheForTests();
    const layer = createLunarGroundTrackLayer({ pastHours: 6, futureHours: 6 });
    const pausedA = layer.getState(createTimeContext(NOW, 16, true));
    const pausedB = layer.getState(createTimeContext(NOW, 16, true));
    expect(pausedA.data).toEqual(pausedB.data);
    const later = layer.getState(createTimeContext(NOW + 3 * 3600 * 1000, 16, true));
    expect(isLunarGroundTrackPayload(pausedA.data)).toBe(true);
    expect(isLunarGroundTrackPayload(later.data)).toBe(true);
    if (!isLunarGroundTrackPayload(pausedA.data) || !isLunarGroundTrackPayload(later.data)) {
      return;
    }
    expect(later.data.current.lonDeg).not.toBeCloseTo(pausedA.data.current.lonDeg, 4);
  });
});
