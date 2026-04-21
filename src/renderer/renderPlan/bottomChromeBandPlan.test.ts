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
    leftTimeStackLines: [
      { role: "date", text: "Monday, April 7, 2026" },
      { role: "clock", text: "Local  3:45 PM" },
      { role: "clock", text: "Refer  3:45 PM" },
      { role: "clock", text: "UTC  19:45:00" },
    ],
    bottomChromeLayout: layout,
  };
}

describe("buildBottomChromeBandRenderPlan", () => {
  it("emits band plate then left-aligned stack lines in order (date then clocks)", () => {
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

    expect(plan.items).toHaveLength(5);
    const [plate, t0, t1, t2, t3] = plan.items;
    expect(plate.kind).toBe("rect");
    if (plate.kind === "rect") {
      expect(plate.x).toBe(bottomBand.x);
      expect(plate.y).toBe(bottomBand.y);
      expect(plate.width).toBe(bottomBand.width);
      expect(plate.height).toBe(bottomBand.height);
      expect(plate.fill).toBe(BOTTOM_CHROME_STYLE.overlay.bottomInstrumentBandPlateFill);
    }

    for (const item of [t0, t1, t2, t3]) {
      expect(item.kind).toBe("text");
    }
    if (t0.kind !== "text" || t1.kind !== "text" || t2.kind !== "text" || t3.kind !== "text") {
      throw new Error("expected text items");
    }

    expect(t0.text).toBe("Monday, April 7, 2026");
    expect(t0.textAlign).toBe("left");
    expect(t0.x).toBe(ib.bottomChromeLayout.horizontalPaddingPx);

    expect(t1.text).toBe("Local  3:45 PM");
    expect(t2.text).toBe("Refer  3:45 PM");
    expect(t3.text).toBe("UTC  19:45:00");

    const colors = BOTTOM_CHROME_STYLE.colors;
    const timePolicy = resolveBottomChromeTimePolicy(colors);
    const datePolicy = resolveBottomChromeDatePolicy(colors);
    expect(t0.fill).toBe(datePolicy.fill);
    expect(t1.fill).toBe(timePolicy.fill);
    expect(t2.fill).toBe(timePolicy.fill);
    expect(t3.fill).toBe(timePolicy.fill);
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
    for (let i = 1; i < ys.length; i += 1) {
      expect(ys[i]).toBeGreaterThan(ys[i - 1]!);
    }
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
});
