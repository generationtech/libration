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
import { DEFAULT_GEOGRAPHY_CONFIG, DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID } from "../../config/appConfig";
import {
  buildUtcTopScaleLayout,
  computeTopBandCircleStackMetrics,
  computeUtcCircleMarkerRadius,
  computeUtcTopScaleRowMetrics,
} from "../displayChrome";
import { loadBundledFontAssetRegistry } from "../../config/chromeTypography";
import {
  computeHourDiskLabelSizePx,
  computeTimezoneLetterSizePx,
  TOP_CHROME_STYLE,
} from "../../config/topChromeStyle.ts";
import { structuralHourIndexFromReferenceLongitudeDeg } from "../structuralLongitudeGrid";
import { buildTimezoneLetterRowRenderPlan } from "./timezoneLetterRowPlan";

const GLYPH_CTX = { fontRegistry: loadBundledFontAssetRegistry() };

describe("buildTimezoneLetterRowRenderPlan", () => {
  it("returns empty items when timezone letter row is hidden", () => {
    const vw = 960;
    const layout = buildUtcTopScaleLayout(Date.now(), vw, 80, undefined, undefined, {
      timezoneLetterRowVisible: false,
    });
    const rows = layout.rows ?? computeUtcTopScaleRowMetrics(80, { timezoneLetterRowVisible: false });
    const y0 = 0;
    const circleH = rows.circleBandH;
    const tickH = rows.tickBandH;
    const yTickBottom = y0 + circleH + tickH;
    const bandBottom = y0 + 80;
    const zoneH = bandBottom - yTickBottom;
    const zonePadY = 0;

    const plan = buildTimezoneLetterRowRenderPlan({
      viewportWidthPx: vw,
      segments: layout.segments,
      majorBoundaryXs: layout.majorBoundaryXs,
      zoneTop: yTickBottom,
      zoneH,
      bandBottom,
      segGapX: 0.4,
      zonePadY,
      tabBottomR: 4,
      diskLabelSizePx: 14,
      presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(
        layout.presentTimeContext.longitudeDeg,
      ),
      presentTimeNatoLetter: layout.presentTimeContext.natoLetter,
      geography: DEFAULT_GEOGRAPHY_CONFIG,
      anchorSource: layout.topBandAnchor.anchorSource,
      timezoneLetterRowVisible: false,
      glyphRenderContext: GLYPH_CTX,
      resolvedTimezoneLetterFontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
    });
    expect(plan.items).toHaveLength(0);
  });

  it("emits phased boundary lines first, then rect segment fills, then 24 letter texts in hour order", () => {
    const vw = 960;
    const now = Date.UTC(2026, 3, 7, 15, 30, 0);
    const layout = buildUtcTopScaleLayout(now, vw, 80, undefined, undefined, {
      timezoneLetterRowVisible: true,
    });
    const rows = layout.rows ?? computeUtcTopScaleRowMetrics(80);
    const circleStack = computeTopBandCircleStackMetrics(rows.circleBandH);
    const sw = vw / 24;
    const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
    const diskLabelSizePx = computeHourDiskLabelSizePx(r, vw);

    const y0 = 0;
    const circleH = rows.circleBandH;
    const tickH = rows.tickBandH;
    const yTickBottom = y0 + circleH + tickH;
    const bandBottom = y0 + 80;
    const zoneH = bandBottom - yTickBottom;
    const tzTab = TOP_CHROME_STYLE.timezoneTab;
    const zonePadY = Math.max(
      0,
      Math.min(tzTab.zoneFillPadMaxPx, Math.round(zoneH * tzTab.zoneFillPadFracOfZone)),
    );
    const fillH = Math.max(0, zoneH - zonePadY * 2);
    const tabBottomR = Math.min(8, Math.max(4, Math.round(Math.min(zoneH * 0.32, 7))));

    const plan = buildTimezoneLetterRowRenderPlan({
      viewportWidthPx: vw,
      segments: layout.segments,
      majorBoundaryXs: layout.majorBoundaryXs,
      zoneTop: yTickBottom,
      zoneH,
      bandBottom,
      segGapX: 0.4,
      zonePadY,
      tabBottomR,
      diskLabelSizePx,
      presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(
        layout.presentTimeContext.longitudeDeg,
      ),
      presentTimeNatoLetter: layout.presentTimeContext.natoLetter,
      geography: undefined,
      anchorSource: layout.topBandAnchor.anchorSource,
      timezoneLetterRowVisible: true,
      glyphRenderContext: GLYPH_CTX,
      resolvedTimezoneLetterFontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
    });

    const boundaryLines = plan.items.filter((i) => i.kind === "line" && i.y2 === bandBottom);
    expect(boundaryLines.length).toBeGreaterThanOrEqual(25);

    const firstNonBoundaryIdx = plan.items.findIndex(
      (i) => i.kind !== "line" || (i.kind === "line" && i.y2 !== bandBottom),
    );
    expect(firstNonBoundaryIdx).toBeGreaterThan(0);
    expect(plan.items[firstNonBoundaryIdx]?.kind).toBe("rect");

    const letterTexts = plan.items.filter(
      (i) =>
        i.kind === "text" && i.textBaseline === "middle" && i.text.length === 1,
    );
    expect(letterTexts.length).toBeGreaterThanOrEqual(24);
    expect(new Set(letterTexts.map((t) => (t.kind === "text" ? t.text : ""))).size).toBe(24);
    expect(letterTexts[0]!.kind === "text" && letterTexts[0]!.text).toBe(layout.segments[0]!.timezoneLetter);
    const tzLetter = letterTexts[0];
    expect(tzLetter?.kind).toBe("text");
    if (tzLetter?.kind === "text") {
      expect(tzLetter.font.assetId).toBe(DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID);
      expect(tzLetter.font.displayName.toLowerCase()).toContain("zeroes");
      expect(tzLetter.font.sizePx).toBe(computeTimezoneLetterSizePx(diskLabelSizePx, fillH));
    }

    const rects = plan.items.filter((i) => i.kind === "rect");
    expect(rects.length).toBeGreaterThanOrEqual(24);
  });

  it("uses authored timezoneLetterRowFontAssetId for NATO letters only", () => {
    const vw = 960;
    const now = Date.UTC(2026, 3, 7, 15, 30, 0);
    const layout = buildUtcTopScaleLayout(now, vw, 80, undefined, undefined, {
      timezoneLetterRowVisible: true,
    });
    const rows = layout.rows ?? computeUtcTopScaleRowMetrics(80);
    const circleStack = computeTopBandCircleStackMetrics(rows.circleBandH);
    const sw = vw / 24;
    const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
    const diskLabelSizePx = computeHourDiskLabelSizePx(r, vw);

    const y0 = 0;
    const circleH = rows.circleBandH;
    const tickH = rows.tickBandH;
    const yTickBottom = y0 + circleH + tickH;
    const bandBottom = y0 + 80;
    const zoneH = bandBottom - yTickBottom;
    const tzTab = TOP_CHROME_STYLE.timezoneTab;
    const zonePadY = Math.max(
      0,
      Math.min(tzTab.zoneFillPadMaxPx, Math.round(zoneH * tzTab.zoneFillPadFracOfZone)),
    );
    const tabBottomR = Math.min(8, Math.max(4, Math.round(Math.min(zoneH * 0.32, 7))));

    const plan = buildTimezoneLetterRowRenderPlan({
      viewportWidthPx: vw,
      segments: layout.segments,
      majorBoundaryXs: layout.majorBoundaryXs,
      zoneTop: yTickBottom,
      zoneH,
      bandBottom,
      segGapX: 0.4,
      zonePadY,
      tabBottomR,
      diskLabelSizePx,
      presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(
        layout.presentTimeContext.longitudeDeg,
      ),
      presentTimeNatoLetter: layout.presentTimeContext.natoLetter,
      geography: undefined,
      anchorSource: layout.topBandAnchor.anchorSource,
      timezoneLetterRowVisible: true,
      glyphRenderContext: GLYPH_CTX,
      resolvedTimezoneLetterFontAssetId: "computer",
    });

    const letterTexts = plan.items.filter(
      (i) => i.kind === "text" && i.textBaseline === "middle" && i.text.length === 1,
    );
    const tzLetter = letterTexts[0];
    expect(tzLetter?.kind).toBe("text");
    if (tzLetter?.kind === "text") {
      expect(tzLetter.font.assetId).toBe("computer");
    }
  });

  it("throws if presentTimeStructuralHour0To23 does not match presentTimeNatoLetter for that column", () => {
    const vw = 960;
    const now = Date.UTC(2026, 3, 7, 15, 30, 0);
    const layout = buildUtcTopScaleLayout(now, vw, 80, undefined, undefined, {
      timezoneLetterRowVisible: true,
    });
    const rows = layout.rows ?? computeUtcTopScaleRowMetrics(80);
    const y0 = 0;
    const circleH = rows.circleBandH;
    const tickH = rows.tickBandH;
    const yTickBottom = y0 + circleH + tickH;
    const bandBottom = y0 + 80;
    const zoneH = bandBottom - yTickBottom;
    const tzTab = TOP_CHROME_STYLE.timezoneTab;
    const zonePadY = Math.max(
      0,
      Math.min(tzTab.zoneFillPadMaxPx, Math.round(zoneH * tzTab.zoneFillPadFracOfZone)),
    );
    const tabBottomR = Math.min(8, Math.max(4, Math.round(Math.min(zoneH * 0.32, 7))));
    const circleStack = computeTopBandCircleStackMetrics(rows.circleBandH);
    const sw = vw / 24;
    const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
    const diskLabelSizePx = computeHourDiskLabelSizePx(r, vw);

    expect(() =>
      buildTimezoneLetterRowRenderPlan({
        viewportWidthPx: vw,
        segments: layout.segments,
        majorBoundaryXs: layout.majorBoundaryXs,
        zoneTop: yTickBottom,
        zoneH,
        bandBottom,
        segGapX: 0.4,
        zonePadY,
        tabBottomR,
        diskLabelSizePx,
        presentTimeStructuralHour0To23: (structuralHourIndexFromReferenceLongitudeDeg(
          layout.presentTimeContext.longitudeDeg,
        ) +
          1) %
          24,
        presentTimeNatoLetter: layout.presentTimeContext.natoLetter,
        geography: undefined,
        anchorSource: layout.topBandAnchor.anchorSource,
        timezoneLetterRowVisible: true,
        glyphRenderContext: GLYPH_CTX,
        resolvedTimezoneLetterFontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
      }),
    ).toThrow(/NATO active cell/);
  });
});
