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
import {
  resolveBottomChromeDatePolicy,
  resolveBottomChromeLabelPolicy,
  resolveBottomChromeTimePolicy,
} from "../../config/bottomChromeVisualPolicy";
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
    localMicroLabel: "LOCAL TIME",
    localTimeLine: "3:45 PM",
    localDateLine: "Apr 7, 2026",
    rightPanelDateLine: "Monday, April 7, 2026",
    bottomChromeLayout: layout,
  };
}

describe("buildBottomChromeBandRenderPlan", () => {
  it("emits band plate rect then three text items in left micro → left time → right date order", () => {
    const vw = 960;
    const typo = resolveBottomChromeTypography(vw);
    const ib = sampleInformationBar(vw);
    const bottomBand = { x: 0, y: 900, width: vw, height: 56 };
    const plan = buildBottomChromeBandRenderPlan({
      viewportWidthPx: vw,
      bottomBand,
      ib,
      typography: typo,
      glyphRenderContext: GLYPH_CTX,
      productDefaultFontAssetId: PRODUCT_FONT,
    });

    expect(plan.items).toHaveLength(4);
    const [plate, a, b, c] = plan.items;
    expect(plate.kind).toBe("rect");
    if (plate.kind === "rect") {
      expect(plate.x).toBe(bottomBand.x);
      expect(plate.y).toBe(bottomBand.y);
      expect(plate.width).toBe(bottomBand.width);
      expect(plate.height).toBe(bottomBand.height);
      expect(plate.fill).toBe(BOTTOM_CHROME_STYLE.overlay.bottomInstrumentBandPlateFill);
    }

    expect(a.kind).toBe("text");
    expect(b.kind).toBe("text");
    expect(c.kind).toBe("text");
    if (a.kind !== "text" || b.kind !== "text" || c.kind !== "text") {
      throw new Error("expected text items");
    }

    expect(a.text).toBe("LOCAL TIME");
    expect(a.textAlign).toBe("left");
    expect(a.letterSpacingEm).toBe(BOTTOM_CHROME_STYLE.layout.leftMicroLabelLetterSpacingEm);
    expect(a.shadow).toBeDefined();
    expect(a.font.assetId).toBe(PRODUCT_FONT);
    expect(a.font.displayName.length).toBeGreaterThan(0);

    expect(b.text).toBe("3:45 PM");
    expect(b.textAlign).toBe("left");
    expect(b.letterSpacingEm).toBe(0);
    expect(b.y).not.toBe(a.y);

    expect(c.text).toBe("Monday, April 7, 2026");
    expect(c.textAlign).toBe("right");
    expect(c.letterSpacingEm).toBe(0);
    expect(c.x).toBe(vw - ib.bottomChromeLayout.horizontalPaddingPx);
    expect(c.y).toBe(b.y);

    const colors = BOTTOM_CHROME_STYLE.colors;
    const labelPolicy = resolveBottomChromeLabelPolicy(colors);
    const timePolicy = resolveBottomChromeTimePolicy(colors);
    const datePolicy = resolveBottomChromeDatePolicy(colors);
    expect(a.fill).toBe(labelPolicy.fill);
    expect(a.font.weight).toBe(labelPolicy.typographyOverrides?.fontWeight);
    expect(b.fill).toBe(timePolicy.fill);
    expect(b.font.weight).toBe(timePolicy.typographyOverrides?.fontWeight);
    expect(c.fill).toBe(datePolicy.fill);
    expect(c.font.weight).toBe(datePolicy.typographyOverrides?.fontWeight);
  });

  it("uses nbsp when right panel date is empty", () => {
    const vw = 640;
    const typo = resolveBottomChromeTypography(vw);
    const ib = sampleInformationBar(vw);
    const empty: BottomInformationBarState = {
      ...ib,
      rightPanelDateLine: "",
    };
    const plan = buildBottomChromeBandRenderPlan({
      viewportWidthPx: vw,
      bottomBand: { x: 0, y: 0, width: vw, height: 48 },
      ib: empty,
      typography: typo,
      glyphRenderContext: GLYPH_CTX,
      productDefaultFontAssetId: PRODUCT_FONT,
    });
    const right = plan.items[3];
    expect(right.kind).toBe("text");
    if (right.kind === "text") {
      expect(right.text).toBe("\u00a0");
    }
  });

  it("positions readouts using band geometry (label above primary time)", () => {
    const vw = 800;
    const typo = resolveBottomChromeTypography(vw);
    const ib = sampleInformationBar(vw);
    const bottomBand = { x: 0, y: 400, width: vw, height: 72 };
    const plan = buildBottomChromeBandRenderPlan({
      viewportWidthPx: vw,
      bottomBand,
      ib,
      typography: typo,
      glyphRenderContext: GLYPH_CTX,
      productDefaultFontAssetId: PRODUCT_FONT,
    });
    const [, label, time] = plan.items;
    if (label.kind !== "text" || time.kind !== "text") {
      throw new Error("expected text");
    }
    expect(label.y).toBeLessThan(time.y);
    expect(label.font.sizePx).toBeLessThan(time.font.sizePx);
  });

  it("allows overriding band plate fill without affecting text items", () => {
    const vw = 480;
    const typo = resolveBottomChromeTypography(vw);
    const ib = sampleInformationBar(vw);
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
});
