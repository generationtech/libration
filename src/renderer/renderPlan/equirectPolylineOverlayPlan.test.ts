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
import { buildEquirectangularPolylineOverlayRenderPlan } from "./equirectPolylineOverlayPlan";
import { moonLongitudeLockedSceneReferenceFrame } from "../../core/sceneReferenceFrame";

describe("buildEquirectangularPolylineOverlayRenderPlan", () => {
  it("emits at least one line for an open two-point path", () => {
    const plan = buildEquirectangularPolylineOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      points: [
        { latDeg: 0, lonDeg: -10 },
        { latDeg: 0, lonDeg: 10 },
      ],
      closed: false,
      layerOpacity: 1,
    });
    expect(plan.items.length).toBeGreaterThan(0);
    const line = plan.items[0]!;
    expect(line.kind).toBe("line");
  });

  it("returns no items for fewer than two points", () => {
    const plan = buildEquirectangularPolylineOverlayRenderPlan({
      viewportWidthPx: 100,
      viewportHeightPx: 50,
      points: [{ latDeg: 0, lonDeg: 0 }],
      closed: true,
      layerOpacity: 1,
    });
    expect(plan.items).toHaveLength(0);
  });

  it("increases stroke width when readability night veil is high", () => {
    const base = buildEquirectangularPolylineOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      points: [
        { latDeg: 0, lonDeg: -10 },
        { latDeg: 0, lonDeg: 10 },
      ],
      closed: false,
      layerOpacity: 1,
    });
    const hi = buildEquirectangularPolylineOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      points: [
        { latDeg: 0, lonDeg: -10 },
        { latDeg: 0, lonDeg: 10 },
      ],
      closed: false,
      layerOpacity: 1,
      readability: { nightVeil01: 1 },
    });
    const b = base.items[0];
    const h = hi.items[0];
    expect(b?.kind).toBe("line");
    expect(h?.kind).toBe("line");
    if (b?.kind === "line" && h?.kind === "line") {
      expect(h.strokeWidthPx).toBeGreaterThan(b.strokeWidthPx);
    }
  });

  it("uses the current solar-analemma default color and accepts an independent custom stroke", () => {
    const points = [
      { latDeg: 0, lonDeg: -10 },
      { latDeg: 0, lonDeg: 10 },
    ];
    const base = buildEquirectangularPolylineOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      points,
      closed: false,
      layerOpacity: 1,
    });
    const custom = buildEquirectangularPolylineOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      points,
      closed: false,
      layerOpacity: 1,
      strokeColor: "#00ffaa",
      strokeThickness: "thin",
    });
    const b = base.items[0];
    const c = custom.items[0];
    expect(b?.kind).toBe("line");
    expect(c?.kind).toBe("line");
    if (b?.kind === "line" && c?.kind === "line") {
      expect(b.stroke).toMatch(/255,\s*200,\s*120/);
      expect(c.stroke).toMatch(/0,\s*255,\s*170/);
      expect(c.strokeWidthPx).toBeLessThan(b.strokeWidthPx);
      expect(custom.items.length).toBe(base.items.length);
    }
  });
});

describe("Moon longitude-lock polyline seams", () => {
  it("does not emit a world-spanning chord for a path across the Moon-frame antipode", () => {
    const frame = moonLongitudeLockedSceneReferenceFrame(0);
    const plan = buildEquirectangularPolylineOverlayRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      frame,
      points: [
        { latDeg: 0, lonDeg: 179 },
        { latDeg: 0, lonDeg: -179 },
      ],
      closed: false,
      layerOpacity: 1,
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
