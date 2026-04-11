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
 * Bounded subsolar / sub-lunar equirectangular markers: layout, gradients, rays, and phase shading are resolved here;
 * {@link executeRenderPlanOnCanvas} applies radialGradientFill / path2d / line items only.
 */

import { mapXFromLongitudeDeg } from "../../core/equirectangularProjection";
import type { RenderLineItem, RenderPlan, RenderRadialGradientFillItem } from "./renderPlanTypes";
import { circlePath2D, circlePathDescriptor } from "./circlePath2D";
import { clipPayloadDescriptor, createPath2DItem } from "./pathItemFactories";

function mapLatToY(latDeg: number, viewportHeightPx: number): number {
  return ((90 - latDeg) / 180) * viewportHeightPx;
}

/**
 * Subsolar sun glyph at resolved map coordinates (same radii and paint order as legacy {@link CanvasRenderBackend}).
 */
export function buildSubsolarMarkerRenderPlan(options: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  lonDeg: number;
  latDeg: number;
}): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  const items: RenderPlan["items"] = [];
  if (!(w > 0) || !(h > 0)) {
    return { items };
  }

  const cx = mapXFromLongitudeDeg(options.lonDeg, w);
  const cy = mapLatToY(options.latDeg, h);
  const r = Math.min(9, Math.max(4.5, w * 0.0055));

  const glow: RenderRadialGradientFillItem = {
    kind: "radialGradientFill",
    x0: cx,
    y0: cy,
    r0: r * 0.15,
    x1: cx,
    y1: cy,
    r1: r * 2.4,
    stops: [
      { offset: 0, color: "rgba(255, 228, 140, 0.5)" },
      { offset: 0.45, color: "rgba(255, 200, 90, 0.12)" },
      { offset: 1, color: "rgba(255, 190, 70, 0)" },
    ],
    clipCx: cx,
    clipCy: cy,
    clipR: r * 2.4,
  };
  items.push(glow);

  const rayStroke = "rgba(255, 240, 200, 0.88)";
  const rayWidth = Math.max(1, r * 0.11);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const inner = r * 1.12;
    const outer = r * 1.48;
    const line: RenderLineItem = {
      kind: "line",
      x1: cx + Math.cos(a) * inner,
      y1: cy + Math.sin(a) * inner,
      x2: cx + Math.cos(a) * outer,
      y2: cy + Math.sin(a) * outer,
      stroke: rayStroke,
      strokeWidthPx: rayWidth,
      lineCap: "round",
    };
    items.push(line);
  }

  items.push({
    kind: "path2d",
    pathKind: "path2d",
    path: circlePath2D(cx, cy, r),
    fill: "rgba(255, 210, 72, 0.96)",
    stroke: "rgba(28, 22, 10, 0.78)",
    strokeWidthPx: Math.max(1.1, r * 0.13),
  });

  items.push({
    kind: "path2d",
    pathKind: "path2d",
    path: circlePath2D(cx, cy, r + 1.25),
    stroke: "rgba(255, 255, 255, 0.42)",
    strokeWidthPx: 1,
  });

  return { items };
}

/**
 * Sub-lunar disc + halo + terminator (same model as legacy backend; phase inputs are plain numbers).
 */
export function buildSublunarMarkerRenderPlan(options: {
  viewportWidthPx: number;
  viewportHeightPx: number;
  lonDeg: number;
  latDeg: number;
  illuminatedFraction: number;
  waxing: boolean;
}): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  const items: RenderPlan["items"] = [];
  if (!(w > 0) || !(h > 0)) {
    return { items };
  }

  const cx = mapXFromLongitudeDeg(options.lonDeg, w);
  const cy = mapLatToY(options.latDeg, h);
  const r = Math.min(7.5, Math.max(3.8, w * 0.0046));
  const f = Math.min(1, Math.max(0, options.illuminatedFraction));
  const waxing = options.waxing;
  const pad = r * 2.5;

  items.push({
    kind: "radialGradientFill",
    x0: cx,
    y0: cy,
    r0: r * 0.2,
    x1: cx,
    y1: cy,
    r1: r * 2.1,
    stops: [
      { offset: 0, color: "rgba(200, 220, 255, 0.35)" },
      { offset: 0.5, color: "rgba(140, 175, 220, 0.1)" },
      { offset: 1, color: "rgba(100, 140, 190, 0)" },
    ],
    clipCx: cx,
    clipCy: cy,
    clipR: r * 2.1,
  });

  items.push({
    kind: "radialGradientFill",
    x0: cx - r * 0.25,
    y0: cy - r * 0.2,
    r0: r * 0.1,
    x1: cx,
    y1: cy,
    r1: r * 1.05,
    stops: [
      { offset: 0, color: "rgba(235, 242, 255, 0.98)" },
      { offset: 0.55, color: "rgba(200, 218, 242, 0.95)" },
      { offset: 1, color: "rgba(175, 198, 228, 0.92)" },
    ],
    clipCx: cx,
    clipCy: cy,
    clipR: r,
  });

  const xTerm = waxing ? r * (1 - 2 * f) : r * (2 * f - 1);
  const shadow = "rgba(28, 38, 56, 0.9)";

  let quadPath: Path2D;
  if (waxing) {
    quadPath = new Path2D(
      `M ${cx - pad},${cy - pad} L ${cx + xTerm},${cy - pad} L ${cx + xTerm},${cy + pad} L ${cx - pad},${cy + pad} Z`,
    );
  } else {
    quadPath = new Path2D(
      `M ${cx + xTerm},${cy - pad} L ${cx + pad},${cy - pad} L ${cx + pad},${cy + pad} L ${cx + xTerm},${cy + pad} Z`,
    );
  }

  items.push(
    createPath2DItem({
      path: quadPath,
      fill: shadow,
      clip: clipPayloadDescriptor(circlePathDescriptor(cx, cy, r)),
    }),
  );

  if (f > 0.88 && f <= 1) {
    items.push({
      kind: "path2d",
      pathKind: "path2d",
      path: circlePath2D(cx - r * 0.32, cy - r * 0.3, r * 0.2),
      fill: "rgba(255, 255, 255, 0.2)",
    });
  }

  if (f > 0.06 && f < 0.94) {
    items.push({
      kind: "line",
      x1: cx + xTerm,
      y1: cy - r * 1.02,
      x2: cx + xTerm,
      y2: cy + r * 1.02,
      stroke: "rgba(18, 26, 40, 0.45)",
      strokeWidthPx: Math.max(0.8, r * 0.09),
    });
  }

  items.push({
    kind: "path2d",
    pathKind: "path2d",
    path: circlePath2D(cx, cy, r),
    stroke: "rgba(28, 40, 58, 0.78)",
    strokeWidthPx: Math.max(1, r * 0.14),
  });

  items.push({
    kind: "path2d",
    pathKind: "path2d",
    path: circlePath2D(cx, cy, r + 1.1),
    stroke: "rgba(255, 255, 255, 0.38)",
    strokeWidthPx: 1,
  });

  return { items };
}
