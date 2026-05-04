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

/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createTimeContext } from "../core/time";
import { createSolarShadingLayer } from "../layers/solarShadingLayer";
import { DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID } from "../config/emissiveCompositionAssetResolve";
import { toRenderableLayerState } from "./layerInputAdapter";
import { CanvasRenderBackend } from "./canvasRenderBackend";

function recording2dContext(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D;
  log: string[];
} {
  const log: string[] = [];
  const noop = (): void => {};
  const ctx = {
    canvas,
    get globalAlpha() {
      return 1;
    },
    set globalAlpha(_v: number) {
      noop();
    },
    get fillStyle() {
      return "#000";
    },
    set fillStyle(_v: string) {
      noop();
    },
    setTransform(...args: number[]): void {
      log.push(`setTransform(${args.join(",")})`);
    },
    fillRect(...args: number[]): void {
      log.push(`fillRect(${args.join(",")})`);
    },
    save(): void {
      log.push("save");
    },
    restore(): void {
      log.push("restore");
    },
    beginPath(): void {
      log.push("beginPath");
    },
    rect(...args: number[]): void {
      log.push(`rect(${args.join(",")})`);
    },
    clip(): void {
      log.push("clip");
    },
    translate(...args: number[]): void {
      log.push(`translate(${args.join(",")})`);
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, log };
}

describe("CanvasRenderBackend", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("constructs one Image per URL when decode fires onload synchronously (emissive raster path)", async () => {
    let imageCtorCount = 0;
    class SyncDecodeImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      complete = false;
      naturalWidth = 0;
      naturalHeight = 0;
      #srcUrl = "";
      constructor() {
        imageCtorCount += 1;
      }
      set src(u: string) {
        this.#srcUrl = u;
        this.complete = true;
        this.naturalWidth = 2;
        this.naturalHeight = 2;
        this.onload?.();
      }
      get src(): string {
        return this.#srcUrl;
      }
    }
    vi.stubGlobal("Image", SyncDecodeImage as unknown as typeof Image);

    const canvas = document.createElement("canvas");
    canvas.width = 120;
    canvas.height = 80;
    const backend = new CanvasRenderBackend(canvas);
    const viewport = { width: 120, height: 80, devicePixelRatio: 1 };
    await backend.initialize(viewport);

    const solar = createSolarShadingLayer({
      emissiveNightLightsMode: "illustrative",
      emissiveCompositionAssetId: DEFAULT_EMISSIVE_COMPOSITION_ASSET_ID,
    });
    const time = createTimeContext(0, 0, false);
    const layerState = toRenderableLayerState(solar, solar.getState(time));

    backend.render({
      frame: { frameNumber: 1, now: 0, deltaMs: 0 },
      viewport,
      layers: [layerState],
      scene: {},
      sceneLayerViewportPx: { x: 0, y: 0, width: 120, height: 80 },
    });

    expect(imageCtorCount).toBe(1);
  });

  it("clips and translates using sceneLayerViewportPx without reading top chrome height", async () => {
    const canvas = document.createElement("canvas");
    const { ctx, log } = recording2dContext(canvas);
    vi.spyOn(canvas, "getContext").mockImplementation((type) => {
      if (type === "2d") {
        return ctx;
      }
      return null;
    });

    const backend = new CanvasRenderBackend(canvas);
    const viewport = { width: 800, height: 600, devicePixelRatio: 2 };
    await backend.initialize(viewport);

    backend.render({
      frame: { frameNumber: 1, now: 0, deltaMs: 0 },
      viewport,
      layers: [],
      scene: { backgroundColor: "#111" },
      sceneLayerViewportPx: { x: 0, y: 72, width: 800, height: 528 },
    });

    const clipSequence = log.filter((e) =>
      ["save", "beginPath", "rect(0,72,800,528)", "clip", "translate(0,72)", "restore"].includes(e),
    );
    expect(clipSequence).toEqual([
      "save",
      "beginPath",
      "rect(0,72,800,528)",
      "clip",
      "translate(0,72)",
      "restore",
    ]);
  });

  it("skips scene clip when sceneLayerViewportPx matches the full viewport", async () => {
    const canvas = document.createElement("canvas");
    const { ctx, log } = recording2dContext(canvas);
    vi.spyOn(canvas, "getContext").mockImplementation((type) => {
      if (type === "2d") {
        return ctx;
      }
      return null;
    });

    const backend = new CanvasRenderBackend(canvas);
    const viewport = { width: 400, height: 300, devicePixelRatio: 1 };
    await backend.initialize(viewport);

    backend.render({
      frame: { frameNumber: 1, now: 0, deltaMs: 0 },
      viewport,
      layers: [],
      scene: {},
      sceneLayerViewportPx: { x: 0, y: 0, width: 400, height: 300 },
    });

    expect(log.some((e) => e.startsWith("rect(") && e !== "fillRect(0,0,400,300)")).toBe(false);
    expect(log.some((e) => e.startsWith("translate("))).toBe(false);
  });
});
