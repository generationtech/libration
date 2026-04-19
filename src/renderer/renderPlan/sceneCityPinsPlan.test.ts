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

import { describe, expect, it, vi, type Mock } from "vitest";
import { DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID } from "../../config/appConfig";
import { mapXFromLongitudeDeg } from "../../core/equirectangularProjection";
import { CITY_PINS_KIND } from "../../layers/cityPinsPayload";
import { executeRenderPlanOnCanvas } from "./canvasRenderPlanExecutor";
import { buildCityPinsRenderPlan } from "./sceneCityPinsPlan";

function latToY(latDeg: number, h: number): number {
  return ((90 - latDeg) / 180) * h;
}

const LABEL_FONT = DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;

describe("buildCityPinsRenderPlan", () => {
  it("returns no items for non-positive viewport dimensions", () => {
    expect(
      buildCityPinsRenderPlan({
        viewportWidthPx: 0,
        viewportHeightPx: 400,
        layerOpacity: 1,
        payload: {
          kind: CITY_PINS_KIND,
          cities: [],
          showLabels: true,
          labelMode: "city",
          scale: "medium",
          labelFontAssetId: LABEL_FONT,
        },
      }).items,
    ).toEqual([]);
  });

  it("emits inner disc, halo, then stroked name text per city when labels on", () => {
    const w = 800;
    const h = 400;
    const plan = buildCityPinsRenderPlan({
      viewportWidthPx: w,
      viewportHeightPx: h,
      layerOpacity: 0.9,
      payload: {
        kind: CITY_PINS_KIND,
        cities: [
          {
            id: "nyc",
            name: "New York",
            latDeg: 40.7,
            lonDeg: -74,
            localTimeLabel: "",
          },
        ],
        showLabels: true,
        labelMode: "city",
        scale: "medium",
        labelFontAssetId: LABEL_FONT,
      },
    });

    expect(plan.items.length).toBe(3);
    expect(plan.items[0]?.kind).toBe("path2d");
    expect(plan.items[1]?.kind).toBe("path2d");
    const t0 = plan.items[2];
    expect(t0?.kind).toBe("text");
    if (t0?.kind !== "text") {
      return;
    }
    expect(t0.text).toBe("New York");
    expect(t0.font.assetId).toBe(LABEL_FONT);
    expect(t0.stroke?.color).toBe("rgba(8, 14, 28, 0.88)");
    expect(t0.opacity).toBe(0.9);
  });

  it("skips label items when showLabels is false", () => {
    const w = 400;
    const h = 200;
    const plan = buildCityPinsRenderPlan({
      viewportWidthPx: w,
      viewportHeightPx: h,
      layerOpacity: 1,
      payload: {
        kind: CITY_PINS_KIND,
        cities: [
          {
            id: "a",
            name: "A",
            latDeg: 0,
            lonDeg: 0,
            localTimeLabel: "12:00",
          },
        ],
        showLabels: false,
        labelMode: "cityAndTime",
        scale: "medium",
        labelFontAssetId: LABEL_FONT,
      },
    });
    expect(plan.items.every((i) => i.kind === "path2d")).toBe(true);
    expect(plan.items.length).toBe(2);
  });

  it("adds local time line only in cityAndTime when localTimeLabel is non-empty", () => {
    const w = 500;
    const h = 250;
    const plan = buildCityPinsRenderPlan({
      viewportWidthPx: w,
      viewportHeightPx: h,
      layerOpacity: 1,
      payload: {
        kind: CITY_PINS_KIND,
        cities: [
          {
            id: "x",
            name: "X",
            latDeg: 10,
            lonDeg: 20,
            localTimeLabel: "3:00 pm",
          },
        ],
        showLabels: true,
        labelMode: "cityAndTime",
        scale: "small",
        labelFontAssetId: LABEL_FONT,
      },
    });
    const texts = plan.items.filter((i) => i.kind === "text");
    expect(texts.length).toBe(2);
    if (texts[1]?.kind !== "text") {
      return;
    }
    expect(texts[1].text).toBe("3:00 pm");
  });

  it("does not emit time line for cityAndTime when localTimeLabel is empty (e.g. custom pin)", () => {
    const plan = buildCityPinsRenderPlan({
      viewportWidthPx: 600,
      viewportHeightPx: 300,
      layerOpacity: 1,
      payload: {
        kind: CITY_PINS_KIND,
        cities: [
          {
            id: "c",
            name: "Custom",
            latDeg: 1,
            lonDeg: 2,
            localTimeLabel: "",
          },
        ],
        showLabels: true,
        labelMode: "cityAndTime",
        scale: "medium",
        labelFontAssetId: LABEL_FONT,
      },
    });
    const texts = plan.items.filter((i) => i.kind === "text");
    expect(texts.length).toBe(1);
  });

  it("places marker and label anchor using equirectangular mapping", () => {
    const w = 360;
    const h = 180;
    const lon = 30;
    const lat = 45;
    const plan = buildCityPinsRenderPlan({
      viewportWidthPx: w,
      viewportHeightPx: h,
      layerOpacity: 1,
      payload: {
        kind: CITY_PINS_KIND,
        cities: [
          {
            id: "p",
            name: "P",
            latDeg: lat,
            lonDeg: lon,
            localTimeLabel: "",
          },
        ],
        showLabels: true,
        labelMode: "city",
        scale: "medium",
        labelFontAssetId: LABEL_FONT,
      },
    });
    const x = mapXFromLongitudeDeg(lon, w);
    const y = latToY(lat, h);
    const r = Math.min(4, Math.max(2.5, w * 0.0028));
    const lx = x + r + 7;
    const inner = plan.items[0];
    if (inner?.kind !== "path2d" || inner.pathKind !== "path2d" || !inner.path) {
      throw new Error("expected path2d with Path2D payload");
    }
    const cap = plan.items[2];
    if (cap?.kind !== "text") {
      throw new Error("expected text");
    }
    expect(cap.x).toBeCloseTo(lx, 5);
    const blockH = cap.font.sizePx;
    expect(cap.y).toBeCloseTo(y - blockH / 2, 5);
  });
});

describe("executeRenderPlanOnCanvas city pin plans", () => {
  function mockCtx(): CanvasRenderingContext2D {
    const c = {
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      shadowColor: "",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      textAlign: "start",
      textBaseline: "alphabetic",
      fillStyle: "",
      strokeStyle: "",
      font: "",
      letterSpacing: "",
      lineWidth: 1,
      lineJoin: "miter",
      miterLimit: 10,
      lineCap: "butt",
      fillText: vi.fn(),
      strokeText: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      clip: vi.fn(),
    };
    return c as unknown as CanvasRenderingContext2D;
  }

  it("executes path2d and stroked+filled label text", () => {
    const ctx = mockCtx();
    const plan = buildCityPinsRenderPlan({
      viewportWidthPx: 200,
      viewportHeightPx: 100,
      layerOpacity: 1,
      payload: {
        kind: CITY_PINS_KIND,
        cities: [
          {
            id: "a",
            name: "A",
            latDeg: 0,
            lonDeg: 0,
            localTimeLabel: "",
          },
        ],
        showLabels: true,
        labelMode: "city",
        scale: "medium",
        labelFontAssetId: LABEL_FONT,
      },
    });
    executeRenderPlanOnCanvas(ctx, plan);
    expect(ctx.fill).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect((ctx.strokeText as Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
    expect((ctx.fillText as Mock).mock.calls.length).toBeGreaterThanOrEqual(1);
  });
});
