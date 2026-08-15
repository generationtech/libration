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
          { latDeg: 1, lonDeg: 2 },
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
