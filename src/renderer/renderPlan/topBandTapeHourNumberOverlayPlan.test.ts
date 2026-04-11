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
import { loadBundledFontAssetRegistry } from "../../config/chromeTypography.ts";
import { buildTopBandTapeHourNumberOverlayRenderPlan } from "./topBandTapeHourNumberOverlayPlan.ts";

describe("buildTopBandTapeHourNumberOverlayRenderPlan", () => {
  it("emits rect + text per hour column when tick band has height", () => {
    const markers = Array.from({ length: 24 }, (_, h) => ({
      centerX: 20 + h * 40,
      structuralHour0To23: h,
    }));
    const plan = buildTopBandTapeHourNumberOverlayRenderPlan({
      viewportWidthPx: 960,
      tickBaselineY: 120,
      tickBandHeightPx: 14,
      markers,
      topBandMode: "utc24",
      textFill: "rgba(220,235,252,0.9)",
      boxFill: "rgba(6,26,54,0.94)",
      boxStroke: "rgba(130,188,228,0.42)",
      fontSizePx: 8,
      glyphRenderContext: { fontRegistry: loadBundledFontAssetRegistry() },
    });
    const rects = plan.items.filter((i) => i.kind === "rect");
    const texts = plan.items.filter((i) => i.kind === "text");
    expect(rects.length).toBe(24);
    expect(texts.length).toBe(24);
  });

  it("emits nothing when tick band height is zero", () => {
    const plan = buildTopBandTapeHourNumberOverlayRenderPlan({
      viewportWidthPx: 800,
      tickBaselineY: 100,
      tickBandHeightPx: 0,
      markers: [],
      topBandMode: "utc24",
      textFill: "#fff",
      boxFill: "#000",
      boxStroke: "#333",
      fontSizePx: 8,
      glyphRenderContext: { fontRegistry: loadBundledFontAssetRegistry() },
    });
    expect(plan.items).toHaveLength(0);
  });
});
