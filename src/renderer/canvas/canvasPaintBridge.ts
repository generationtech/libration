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

/**
 * Canvas-only realization: maps backend-neutral stroke/fill/gradient fields from {@link RenderPlan}
 * items to {@link CanvasRenderingContext2D} state and {@link CanvasGradient} instances.
 * Other backends should not depend on this module.
 */

import type {
  RenderLinearGradientRectItem,
  RenderLineItem,
  RenderRadialGradientFillItem,
} from "../renderPlan/renderPlanTypes.ts";

/** Applies shared color stops to a Canvas gradient (offset ∈ [0, 1], CSS color strings). */
export function addRenderGradientStopsToCanvasGradient(
  gradient: CanvasGradient,
  stops: RenderLinearGradientRectItem["stops"] | RenderRadialGradientFillItem["stops"],
): void {
  for (const s of stops) {
    gradient.addColorStop(s.offset, s.color);
  }
}

/**
 * Linear gradient in scene pixel space: endpoints (x1,y1)→(x2,y2); fill is painted into the item’s
 * axis-aligned rect (x, y, width, height).
 */
export function createCanvasLinearGradientFromRenderItem(
  ctx: CanvasRenderingContext2D,
  item: RenderLinearGradientRectItem,
): CanvasGradient {
  const g = ctx.createLinearGradient(item.x1, item.y1, item.x2, item.y2);
  addRenderGradientStopsToCanvasGradient(g, item.stops);
  return g;
}

/**
 * Radial gradient ({@link x0},{@link y0},{@link r0}) → ({@link x1},{@link y1},{@link r1}) in scene pixels;
 * caller clips before filling (see {@link fillCanvasWithRenderRadialGradientInCircleClip}).
 */
export function createCanvasRadialGradientFromRenderItem(
  ctx: CanvasRenderingContext2D,
  item: RenderRadialGradientFillItem,
): CanvasGradient {
  const g = ctx.createRadialGradient(item.x0, item.y0, item.r0, item.x1, item.y1, item.r1);
  addRenderGradientStopsToCanvasGradient(g, item.stops);
  return g;
}

/**
 * Fills {@link RenderLinearGradientRectItem}’s rectangle with a linear gradient.
 */
export function fillCanvasRectWithRenderLinearGradient(
  ctx: CanvasRenderingContext2D,
  item: RenderLinearGradientRectItem,
): void {
  ctx.fillStyle = createCanvasLinearGradientFromRenderItem(ctx, item);
  ctx.fillRect(item.x, item.y, item.width, item.height);
}

/**
 * Clips to circle ({@link RenderRadialGradientFillItem.clipCx}, {@link clipCy}, {@link clipR}), fills with
 * radial gradient, then restores (caller must {@link CanvasRenderingContext2D.save} / {@link restore} around this).
 */
export function fillCanvasWithRenderRadialGradientInCircleClip(
  ctx: CanvasRenderingContext2D,
  item: RenderRadialGradientFillItem,
): void {
  ctx.beginPath();
  ctx.arc(item.clipCx, item.clipCy, item.clipR, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = createCanvasRadialGradientFromRenderItem(ctx, item);
  const pad = item.clipR * 2;
  ctx.fillRect(item.clipCx - pad, item.clipCy - pad, pad * 2, pad * 2);
}

/**
 * Applies {@link RenderLineItem} stroke color, width, and optional line cap (Canvas defaults apply when omitted).
 */
export function applyCanvasStrokeStateForRenderLine(
  ctx: CanvasRenderingContext2D,
  item: RenderLineItem,
): void {
  ctx.strokeStyle = item.stroke;
  ctx.lineWidth = item.strokeWidthPx;
  if (item.lineCap !== undefined) {
    ctx.lineCap = item.lineCap;
  }
}
