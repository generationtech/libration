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
 * Canvas-only: measures text **ink height** for top-band hour-disk labels via `measureText` bounding boxes.
 *
 * Used only to supply {@link ../config/topBandHourMarkersLayout.ts!SemanticTopBandHourMarkerLayoutContext.textDiskRowIntrinsicContentHeightPx}
 * when a 2D context is available; layout and typography fallbacks remain backend-neutral.
 */

import type { ResolvedTextStyle } from "../typography/typographyTypes.ts";
import { canvasFontStringFromResolvedTextStyle } from "./canvas/canvasTextFontBridge.ts";

/** Reject absurd `measureText` results (bad stubs, corrupted metrics) so layout falls back to typography. */
const MAX_REASONABLE_INK_HEIGHT_PX = 4096 as const;

function isPlausibleInkHeightPx(h: number): boolean {
  return Number.isFinite(h) && h > 0 && h <= MAX_REASONABLE_INK_HEIGHT_PX;
}

function inkHeightPxFromTextMetrics(m: TextMetrics): number | undefined {
  const a = m.actualBoundingBoxAscent;
  const d = m.actualBoundingBoxDescent;
  if (typeof a === "number" && typeof d === "number" && Number.isFinite(a) && Number.isFinite(d)) {
    if (a > 0 || d > 0) {
      return a + d;
    }
  }
  const fa = m.fontBoundingBoxAscent;
  const fd = m.fontBoundingBoxDescent;
  if (typeof fa === "number" && typeof fd === "number" && Number.isFinite(fa) && Number.isFinite(fd)) {
    if (fa > 0 || fd > 0) {
      return fa + fd;
    }
  }
  return undefined;
}

/**
 * Returns the maximum measured ink height across `labels`, or `undefined` when measurement is unavailable or not
 * meaningful (e.g. tests with stubbed `measureText`, zero metrics).
 */
export function tryMeasureMaxTopBandHourMarkerTextInkHeightPx(args: {
  ctx: CanvasRenderingContext2D;
  resolvedStyle: ResolvedTextStyle;
  labels: readonly string[];
}): number | undefined {
  if (args.labels.length === 0) {
    return undefined;
  }
  args.ctx.font = canvasFontStringFromResolvedTextStyle(args.resolvedStyle);
  let max = 0;
  let any = false;
  for (const label of args.labels) {
    if (label.length === 0) {
      continue;
    }
    const m = args.ctx.measureText(label);
    const h = inkHeightPxFromTextMetrics(m);
    if (h !== undefined && isPlausibleInkHeightPx(h)) {
      any = true;
      max = Math.max(max, h);
    }
  }
  return any ? max : undefined;
}

/**
 * Creates a temporary Canvas 2D context when `document` is available; returns `undefined` in non-browser or test
 * environments without a real canvas implementation.
 */
export function tryCreateOffscreenCanvas2dContext(): CanvasRenderingContext2D | undefined {
  try {
    const g = globalThis as unknown as {
      document?: { createElement?: (name: string) => HTMLCanvasElement };
    };
    const create = g.document?.createElement;
    if (typeof create !== "function") {
      return undefined;
    }
    const canvas = create.call(g.document, "canvas");
    const ctx = canvas.getContext("2d");
    return ctx ?? undefined;
  } catch {
    return undefined;
  }
}
