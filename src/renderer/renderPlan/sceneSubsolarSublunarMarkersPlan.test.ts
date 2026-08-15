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
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { executeRenderPlanOnCanvas } from "./canvasRenderPlanExecutor";
import {
  buildSubsolarMarkerRenderPlan,
  buildSublunarMarkerRenderPlan,
} from "./sceneSubsolarSublunarMarkersPlan";

describe("buildSubsolarMarkerRenderPlan", () => {
  it("emits empty plan for zero viewport", () => {
    const plan = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: 0,
      viewportHeightPx: 400,
      lonDeg: 0,
      latDeg: 0,
    });
    expect(plan.items).toHaveLength(0);
  });

  it("places glow, eight rays, disk fill+stroke, and outer ring in order", () => {
    const plan = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: 800,
      viewportHeightPx: 400,
      lonDeg: 0,
      latDeg: 0,
    });
    expect(plan.items[0]).toMatchObject({
      kind: "radialGradientFill",
      clipR: expect.any(Number),
    });
    expect(plan.items[0]).toMatchObject({
      kind: "radialGradientFill",
      clipCx: 400,
      clipCy: 200,
    });

    const rays = plan.items.slice(1, 9);
    expect(rays).toHaveLength(8);
    for (const r of rays) {
      expect(r).toMatchObject({ kind: "line", lineCap: "round" });
    }

    expect(plan.items[9]).toMatchObject({
      kind: "path2d",
      fill: "rgba(255, 210, 72, 0.96)",
    });
    expect(plan.items[10]).toMatchObject({
      kind: "path2d",
      stroke: "rgba(255, 255, 255, 0.42)",
    });
    expect(plan.items).toHaveLength(11);
  });

  it("widens subsolar strokes when readability night veil is high", () => {
    const base = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: 800,
      viewportHeightPx: 400,
      lonDeg: 0,
      latDeg: 0,
    });
    const hi = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: 800,
      viewportHeightPx: 400,
      lonDeg: 0,
      latDeg: 0,
      readability: { nightVeil01: 1 },
    });
    const rayB = base.items[1];
    const rayH = hi.items[1];
    expect(rayB?.kind).toBe("line");
    expect(rayH?.kind).toBe("line");
    if (rayB?.kind === "line" && rayH?.kind === "line") {
      expect(rayH.strokeWidthPx).toBeGreaterThan(rayB.strokeWidthPx);
    }
  });

  it("maps longitude and latitude to scene coordinates", () => {
    const plan = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: 360,
      viewportHeightPx: 180,
      lonDeg: -180,
      latDeg: -90,
    });
    const glow = plan.items[0] as Extract<
      (typeof plan.items)[number],
      { kind: "radialGradientFill" }
    >;
    expect(glow.clipCx).toBe(0);
    expect(glow.clipCy).toBe(180);
  });
});

describe("buildSublunarMarkerRenderPlan", () => {
  it("emits glow, lit disk, optional shadow quad with disk clip, strokes", () => {
    const plan = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 400,
      viewportHeightPx: 200,
      lonDeg: 10,
      latDeg: 0,
      illuminatedFraction: 0.5,
      waxing: true,
    });

    expect(plan.items[0].kind).toBe("radialGradientFill");
    expect(plan.items[1].kind).toBe("radialGradientFill");

    const shadow = plan.items[2];
    expect(shadow).toMatchObject({
      kind: "path2d",
      fill: "rgba(28, 38, 56, 0.9)",
    });
    expect(shadow).toMatchObject({
      kind: "path2d",
      clip: {
        clipPathKind: "descriptor",
        clipPathDescriptor: { commands: expect.any(Array) },
      },
    });

    const last = plan.items[plan.items.length - 1];
    expect(last).toMatchObject({
      kind: "path2d",
      stroke: "rgba(255, 255, 255, 0.38)",
    });
  });

  it("omits terminator line near full or new moon", () => {
    const full = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 400,
      viewportHeightPx: 200,
      lonDeg: 0,
      latDeg: 0,
      illuminatedFraction: 1,
      waxing: true,
    });
    expect(full.items.some((i) => i.kind === "line")).toBe(false);

    const quarter = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 400,
      viewportHeightPx: 200,
      lonDeg: 0,
      latDeg: 0,
      illuminatedFraction: 0.5,
      waxing: false,
    });
    expect(quarter.items.some((i) => i.kind === "line")).toBe(true);
  });

  it("omits the libration mark when disabled and keeps the previous phase-only order", () => {
    const off = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 400,
      viewportHeightPx: 200,
      lonDeg: 0,
      latDeg: 0,
      illuminatedFraction: 0.5,
      waxing: true,
      appearance: {
        size: "normal",
        librationEnabled: false,
        librationStyle: "ring",
        librationColor: "#c5d4e8",
        librationThickness: "normal",
        librationMotionScale: "normal",
      },
    });
    const on = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 400,
      viewportHeightPx: 200,
      lonDeg: 0,
      latDeg: 0,
      illuminatedFraction: 0.5,
      waxing: true,
      librationLongitudeDeg: 0,
      librationLatitudeDeg: 0,
    });
    expect(on.items.length).toBe(off.items.length + 2);
    expect(off.items[off.items.length - 1]).toMatchObject({
      kind: "path2d",
      stroke: "rgba(255, 255, 255, 0.38)",
    });
  });

  it("emits a clipped ring at disc center for zero libration", () => {
    const plan = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 400,
      viewportHeightPx: 200,
      lonDeg: 0,
      latDeg: 0,
      illuminatedFraction: 1,
      waxing: true,
      librationLongitudeDeg: 0,
      librationLatitudeDeg: 0,
    });
    const ring = plan.items.filter((i) => i.kind === "path2d" && "clip" in i && i.clip);
    expect(ring.length).toBeGreaterThanOrEqual(2);
    const indicator = ring[ring.length - 1];
    expect(indicator).toMatchObject({
      kind: "path2d",
      stroke: expect.stringMatching(/197,\s*212,\s*232/),
      clip: { clipPathKind: "descriptor" },
    });
  });

  it("emits a clipped crosshair path in crosshair mode", () => {
    const plan = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 400,
      viewportHeightPx: 200,
      lonDeg: 0,
      latDeg: 0,
      illuminatedFraction: 0.5,
      waxing: true,
      librationLongitudeDeg: 4,
      librationLatitudeDeg: 3,
      appearance: {
        size: "normal",
        librationEnabled: true,
        librationStyle: "crosshair",
        librationColor: "#c5d4e8",
        librationThickness: "normal",
        librationMotionScale: "normal",
      },
    });
    const marks = plan.items.filter((i) => i.kind === "path2d" && i.clip);
    expect(marks.length).toBeGreaterThanOrEqual(2);
  });

  it("scales the disc with Moon size without changing Sun radius", () => {
    const normal = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 1888,
      viewportHeightPx: 944,
      lonDeg: 0,
      latDeg: 0,
      illuminatedFraction: 0.5,
      waxing: true,
      appearance: {
        size: "normal",
        librationEnabled: false,
        librationStyle: "ring",
        librationColor: "#c5d4e8",
        librationThickness: "normal",
        librationMotionScale: "normal",
      },
    });
    const large = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 1888,
      viewportHeightPx: 944,
      lonDeg: 0,
      latDeg: 0,
      illuminatedFraction: 0.5,
      waxing: true,
      appearance: {
        size: "large",
        librationEnabled: false,
        librationStyle: "ring",
        librationColor: "#c5d4e8",
        librationThickness: "normal",
        librationMotionScale: "normal",
      },
    });
    const sun = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: 1888,
      viewportHeightPx: 944,
      lonDeg: 0,
      latDeg: 0,
    });
    const nFill = normal.items[1];
    const lFill = large.items[1];
    const sFill = sun.items[0];
    expect(nFill?.kind).toBe("radialGradientFill");
    expect(lFill?.kind).toBe("radialGradientFill");
    expect(sFill?.kind).toBe("radialGradientFill");
    if (
      nFill?.kind === "radialGradientFill" &&
      lFill?.kind === "radialGradientFill" &&
      sFill?.kind === "radialGradientFill"
    ) {
      expect(nFill.clipR).toBe(7.5);
      expect(lFill.clipR).toBeCloseTo(7.5 * 1.42, 5);
      expect(sFill.clipR).toBe(Math.min(9, Math.max(4.5, 1888 * 0.0055)) * 2.4);
    }
  });

  it("keeps astronomy out of the canvas backend", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../canvasRenderBackend.ts"), "utf8");
    expect(src).not.toMatch(/opticalLunarLibration/);
    expect(src).not.toMatch(/moonEcliptic/);
    expect(src).not.toMatch(/librationMotionScale/);
  });
});

describe("executeRenderPlanOnCanvas subsolar + sublunar marker plans", () => {
  function mockCtx(): CanvasRenderingContext2D {
    const gradient = { addColorStop: vi.fn() };
    const c = {
      save: vi.fn(),
      restore: vi.fn(),
      globalAlpha: 1,
      beginPath: vi.fn(),
      arc: vi.fn(),
      clip: vi.fn(),
      fillRect: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
      lineCap: "butt",
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      createRadialGradient: vi.fn(() => gradient),
    };
    return c as unknown as CanvasRenderingContext2D;
  }

  it("executes subsolar plan with radial fills, lines, and path2d", () => {
    const ctx = mockCtx();
    const plan = buildSubsolarMarkerRenderPlan({
      viewportWidthPx: 200,
      viewportHeightPx: 100,
      lonDeg: 0,
      latDeg: 0,
    });
    executeRenderPlanOnCanvas(ctx, plan);
    expect(ctx.createRadialGradient).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.clip).toHaveBeenCalled();
    expect(ctx.fillRect).toHaveBeenCalled();
    expect(ctx.lineTo).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.fill).toHaveBeenCalled();
  });

  it("clips path2d fill when sublunar shadow clip payload is set", () => {
    const ctx = mockCtx();
    const plan = buildSublunarMarkerRenderPlan({
      viewportWidthPx: 300,
      viewportHeightPx: 150,
      lonDeg: 5,
      latDeg: 10,
      illuminatedFraction: 0.55,
      waxing: true,
    });
    executeRenderPlanOnCanvas(ctx, plan);
    expect(ctx.clip).toHaveBeenCalled();
    const clipCalls = (ctx.clip as Mock).mock.calls.length;
    expect(clipCalls).toBeGreaterThanOrEqual(2);
  });
});
