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

import { isCityPinsPayload } from "../layers/cityPinsPayload";
import { isSubsolarMarkerPayload } from "../layers/subsolarMarkerPayload";
import { isSublunarMarkerPayload } from "../layers/sublunarMarkerPayload";
import { isEquirectangularGridPayload } from "../layers/equirectGridPayload";
import { isEquirectangularRasterPayload } from "../layers/rasterPayload";
import { isSolarShadingPayload } from "../layers/solarShadingPayload";
import { isTextOverlayPayload } from "../layers/textOverlayPayload";
import { executeRenderPlanOnCanvas } from "./renderPlan/canvasRenderPlanExecutor";
import { buildBaseRasterMapRenderPlan } from "./renderPlan/sceneBaseRasterMapPlan";
import { buildEquirectangularGridOverlayRenderPlan } from "./renderPlan/equirectGridOverlayPlan";
import { buildSolarShadingIlluminationRenderPlan } from "./renderPlan/sceneSolarShadingIlluminationPlan";
import {
  buildSubsolarMarkerRenderPlan,
  buildSublunarMarkerRenderPlan,
} from "./renderPlan/sceneSubsolarSublunarMarkersPlan";
import { buildCityPinsRenderPlan } from "./renderPlan/sceneCityPinsPlan";
import { buildSceneTextOverlayRenderPlan } from "./renderPlan/sceneTextOverlayPlan";
import type { RenderBackend } from "./RenderBackend";
import type { RenderableLayerState, SceneRenderInput, Viewport } from "./types";

/**
 * Minimal canvas 2D backend: clears to scene background and draws composited layers.
 * Layer-type dispatch stays inside the renderer; layer definitions remain data-only.
 */

export class CanvasRenderBackend implements RenderBackend {
  private readonly rasterImages = new Map<string, HTMLImageElement>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    /** Called when a raster image finishes loading so the shell can repaint. */
    private readonly onRasterReady?: () => void,
  ) {}

  async initialize(viewport: Viewport): Promise<void> {
    if (viewport.width <= 0 || viewport.height <= 0) {
      throw new Error("[libration:canvas] invalid viewport dimensions");
    }
    this.applyViewport(viewport);
  }

  resize(viewport: Viewport): void {
    if (viewport.width <= 0 || viewport.height <= 0) {
      return;
    }
    this.applyViewport(viewport);
  }

  render(input: SceneRenderInput): void {
    const ctx = this.canvas.getContext("2d");
    if (!ctx) {
      throw new Error("[libration:canvas] could not get 2d context");
    }

    const { viewport } = input;
    const dpr = viewport.devicePixelRatio > 0 ? viewport.devicePixelRatio : 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const bg = input.scene.backgroundColor ?? "#1a1a1a";
    ctx.globalAlpha = 1;
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, viewport.width, viewport.height);

    const layers = [...input.layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      this.drawLayer(ctx, layer, viewport);
      ctx.restore();
    }
  }

  dispose(): void {
    this.rasterImages.clear();
  }

  private applyViewport(viewport: Viewport): void {
    const dpr = viewport.devicePixelRatio > 0 ? viewport.devicePixelRatio : 1;
    const w = Math.max(1, Math.floor(viewport.width * dpr));
    const h = Math.max(1, Math.floor(viewport.height * dpr));
    this.canvas.width = w;
    this.canvas.height = h;
    this.canvas.style.width = `${viewport.width}px`;
    this.canvas.style.height = `${viewport.height}px`;
  }

  private drawLayer(
    ctx: CanvasRenderingContext2D,
    layer: RenderableLayerState,
    viewport: Viewport,
  ): void {
    switch (layer.type) {
      case "raster":
        this.drawRasterLayer(ctx, layer, viewport);
        break;
      case "vector":
        this.drawVectorLayer(ctx, layer, viewport);
        break;
      case "text":
        this.drawTextLayer(ctx, layer, viewport);
        break;
      case "illumination":
        this.drawIlluminationLayer(ctx, layer, viewport);
        break;
      case "points":
        this.drawPointsLayer(ctx, layer, viewport);
        break;
      default:
        break;
    }
  }

  /**
   * Ensures an image is loading; returns it only once decoded. Triggers {@link onRasterReady} on first successful load.
   */
  private ensureRasterImage(src: string): HTMLImageElement | null {
    let img = this.rasterImages.get(src);
    if (!img) {
      img = new Image();
      img.onload = () => {
        this.onRasterReady?.();
      };
      img.onerror = () => {
        console.error(`[libration:canvas] failed to load raster image: ${src}`);
      };
      img.src = src;
      this.rasterImages.set(src, img);
      return null;
    }
    if (!img.complete || img.naturalWidth === 0) {
      return null;
    }
    return img;
  }

  private drawRasterLayer(
    ctx: CanvasRenderingContext2D,
    layer: RenderableLayerState,
    viewport: Viewport,
  ): void {
    if (!isEquirectangularRasterPayload(layer.data)) {
      return;
    }
    const w = viewport.width;
    const h = viewport.height;
    if (w <= 0 || h <= 0) {
      return;
    }
    executeRenderPlanOnCanvas(
      ctx,
      buildBaseRasterMapRenderPlan({
        src: layer.data.src,
        viewportWidthPx: w,
        viewportHeightPx: h,
      }),
      { resolveRasterImage: (src) => this.ensureRasterImage(src) },
    );
  }

  /**
   * Solar day/night mask: sampling and patch layout are emitted as {@link RenderPlan} items; execution is mechanical.
   */
  private drawIlluminationLayer(
    ctx: CanvasRenderingContext2D,
    layer: RenderableLayerState,
    viewport: Viewport,
  ): void {
    if (!isSolarShadingPayload(layer.data)) {
      return;
    }
    const w = viewport.width;
    const h = viewport.height;
    if (w <= 0 || h <= 0) {
      return;
    }

    const { subsolarLatDeg, subsolarLonDeg } = layer.data;
    executeRenderPlanOnCanvas(
      ctx,
      buildSolarShadingIlluminationRenderPlan({
        viewportWidthPx: w,
        viewportHeightPx: h,
        subsolarLatDeg,
        subsolarLonDeg,
        layerOpacity: layer.opacity,
      }),
    );
  }

  /**
   * Equirectangular lat/lon grid: complements map + shading without dominating the frame.
   * Plan-backed: geometry and stroke hierarchy are emitted as {@link RenderPlan} line items; execution is mechanical.
   */
  private drawVectorLayer(
    ctx: CanvasRenderingContext2D,
    layer: RenderableLayerState,
    viewport: Viewport,
  ): void {
    if (!isEquirectangularGridPayload(layer.data)) {
      return;
    }
    const w = viewport.width;
    const h = viewport.height;
    if (w <= 0 || h <= 0) {
      return;
    }

    const { meridianStepDeg, parallelStepDeg } = layer.data;
    ctx.setLineDash([]);
    executeRenderPlanOnCanvas(
      ctx,
      buildEquirectangularGridOverlayRenderPlan({
        viewportWidthPx: w,
        viewportHeightPx: h,
        meridianStepDeg,
        parallelStepDeg,
        layerOpacity: layer.opacity,
      }),
    );
  }

  /**
   * Bounded corner readouts (UTC / local): plan-backed text primitives; execution is mechanical.
   */
  private drawTextLayer(
    ctx: CanvasRenderingContext2D,
    layer: RenderableLayerState,
    viewport: Viewport,
  ): void {
    if (!isTextOverlayPayload(layer.data)) {
      return;
    }

    const vw = viewport.width;
    if (vw <= 0) {
      return;
    }

    const { placement, primary, label } = layer.data;
    executeRenderPlanOnCanvas(
      ctx,
      buildSceneTextOverlayRenderPlan({
        viewportWidthPx: vw,
        layerOpacity: layer.opacity,
        placement,
        label,
        primary,
      }),
    );
  }

  /**
   * Point markers: subsolar/sublunar/city pins. Geometry and labels for city pins are emitted as
   * {@link RenderPlan} (path2d + text); execution is mechanical.
   */
  private drawPointsLayer(
    ctx: CanvasRenderingContext2D,
    layer: RenderableLayerState,
    viewport: Viewport,
  ): void {
    if (isSubsolarMarkerPayload(layer.data)) {
      executeRenderPlanOnCanvas(
        ctx,
        buildSubsolarMarkerRenderPlan({
          viewportWidthPx: viewport.width,
          viewportHeightPx: viewport.height,
          lonDeg: layer.data.lonDeg,
          latDeg: layer.data.latDeg,
        }),
      );
      return;
    }
    if (isSublunarMarkerPayload(layer.data)) {
      executeRenderPlanOnCanvas(
        ctx,
        buildSublunarMarkerRenderPlan({
          viewportWidthPx: viewport.width,
          viewportHeightPx: viewport.height,
          lonDeg: layer.data.lonDeg,
          latDeg: layer.data.latDeg,
          illuminatedFraction: layer.data.illuminatedFraction,
          waxing: layer.data.waxing,
        }),
      );
      return;
    }
    if (!isCityPinsPayload(layer.data)) {
      return;
    }
    const w = viewport.width;
    const h = viewport.height;
    if (w <= 0 || h <= 0) {
      return;
    }

    executeRenderPlanOnCanvas(
      ctx,
      buildCityPinsRenderPlan({
        viewportWidthPx: w,
        viewportHeightPx: h,
        layerOpacity: layer.opacity,
        payload: layer.data,
      }),
    );
  }
}
