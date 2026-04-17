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

import { describe, expect, it, vi } from "vitest";
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
