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
 * Canvas-only realization: applies {@link RenderPath2DItem} to a {@link CanvasRenderingContext2D}.
 * Semantic geometry lives in {@link RenderPath2DItem}’s payload; this module turns it into Canvas
 * {@link Path2D} and draw calls — not the source of truth for layout intent.
 */

import type { RenderClipPayload, RenderPath2DItem } from "../renderPlan/renderPlanTypes.ts";
import type { RenderPathDescriptor } from "../renderPlan/pathTypes.ts";

/**
 * Builds a Canvas {@link Path2D} from a backend-neutral descriptor (Canvas-only).
 */
export function path2DFromRenderPathDescriptor(descriptor: RenderPathDescriptor): Path2D {
  const p = new Path2D();
  for (const cmd of descriptor.commands) {
    switch (cmd.kind) {
      case "moveTo":
        p.moveTo(cmd.x, cmd.y);
        break;
      case "lineTo":
        p.lineTo(cmd.x, cmd.y);
        break;
      case "arc":
        p.arc(cmd.cx, cmd.cy, cmd.r, cmd.start, cmd.end, cmd.ccw ?? false);
        break;
      case "closePath":
        p.closePath();
        break;
    }
  }
  return p;
}

function resolvePath2DForItem(item: RenderPath2DItem): Path2D {
  switch (item.pathKind) {
    case "path2d":
      return item.path;
    case "descriptor":
      return path2DFromRenderPathDescriptor(item.pathDescriptor);
  }
}

/**
 * Resolves {@link RenderClipPayload} to Canvas {@link Path2D} for {@link CanvasRenderingContext2D.clip}.
 */
export function path2DFromRenderClipPayload(clip: RenderClipPayload): Path2D {
  switch (clip.clipPathKind) {
    case "path2d":
      return clip.clipPath;
    case "descriptor":
      return path2DFromRenderPathDescriptor(clip.clipPathDescriptor);
  }
}

/**
 * Resolves {@link RenderPath2DItem} via {@link RenderPath2DItem.pathKind} and applies fill/stroke.
 */
export function drawRenderPath(ctx: CanvasRenderingContext2D, item: RenderPath2DItem): void {
  const path = resolvePath2DForItem(item);
  if (item.clip) {
    ctx.clip(path2DFromRenderClipPayload(item.clip));
  }
  ctx.lineCap = "butt";
  if (item.fill) {
    ctx.fillStyle = item.fill;
    ctx.fill(path);
  }
  if (item.stroke) {
    ctx.strokeStyle = item.stroke;
    ctx.lineWidth = item.strokeWidthPx ?? 1;
    ctx.stroke(path);
  }
}

/**
 * Optional {@link RenderPath2DItem.clip}: clip to the resolved path ({@link path2DFromRenderClipPayload}), then draw
 * the primary path. Stroke/fill use solid CSS color strings from the item; line cap is forced to {@code "butt"} for
 * crisp joins on instrument silhouettes (historical executor behavior).
 */
export function drawRenderPath2DItemOnCanvas(
  ctx: CanvasRenderingContext2D,
  item: RenderPath2DItem,
): void {
  drawRenderPath(ctx, item);
}
