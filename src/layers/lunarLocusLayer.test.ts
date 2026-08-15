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
import { LUNAR_LOCUS_EPOCH_UTC, resetLunarLocusCacheForTests } from "../core/lunarLocus";
import { createLunarLocusLayer } from "./lunarLocusLayer";
import { isLunarLocusPayload } from "./lunarLocusPayload";

const RECENT_MS = Date.parse(LUNAR_LOCUS_EPOCH_UTC.recent);

describe("createLunarLocusLayer", () => {
  it("emits a line-only payload from TimeContext.now", () => {
    resetLunarLocusCacheForTests();
    const layer = createLunarLocusLayer({});
    const st = layer.getState(createTimeContext(RECENT_MS, 0, true));
    expect(isLunarLocusPayload(st.data)).toBe(true);
    if (!isLunarLocusPayload(st.data)) {
      return;
    }
    expect(st.data.points.length).toBeGreaterThan(50);
    const moon = sublunarPoint(RECENT_MS);
    const nearest = st.data.points.reduce((best, p) => {
      const d = Math.hypot(p.latDeg - moon.latDeg, p.lonDeg - moon.lonDeg);
      return d < best ? d : best;
    }, Infinity);
    expect(nearest).toBeLessThan(0.15);
  });

  it("is stable for paused product time and changes when now advances", () => {
    resetLunarLocusCacheForTests();
    const layer = createLunarLocusLayer({});
    const pausedA = layer.getState(createTimeContext(RECENT_MS, 0, true));
    const pausedB = layer.getState(createTimeContext(RECENT_MS, 0, true));
    const later = layer.getState(createTimeContext(RECENT_MS + 3_600_000, 0, true));
    expect(isLunarLocusPayload(pausedA.data)).toBe(true);
    expect(isLunarLocusPayload(pausedB.data)).toBe(true);
    expect(isLunarLocusPayload(later.data)).toBe(true);
    if (!isLunarLocusPayload(pausedA.data) || !isLunarLocusPayload(pausedB.data) || !isLunarLocusPayload(later.data)) {
      return;
    }
    expect(pausedA.data.points).toEqual(pausedB.data.points);
    expect(later.data.points).not.toEqual(pausedA.data.points);
  });
});
