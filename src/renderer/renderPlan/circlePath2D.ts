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
 * Full circle helpers: {@link circlePathDescriptor} is the preferred backend-neutral intent for migrated
 * emitters; {@link circlePath2D} remains for callers that still need a Canvas {@link Path2D} (e.g. SVG-string
 * parity, legacy tests). For clips, prefer {@link ./renderPlanTypes.ts!RenderClipPayload} with
 * `clipPathKind: "descriptor"` via {@link ./pathItemFactories.ts!clipPayloadDescriptor}.
 */

import { createPathBuilder } from "./pathBuilder.ts";
import type { RenderPathDescriptor } from "./pathTypes.ts";

/**
 * Full circle as {@link Path2D} using SVG path syntax (two semicircle arcs) — suitable when callers
 * still require a Canvas path object. Prefer {@link circlePathDescriptor} for new shared-layer emission.
 */
export function circlePath2D(cx: number, cy: number, radiusPx: number): Path2D {
  const r = radiusPx;
  return new Path2D(
    `M ${cx + r},${cy} A ${r} ${r} 0 1 1 ${cx - r},${cy} A ${r} ${r} 0 1 1 ${cx + r},${cy}`,
  );
}

/** Backend-neutral full circle: one closed arc (equivalent coverage to {@link circlePath2D}). */
export function circlePathDescriptor(cx: number, cy: number, radiusPx: number): RenderPathDescriptor {
  const b = createPathBuilder();
  b.moveTo(cx + radiusPx, cy);
  b.arc(cx, cy, radiusPx, 0, Math.PI * 2, false);
  b.closePath();
  return b.build();
}
