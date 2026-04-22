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
});
