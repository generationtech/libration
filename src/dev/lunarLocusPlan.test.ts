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
import { LUNAR_LOCUS_EPOCH_UTC, LUNAR_LOCUS_SAMPLE_COUNT } from "./lunarLocusExperiment";
import { buildLunarLocusRenderPlan } from "./lunarLocusPlan";

const RECENT_MS = Date.parse(LUNAR_LOCUS_EPOCH_UTC.recent);
const WIDTH = 1920;
const HEIGHT = 980;

describe("lunarLocusPlan", () => {
  it("emits one disc per sample for dots-only", () => {
    const plan = buildLunarLocusRenderPlan({
      utcMs: RECENT_MS,
      viewportWidthPx: WIDTH,
      viewportHeightPx: HEIGHT,
      mode: "glyph",
      treatment: "dots",
    });
    const discs = plan.items.filter((item) => item.kind === "path2d");
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(discs).toHaveLength(LUNAR_LOCUS_SAMPLE_COUNT);
    expect(lines).toHaveLength(0);
  });

  it("emits discs plus connecting segments for dots-line", () => {
    const plan = buildLunarLocusRenderPlan({
      utcMs: RECENT_MS,
      viewportWidthPx: WIDTH,
      viewportHeightPx: HEIGHT,
      mode: "residual",
      treatment: "dots-line",
    });
    const discs = plan.items.filter((item) => item.kind === "path2d");
    const lines = plan.items.filter((item) => item.kind === "line");
    expect(discs).toHaveLength(LUNAR_LOCUS_SAMPLE_COUNT);
    expect(lines.length).toBe(LUNAR_LOCUS_SAMPLE_COUNT - 1);
  });

  it("does not emit a world-spanning segment across a dateline pair", () => {
    const plan = buildLunarLocusRenderPlan({
      utcMs: RECENT_MS,
      viewportWidthPx: WIDTH,
      viewportHeightPx: HEIGHT,
      mode: "geographic",
      treatment: "dots-line",
    });
    for (const item of plan.items) {
      if (item.kind !== "line") {
        continue;
      }
      expect(Math.abs(item.x2 - item.x1)).toBeLessThan(WIDTH * 0.5);
    }
  });

  it("is deterministic for a fixed epoch and viewport", () => {
    const a = buildLunarLocusRenderPlan({
      utcMs: RECENT_MS,
      viewportWidthPx: WIDTH,
      viewportHeightPx: HEIGHT,
      mode: "glyph",
      treatment: "dots-line",
    });
    const b = buildLunarLocusRenderPlan({
      utcMs: RECENT_MS,
      viewportWidthPx: WIDTH,
      viewportHeightPx: HEIGHT,
      mode: "glyph",
      treatment: "dots-line",
    });
    expect(a.items).toHaveLength(b.items.length);
    expect(a.items.filter((i) => i.kind === "line")).toHaveLength(
      b.items.filter((i) => i.kind === "line").length,
    );
  });
});
