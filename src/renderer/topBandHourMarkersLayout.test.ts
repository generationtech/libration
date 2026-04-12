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
import {
  buildUtcTopScaleLayout,
  computeTopBandCircleStackMetrics,
  computeUtcTopScaleRowMetrics,
  resolveTopBandTimeFromConfig,
} from "./displayChrome";
import {
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_DISPLAY_TIME_CONFIG,
  DEFAULT_HOUR_MARKERS_CONFIG,
} from "../config/appConfig";
import { buildSemanticTopBandHourMarkers } from "../config/topBandHourMarkersSemanticPlan.ts";
import { resolveEffectiveTopBandHourMarkers } from "../config/topBandHourMarkersResolver.ts";
import {
  computeTextIndicatorRowHeightPx,
  computeTextModeIntrinsicDiskBandVerticalMetrics,
  computeTextModeLayoutDiskBandVerticalMetrics,
  layoutSemanticTopBandAnalogClockMarkers,
  layoutSemanticTopBandHourMarkers,
  layoutSemanticTopBandRadialLineMarkers,
  layoutSemanticTopBandRadialWedgeMarkers,
} from "../config/topBandHourMarkersLayout.ts";

const RESOLVED_UTC = resolveTopBandTimeFromConfig({
  ...DEFAULT_DISPLAY_TIME_CONFIG,
  referenceTimeZone: { source: "fixed", timeZone: "UTC" },
  topBandMode: "utc24",
  topBandAnchor: { mode: "auto" },
});

describe("computeTextIndicatorRowHeightPx", () => {
  it("shrinks with smaller sizeMultiplier and grows with larger font size (intrinsic sizing path)", () => {
    const smallMul = computeTextIndicatorRowHeightPx({ fontSizePx: 14, sizeMultiplier: 0.5 });
    const largeMul = computeTextIndicatorRowHeightPx({ fontSizePx: 14, sizeMultiplier: 2 });
    expect(smallMul).toBeLessThan(largeMul);
    const mid = computeTextIndicatorRowHeightPx({ fontSizePx: 14, sizeMultiplier: 1 });
    expect(computeTextIndicatorRowHeightPx({ fontSizePx: 22, sizeMultiplier: 1 })).toBeGreaterThan(mid);
  });

  it("at the same font size, 0.90× / 1.20× / 1.50× produce strictly increasing row heights (ceil can tie at small sizes)", () => {
    const fs = 100;
    const h09 = computeTextIndicatorRowHeightPx({ fontSizePx: fs, sizeMultiplier: 0.9 });
    const h12 = computeTextIndicatorRowHeightPx({ fontSizePx: fs, sizeMultiplier: 1.2 });
    const h15 = computeTextIndicatorRowHeightPx({ fontSizePx: fs, sizeMultiplier: 1.5 });
    expect(h09).toBeLessThan(h12);
    expect(h12).toBeLessThan(h15);
    expect(h15 - h09).toBeGreaterThanOrEqual(2);
  });

  it("layout path: row height is core + configured top + bottom (no hidden automatic padding layer)", () => {
    const base = computeTextModeIntrinsicDiskBandVerticalMetrics({ fontSizePx: 20, sizeMultiplier: 1 });
    expect(base.diskBandH).toBeGreaterThan(0);
    const lay = computeTextModeLayoutDiskBandVerticalMetrics({
      fontSizePx: 20,
      sizeMultiplier: 1,
      rowTopInsetPx: 4,
      rowBottomInsetPx: 2,
    });
    expect(lay.topPadInsideDiskPx).toBe(4);
    expect(lay.bottomPadInsideDiskPx).toBe(2);
    expect(lay.diskBandH).toBe(lay.textCoreHeightPx + 4 + 2);
    expect(
      computeTextIndicatorRowHeightPx({
        fontSizePx: 20,
        sizeMultiplier: 1,
        textTopMarginPx: 4,
        textBottomMarginPx: 2,
      }),
    ).toBe(lay.diskBandH);
  });

  it("intrinsic sizing disk height is independent of configured row insets", () => {
    const a = computeTextModeIntrinsicDiskBandVerticalMetrics({ fontSizePx: 20, sizeMultiplier: 1 });
    const b = computeTextModeIntrinsicDiskBandVerticalMetrics({ fontSizePx: 20, sizeMultiplier: 1 });
    expect(a.diskBandH).toBe(b.diskBandH);
  });
});

function hourMarkerLayout(
  realization: (typeof DEFAULT_HOUR_MARKERS_CONFIG)["realization"],
): typeof DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG {
  return {
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    hourMarkers: {
      ...DEFAULT_HOUR_MARKERS_CONFIG,
      realization,
      layout: { ...DEFAULT_HOUR_MARKERS_CONFIG.layout, sizeMultiplier: 1 },
    },
  };
}

describe("layoutSemanticTopBandHourMarkers", () => {
  it("produces 24 laid-out text instances aligned to the semantic plan", () => {
    const w = 960;
    const top = 88;
    const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
    const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
    const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
    const effective = resolveEffectiveTopBandHourMarkers(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const plan = buildSemanticTopBandHourMarkers(effective);
    const laidOut = layoutSemanticTopBandHourMarkers(plan, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: scale.circleMarkers.map((m) => ({
        centerX: m.centerX,
        radiusPx: m.radiusPx,
        structuralHour0To23: m.utcHour,
        currentHourLabel: m.currentHourLabel,
      })),
      diskLabelSizePx: 14,
    });
    expect(plan.instances).toHaveLength(24);
    expect(laidOut).toHaveLength(24);
    for (let h = 0; h < 24; h += 1) {
      const row = laidOut[h]!;
      expect(row.structuralHour0To23).toBe(h);
      expect(row.displayLabel).toBe(scale.circleMarkers[h]!.currentHourLabel);
      expect(row.centerX).toBeCloseTo(scale.circleMarkers[h]!.centerX, 5);
      expect(row.wrapHalfExtentPx).toBeGreaterThan(0);
    }
  });

  it("static-zone analog layout uses structural segment centerX, not phased tape centerX", () => {
    const w = 960;
    const top = 88;
    const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
    const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
    const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
    const structuralX = scale.segments.map((s) => s.centerX);
    const eff = resolveEffectiveTopBandHourMarkers(
      hourMarkerLayout({ kind: "analogClock", appearance: {} }),
    );
    const plan = buildSemanticTopBandHourMarkers(eff, { referenceNowMs: Date.UTC(2024, 0, 1, 6, 0, 0) });
    const tapeMarkers = scale.circleMarkers.map((m) => ({
      centerX: m.centerX,
      radiusPx: m.radiusPx,
      structuralHour0To23: m.utcHour,
      currentHourLabel: m.currentHourLabel,
    }));
    const laidOut = layoutSemanticTopBandAnalogClockMarkers(plan, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      structuralZoneCenterXPx: structuralX,
    });
    expect(laidOut).toHaveLength(24);
    let maxDeltaFromTape = 0;
    for (const row of laidOut) {
      const h = row.structuralHour0To23;
      expect(row.centerX).toBeCloseTo(structuralX[h]!, 5);
      maxDeltaFromTape = Math.max(maxDeltaFromTape, Math.abs(row.centerX - tapeMarkers[h]!.centerX));
    }
    expect(maxDeltaFromTape).toBeGreaterThan(1);
  });
});

describe("layoutSemanticTopBandRadialLineMarkers", () => {
  it("produces 24 laid-out instances on phased tape centerX (tape-advected), same x as text layout", () => {
    const w = 960;
    const top = 88;
    const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
    const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
    const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
    const tapeMarkers = scale.circleMarkers.map((m) => ({
      centerX: m.centerX,
      radiusPx: m.radiusPx,
      structuralHour0To23: m.utcHour,
      currentHourLabel: m.currentHourLabel,
    }));
    const eff = resolveEffectiveTopBandHourMarkers(
      hourMarkerLayout({ kind: "radialLine", appearance: {} }),
    );
    const plan = buildSemanticTopBandHourMarkers(eff);
    const laidOutRadial = layoutSemanticTopBandRadialLineMarkers(plan, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
    });
    const laidOutText = layoutSemanticTopBandHourMarkers(plan, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
    });
    expect(laidOutRadial).toHaveLength(24);
    expect(laidOutText).toHaveLength(24);
    for (let h = 0; h < 24; h += 1) {
      expect(laidOutRadial[h]!.centerX).toBeCloseTo(laidOutText[h]!.centerX, 5);
      expect(laidOutRadial[h]!.centerX).toBeCloseTo(scale.circleMarkers[h]!.centerX, 5);
    }
  });
});

describe("layoutSemanticTopBandRadialWedgeMarkers", () => {
  it("produces 24 laid-out instances on phased tape centerX, same x as radialLine layout", () => {
    const w = 960;
    const top = 88;
    const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
    const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
    const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
    const tapeMarkers = scale.circleMarkers.map((m) => ({
      centerX: m.centerX,
      radiusPx: m.radiusPx,
      structuralHour0To23: m.utcHour,
      currentHourLabel: m.currentHourLabel,
    }));
    const eff = resolveEffectiveTopBandHourMarkers(
      hourMarkerLayout({ kind: "radialWedge", appearance: {} }),
    );
    const plan = buildSemanticTopBandHourMarkers(eff);
    const laidOutWedge = layoutSemanticTopBandRadialWedgeMarkers(plan, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
    });
    const laidOutRadial = layoutSemanticTopBandRadialLineMarkers(
      buildSemanticTopBandHourMarkers(
        resolveEffectiveTopBandHourMarkers(hourMarkerLayout({ kind: "radialLine", appearance: {} })),
      ),
      {
        viewportWidthPx: w,
        topBandYPx: 0,
        circleBandHeightPx: rows.circleBandH,
        circleStack,
        markers: tapeMarkers,
        diskLabelSizePx: 14,
      },
    );
    expect(laidOutWedge).toHaveLength(24);
    expect(laidOutRadial).toHaveLength(24);
    for (let h = 0; h < 24; h += 1) {
      expect(laidOutWedge[h]!.centerX).toBeCloseTo(laidOutRadial[h]!.centerX, 5);
    }
  });
});
