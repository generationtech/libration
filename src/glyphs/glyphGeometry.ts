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
 * Shared polar geometry for hour-marker procedural glyphs (clock face, radial line, radial wedge).
 */

import { createPathBuilder } from "../renderer/renderPlan/pathBuilder.ts";
import type { RenderPathDescriptor } from "../renderer/renderPlan/pathTypes.ts";

/** Hour hand / radial spoke angle: 12h cycle, 0 at top (−π/2 in standard polar). */
export function hourToTheta(hour: number): number {
  const hour12 = ((hour % 12) + 12) % 12;
  return (hour12 / 12) * 2 * Math.PI - Math.PI / 2;
}

/** Minute hand angle: 60-minute cycle, 0 at top (same polar convention as {@link hourToTheta}). */
export function minuteToTheta(minute: number): number {
  const m = ((minute % 60) + 60) % 60;
  return (m / 60) * 2 * Math.PI - Math.PI / 2;
}

export function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  theta: number,
): { x: number; y: number } {
  return {
    x: cx + Math.cos(theta) * r,
    y: cy + Math.sin(theta) * r,
  };
}

/**
 * Annular sector (donut slice): outer arc t0→t1, radial edges, inner arc t1→t0.
 * Path uses SVG arc syntax (see {@link ../renderer/renderPlan/circlePath2D.ts}) for DOM test compatibility.
 */
export function annularSectorPath2D(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  t0: number,
  t1: number,
): Path2D {
  const x0o = cx + Math.cos(t0) * rOuter;
  const y0o = cy + Math.sin(t0) * rOuter;
  const x1o = cx + Math.cos(t1) * rOuter;
  const y1o = cy + Math.sin(t1) * rOuter;
  const x1i = cx + Math.cos(t1) * rInner;
  const y1i = cy + Math.sin(t1) * rInner;
  const x0i = cx + Math.cos(t0) * rInner;
  const y0i = cy + Math.sin(t0) * rInner;
  const d = [
    `M ${x0o},${y0o}`,
    `A ${rOuter} ${rOuter} 0 0 1 ${x1o},${y1o}`,
    `L ${x1i},${y1i}`,
    `A ${rInner} ${rInner} 0 0 0 ${x0i},${y0i}`,
    "Z",
  ].join(" ");
  return new Path2D(d);
}

/**
 * Same annular sector as {@link annularSectorPath2D} via Canvas-style arcs — emit as
 * `pathKind: "descriptor"` on {@link RenderPath2DItem}.
 */
export function annularSectorPathDescriptor(
  cx: number,
  cy: number,
  rInner: number,
  rOuter: number,
  t0: number,
  t1: number,
): RenderPathDescriptor {
  const x0o = cx + Math.cos(t0) * rOuter;
  const y0o = cy + Math.sin(t0) * rOuter;
  const x1i = cx + Math.cos(t1) * rInner;
  const y1i = cy + Math.sin(t1) * rInner;
  const b = createPathBuilder();
  b.moveTo(x0o, y0o);
  b.arc(cx, cy, rOuter, t0, t1, false);
  b.lineTo(x1i, y1i);
  b.arc(cx, cy, rInner, t1, t0, true);
  b.closePath();
  return b.build();
}
