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
 * Small constructors for {@link RenderPath2DItem} — keeps {@link RenderPathPayload} and optional
 * {@link RenderClipPayload} discriminants correct.
 */

import type { RenderPathDescriptor } from "./pathTypes.ts";
import type { RenderClipPayload, RenderColor, RenderPath2DItem } from "./renderPlanTypes.ts";

/** Wrap a Canvas clip path (transitional; prefer {@link clipPayloadDescriptor} for migrated emitters). */
export function clipPayloadPath2D(clipPath: Path2D): RenderClipPayload {
  return { clipPathKind: "path2d", clipPath };
}

/** Backend-neutral clip region — realized to {@link Path2D} in {@link ../canvas/canvasPathBridge.ts}. */
export function clipPayloadDescriptor(clipPathDescriptor: RenderPathDescriptor): RenderClipPayload {
  return { clipPathKind: "descriptor", clipPathDescriptor };
}

export function createPath2DItem(args: {
  path: Path2D;
  fill?: RenderColor;
  stroke?: RenderColor;
  strokeWidthPx?: number;
  clip?: RenderClipPayload;
}): RenderPath2DItem {
  return {
    kind: "path2d",
    pathKind: "path2d",
    path: args.path,
    fill: args.fill,
    stroke: args.stroke,
    strokeWidthPx: args.strokeWidthPx,
    clip: args.clip,
  };
}

export function createDescriptorPathItem(args: {
  pathDescriptor: RenderPathDescriptor;
  fill?: RenderColor;
  stroke?: RenderColor;
  strokeWidthPx?: number;
  clip?: RenderClipPayload;
}): RenderPath2DItem {
  return {
    kind: "path2d",
    pathKind: "descriptor",
    pathDescriptor: args.pathDescriptor,
    fill: args.fill,
    stroke: args.stroke,
    strokeWidthPx: args.strokeWidthPx,
    clip: args.clip,
  };
}
