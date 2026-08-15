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
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { LUNAR_LOCUS_KIND, type LunarLocusPayload } from "../../layers/lunarLocusPayload";
import {
  DEFAULT_LUNAR_LOCUS_STROKE_RGB,
  LUNAR_LOCUS_EPOCH_UTC,
  interpolateLunarLocusPolyline,
  resetLunarLocusCacheForTests,
  sampleLunarLocus,
} from "../../core/lunarLocus";
import { buildLunarLocusRenderPlan } from "./lunarLocusPlan";

function payload(partial: Partial<LunarLocusPayload> = {}): LunarLocusPayload {
  return {
    kind: LUNAR_LOCUS_KIND,
    points: [],
    ...partial,
  };
}

describe("buildLunarLocusRenderPlan", () => {
  it("emits no primitives for an empty locus", () => {
    const plan = buildLunarLocusRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload(),
    });
    expect(plan.items).toHaveLength(0);
  });

  it("emits line primitives only", () => {
    const plan = buildLunarLocusRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        points: [
          { latDeg: 10, lonDeg: -20 },
          { latDeg: 12, lonDeg: -10 },
          { latDeg: 8, lonDeg: 0 },
        ],
      }),
    });
    expect(plan.items.every((item) => item.kind === "line")).toBe(true);
    expect(plan.items.length).toBeGreaterThan(0);
    expect(plan.items.some((item) => item.kind === "path2d")).toBe(false);
  });

  it("does not emit a world-spanning line across the dateline", () => {
    const plan = buildLunarLocusRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        points: [
          { latDeg: 10, lonDeg: 170 },
          { latDeg: 12, lonDeg: 176 },
          { latDeg: 11, lonDeg: 182 },
          { latDeg: 9, lonDeg: 188 },
        ],
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

  it("uses the lunar stroke identity, not white or solar-analemma warm", () => {
    const plan = buildLunarLocusRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        points: [
          { latDeg: 0, lonDeg: 0 },
          { latDeg: 8, lonDeg: 16 },
        ],
      }),
    });
    const line = plan.items.find((item) => item.kind === "line");
    expect(line?.kind).toBe("line");
    if (line?.kind !== "line") {
      return;
    }
    expect(line.stroke).toMatch(/28,\s*38,\s*56/);
    expect(line.stroke).not.toMatch(/255,\s*200,\s*120/);
    expect(line.strokeWidthPx).toBeCloseTo(1.2, 5);
    expect(DEFAULT_LUNAR_LOCUS_STROKE_RGB).toBe("#1c2638");
  });

  it("propagates custom locus color and thickness without changing geometry", () => {
    const points = [
      { latDeg: 0, lonDeg: 0 },
      { latDeg: 8, lonDeg: 16 },
    ];
    const base = buildLunarLocusRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({ points }),
    });
    const custom = buildLunarLocusRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        points,
        strokeColor: "#ff00aa",
        strokeThickness: "thick",
      }),
    });
    expect(custom.items.length).toBe(base.items.length);
    const line = custom.items.find((item) => item.kind === "line");
    expect(line?.kind).toBe("line");
    if (line?.kind !== "line") {
      return;
    }
    expect(line.stroke).toMatch(/255,\s*0,\s*170/);
    expect(line.strokeWidthPx).toBeCloseTo(1.2 * 1.45, 5);
  });

  it("emits no primitives when opacity is zero", () => {
    const plan = buildLunarLocusRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 0,
      payload: payload({
        points: [
          { latDeg: 0, lonDeg: 0 },
          { latDeg: 1, lonDeg: 1 },
        ],
      }),
    });
    expect(plan.items).toHaveLength(0);
  });

  it("keeps the canvas backend free of lunar-day and standstill semantics", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../canvasRenderBackend.ts"), "utf8");
    expect(src).not.toMatch(/meanLunarDay/);
    expect(src).not.toMatch(/standstill/i);
    expect(src).not.toMatch(/mean lunar/i);
  });

  it("emits an open polyline, not a last-to-first closing span", () => {
    const plan = buildLunarLocusRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({
        points: [
          { latDeg: 0, lonDeg: 0 },
          { latDeg: 0, lonDeg: 20 },
          { latDeg: 20, lonDeg: 20 },
          { latDeg: 20, lonDeg: 0 },
        ],
      }),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines).toHaveLength(3);
  });

  it("does not emit a remote closure chord on the production Moon-anchored locus", () => {
    resetLunarLocusCacheForTests();
    const points = interpolateLunarLocusPolyline(sampleLunarLocus(Date.parse(LUNAR_LOCUS_EPOCH_UTC.recent)));
    const w = 1888;
    const h = 944;
    const plan = buildLunarLocusRenderPlan({
      viewportWidthPx: w,
      viewportHeightPx: h,
      layerOpacity: 1,
      payload: payload({ points }),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines.length).toBeGreaterThan(100);
    const first = points[0]!;
    const last = points[points.length - 1]!;
    const firstX = ((first.lonDeg + 180) / 360) * w;
    const lastX = ((last.lonDeg + 180) / 360) * w;
    const firstY = ((90 - first.latDeg) / 180) * h;
    const lastY = ((90 - last.latDeg) / 180) * h;
    const moonR = Math.min(7.5, Math.max(3.8, w * 0.0046));
    const near = (x0: number, y0: number, x1: number, y1: number) => Math.hypot(x1 - x0, y1 - y0) < 0.35;
    let joinsRawEnds = false;
    let exposesRawEnd = false;
    for (const item of lines) {
      if (item.kind !== "line") {
        continue;
      }
      const aFirst = near(item.x1, item.y1, firstX, firstY) || near(item.x2, item.y2, firstX, firstY);
      const aLast = near(item.x1, item.y1, lastX, lastY) || near(item.x2, item.y2, lastX, lastY);
      if (aFirst && aLast) {
        joinsRawEnds = true;
      }
      if (aFirst || aLast) {
        exposesRawEnd = true;
      }
    }
    expect(joinsRawEnds).toBe(false);
    expect(Math.hypot(lastX - firstX, lastY - firstY)).toBeLessThan(moonR);
    expect(exposesRawEnd).toBe(false);
  });

  it("preserves wrapped-copy geometry without long or reversed world spans", () => {
    resetLunarLocusCacheForTests();
    const points = interpolateLunarLocusPolyline(sampleLunarLocus(Date.parse(LUNAR_LOCUS_EPOCH_UTC.recent)));
    const plan = buildLunarLocusRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      layerOpacity: 1,
      payload: payload({ points }),
    });
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(lines.length).toBeGreaterThan(100);
    for (const item of lines) {
      if (item.kind !== "line") {
        continue;
      }
      const dx = item.x2 - item.x1;
      const dy = item.y2 - item.y1;
      expect(Math.abs(dx)).toBeLessThan(360 * 0.5);
      expect(Math.hypot(dx, dy)).toBeLessThan(40);
    }
  });
});
