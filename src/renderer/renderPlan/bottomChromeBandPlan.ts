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
 * Render-plan builder: bottom instrument layout band (plate) plus lower-left stacked date/time readouts.
 * Layout matches legacy {@link ../bottomChrome} math; product strings come from {@link BottomInformationBarState}.
 */

import {
  resolveBottomChromeDatePolicy,
  resolveBottomChromeSecondaryReadoutPolicy,
  resolveBottomChromeTimePolicy,
} from "../../config/bottomChromeVisualPolicy.ts";
import type { FontAssetId } from "../../typography/fontAssetTypes.ts";
import { createBottomChromeTextGlyph } from "../../glyphs/bottomChromeTextGlyphFromPolicy.ts";
import { BOTTOM_CHROME_STYLE, type BottomChromeColorTokens } from "../../config/bottomChromeStyle";
import {
  bottomStackLabelToTimeGapPx,
  maxBottomStackLabelColumnInkWidthPx,
} from "../bottomStackTimeColumnLayout.ts";
import { emitGlyphToRenderPlan, type GlyphRenderContext } from "../../glyphs/glyphToRenderPlan.ts";
import type { BottomChromeTextVisualPolicy } from "../../config/bottomChromeVisualPolicy.ts";
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

/** Role sizing/weight from policy; face comes from the global product default font. */
function withInheritedProductFontFace(
  policy: BottomChromeTextVisualPolicy,
  productDefaultFontAssetId: FontAssetId,
): BottomChromeTextVisualPolicy {
  return {
    ...policy,
    typographyOverrides: {
      ...policy.typographyOverrides,
      fontAssetId: productDefaultFontAssetId,
    },
  };
}

/**
 * Full bottom-band overlay: resolved band plate (structural rect) then lower-left stacked readouts.
 * Band fill defaults to transparent so the map-backed appearance matches the pre–Phase 2 text-only path.
 */
export function buildBottomChromeBandRenderPlan(options: {
  viewportWidthPx: number;
  bottomBand: BottomChromeBandRect;
  ib: BottomInformationBarState;
  typography: { microLabelPx: number; primaryTimePx: number; secondaryReadoutPx: number };
  colors?: BottomChromeColorTokens;
  /** Overrides default band plate fill (e.g. in tests). */
  bandPlateFill?: string;
  /** Bundled fonts + typography resolution for {@link TextGlyph} emission. */
  glyphRenderContext: GlyphRenderContext;
  /** Global default bundled font (roles keep weight/spacing; face inherits this id). */
  productDefaultFontAssetId: FontAssetId;
}): RenderPlan {
  const colors = options.colors ?? BOTTOM_CHROME_STYLE.colors;
  const L = BOTTOM_CHROME_STYLE.layout;
  const O = BOTTOM_CHROME_STYLE.overlay;
  const padX = options.ib.bottomChromeLayout.horizontalPaddingPx;
  const bh = options.bottomBand.height;
  const by = options.bottomBand.y;
  const sideLift = bh * L.sideReadoutVerticalLiftFracOfBandHeight;
  const shadow = sideReadoutShadowFromStyle();
  const band = options.bottomBand;
  const plateFill = options.bandPlateFill ?? O.bottomInstrumentBandPlateFill;
  const gctx = options.glyphRenderContext;

  const pid = options.productDefaultFontAssetId;
  const timePolicy = withInheritedProductFontFace(resolveBottomChromeTimePolicy(colors), pid);
  const datePolicy = withInheritedProductFontFace(resolveBottomChromeDatePolicy(colors), pid);
  const labelPolicy = withInheritedProductFontFace(resolveBottomChromeSecondaryReadoutPolicy(colors), pid);
  const stackPx = options.typography.primaryTimePx;

  const clockLabels = options.ib.leftTimeStackLines.flatMap((row) =>
    row.role === "clock" ? [row.label] : [],
  );
  const labelColInkPx = maxBottomStackLabelColumnInkWidthPx(clockLabels, stackPx);
  const labelGapPx = labelColInkPx > 0 ? bottomStackLabelToTimeGapPx(stackPx) : 0;
  const timeColumnLeftX = padX + labelColInkPx + labelGapPx;

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

  const n = options.ib.leftTimeStackLines.length;
  const topFrac = 0.12;
  const botFrac = 0.9;
  const span = Math.max(0.05, botFrac - topFrac);

  for (let i = 0; i < n; i += 1) {
    const row = options.ib.leftTimeStackLines[i]!;
    const t = n === 1 ? 0.5 : i / Math.max(1, n - 1);
    const yFrac = topFrac + t * span;
    const cy = by + bh * yFrac - sideLift;

    if (row.role === "date") {
      const text = row.text.length > 0 ? row.text : "\u00a0";
      emitGlyphToRenderPlan(
        createBottomChromeTextGlyph(text, datePolicy, { textAlign: "left", shadow }),
        { cx: padX, cy, size: stackPx },
        gctx,
        items,
      );
      continue;
    }

    if (row.role === "spacer") {
      emitGlyphToRenderPlan(
        createBottomChromeTextGlyph("\u00a0", timePolicy, { textAlign: "left", shadow }),
        { cx: padX, cy, size: stackPx },
        gctx,
        items,
      );
      continue;
    }

    const timeText = row.timeText.length > 0 ? row.timeText : "\u00a0";
    if (row.label !== null && row.label.length > 0) {
      emitGlyphToRenderPlan(
        createBottomChromeTextGlyph(row.label, labelPolicy, { textAlign: "left", shadow }),
        { cx: padX, cy, size: stackPx },
        gctx,
        items,
      );
    }
    emitGlyphToRenderPlan(
      createBottomChromeTextGlyph(timeText, timePolicy, { textAlign: "left", shadow }),
      { cx: timeColumnLeftX, cy, size: stackPx },
      gctx,
      items,
    );
  }

  return { items };
}
