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
 * Bottom instrument chrome render pass: resolved band plate plus lower-left reference-city date/time readouts (floating overlay).
 * Consumes only pre-derived {@link BottomInformationBarState}.
 */

import { BOTTOM_CHROME_STYLE } from "../config/bottomChromeStyle";
import { defaultFontAssetRegistry } from "../typography/fontAssetRegistry";
import type { FontAssetId } from "../typography/fontAssetTypes";
import { bottomChromeFontPx } from "./bottomChromeLayout";
import type { BottomInformationBarState } from "./bottomChromeTypes";
import { buildBottomChromeBandRenderPlan } from "./renderPlan/bottomChromeBandPlan";
import { executeRenderPlanOnCanvas } from "./renderPlan/canvasRenderPlanExecutor";
import type { Viewport } from "./types";

/** Same footprint as {@link DisplayChromeBandRect} — kept local to avoid circular imports with `displayChrome`. */
type BottomChromeBandRect = { x: number; y: number; width: number; height: number };

/** Computes resolved typography sizes from viewport width (token-driven). */
export function resolveBottomChromeTypography(
  viewportWidthPx: number,
  /** Applied after token resolution (config `bottomTimeStackSizeMultiplier`). */
  hudReadoutSizeMultiplier: number = 1,
): {
  microLabelPx: number;
  primaryTimePx: number;
  secondaryReadoutPx: number;
} {
  const T = BOTTOM_CHROME_STYLE.typography;
  const vw = Math.max(0, viewportWidthPx);
  const m = Number.isFinite(hudReadoutSizeMultiplier) && hudReadoutSizeMultiplier > 0 ? hudReadoutSizeMultiplier : 1;
  const stackPx =
    m * bottomChromeFontPx(vw, T.primaryTimeMinPx, T.primaryTimeMaxPx, T.primaryTimeFracOfViewportWidth);
  return {
    microLabelPx:
      m *
      bottomChromeFontPx(vw, T.microLabelMinPx, T.microLabelMaxPx, T.microLabelFracOfViewportWidth),
    primaryTimePx: stackPx,
    /** Kept for API compatibility; lower-left HUD uses {@link primaryTimePx} for every row. */
    secondaryReadoutPx: stackPx,
  };
}

/** Full bottom chrome draw: band extent rect (default transparent plate) then floating lower-left readouts. */
export function renderBottomChrome(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  bottomBand: BottomChromeBandRect,
  ib: BottomInformationBarState,
  productDefaultFontAssetId: FontAssetId,
  options?: { hudReadoutSizeMultiplier?: number },
): void {
  const vw = viewport.width;
  const typo = resolveBottomChromeTypography(vw, options?.hudReadoutSizeMultiplier ?? 1);
  const plan = buildBottomChromeBandRenderPlan({
    viewportWidthPx: vw,
    bottomBand,
    ib,
    typography: typo,
    glyphRenderContext: { fontRegistry: defaultFontAssetRegistry },
    productDefaultFontAssetId,
  });
  executeRenderPlanOnCanvas(ctx, plan);
}
