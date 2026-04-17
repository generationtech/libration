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
import {
  buildDisplayChromeState,
  buildSceneRenderInput,
  createViewportFromCanvas,
} from "./renderBridge";
import { createTimeContext } from "../core/time";
import { sceneLayerViewportRectPx } from "../renderer/sceneViewportLayout";

describe("renderBridge", () => {
  it("buildSceneRenderInput keeps scene defaults compatible with the canvas backend", () => {
    const input = buildSceneRenderInput({
      frame: { frameNumber: 0, now: 0, deltaMs: 0 },
      viewport: { width: 640, height: 480, devicePixelRatio: 1 },
      layers: [],
    });
    expect(input.scene).toEqual({});
    expect(input.layers).toEqual([]);
    expect(input.sceneLayerViewportPx).toEqual({
      x: 0,
      y: 0,
      width: 640,
      height: 480,
    });
  });

  it("buildSceneRenderInput resolves sceneLayerViewportPx from top band height (not forwarded raw)", () => {
    const viewport = { width: 640, height: 480, devicePixelRatio: 1 };
    const input = buildSceneRenderInput({
      frame: { frameNumber: 0, now: 0, deltaMs: 0 },
      viewport,
      layers: [],
      topChromeReservedHeightPx: 72,
    });
    expect(input.sceneLayerViewportPx).toEqual(
      sceneLayerViewportRectPx(viewport, 72),
    );
    expect(
      "topChromeReservedHeightPx" in input &&
        (input as { topChromeReservedHeightPx?: number }).topChromeReservedHeightPx !== undefined,
    ).toBe(false);
  });

  it("createViewportFromCanvas uses element client dimensions (min 1×1)", () => {
    const canvas = { clientWidth: 640, clientHeight: 480 } as HTMLCanvasElement;
    expect(createViewportFromCanvas(canvas)).toMatchObject({
      width: 640,
      height: 480,
    });
    const tiny = { clientWidth: 0, clientHeight: 0 } as HTMLCanvasElement;
    expect(createViewportFromCanvas(tiny).width).toBeGreaterThanOrEqual(1);
    expect(createViewportFromCanvas(tiny).height).toBeGreaterThanOrEqual(1);
  });

  it("re-exports display chrome builder for the same orchestration surface as scene input", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const chrome = buildDisplayChromeState({
      time,
      viewport: { width: 640, height: 480, devicePixelRatio: 1 },
      frame: { frameNumber: 3, now: time.now, deltaMs: time.deltaMs },
    });
    expect(chrome.frameNumber).toBe(3);
    expect(chrome.viewport.width).toBe(640);
  });
});
