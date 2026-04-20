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
  effectiveTopBandHourMarkerSelection,
} from "../config/appConfig";
import { defaultFontAssetRegistry } from "../typography/fontAssetRegistry.ts";
import { buildSemanticTopBandHourMarkers } from "../config/topBandHourMarkersSemanticPlan.ts";
import { resolveEffectiveTopBandHourMarkers } from "../config/topBandHourMarkersResolver.ts";
import {
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

function hourMarkerLayout(
  realization: (typeof DEFAULT_HOUR_MARKERS_CONFIG)["realization"],
): typeof DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG {
  return {
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    hourMarkers: {
      ...DEFAULT_HOUR_MARKERS_CONFIG,
      realization,
      layout: { sizeMultiplier: 1 },
    },
  };
}

function resolvedHourMarkerLayoutFrom(
  layout: typeof DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
): ReturnType<typeof resolveEffectiveTopBandHourMarkers>["layout"] {
  return resolveEffectiveTopBandHourMarkers(layout).layout;
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
      hourMarkerLayout: resolvedHourMarkerLayoutFrom(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG),
      fontRegistry: defaultFontAssetRegistry,
      effectiveTopBandHourMarkerSelection: effectiveTopBandHourMarkerSelection(
        DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      ),
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

  it("civil-column-anchored analog layout uses structural segment centerX, not phased tape centerX", () => {
    const w = 960;
    const top = 88;
    const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
    const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
    const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
    const structuralX = scale.segments.map((s) => s.centerX);
    const eff = resolveEffectiveTopBandHourMarkers(
      hourMarkerLayout({ kind: "analogClock", appearance: {} }),
    );
    const plan = buildSemanticTopBandHourMarkers(eff, { anchoredTimezoneSegment: { referenceFractionalHour: 6, presentTimeStructuralHour0To23: 4 } });
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
      hourMarkerLayout: resolvedHourMarkerLayoutFrom(
        hourMarkerLayout({ kind: "analogClock", appearance: {} }),
      ),
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
  it("produces 24 laid-out instances on phased tape centerX (civilPhased), same x as text layout", () => {
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
    const plan = buildSemanticTopBandHourMarkers(eff, { anchoredTimezoneSegment: { referenceFractionalHour: 12.57, presentTimeStructuralHour0To23: 7 } });
    const laidOutRadial = layoutSemanticTopBandRadialLineMarkers(plan, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      hourMarkerLayout: resolvedHourMarkerLayoutFrom(
        hourMarkerLayout({ kind: "radialLine", appearance: {} }),
      ),
    });
    const laidOutText = layoutSemanticTopBandHourMarkers(plan, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      hourMarkerLayout: resolvedHourMarkerLayoutFrom(
        hourMarkerLayout({ kind: "radialLine", appearance: {} }),
      ),
      fontRegistry: defaultFontAssetRegistry,
      effectiveTopBandHourMarkerSelection: effectiveTopBandHourMarkerSelection(
        DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      ),
    });
    expect(laidOutRadial).toHaveLength(24);
    expect(laidOutText).toHaveLength(24);
    for (let h = 0; h < 24; h += 1) {
      expect(laidOutRadial[h]!.centerX).toBeCloseTo(laidOutText[h]!.centerX, 5);
      expect(laidOutRadial[h]!.centerX).toBeCloseTo(scale.circleMarkers[h]!.centerX, 5);
    }
  });

  it("civil-column-anchored radial layout uses structural segment centerX, not phased tape centerX", () => {
    const w = 960;
    const top = 88;
    const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
    const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
    const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
    const structuralX = scale.segments.map((s) => s.centerX);
    const tapeMarkers = scale.circleMarkers.map((m) => ({
      centerX: m.centerX,
      radiusPx: m.radiusPx,
      structuralHour0To23: m.utcHour,
      currentHourLabel: m.currentHourLabel,
    }));
    const eff = resolveEffectiveTopBandHourMarkers({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...DEFAULT_HOUR_MARKERS_CONFIG,
        realization: { kind: "radialLine", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    });
    expect(eff.behavior).toBe("civilColumnAnchored");
    const plan = buildSemanticTopBandHourMarkers(eff, { anchoredTimezoneSegment: { referenceFractionalHour: 6, presentTimeStructuralHour0To23: 4 } });
    const laidOut = layoutSemanticTopBandRadialLineMarkers(plan, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      hourMarkerLayout: resolvedHourMarkerLayoutFrom({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          ...DEFAULT_HOUR_MARKERS_CONFIG,
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
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
    const plan = buildSemanticTopBandHourMarkers(eff, { anchoredTimezoneSegment: { referenceFractionalHour: 12.57, presentTimeStructuralHour0To23: 7 } });
    const laidOutWedge = layoutSemanticTopBandRadialWedgeMarkers(plan, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      hourMarkerLayout: resolvedHourMarkerLayoutFrom(
        hourMarkerLayout({ kind: "radialWedge", appearance: {} }),
      ),
    });
    const laidOutRadial = layoutSemanticTopBandRadialLineMarkers(
      buildSemanticTopBandHourMarkers(
        resolveEffectiveTopBandHourMarkers(hourMarkerLayout({ kind: "radialLine", appearance: {} })),
        { anchoredTimezoneSegment: { referenceFractionalHour: 12.57, presentTimeStructuralHour0To23: 7 } },
      ),
      {
        viewportWidthPx: w,
        topBandYPx: 0,
        circleBandHeightPx: rows.circleBandH,
        circleStack,
        markers: tapeMarkers,
        diskLabelSizePx: 14,
        hourMarkerLayout: resolvedHourMarkerLayoutFrom(
          hourMarkerLayout({ kind: "radialLine", appearance: {} }),
        ),
      },
    );
    expect(laidOutWedge).toHaveLength(24);
    expect(laidOutRadial).toHaveLength(24);
    for (let h = 0; h < 24; h += 1) {
      expect(laidOutWedge[h]!.centerX).toBeCloseTo(laidOutRadial[h]!.centerX, 5);
    }
  });
});
