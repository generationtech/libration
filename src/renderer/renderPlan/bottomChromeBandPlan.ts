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
 * Render-plan builder: bottom instrument layout band (plate) plus left/right floating readouts.
 * Layout matches legacy {@link ../bottomChrome} math; product strings come from {@link BottomInformationBarState}.
 */

import {
  resolveBottomChromeDatePolicy,
  resolveBottomChromeLabelPolicy,
  resolveBottomChromeTimePolicy,
} from "../../config/bottomChromeVisualPolicy.ts";
import { createBottomChromeTextGlyph } from "../../glyphs/bottomChromeTextGlyphFromPolicy.ts";
import { BOTTOM_CHROME_STYLE, type BottomChromeColorTokens } from "../../config/bottomChromeStyle";
import { bottomChromeReadoutContentFromInformationBar } from "../../glyphs/bottomChromeContent.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../../glyphs/glyphToRenderPlan.ts";
import type { BottomInformationBarState } from "../bottomChromeTypes";
import type { RenderPlan, RenderTextShadowStyle } from "./renderPlanTypes";

export type BottomChromeBandRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function sideReadoutShadowFromStyle(): RenderTextShadowStyle {
  const O = BOTTOM_CHROME_STYLE.overlay;
  return {
    color: O.sideReadoutTextShadowColor,
    blurPx: O.sideReadoutTextShadowBlurPx,
    offsetXPx: O.sideReadoutTextShadowOffsetXPx,
    offsetYPx: O.sideReadoutTextShadowOffsetYPx,
  };
}

/**
 * Full bottom-band overlay: resolved band plate (structural rect) then micro label, time, and right date readouts.
 * Band fill defaults to transparent so the map-backed appearance matches the pre–Phase 2 text-only path.
 */
export function buildBottomChromeBandRenderPlan(options: {
  viewportWidthPx: number;
  bottomBand: BottomChromeBandRect;
  ib: BottomInformationBarState;
  typography: { microLabelPx: number; primaryTimePx: number };
  colors?: BottomChromeColorTokens;
  /** Overrides default band plate fill (e.g. in tests). */
  bandPlateFill?: string;
  /** Bundled fonts + typography resolution for {@link TextGlyph} emission. */
  glyphRenderContext: GlyphRenderContext;
}): RenderPlan {
  const colors = options.colors ?? BOTTOM_CHROME_STYLE.colors;
  const L = BOTTOM_CHROME_STYLE.layout;
  const O = BOTTOM_CHROME_STYLE.overlay;
  const padX = options.ib.bottomChromeLayout.horizontalPaddingPx;
  const bh = options.bottomBand.height;
  const by = options.bottomBand.y;
  const sideLift = bh * L.sideReadoutVerticalLiftFracOfBandHeight;
  const timeY = by + bh * L.leftPrimaryTimeYFracOfBandHeight - sideLift;
  const labelY = by + bh * L.leftMicroLabelYFracOfBandHeight - sideLift;
  const vw = Math.max(0, options.viewportWidthPx);
  const rx = vw - padX;
  const shadow = sideReadoutShadowFromStyle();
  const band = options.bottomBand;
  const plateFill = options.bandPlateFill ?? O.bottomInstrumentBandPlateFill;
  const gctx = options.glyphRenderContext;

  const content = bottomChromeReadoutContentFromInformationBar(options.ib);
  const labelPolicy = resolveBottomChromeLabelPolicy(colors);
  const timePolicy = resolveBottomChromeTimePolicy(colors);
  const datePolicy = resolveBottomChromeDatePolicy(colors);

  const items: RenderPlan["items"] = [
    {
      kind: "rect" as const,
      x: band.x,
      y: band.y,
      width: band.width,
      height: band.height,
      fill: plateFill,
    },
  ];

  emitGlyphToRenderPlan(
    createBottomChromeTextGlyph(content.label.label, labelPolicy, { textAlign: "left", shadow }),
    { cx: padX, cy: labelY, size: options.typography.microLabelPx },
    gctx,
    items,
  );
  emitGlyphToRenderPlan(
    createBottomChromeTextGlyph(content.time.label, timePolicy, { textAlign: "left", shadow }),
    { cx: padX, cy: timeY, size: options.typography.primaryTimePx },
    gctx,
    items,
  );
  emitGlyphToRenderPlan(
    createBottomChromeTextGlyph(content.date.label, datePolicy, { textAlign: "right", shadow }),
    { cx: rx, cy: timeY, size: options.typography.primaryTimePx },
    gctx,
    items,
  );

  return { items };
}
