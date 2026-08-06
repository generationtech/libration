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

/**
 * DLU-1: visibility & render readiness — Canvas dispatches layer type `tracks`
 * (ISS orbital path was silent when paint lived only under `points`).
 */

import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_APP_CONFIG, type AppConfig } from "../config/appConfig";
import { buildDefaultSceneConfigFromLayerFlags } from "../config/v2/sceneConfig";
import { createLayerRegistryFromConfig } from "../app/bootstrap";
import {
  createDynamicTracksOverlayLayer,
  runtimeIdForDynamicTracksSceneLayer,
} from "../layers/dynamicTracksOverlayLayer";
import {
  DYNAMIC_TRACKS_KIND,
  type DynamicTracksPayload,
} from "../layers/dynamicTracksPayload";
import {
  DYNAMIC_POINT_FEATURES_KIND,
  type DynamicPointFeaturesPayload,
} from "../layers/dynamicPointFeaturesPayload";
import { CanvasRenderBackend } from "./canvasRenderBackend";
import * as sceneDynamicTracksPlan from "./renderPlan/sceneDynamicTracksPlan";
import * as sceneDynamicPointFeaturesPlan from "./renderPlan/sceneDynamicPointFeaturesPlan";
import type { RenderableLayerState } from "./types";

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
    get strokeStyle() {
      return "#000";
    },
    set strokeStyle(_v: string) {
      noop();
    },
    get lineWidth() {
      return 1;
    },
    set lineWidth(_v: number) {
      noop();
    },
    get lineCap() {
      return "butt";
    },
    set lineCap(_v: string) {
      noop();
    },
    get lineJoin() {
      return "miter";
    },
    set lineJoin(_v: string) {
      noop();
    },
    get miterLimit() {
      return 10;
    },
    set miterLimit(_v: number) {
      noop();
    },
    get font() {
      return "";
    },
    set font(_v: string) {
      noop();
    },
    get textAlign() {
      return "start";
    },
    set textAlign(_v: string) {
      noop();
    },
    get textBaseline() {
      return "alphabetic";
    },
    set textBaseline(_v: string) {
      noop();
    },
    get letterSpacing() {
      return "0px";
    },
    set letterSpacing(_v: string) {
      noop();
    },
    get shadowColor() {
      return "transparent";
    },
    set shadowColor(_v: string) {
      noop();
    },
    get shadowBlur() {
      return 0;
    },
    set shadowBlur(_v: number) {
      noop();
    },
    get shadowOffsetX() {
      return 0;
    },
    set shadowOffsetX(_v: number) {
      noop();
    },
    get shadowOffsetY() {
      return 0;
    },
    set shadowOffsetY(_v: number) {
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
    moveTo(...args: number[]): void {
      log.push(`moveTo(${args.join(",")})`);
    },
    lineTo(...args: number[]): void {
      log.push(`lineTo(${args.join(",")})`);
    },
    stroke(): void {
      log.push("stroke");
    },
    fill(_path?: Path2D): void {
      log.push("fill");
    },
    fillText(text: string, ...args: number[]): void {
      log.push(`fillText(${text},${args.join(",")})`);
    },
    strokeText(text: string, ...args: number[]): void {
      log.push(`strokeText(${text},${args.join(",")})`);
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

const tracksPayload: DynamicTracksPayload = {
  kind: DYNAMIC_TRACKS_KIND,
  tracks: [
    {
      id: "iss",
      label: "ISS (ZARYA)",
      samples: [
        { lonDeg: -120, latDeg: 32, timeMs: 1 },
        { lonDeg: -100, latDeg: 40, timeMs: 2 },
        { lonDeg: -80, latDeg: 48, timeMs: 3 },
      ],
    },
  ],
};

const pointsPayload: DynamicPointFeaturesPayload = {
  kind: DYNAMIC_POINT_FEATURES_KIND,
  features: [
    {
      id: "eq-1",
      lonDeg: -122,
      latDeg: 37,
      magnitude: 5.2,
      label: "M 5.2",
    },
  ],
};

describe("DLU-1 visibility & render readiness", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("orbitalTracks layer declares type tracks (not points)", () => {
    const layer = createDynamicTracksOverlayLayer({
      sceneLayerId: "orbitalTracks",
      sourceId: "iss-orbital-track-v1",
    });
    expect(layer.type).toBe("tracks");
  });

  it("Canvas dispatches type tracks to the dynamic tracks RenderPlan builder", async () => {
    const tracksSpy = vi.spyOn(
      sceneDynamicTracksPlan,
      "buildDynamicTracksRenderPlan",
    );
    const pointsSpy = vi.spyOn(
      sceneDynamicPointFeaturesPlan,
      "buildDynamicPointFeaturesRenderPlan",
    );

    const canvas = document.createElement("canvas");
    const { ctx, log } = recording2dContext(canvas);
    vi.spyOn(canvas, "getContext").mockImplementation((type) => {
      if (type === "2d") return ctx;
      return null;
    });

    const backend = new CanvasRenderBackend(canvas);
    const viewport = { width: 800, height: 400, devicePixelRatio: 1 };
    await backend.initialize(viewport);

    const layer: RenderableLayerState = {
      id: "layer.dynamicTracks.orbitalTracks",
      name: "ISS orbital track",
      type: "tracks",
      zIndex: 40,
      visible: true,
      opacity: 1,
      data: tracksPayload,
    };

    backend.render({
      frame: { frameNumber: 1, now: 0, deltaMs: 0 },
      viewport,
      layers: [layer],
      scene: {},
      sceneLayerViewportPx: { x: 0, y: 0, width: 800, height: 400 },
    });

    expect(tracksSpy).toHaveBeenCalledTimes(1);
    expect(pointsSpy).not.toHaveBeenCalled();
    expect(log.some((e) => e.startsWith("moveTo("))).toBe(true);
    expect(log.some((e) => e.startsWith("lineTo("))).toBe(true);
    expect(log.includes("stroke")).toBe(true);
  });

  it("does not paint tracks payload when mistyped as points (dispatch is type-keyed)", async () => {
    const tracksSpy = vi.spyOn(
      sceneDynamicTracksPlan,
      "buildDynamicTracksRenderPlan",
    );

    const canvas = document.createElement("canvas");
    const { ctx } = recording2dContext(canvas);
    vi.spyOn(canvas, "getContext").mockImplementation((type) => {
      if (type === "2d") return ctx;
      return null;
    });

    const backend = new CanvasRenderBackend(canvas);
    const viewport = { width: 800, height: 400, devicePixelRatio: 1 };
    await backend.initialize(viewport);

    const mistyped: RenderableLayerState = {
      id: "mistyped",
      name: "mistyped tracks",
      type: "points",
      zIndex: 40,
      visible: true,
      opacity: 1,
      data: tracksPayload,
    };

    backend.render({
      frame: { frameNumber: 1, now: 0, deltaMs: 0 },
      viewport,
      layers: [mistyped],
      scene: {},
      sceneLayerViewportPx: { x: 0, y: 0, width: 800, height: 400 },
    });

    expect(tracksSpy).not.toHaveBeenCalled();
  });

  it("Canvas still paints dynamic point-features via type points", async () => {
    const pointsSpy = vi.spyOn(
      sceneDynamicPointFeaturesPlan,
      "buildDynamicPointFeaturesRenderPlan",
    );

    const canvas = document.createElement("canvas");
    const { ctx, log } = recording2dContext(canvas);
    vi.spyOn(canvas, "getContext").mockImplementation((type) => {
      if (type === "2d") return ctx;
      return null;
    });

    const backend = new CanvasRenderBackend(canvas);
    const viewport = { width: 800, height: 400, devicePixelRatio: 1 };
    await backend.initialize(viewport);

    const layer: RenderableLayerState = {
      id: "layer.dynamicPointFeatures.earthquakes",
      name: "Earthquakes",
      type: "points",
      zIndex: 35,
      visible: true,
      opacity: 1,
      data: pointsPayload,
    };

    backend.render({
      frame: { frameNumber: 1, now: 0, deltaMs: 0 },
      viewport,
      layers: [layer],
      scene: {},
      sceneLayerViewportPx: { x: 0, y: 0, width: 800, height: 400 },
    });

    expect(pointsSpy).toHaveBeenCalledTimes(1);
    expect(log.includes("fill")).toBe(true);
  });

  it("registry exposes orbitalTracks runtime layer when Layers flag is on", () => {
    const layers = { ...DEFAULT_APP_CONFIG.layers, orbitalTracks: true };
    const config: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      layers,
      scene: buildDefaultSceneConfigFromLayerFlags(layers),
    };
    const registry = createLayerRegistryFromConfig(config);
    const id = runtimeIdForDynamicTracksSceneLayer("orbitalTracks");
    const registered = registry.getLayers().find((l) => l.id === id);
    expect(registered).toBeDefined();
    expect(registered!.type).toBe("tracks");
  });
});
