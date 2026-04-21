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
import { loadBundledFontAssetRegistry } from "../../config/chromeTypography";
import { resolveBottomChromeDatePolicy, resolveBottomChromeTimePolicy } from "../../config/bottomChromeVisualPolicy";
import { BOTTOM_CHROME_STYLE } from "../../config/bottomChromeStyle";
import { computeBottomChromeLayout } from "../bottomChromeLayout";
import { resolveBottomChromeTypography } from "../bottomChrome";
import type { BottomInformationBarState } from "../bottomChromeTypes";
import { buildBottomChromeBandRenderPlan } from "./bottomChromeBandPlan";
import { DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID } from "../../config/appConfig";

const GLYPH_CTX = { fontRegistry: loadBundledFontAssetRegistry() };
const PRODUCT_FONT = DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID;

function sampleInformationBar(vw: number): BottomInformationBarState {
  const layout = computeBottomChromeLayout(vw);
  return {
    leftTimeStackLines: [
      { role: "date", text: "Monday, April 7, 2026" },
      { role: "time", text: "3:45:00 PM" },
    ],
    bottomChromeLayout: layout,
  };
}

describe("buildBottomChromeBandRenderPlan", () => {
  it("emits band plate then left-aligned date then time (same x, no labels)", () => {
    const vw = 960;
    const ib = sampleInformationBar(vw);
    const typo = resolveBottomChromeTypography(vw, ib.leftTimeStackLines.length);
    const bottomBand = { x: 0, y: 900, width: vw, height: 56 };
    const plan = buildBottomChromeBandRenderPlan({
      viewportWidthPx: vw,
      bottomBand,
      ib,
      typography: typo,
      glyphRenderContext: GLYPH_CTX,
      productDefaultFontAssetId: PRODUCT_FONT,
    });

    expect(plan.items.length).toBeGreaterThanOrEqual(3);
    const [plate, ...texts] = plan.items;
    expect(plate.kind).toBe("rect");
    if (plate.kind === "rect") {
      expect(plate.x).toBe(bottomBand.x);
      expect(plate.y).toBe(bottomBand.y);
      expect(plate.width).toBe(bottomBand.width);
      expect(plate.height).toBe(bottomBand.height);
      expect(plate.fill).toBe(BOTTOM_CHROME_STYLE.overlay.bottomInstrumentBandPlateFill);
    }

    const textItems = texts.filter((it): it is Extract<typeof it, { kind: "text" }> => it.kind === "text");
    expect(textItems[0]!.text).toBe("Monday, April 7, 2026");
    expect(textItems[0]!.textAlign).toBe("left");
    expect(textItems[0]!.x).toBe(ib.bottomChromeLayout.horizontalPaddingPx);

    const colors = BOTTOM_CHROME_STYLE.colors;
    const timePolicy = resolveBottomChromeTimePolicy(colors);
    const datePolicy = resolveBottomChromeDatePolicy(colors);
    expect(textItems[0]!.fill).toBe(datePolicy.fill);
    expect(textItems[1]!.fill).toBe(timePolicy.fill);
    expect(textItems[1]!.x).toBe(ib.bottomChromeLayout.horizontalPaddingPx);
  });

  it("uses nbsp when a stack line is empty", () => {
    const vw = 640;
    const layout = computeBottomChromeLayout(vw);
    const ib: BottomInformationBarState = {
      leftTimeStackLines: [{ role: "date", text: "" }],
      bottomChromeLayout: layout,
    };
    const typo = resolveBottomChromeTypography(vw, ib.leftTimeStackLines.length);
    const plan = buildBottomChromeBandRenderPlan({
      viewportWidthPx: vw,
      bottomBand: { x: 0, y: 0, width: vw, height: 48 },
      ib,
      typography: typo,
      glyphRenderContext: GLYPH_CTX,
      productDefaultFontAssetId: PRODUCT_FONT,
    });
    const text = plan.items[1];
    expect(text.kind).toBe("text");
    if (text.kind === "text") {
      expect(text.text).toBe("\u00a0");
    }
  });

  it("positions stack lines with increasing y downward in the band", () => {
    const vw = 800;
    const ib = sampleInformationBar(vw);
    const typo = resolveBottomChromeTypography(vw, ib.leftTimeStackLines.length);
    const bottomBand = { x: 0, y: 400, width: vw, height: 72 };
    const plan = buildBottomChromeBandRenderPlan({
      viewportWidthPx: vw,
      bottomBand,
      ib,
      typography: typo,
      glyphRenderContext: GLYPH_CTX,
      productDefaultFontAssetId: PRODUCT_FONT,
    });
    const ys = plan.items
      .filter((it): it is Extract<typeof it, { kind: "text" }> => it.kind === "text")
      .map((it) => it.y);
    const uniqueY = [...new Set(ys)].sort((a, b) => a - b);
    for (let i = 1; i < uniqueY.length; i += 1) {
      expect(uniqueY[i]).toBeGreaterThan(uniqueY[i - 1]!);
    }
  });

  it("tightens vertical spacing between date and time rows (~half legacy band span) while keeping date above time", () => {
    const vw = 800;
    const ib = sampleInformationBar(vw);
    const typo = resolveBottomChromeTypography(vw, ib.leftTimeStackLines.length);
    const bh = 72;
    const bottomBand = { x: 0, y: 400, width: vw, height: bh };
    const plan = buildBottomChromeBandRenderPlan({
      viewportWidthPx: vw,
      bottomBand,
      ib,
      typography: typo,
      glyphRenderContext: GLYPH_CTX,
      productDefaultFontAssetId: PRODUCT_FONT,
    });
    const texts = plan.items.filter(
      (it): it is Extract<typeof it, { kind: "text" }> => it.kind === "text",
    );
    expect(texts[0]!.text).toBe("Monday, April 7, 2026");
    expect(texts[1]!.text).toBe("3:45:00 PM");
    const topFrac = 0.12;
    const botFrac = 0.9;
    const span = Math.max(0.05, botFrac - topFrac);
    const legacyCenterGapPx = span * bh;
    const gapY = texts[1]!.y - texts[0]!.y;
    expect(gapY).toBeGreaterThan(0);
    expect(gapY).toBeLessThan(legacyCenterGapPx * 0.55);
    const stackPx = typo.primaryTimePx;
    const minRowGapPx = Math.max(4, stackPx * 0.06);
    expect(gapY).toBeGreaterThanOrEqual(minRowGapPx * 0.85);
  });

  it("allows overriding band plate fill without affecting text items", () => {
    const vw = 480;
    const ib = sampleInformationBar(vw);
    const typo = resolveBottomChromeTypography(vw, ib.leftTimeStackLines.length);
    const bottomBand = { x: 2, y: 100, width: vw - 4, height: 40 };
    const customFill = "rgba(2, 14, 38, 0.12)";
    const plan = buildBottomChromeBandRenderPlan({
      viewportWidthPx: vw,
      bottomBand,
      ib,
      typography: typo,
      bandPlateFill: customFill,
      glyphRenderContext: GLYPH_CTX,
      productDefaultFontAssetId: PRODUCT_FONT,
    });
    const plate = plan.items[0];
    expect(plate.kind).toBe("rect");
    if (plate.kind === "rect") {
      expect(plate.fill).toBe(customFill);
    }
  });

  it("uses the same font size for date and time rows", () => {
    const vw = 700;
    const ib = sampleInformationBar(vw);
    const typo = resolveBottomChromeTypography(vw, ib.leftTimeStackLines.length);
    const plan = buildBottomChromeBandRenderPlan({
      viewportWidthPx: vw,
      bottomBand: { x: 0, y: 0, width: vw, height: 64 },
      ib,
      typography: typo,
      glyphRenderContext: GLYPH_CTX,
      productDefaultFontAssetId: PRODUCT_FONT,
    });
    const sizes = plan.items
      .filter((it): it is Extract<typeof it, { kind: "text" }> => it.kind === "text")
      .map((it) => it.font.sizePx);
    const u = new Set(sizes);
    expect(u.size).toBe(1);
    expect(sizes[0]).toBe(typo.primaryTimePx);
  });
});
