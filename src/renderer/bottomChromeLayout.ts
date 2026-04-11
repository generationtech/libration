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

import { BOTTOM_CHROME_STYLE } from "../config/bottomChromeStyle";

/**
 * Horizontal layout for bottom instrument chrome: left clock and right calendar are **edge-anchored** (floating overlay).
 */
export interface BottomChromeLayout {
  viewportWidthPx: number;
  horizontalPaddingPx: number;
}

function horizontalPaddingPx(viewportWidthPx: number): number {
  const L = BOTTOM_CHROME_STYLE.layout;
  const vw = Math.max(0, viewportWidthPx);
  return Math.min(L.horizontalPaddingMaxPx, Math.max(L.horizontalPaddingMinPx, vw * L.horizontalPaddingFracOfViewportWidth));
}

/**
 * Logical row height for bottom chrome from viewport height — token-driven;
 * matches the `computeBandHeights` bottom term in {@link displayChrome}.
 */
export function computeBottomChromeBandHeightPx(viewportHeightPx: number): number {
  const h = viewportHeightPx > 0 ? viewportHeightPx : 1;
  const { heightFracOfViewport, minHeightPx, maxHeightPx } = BOTTOM_CHROME_STYLE.bandHeight;
  return Math.max(minHeightPx, Math.min(maxHeightPx, Math.round(h * heightFracOfViewport)));
}

/** Inset of the bottom chrome cluster from the physical viewport bottom (floating overlay). */
export function computeBottomChromeOverlayBottomMarginPx(viewportHeightPx: number): number {
  const h = viewportHeightPx > 0 ? viewportHeightPx : 1;
  const { bottomMarginMinPx, bottomMarginMaxPx, bottomMarginFracOfViewportHeight } = BOTTOM_CHROME_STYLE.overlay;
  return Math.min(
    bottomMarginMaxPx,
    Math.max(bottomMarginMinPx, Math.round(h * bottomMarginFracOfViewportHeight)),
  );
}

export function computeBottomChromeLayout(viewportWidthPx: number): BottomChromeLayout {
  const vw = Math.max(0, viewportWidthPx);
  return {
    viewportWidthPx: vw,
    horizontalPaddingPx: horizontalPaddingPx(vw),
  };
}

/** Clamps a font size using viewport width and token bounds (deterministic). */
export function bottomChromeFontPx(
  viewportWidthPx: number,
  minPx: number,
  maxPx: number,
  fracOfViewportWidth: number,
): number {
  const vw = Math.max(0, viewportWidthPx);
  return Math.min(maxPx, Math.max(minPx, vw * fracOfViewportWidth));
}

/**
 * Height of the soft map→HUD fade above the bottom information layout box (CSS px), from viewport height only.
 */
export function computeBottomHudMapFadeHeightPx(viewportHeightPx: number): number {
  const h = viewportHeightPx > 0 ? viewportHeightPx : 1;
  const O = BOTTOM_CHROME_STYLE.overlay;
  return Math.min(
    O.mapHudBoundaryFadeDepthMaxPx,
    Math.max(
      O.mapHudBoundaryFadeDepthMinPx,
      Math.round(h * O.mapHudBoundaryFadeDepthFracOfViewportHeight),
    ),
  );
}

/** Viewport CSS pixels for the map→HUD vertical fade fill (when the bottom information bar is visible). */
export interface BottomHudMapFadeOverlayRect {
  fadeTopYPx: number;
  heightPx: number;
  widthPx: number;
}

/**
 * Fade band from {@link BottomHudMapFadeOverlayRect.fadeTopYPx} down to the HUD top: transparent aloft, slightly
 * darkened at the boundary. Returns null when there is no drawable interval.
 */
export function computeBottomHudMapFadeOverlayRect(options: {
  seamYPx: number;
  hudTopYPx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
}): BottomHudMapFadeOverlayRect | null {
  const vw = Math.max(0, options.viewportWidthPx);
  if (!(vw > 0)) {
    return null;
  }
  const { seamYPx, hudTopYPx, viewportHeightPx } = options;
  if (!(hudTopYPx > seamYPx)) {
    return null;
  }
  const fadeH = computeBottomHudMapFadeHeightPx(viewportHeightPx);
  const fadeTop = Math.max(seamYPx, hudTopYPx - fadeH);
  const heightPx = hudTopYPx - fadeTop;
  if (!(heightPx > 0)) {
    return null;
  }
  return { fadeTopYPx: fadeTop, heightPx, widthPx: vw };
}

/**
 * The map→HUD fade fill stops at the HUD top, but the linear gradient’s end Y is placed this many CSS px **below**
 * that line so the bottom of the filled rect samples a color short of the final stop — avoiding a hard horizontal seam.
 */
export const BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX = 12;
