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

import { describe, expect, it } from "vitest";
import { BOTTOM_CHROME_STYLE } from "../config/bottomChromeStyle";
import { resolveBottomChromeTypography } from "./bottomChrome";
import {
  BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX,
  computeBottomHudMapFadeHeightPx,
  computeBottomHudMapFadeOverlayRect,
} from "./bottomChromeLayout";

describe("bottom chrome emphasis and typography", () => {
  it("exposes readable side-readout colors for floating labels over the map", () => {
    expect(BOTTOM_CHROME_STYLE.colors.primaryTime.length).toBeGreaterThan(8);
    expect(BOTTOM_CHROME_STYLE.colors.microLabel.length).toBeGreaterThan(8);
    expect(BOTTOM_CHROME_STYLE.colors.secondaryReadout.length).toBeGreaterThan(8);
  });

  it("resolves deterministic typography sizes from viewport width", () => {
    const a = resolveBottomChromeTypography(1920);
    const b = resolveBottomChromeTypography(1920);
    expect(a.primaryTimePx).toBe(b.primaryTimePx);
    expect(a.primaryTimePx).toBeGreaterThanOrEqual(13);
    expect(a.primaryTimePx).toBeLessThanOrEqual(19);
    const narrow = resolveBottomChromeTypography(640);
    expect(narrow.primaryTimePx).toBeLessThanOrEqual(a.primaryTimePx);
    expect(a.secondaryReadoutPx).toBeGreaterThan(0);
    expect(a.secondaryReadoutPx).toBeLessThanOrEqual(a.primaryTimePx);
  });

  it("defines map→HUD boundary fade tokens with ordered depth bounds (no top hairline token)", () => {
    const o = BOTTOM_CHROME_STYLE.overlay;
    expect(o.mapHudBoundaryFadeDepthMinPx).toBeLessThan(o.mapHudBoundaryFadeDepthMaxPx);
    expect(o.mapHudBoundaryFadeColorBottom.length).toBeGreaterThan(12);
    expect(o.mapHudBoundaryFadeColorBottom).toMatch(/0\.11\)/);
    expect(Object.prototype.hasOwnProperty.call(o, "mapHudBoundaryHighlight")).toBe(false);
  });
});

describe("BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX", () => {
  it("extends the linear gradient past the HUD top so the fade fill never samples the final stop at the boundary", () => {
    expect(BOTTOM_HUD_MAP_FADE_GRADIENT_EXTEND_BELOW_HUD_TOP_PX).toBe(12);
  });
});

describe("computeBottomHudMapFadeHeightPx", () => {
  it("clamps fade depth to the configured min and max", () => {
    const o = BOTTOM_CHROME_STYLE.overlay;
    const tiny = computeBottomHudMapFadeHeightPx(200);
    expect(tiny).toBe(o.mapHudBoundaryFadeDepthMinPx);
    const huge = computeBottomHudMapFadeHeightPx(4000);
    expect(huge).toBe(o.mapHudBoundaryFadeDepthMaxPx);
  });

  it("scales with viewport height when inside the clamp window", () => {
    const o = BOTTOM_CHROME_STYLE.overlay;
    const mid = computeBottomHudMapFadeHeightPx(1000);
    expect(mid).toBe(
      Math.round(1000 * o.mapHudBoundaryFadeDepthFracOfViewportHeight),
    );
    expect(mid).toBeGreaterThanOrEqual(o.mapHudBoundaryFadeDepthMinPx);
    expect(mid).toBeLessThanOrEqual(o.mapHudBoundaryFadeDepthMaxPx);
  });
});

describe("computeBottomHudMapFadeOverlayRect", () => {
  it("returns null when width is non-positive or the HUD does not sit below the seam", () => {
    expect(
      computeBottomHudMapFadeOverlayRect({
        seamYPx: 100,
        hudTopYPx: 500,
        viewportWidthPx: 0,
        viewportHeightPx: 900,
      }),
    ).toBeNull();
    expect(
      computeBottomHudMapFadeOverlayRect({
        seamYPx: 400,
        hudTopYPx: 400,
        viewportWidthPx: 1200,
        viewportHeightPx: 900,
      }),
    ).toBeNull();
    expect(
      computeBottomHudMapFadeOverlayRect({
        seamYPx: 500,
        hudTopYPx: 400,
        viewportWidthPx: 1200,
        viewportHeightPx: 900,
      }),
    ).toBeNull();
  });

  it("uses fade depth as band height when the map strip is tall enough", () => {
    const h = 1000;
    const fadeH = computeBottomHudMapFadeHeightPx(h);
    const r = computeBottomHudMapFadeOverlayRect({
      seamYPx: 80,
      hudTopYPx: 900,
      viewportWidthPx: 1600,
      viewportHeightPx: h,
    });
    expect(r).not.toBeNull();
    expect(r!.widthPx).toBe(1600);
    expect(r!.heightPx).toBe(fadeH);
    expect(r!.fadeTopYPx).toBe(900 - fadeH);
  });

  it("clamps fade height when the HUD is closer to the seam than the configured fade depth", () => {
    const r = computeBottomHudMapFadeOverlayRect({
      seamYPx: 880,
      hudTopYPx: 900,
      viewportWidthPx: 800,
      viewportHeightPx: 1080,
    });
    expect(r).not.toBeNull();
    expect(r!.fadeTopYPx).toBe(880);
    expect(r!.heightPx).toBe(20);
  });
});
