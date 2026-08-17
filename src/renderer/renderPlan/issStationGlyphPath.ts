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
 * Tiny ISS / satellite silhouette for world-map scale (LIB-038).
 * Central body + lateral solar-array wings. Not spacecraft attitude.
 */

import { createPathBuilder } from "./pathBuilder";
import type { RenderPathDescriptor } from "./pathTypes";

function rotate(x: number, y: number, angleRad: number): { x: number; y: number } {
  const c = Math.cos(angleRad);
  const s = Math.sin(angleRad);
  return { x: x * c - y * s, y: x * s + y * c };
}

function addRect(
  builder: ReturnType<typeof createPathBuilder>,
  cx: number,
  cy: number,
  scale: number,
  angleRad: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  const corners: Array<readonly [number, number]> = [
    [x0, y0],
    [x1, y0],
    [x1, y1],
    [x0, y1],
  ];
  const mapped = corners.map(([x, y]) => {
    const r = rotate(x * scale, y * scale, angleRad);
    return { x: cx + r.x, y: cy + r.y };
  });
  builder.moveTo(mapped[0]!.x, mapped[0]!.y);
  builder.lineTo(mapped[1]!.x, mapped[1]!.y);
  builder.lineTo(mapped[2]!.x, mapped[2]!.y);
  builder.lineTo(mapped[3]!.x, mapped[3]!.y);
  builder.closePath();
}

/**
 * ISS silhouette in local units: wings along ±X, body along ±Y (forward = +Y before rotation).
 * `angleRad` is screen travel heading from +X (east) toward +Y (south).
 * Local +Y (body forward) is rotated onto that heading.
 */
export function issStationGlyphPathDescriptor(
  cx: number,
  cy: number,
  scalePx: number,
  angleRad: number = 0,
): RenderPathDescriptor {
  const b = createPathBuilder();
  const s = Math.max(0.5, scalePx);
  const rot = angleRad - Math.PI / 2;
  addRect(b, cx, cy, s, rot, -1.05, -0.11, -0.2, 0.11);
  addRect(b, cx, cy, s, rot, 0.2, -0.11, 1.05, 0.11);
  addRect(b, cx, cy, s, rot, -0.22, -0.045, 0.22, 0.045);
  addRect(b, cx, cy, s, rot, -0.13, -0.34, 0.13, 0.34);
  return b.build();
}
