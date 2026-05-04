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
import { isEquirectangularPolylinePayload } from "../layers/equirectPolylinePayload";
import { DEFAULT_BASE_MAP_PRESENTATION } from "../config/baseMapPresentation";
import { isEquirectangularRasterPayload } from "../layers/rasterPayload";
import { resolveEmissiveCompositionAsset } from "../config/emissiveCompositionAssetResolve";
import { getMoonlightPolicy } from "../core/moonlightPolicy";
import { isSolarShadingPayload } from "../layers/solarShadingPayload";
import { isTextOverlayPayload } from "../layers/textOverlayPayload";
import { executeRenderPlanOnCanvas } from "./renderPlan/canvasRenderPlanExecutor";
import { buildBaseRasterMapRenderPlan } from "./renderPlan/sceneBaseRasterMapPlan";
import { buildEquirectangularGridOverlayRenderPlan } from "./renderPlan/equirectGridOverlayPlan";
import { buildEquirectangularPolylineOverlayRenderPlan } from "./renderPlan/equirectPolylineOverlayPlan";
import type { EmissiveRasterSampleBuffer } from "./emissiveIlluminationRaster";
import { rgbaBufferFromHtmlImage } from "./emissiveIlluminationRaster";
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
  private emissiveRasterCache: { assetId: string; buf: EmissiveRasterSampleBuffer } | null = null;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    /** Called when a raster image finishes loading so the shell can repaint. */
    private readonly onRasterReady?: () => void,
    /**
     * Product-agnostic: image `src` failed to decode. Base map layers set `emitLoadFailure` on
     * the payload; the app maps this to base map exclusion only.
     */
    private readonly onRasterImageLoadFailed?: (src: string) => void,
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

    const r = input.sceneLayerViewportPx;
    const sceneViewport: Viewport = {
      width: r.width,
      height: r.height,
      devicePixelRatio: dpr,
    };
    const useSceneInset =
      r.width > 0 &&
      r.height > 0 &&
      (r.x !== 0 ||
        r.y !== 0 ||
        r.width !== viewport.width ||
        r.height !== viewport.height);
    if (useSceneInset) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(r.x, r.y, r.width, r.height);
      ctx.clip();
      ctx.translate(r.x, r.y);
    }

    const layers = [...input.layers].sort((a, b) => a.zIndex - b.zIndex);
    for (const layer of layers) {
      if (!layer.visible) continue;
      ctx.save();
      ctx.globalAlpha = layer.opacity;
      this.drawLayer(ctx, layer, sceneViewport);
      ctx.restore();
    }

    if (useSceneInset) {
      ctx.restore();
    }
  }

  dispose(): void {
    this.rasterImages.clear();
    this.emissiveRasterCache = null;
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
  private ensureRasterImage(
    src: string,
    options?: { reportLoadFailure?: boolean },
  ): HTMLImageElement | null {
    let img = this.rasterImages.get(src);
    if (!img) {
      img = new Image();
      const report = options?.reportLoadFailure === true;
      img.onload = () => {
        this.onRasterReady?.();
      };
      img.onerror = () => {
        console.error(`[libration:canvas] failed to load raster image: ${src}`);
        this.rasterImages.delete(src);
        if (report) {
          this.onRasterImageLoadFailed?.(src);
        }
      };
      // Register before `src` so a synchronous `onload` (browser decode cache) still sees this
      // entry during any re-entrant `render` from `onRasterReady`, and we only construct one
      // `Image` per URL.
      this.rasterImages.set(src, img);
      img.src = src;
      if (img.complete && img.naturalWidth > 0) {
        return img;
      }
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
    const reportLoadFailure = layer.data.emitLoadFailure === true;
    executeRenderPlanOnCanvas(
      ctx,
      buildBaseRasterMapRenderPlan({
        src: layer.data.src,
        viewportWidthPx: w,
        viewportHeightPx: h,
        presentation: layer.data.presentation ?? { ...DEFAULT_BASE_MAP_PRESENTATION },
      }),
      {
        resolveRasterImage: (s) => this.ensureRasterImage(s, { reportLoadFailure }),
      },
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

    const {
      subsolarLatDeg,
      subsolarLonDeg,
      sublunarLatDeg,
      sublunarLonDeg,
      lunarIlluminatedFraction,
      moonlightMode,
      emissiveNightLightsMode,
      emissiveCompositionAssetId,
    } = layer.data;
    const moonlightPolicy = getMoonlightPolicy(moonlightMode ?? "illustrative");

    let emissiveRaster: EmissiveRasterSampleBuffer | null = null;
    if (emissiveNightLightsMode === "off") {
      this.emissiveRasterCache = null;
    } else {
      if (this.emissiveRasterCache && this.emissiveRasterCache.assetId !== emissiveCompositionAssetId) {
        this.emissiveRasterCache = null;
      }
      if (this.emissiveRasterCache?.assetId === emissiveCompositionAssetId) {
        emissiveRaster = this.emissiveRasterCache.buf;
      } else {
        const asset = resolveEmissiveCompositionAsset(emissiveCompositionAssetId);
        const img = this.ensureRasterImage(asset.src, { reportLoadFailure: false });
        const buf = img ? rgbaBufferFromHtmlImage(img) : null;
        if (buf) {
          this.emissiveRasterCache = { assetId: emissiveCompositionAssetId, buf };
        }
        emissiveRaster = buf;
      }
    }

    executeRenderPlanOnCanvas(
      ctx,
      buildSolarShadingIlluminationRenderPlan({
        viewportWidthPx: w,
        viewportHeightPx: h,
        subsolarLatDeg,
        subsolarLonDeg,
        sublunarLatDeg,
        sublunarLonDeg,
        lunarIlluminatedFraction,
        layerOpacity: layer.opacity,
        moonlightPolicy,
        emissiveNightLightsMode,
        emissiveRaster,
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
    const w = viewport.width;
    const h = viewport.height;
    if (w <= 0 || h <= 0) {
      return;
    }
    ctx.setLineDash([]);
    if (isEquirectangularGridPayload(layer.data)) {
      const { meridianStepDeg, parallelStepDeg } = layer.data;
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
      return;
    }
    if (isEquirectangularPolylinePayload(layer.data)) {
      const { points, closed } = layer.data;
      executeRenderPlanOnCanvas(
        ctx,
        buildEquirectangularPolylineOverlayRenderPlan({
          viewportWidthPx: w,
          viewportHeightPx: h,
          points,
          closed,
          layerOpacity: layer.opacity,
        }),
      );
    }
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
