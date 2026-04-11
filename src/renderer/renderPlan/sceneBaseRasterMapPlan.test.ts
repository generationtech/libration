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
import { WORLD_EQUIRECTANGULAR_SRC } from "../../layers/baseMapLayer";
import { buildBaseRasterMapRenderPlan } from "./sceneBaseRasterMapPlan";

describe("buildBaseRasterMapRenderPlan", () => {
  it("emits a single imageBlit covering the viewport with the given src", () => {
    const plan = buildBaseRasterMapRenderPlan({
      src: WORLD_EQUIRECTANGULAR_SRC,
      viewportWidthPx: 800,
      viewportHeightPx: 400,
    });
    expect(plan.items).toHaveLength(1);
    const item = plan.items[0];
    expect(item.kind).toBe("imageBlit");
    if (item.kind !== "imageBlit") {
      return;
    }
    expect(item.src).toBe(WORLD_EQUIRECTANGULAR_SRC);
    expect(item.x).toBe(0);
    expect(item.y).toBe(0);
    expect(item.width).toBe(800);
    expect(item.height).toBe(400);
  });

  it("returns an empty plan when viewport dimensions are non-positive", () => {
    expect(
      buildBaseRasterMapRenderPlan({
        src: "/maps/x.jpg",
        viewportWidthPx: 0,
        viewportHeightPx: 100,
      }).items,
    ).toEqual([]);
    expect(
      buildBaseRasterMapRenderPlan({
        src: "/maps/x.jpg",
        viewportWidthPx: 10,
        viewportHeightPx: -1,
      }).items,
    ).toEqual([]);
  });
});
