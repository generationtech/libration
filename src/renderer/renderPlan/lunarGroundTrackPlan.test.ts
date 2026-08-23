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
import { LUNAR_GROUND_TRACK_KIND, type LunarGroundTrackPayload } from "../../layers/lunarGroundTrackPayload";
import { moonLongitudeLockedSceneReferenceFrame } from "../../core/sceneReferenceFrame";
import { buildLunarGroundTrackRenderPlan } from "./lunarGroundTrackPlan";

function payload(partial: Partial<LunarGroundTrackPayload> = {}): LunarGroundTrackPayload {
  return {
    kind: LUNAR_GROUND_TRACK_KIND,
    past: [],
    current: { latDeg: 0, lonDeg: 0 },
    future: [],
    ticks: [],
    pastColor: "#aacdf0",
    futureColor: "#aacdf0",
    ...partial,
  };
}

describe("buildLunarGroundTrackRenderPlan", () => {
  it("emits no primitives for an empty track", () => {
    const plan = buildLunarGroundTrackRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload(),
    });
    expect(plan.items).toHaveLength(0);
  });

  it("does not emit a world-spanning line across the dateline", () => {
    const plan = buildLunarGroundTrackRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        past: [{ latDeg: 10, lonDeg: 170 }],
        current: { latDeg: 10, lonDeg: 179 },
        future: [{ latDeg: 10, lonDeg: -179 }],
      }),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines.length).toBeGreaterThan(0);
    for (const item of lines) {
      if (item.kind !== "line") {
        continue;
      }
      expect(Math.abs(item.x2 - item.x1)).toBeLessThan(360 * 0.5);
    }
  });

  it("emits past and future segments plus ticks when those arrays are populated", () => {
    const plan = buildLunarGroundTrackRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        past: [{ latDeg: 0, lonDeg: -20 }],
        current: { latDeg: 0, lonDeg: 0 },
        future: [{ latDeg: 0, lonDeg: 20 }],
        ticks: [{ latDeg: 5, lonDeg: -10 }],
      }),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    const ticks = plan.items.filter((item) => item.kind === "path2d");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    expect(ticks).toHaveLength(1);
    const past = lines[0];
    const future = lines[1];
    expect(past?.kind).toBe("line");
    expect(future?.kind).toBe("line");
    if (past?.kind === "line" && future?.kind === "line") {
      const pastA = Number(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/.exec(past.stroke)?.[1]);
      const futureA = Number(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/.exec(future.stroke)?.[1]);
      expect(futureA).toBeGreaterThan(pastA);
      expect(past.stroke).toMatch(/^rgba\(170,\s*205,\s*240,/);
      expect(future.stroke).toMatch(/^rgba\(170,\s*205,\s*240,/);
    }
  });

  it("uses configured past and future RGB identities independently", () => {
    const plan = buildLunarGroundTrackRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        past: [{ latDeg: 0, lonDeg: -20 }],
        current: { latDeg: 0, lonDeg: 0 },
        future: [{ latDeg: 0, lonDeg: 20 }],
        pastColor: "#ff0000",
        futureColor: "#00ff00",
      }),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines.length).toBeGreaterThanOrEqual(2);
    const past = lines[0];
    const future = lines[1];
    expect(past?.kind).toBe("line");
    expect(future?.kind).toBe("line");
    if (past?.kind === "line" && future?.kind === "line") {
      expect(past.stroke).toMatch(/^rgba\(255,\s*0,\s*0,/);
      expect(future.stroke).toMatch(/^rgba\(0,\s*255,\s*0,/);
      const pastA = Number(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/.exec(past.stroke)?.[1]);
      const futureA = Number(/rgba\([^,]+,[^,]+,[^,]+,\s*([0-9.]+)\)/.exec(future.stroke)?.[1]);
      expect(futureA).toBeGreaterThan(pastA);
    }
  });

  it("keeps Moon-frame dateline segments short rather than spanning the world", () => {
    const plan = buildLunarGroundTrackRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      frame: moonLongitudeLockedSceneReferenceFrame(175),
      layerOpacity: 1,
      payload: payload({
        past: [{ latDeg: 10, lonDeg: 170 }],
        current: { latDeg: 10, lonDeg: 179 },
        future: [{ latDeg: 10, lonDeg: -179 }],
      }),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines.length).toBeGreaterThan(0);
    for (const item of lines) {
      if (item.kind !== "line") {
        continue;
      }
      expect(Math.abs(item.x2 - item.x1)).toBeLessThan(360 * 0.5);
    }
  });
});
