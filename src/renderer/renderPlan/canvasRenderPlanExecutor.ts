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

import {
  fillCanvasRectWithRenderLinearGradient,
  fillCanvasWithRenderRadialGradientInCircleClip,
  applyCanvasStrokeStateForRenderLine,
} from "../canvas/canvasPaintBridge.ts";
import { drawRenderPath2DItemOnCanvas } from "../canvas/canvasPathBridge.ts";
import {
  canvasFontStringFromRenderTextFont,
} from "../canvas/canvasTextFontBridge.ts";
import {
  analyzeTextMode24hVerticalGapInvariants,
  buildTextMode24hIndicatorConsolidatedVerticalDiagnostics,
  logTextMode24hIndicatorVerticalDiagnosticsSnapshot,
} from "../textMode24hIndicatorVerticalDiagnostics.ts";
import type {
  RenderCurvedTextItem,
  RenderImageBlitItem,
  RenderLinearGradientRectItem,
  RenderLineItem,
  RenderPath2DItem,
  RenderPlan,
  RenderRadialGradientFillItem,
  RenderRasterPatchItem,
  RenderRectItem,
  RenderTextItem,
} from "./renderPlanTypes";

function clearTextShadow(ctx: CanvasRenderingContext2D): void {
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function applyTextShadow(
  ctx: CanvasRenderingContext2D,
  shadow: RenderTextItem["shadow"],
): void {
  if (shadow) {
    ctx.shadowColor = shadow.color;
    ctx.shadowBlur = shadow.blurPx;
    ctx.shadowOffsetX = shadow.offsetXPx;
    ctx.shadowOffsetY = shadow.offsetYPx;
  } else {
    clearTextShadow(ctx);
  }
}

function drawText(ctx: CanvasRenderingContext2D, item: RenderTextItem): void {
  ctx.save();
  ctx.globalAlpha = item.opacity ?? 1;
  ctx.textAlign = item.textAlign;
  ctx.textBaseline = item.textBaseline;
  ctx.fillStyle = item.fill;
  ctx.font = canvasFontStringFromRenderTextFont(item.font);
  if (item.letterSpacingEm !== undefined) {
    ctx.letterSpacing = `${item.letterSpacingEm}em`;
  } else {
    ctx.letterSpacing = "0";
  }
  if (item.stroke) {
    clearTextShadow(ctx);
    ctx.lineJoin = item.stroke.lineJoin ?? "round";
    ctx.miterLimit = item.stroke.miterLimit ?? 2;
    ctx.lineWidth = item.stroke.widthPx;
    ctx.strokeStyle = item.stroke.color;
    ctx.strokeText(item.text, item.x, item.y);
  }
  applyTextShadow(ctx, item.shadow);
  const diag = item.textMode24hVerticalDiagnostics;
  const allow24hTextDiag =
    diag !== undefined && import.meta.env.DEV && import.meta.env.MODE !== "test";
  if (allow24hTextDiag) {
    const metrics = ctx.measureText(item.text);
    const consolidated = buildTextMode24hIndicatorConsolidatedVerticalDiagnostics({
      pre: diag,
      fontSizePx: item.font.sizePx,
      textBaseline: item.textBaseline,
      fillTextAnchorYPx: item.y,
      metrics,
    });
    const invariantReport = analyzeTextMode24hVerticalGapInvariants(consolidated);
    logTextMode24hIndicatorVerticalDiagnosticsSnapshot({ consolidated, invariantReport });
  }
  ctx.fillText(item.text, item.x, item.y);
  ctx.restore();
}

function drawCurvedText(ctx: CanvasRenderingContext2D, item: RenderCurvedTextItem): void {
  const text = item.text;
  if (!text) {
    return;
  }
  ctx.save();
  ctx.fillStyle = item.fill;
  ctx.font = canvasFontStringFromRenderTextFont(item.font);
  if (item.letterSpacingEm !== undefined) {
    ctx.letterSpacing = `${item.letterSpacingEm}em`;
  } else {
    ctx.letterSpacing = "0";
  }
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let totalW = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    const w = ctx.measureText(ch).width;
    totalW += Number.isFinite(w) && w > 0 ? w : item.font.sizePx * 0.55;
  }

  const r = Math.max(1e-6, item.radiusPx);
  const sweep = item.endAngleRad - item.startAngleRad;
  const arcLen = Math.abs(sweep) * r;
  const scale = totalW > 1e-6 ? Math.min(1, arcLen / totalW) : 1;

  let t = 0;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]!;
    const cw = ctx.measureText(ch).width;
    const w = Number.isFinite(cw) && cw > 0 ? cw : item.font.sizePx * 0.55;
    const mid = t + w * 0.5;
    const frac = totalW > 1e-6 ? mid / totalW : 0.5;
    const angle = item.startAngleRad + sweep * frac * scale;
    const px = item.cx + r * Math.cos(angle);
    const py = item.cy + r * Math.sin(angle);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(angle + Math.PI * 0.5);
    ctx.fillText(ch, 0, 0);
    ctx.restore();
    t += w;
  }
  ctx.restore();
}

function drawRect(ctx: CanvasRenderingContext2D, item: RenderRectItem): void {
  ctx.save();
  const { x, y, width: w, height: h } = item;
  if (item.fill) {
    ctx.fillStyle = item.fill;
    ctx.fillRect(x, y, w, h);
  }
  if (item.stroke) {
    ctx.strokeStyle = item.stroke;
    ctx.lineWidth = item.strokeWidthPx ?? 1;
    ctx.strokeRect(x, y, w, h);
  }
  ctx.restore();
}

function drawLine(ctx: CanvasRenderingContext2D, item: RenderLineItem): void {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(item.x1, item.y1);
  ctx.lineTo(item.x2, item.y2);
  applyCanvasStrokeStateForRenderLine(ctx, item);
  ctx.stroke();
  ctx.restore();
}

function drawPath2D(ctx: CanvasRenderingContext2D, item: RenderPath2DItem): void {
  ctx.save();
  drawRenderPath2DItemOnCanvas(ctx, item);
  ctx.restore();
}

function drawLinearGradientRect(
  ctx: CanvasRenderingContext2D,
  item: RenderLinearGradientRectItem,
): void {
  ctx.save();
  fillCanvasRectWithRenderLinearGradient(ctx, item);
  ctx.restore();
}

function drawRadialGradientFill(
  ctx: CanvasRenderingContext2D,
  item: RenderRadialGradientFillItem,
): void {
  ctx.save();
  fillCanvasWithRenderRadialGradientInCircleClip(ctx, item);
  ctx.restore();
}

function drawRasterPatch(ctx: CanvasRenderingContext2D, item: RenderRasterPatchItem): void {
  const { widthPx: w, heightPx: h, rgba, x, y, destWidth, destHeight } = item;
  if (w <= 0 || h <= 0 || rgba.length !== w * h * 4) {
    return;
  }
  const doc = globalThis.document;
  if (!doc?.createElement) {
    return;
  }
  const canvas = doc.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const sctx = canvas.getContext("2d");
  if (!sctx) {
    return;
  }
  const img = sctx.createImageData(w, h);
  img.data.set(rgba);
  sctx.putImageData(img, 0, 0);
  ctx.save();
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, w, h, x, y, destWidth, destHeight);
  ctx.restore();
}

function drawImageBlit(
  ctx: CanvasRenderingContext2D,
  item: RenderImageBlitItem,
  resolveRasterImage: ((src: string) => HTMLImageElement | null) | undefined,
): void {
  const img = resolveRasterImage?.(item.src);
  if (!img) {
    return;
  }
  const { x, y, width: w, height: h } = item;
  if (w <= 0 || h <= 0) {
    return;
  }
  ctx.drawImage(img, x, y, w, h);
}

/** Optional hooks for plan execution; image lifecycle stays with the caller when used. */
export interface CanvasRenderPlanExecutionOptions {
  /**
   * Resolves {@link RenderImageBlitItem} sources to decoded images. Omit to skip image blits
   * (e.g. tests with no bitmap); backend passes cache-backed loading from {@link CanvasRenderBackend}.
   */
  resolveRasterImage?: (src: string) => HTMLImageElement | null;
}

/**
 * Mechanical execution: applies {@link RenderPlan} to a 2D canvas context.
 * Caller owns transform (DPR), compositing, and clipping regions.
 */
export function executeRenderPlanOnCanvas(
  ctx: CanvasRenderingContext2D,
  plan: RenderPlan,
  options?: CanvasRenderPlanExecutionOptions,
): void {
  const resolveRasterImage = options?.resolveRasterImage;
  for (const item of plan.items) {
    switch (item.kind) {
      case "text":
        drawText(ctx, item);
        break;
      case "curvedText":
        drawCurvedText(ctx, item);
        break;
      case "rect":
        drawRect(ctx, item);
        break;
      case "line":
        drawLine(ctx, item);
        break;
      case "path2d":
        drawPath2D(ctx, item);
        break;
      case "linearGradientRect":
        drawLinearGradientRect(ctx, item);
        break;
      case "radialGradientFill":
        drawRadialGradientFill(ctx, item);
        break;
      case "rasterPatch":
        drawRasterPatch(ctx, item);
        break;
      case "imageBlit":
        drawImageBlit(ctx, item, resolveRasterImage);
        break;
      default: {
        const _exhaustive: never = item;
        void _exhaustive;
        break;
      }
    }
  }
}
