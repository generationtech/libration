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
import { longitudeDegFromMapX } from "../../core/equirectangularProjection.ts";
import { solarLocalWallClockStateFromUtcMs } from "../../core/solarLocalWallClock.ts";
import { anchoredTimezoneSegmentWallClockState } from "../../config/topBandHourMarkersSemanticTypes.ts";
import {
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_DISPLAY_TIME_CONFIG,
  DEFAULT_HOUR_MARKERS_CONFIG,
  effectiveTopBandHourMarkerSelection,
  type DisplayChromeLayoutConfig,
} from "../../config/appConfig.ts";
import {
  buildSemanticTopBandHourMarkers,
  wallClockLongitudeDegForStructuralHourMarkers,
} from "../../config/topBandHourMarkersSemanticPlan.ts";
import { structuralColumnCenterLongitudeDeg } from "../../config/topBandHourMarkersSemanticTypes.ts";
import {
  layoutSemanticTopBandAnalogClockMarkers,
  layoutSemanticTopBandRadialLineMarkers,
  layoutSemanticTopBandRadialWedgeMarkers,
} from "../../config/topBandHourMarkersLayout.ts";
import { resolveEffectiveTopBandHourMarkers } from "../../config/topBandHourMarkersResolver.ts";
import { hourToTheta } from "../../glyphs/glyphGeometry.ts";
import { reorderLaidOutSemanticMarkersForPresentTickPaintOrder } from "../semanticTopBandHourMarkerEmitOrder.ts";
import { structuralHourIndexFromReferenceLongitudeDeg } from "../structuralLongitudeGrid.ts";
import {
  buildUtcTopScaleLayout,
  computeTopBandCircleStackMetrics,
  computeUtcTopScaleRowMetrics,
  referenceFractionalHourOfDay,
  resolveTopBandTimeFromConfig,
} from "../displayChrome.ts";
import { buildTopBandCircleBandHourStackRenderPlan } from "./topBandCircleBandHourStackPlan.ts";
import { defaultFontAssetRegistry } from "../../typography/fontAssetRegistry.ts";

const GLYPH_CTX = { fontRegistry: defaultFontAssetRegistry };

function hourMarkersLayout(
  hourMarkers: DisplayChromeLayoutConfig["hourMarkers"],
): DisplayChromeLayoutConfig {
  return {
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    hourMarkers,
  };
}

/** ~7:02 local (non-top-of-hour) in America/New_York, April 2026 (EDT = UTC−4). */
const REF_MS_NY_702 = Date.UTC(2026, 3, 18, 11, 2, 47);

const RESOLVED_NY_LOCAL24 = resolveTopBandTimeFromConfig({
  ...DEFAULT_DISPLAY_TIME_CONFIG,
  referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
  topBandMode: "local24",
  topBandAnchor: { mode: "auto" },
});

describe("reorderLaidOutSemanticMarkersForPresentTickPaintOrder", () => {
  it("moves the present structural hour to the end without dropping rows", () => {
    const rows = Array.from({ length: 24 }, (_, structuralHour0To23) => ({
      structuralHour0To23,
      centerX: structuralHour0To23 * 10,
    }));
    const out = reorderLaidOutSemanticMarkersForPresentTickPaintOrder(rows, 7);
    expect(out).toHaveLength(24);
    expect(out[23]!.structuralHour0To23).toBe(7);
    expect(out.slice(0, 23).every((r) => r.structuralHour0To23 !== 7)).toBe(true);
  });

  it("is a no-op when present hour is undefined", () => {
    const rows = [{ structuralHour0To23: 3, centerX: 1 }];
    expect(reorderLaidOutSemanticMarkersForPresentTickPaintOrder(rows, undefined)).toBe(rows);
  });
});

describe("present-time tick vs procedural wall-clock (laid-out instance at nowX)", () => {
  function fixtureScale() {
    const w = 1737;
    const top = 88;
    const scale = buildUtcTopScaleLayout(REF_MS_NY_702, w, top, RESOLVED_NY_LOCAL24);
    const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
    const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
    return { w, top, scale, rows, circleStack };
  }

  it("present-time column uses anchored reference civil wall-clock for analog, radialLine, radialWedge (civilColumnAnchored)", () => {
    const { w, scale, rows, circleStack } = fixtureScale();
    const lon = scale.topBandAnchor.referenceLongitudeDeg;
    const hTick = structuralHourIndexFromReferenceLongitudeDeg(lon);
    expect(scale.nowX).toBeCloseTo(scale.segments[hTick]!.centerX, 5);

    const zoneX = scale.segments.map((s) => s.centerX);
    const wallLon = wallClockLongitudeDegForStructuralHourMarkers(
      "civilColumnAnchored",
      scale.circleMarkers.map((m) => ({ centerX: m.centerX, structuralHour0To23: m.utcHour })),
      w,
      zoneX,
    );
    const lonAtTick = longitudeDegFromMapX(zoneX[hTick]!, w);
    expect(wallLon[hTick]).toBeCloseTo(lonAtTick, 7);

    const refFrac = referenceFractionalHourOfDay(REF_MS_NY_702, RESOLVED_NY_LOCAL24.referenceTimeZone);
    expect(scale.referenceFractionalHour).toBeCloseTo(refFrac, 7);
    const expected = anchoredTimezoneSegmentWallClockState(refFrac, hTick, hTick);
    const meridianOffsetWallClockAtTickLon = solarLocalWallClockStateFromUtcMs(REF_MS_NY_702, lonAtTick);
    expect(expected.continuousHour0To24).not.toBeCloseTo(meridianOffsetWallClockAtTickLon.continuousHour0To24, 1);
    const tapeMarkers = scale.circleMarkers.map((m) => ({
      centerX: m.centerX,
      radiusPx: m.radiusPx,
      structuralHour0To23: m.utcHour,
      currentHourLabel: m.currentHourLabel,
    }));

    const effAnalog = resolveEffectiveTopBandHourMarkers(
      hourMarkersLayout({
        ...DEFAULT_HOUR_MARKERS_CONFIG,
        realization: { kind: "analogClock", appearance: {} },
        layout: { sizeMultiplier: 1 },
      }),
    );
    const planAnalog = buildSemanticTopBandHourMarkers(effAnalog, {
      anchoredTimezoneSegment: {
        referenceFractionalHour: refFrac,
        presentTimeStructuralHour0To23: hTick,
      },
    });
    const laidAnalog = layoutSemanticTopBandAnalogClockMarkers(planAnalog, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      hourMarkerLayout: effAnalog.layout,
      structuralZoneCenterXPx: zoneX,
    });
    const atTickAnalog = laidAnalog.find((r) => r.structuralHour0To23 === hTick)!;
    expect(atTickAnalog.centerX).toBeCloseTo(scale.nowX, 5);
    expect(atTickAnalog.continuousHour0To24).toBeCloseTo(expected.continuousHour0To24, 7);
    expect(atTickAnalog.continuousMinute0To60).toBeCloseTo(expected.continuousMinute0To60, 7);
    expect(hourToTheta(atTickAnalog.continuousHour0To24)).toBeCloseTo(
      hourToTheta(expected.continuousHour0To24),
      7,
    );

    const effRadial = resolveEffectiveTopBandHourMarkers(
      hourMarkersLayout({
        ...DEFAULT_HOUR_MARKERS_CONFIG,
        realization: { kind: "radialLine", appearance: {} },
        layout: { sizeMultiplier: 1 },
      }),
    );
    const planRadial = buildSemanticTopBandHourMarkers(effRadial, {
      anchoredTimezoneSegment: {
        referenceFractionalHour: refFrac,
        presentTimeStructuralHour0To23: hTick,
      },
    });
    const laidRadial = layoutSemanticTopBandRadialLineMarkers(planRadial, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      hourMarkerLayout: effRadial.layout,
      structuralZoneCenterXPx: zoneX,
    });
    const atTickRadial = laidRadial.find((r) => r.structuralHour0To23 === hTick)!;
    expect(atTickRadial.centerX).toBeCloseTo(scale.nowX, 5);
    expect(atTickRadial.continuousHour0To24).toBeCloseTo(expected.continuousHour0To24, 7);
    expect(hourToTheta(atTickRadial.continuousHour0To24)).toBeCloseTo(
      hourToTheta(expected.continuousHour0To24),
      7,
    );

    const effWedge = resolveEffectiveTopBandHourMarkers(
      hourMarkersLayout({
        ...DEFAULT_HOUR_MARKERS_CONFIG,
        realization: { kind: "radialWedge", appearance: {} },
        layout: { sizeMultiplier: 1 },
      }),
    );
    const planWedge = buildSemanticTopBandHourMarkers(effWedge, {
      anchoredTimezoneSegment: {
        referenceFractionalHour: refFrac,
        presentTimeStructuralHour0To23: hTick,
      },
    });
    const laidWedge = layoutSemanticTopBandRadialWedgeMarkers(planWedge, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      hourMarkerLayout: effWedge.layout,
      structuralZoneCenterXPx: zoneX,
    });
    const atTickWedge = laidWedge.find((r) => r.structuralHour0To23 === hTick)!;
    expect(atTickWedge.centerX).toBeCloseTo(scale.nowX, 5);
    expect(atTickWedge.continuousHour0To24).toBeCloseTo(expected.continuousHour0To24, 7);

    const hEast = (hTick + 1) % 24;
    const expectedEast = anchoredTimezoneSegmentWallClockState(refFrac, hEast, hTick);
    const eastAnalog = laidAnalog.find((r) => r.structuralHour0To23 === hEast)!;
    expect(eastAnalog.continuousHour0To24).toBeCloseTo(expectedEast.continuousHour0To24, 7);
  });

  it("procedural glyphs at the present-tick column use civilColumnAnchored layout x + anchored civil wall clock", () => {
    const { w, scale, rows, circleStack } = fixtureScale();
    const lon = scale.topBandAnchor.referenceLongitudeDeg;
    const hTick = structuralHourIndexFromReferenceLongitudeDeg(lon);
    const zoneX = scale.segments.map((s) => s.centerX);
    const tapeMarkers = scale.circleMarkers.map((m) => ({
      centerX: m.centerX,
      radiusPx: m.radiusPx,
      structuralHour0To23: m.utcHour,
      currentHourLabel: m.currentHourLabel,
    }));
    const effAnalog = resolveEffectiveTopBandHourMarkers(
      hourMarkersLayout({
        ...DEFAULT_HOUR_MARKERS_CONFIG,
        realization: { kind: "analogClock", appearance: {} },
        layout: { sizeMultiplier: 1 },
      }),
    );
    expect(effAnalog.behavior).toBe("civilColumnAnchored");
    const wallLon = wallClockLongitudeDegForStructuralHourMarkers(
      effAnalog.behavior,
      tapeMarkers,
      w,
      zoneX,
    );
    const cxTick = tapeMarkers[hTick]!.centerX;
    const lonTape = longitudeDegFromMapX(cxTick, w);
    expect(wallLon[hTick]).not.toBeCloseTo(lonTape, 3);
    const refFrac = scale.referenceFractionalHour;
    const expected = anchoredTimezoneSegmentWallClockState(refFrac, hTick, hTick);

    const planAnalog = buildSemanticTopBandHourMarkers(effAnalog, {
      anchoredTimezoneSegment: {
        referenceFractionalHour: refFrac,
        presentTimeStructuralHour0To23: hTick,
      },
    });
    const laidAnalog = layoutSemanticTopBandAnalogClockMarkers(planAnalog, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      hourMarkerLayout: effAnalog.layout,
      structuralZoneCenterXPx: zoneX,
    });
    const atTickAnalog = laidAnalog.find((r) => r.structuralHour0To23 === hTick)!;
    expect(atTickAnalog.centerX).toBeCloseTo(zoneX[hTick]!, 5);
    expect(atTickAnalog.continuousHour0To24).toBeCloseTo(expected.continuousHour0To24, 7);

    const effRadial = resolveEffectiveTopBandHourMarkers(
      hourMarkersLayout({
        ...DEFAULT_HOUR_MARKERS_CONFIG,
        realization: { kind: "radialLine", appearance: {} },
        layout: { sizeMultiplier: 1 },
      }),
    );
    expect(effRadial.behavior).toBe("civilColumnAnchored");
    const planRadial = buildSemanticTopBandHourMarkers(effRadial, {
      anchoredTimezoneSegment: {
        referenceFractionalHour: refFrac,
        presentTimeStructuralHour0To23: hTick,
      },
    });
    const laidRadial = layoutSemanticTopBandRadialLineMarkers(planRadial, {
      viewportWidthPx: w,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: tapeMarkers,
      diskLabelSizePx: 14,
      hourMarkerLayout: effRadial.layout,
      structuralZoneCenterXPx: zoneX,
    });
    const atTickRadial = laidRadial.find((r) => r.structuralHour0To23 === hTick)!;
    expect(atTickRadial.centerX).toBeCloseTo(zoneX[hTick]!, 5);
    expect(atTickRadial.continuousHour0To24).toBeCloseTo(expected.continuousHour0To24, 7);
  });

  it("full render plan: analog clock stack emits round-cap hand lines for each column (present-tick paint order wired)", () => {
    const { w, scale, rows, circleStack } = fixtureScale();
    const hTick = structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg);
    const zoneX = scale.segments.map((s) => s.centerX);

    const layoutAnalog = hourMarkersLayout({
      ...DEFAULT_HOUR_MARKERS_CONFIG,
      realization: { kind: "analogClock", appearance: {} },
      layout: { sizeMultiplier: 1 },
    });
    const plan = buildTopBandCircleBandHourStackRenderPlan({
      viewportWidthPx: w,
      topBandOriginXPx: 0,
      topBandYPx: 0,
      circleBandHeightPx: rows.circleBandH,
      circleStack,
      markers: scale.circleMarkers.map((m) => ({
        centerX: m.centerX,
        radiusPx: m.radiusPx,
        nextHourLabel: m.nextHourLabel,
        currentHourLabel: m.currentHourLabel,
        annotationKind: m.annotationKind,
        annotationLabel: m.annotationLabel,
        structuralHour0To23: m.utcHour,
      })),
      diskLabelSizePx: 14,
      effectiveTopBandHourMarkerSelection: effectiveTopBandHourMarkerSelection(layoutAnalog),
      effectiveTopBandHourMarkers: resolveEffectiveTopBandHourMarkers(layoutAnalog),
      glyphRenderContext: GLYPH_CTX,
      referenceFractionalHour: scale.referenceFractionalHour,
      structuralZoneCenterXPx: zoneX,
      presentTimeStructuralHour0To23: hTick,
    });

    const handLines = plan.items.filter((i) => i.kind === "line" && i.lineCap === "round");
    expect(handLines.length).toBeGreaterThanOrEqual(24 * 2);
  });
});

describe("wallClockLongitudeDegForStructuralHourMarkers (zone centers)", () => {
  it("matches inverse map of structural zone center x when zone array is provided", () => {
    const w = 960;
    const zoneX = Array.from({ length: 24 }, (_, h) => {
      const lon = structuralColumnCenterLongitudeDeg(h);
      return ((lon + 180) / 360) * w;
    });
    const markers = Array.from({ length: 24 }, (_, h) => ({
      centerX: h * 20,
      structuralHour0To23: h,
    }));
    const out = wallClockLongitudeDegForStructuralHourMarkers("civilColumnAnchored", markers, w, zoneX);
    for (let h = 0; h < 24; h += 1) {
      expect(out[h]).toBeCloseTo(longitudeDegFromMapX(zoneX[h]!, w), 10);
      expect(out[h]).toBeCloseTo(structuralColumnCenterLongitudeDeg(h), 10);
    }
  });
});
