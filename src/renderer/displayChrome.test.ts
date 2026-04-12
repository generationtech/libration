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
import { createTimeContext } from "../core/time";
import {
  cloneHourMarkersConfig,
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_DISPLAY_TIME_CONFIG,
  DEFAULT_GEOGRAPHY_CONFIG,
  type DisplayTimeConfig,
} from "../config/appConfig";
import { resolveEffectiveTopBandHourMarkers } from "../config/topBandHourMarkersResolver.ts";
import { structuralZoneLetterFromIndex } from "../config/structuralZoneLetters";
import { REFERENCE_CITIES } from "../data/referenceCities";
import {
  computeBottomChromeLayout,
  computeBottomChromeOverlayBottomMarginPx,
  computeBottomHudMapFadeOverlayRect,
} from "./bottomChromeLayout";
import { TOP_CHROME_STYLE, TOP_TAPE_TICK_LINE_WIDTH } from "../config/topChromeStyle.ts";
import {
  buildBottomInformationBarState,
  buildDisplayChromeState,
  buildUtcTopScaleLayout,
  computeUtcCircleMarkerRadius,
  computeUtcTopScaleRowMetrics,
  longitudeDegFromMapX,
  resolveDisplayTimeReferenceZone,
  mapXFromLongitudeDeg,
  resolveTopBandTimeFromConfig,
  referenceFractionalHourOfDay,
  solarLocalHour0To23FromUtcMsOfDay,
  militaryZoneLetterFromStructuralHourIndex,
  CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST,
  MILITARY_ZONE_LETTERS_WEST_TO_EAST,
  STRUCTURAL_ZONE_LETTERS_WEST_TO_EAST,
  militaryTimeZoneLetterFromStructuralColumnIndex,
  militaryTimeZoneLetterFromLongitudeDeg,
  nominalUtcOffsetHoursFromLongitudeDeg,
  topBandCircleLabel,
  topBandHourMarkerCenterX,
  topBandNextHourLabel,
  topBandMarkerAnnotationKind,
  topBandMarkerAnnotationLabel,
  computeTopBandCircleStackMetrics,
  computeUtcSubsolarLongitudeDeg,
  utcDayStartMs,
  utcOffsetHoursForTimeZone,
  wrapFraction01,
  topBandWrapOffsetsForCenteredExtent,
  topBandWrapOffsetsForSpan,
  zonedCalendarDayStartMs,
  presentTimeIndicatorWrapHalfExtentPx,
  presentTimeIndicatorXFromReferenceLongitudeDeg,
  structuralHourIndexFromReferenceLongitudeDeg,
  topBandTimezoneTabPaddedCenterX,
  topBandTickRailMajorTickVerticalSpan,
  computeChromeMapSideBezelVerticalSpan,
  chromeMapSideBezelCrispXs,
  TOP_BAND_DISK_WRAP_HALO_PAD_PX,
  topBandAnnotationWrapHalfExtentPx,
  topBandDiskWrapHalfExtentPx,
  topBandUpperNumeralWrapHalfExtentPx,
  type ResolvedTopBandTime,
} from "./displayChrome";

/** Top tape anchor x: exact reference meridian (continuous longitude), same as map x. */
function expectedTopTapeAnchorX(referenceLongitudeDeg: number, widthPx: number): number {
  return mapXFromLongitudeDeg(referenceLongitudeDeg, widthPx);
}

/** Present-time tick x: center of the structural 15° column containing the resolved anchor longitude. */
function expectedPresentTimeIndicatorX(referenceLongitudeDeg: number, widthPx: number): number {
  return presentTimeIndicatorXFromReferenceLongitudeDeg(referenceLongitudeDeg, widthPx);
}

/** Deterministic chrome time: fixed UTC + UTC-phased top band (legacy test baseline). */
const DISPLAY_TIME_UTC_UTC24: DisplayTimeConfig = {
  ...DEFAULT_DISPLAY_TIME_CONFIG,
  referenceTimeZone: { source: "fixed", timeZone: "UTC" },
  topBandMode: "utc24",
  topBandAnchor: { mode: "auto" },
};

const RESOLVED_UTC_UTC24: ResolvedTopBandTime = resolveTopBandTimeFromConfig(DISPLAY_TIME_UTC_UTC24);

const DISPLAY_TIME_NY_UTC24: DisplayTimeConfig = {
  ...DEFAULT_DISPLAY_TIME_CONFIG,
  referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
  topBandMode: "utc24",
  topBandAnchor: { mode: "auto" },
};

const RESOLVED_NY_UTC24: ResolvedTopBandTime = resolveTopBandTimeFromConfig(DISPLAY_TIME_NY_UTC24);

describe("present-time tick (tick rail, structural column center)", () => {
  it("uses layout.nowX at the center of the structural column for the resolved anchor meridian (not exact meridian x)", () => {
    const w = 1737;
    const t = Date.UTC(2026, 2, 20, 15, 44, 12, 888);
    const layout = buildUtcTopScaleLayout(t, w, 80, RESOLVED_UTC_UTC24);
    const lon = layout.topBandAnchor.referenceLongitudeDeg;
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(lon, w), 7);
    expect(layout.nowX).toBeCloseTo(layout.segments[structuralHourIndexFromReferenceLongitudeDeg(lon)]!.centerX, 7);
    expect(layout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(lon, w), 5);
    expect(layout.nowX).not.toBeCloseTo(layout.topBandAnchor.anchorX, 3);
  });

  it("places the now tick segment on the same vertical span as major hour ticks in the tick rail", () => {
    const rows = computeUtcTopScaleRowMetrics(88);
    const yCircleBottom = 120;
    const { tickBaselineY, majorTickTopY } = topBandTickRailMajorTickVerticalSpan(yCircleBottom, rows.tickBandH);
    expect(majorTickTopY).toBeCloseTo(tickBaselineY - rows.tickBandH * 0.92, 7);
    expect(tickBaselineY - majorTickTopY).toBeCloseTo(rows.tickBandH * 0.92, 7);
  });

  it("uses tick-rail style tokens for present-time line width (tape tick width × multiplier)", () => {
    const { lineWidth, presentTimeTickWidthMulTapeTick } = TOP_CHROME_STYLE.ticks;
    expect(lineWidth).toBe(TOP_TAPE_TICK_LINE_WIDTH);
    expect(lineWidth * presentTimeTickWidthMulTapeTick).toBeCloseTo(TOP_TAPE_TICK_LINE_WIDTH * 2.5, 7);
  });
});

describe("topBandTimezoneTabPaddedCenterX", () => {
  const gap = 0.5;

  it("uses the padded segment geometric midpoint for every column (including active)", () => {
    const seg = { x0: 300, x1: 400 };
    expect(topBandTimezoneTabPaddedCenterX(seg, gap)).toBeCloseTo(350, 5);
  });

  it("matches the horizontal center of the padded tab span", () => {
    const seg = { x0: 700, x1: 800 };
    expect(topBandTimezoneTabPaddedCenterX(seg, gap)).toBeCloseTo(750, 5);
  });

  it("uses midpoint even when x0/x1 are asymmetric padding scenarios", () => {
    const seg = { x0: 200, x1: 300 };
    expect(topBandTimezoneTabPaddedCenterX(seg, gap)).toBeCloseTo(250, 5);
  });
});

/**
 * Phased {@link buildUtcTopScaleLayout} `majorBoundaryXs` follow the moving tape (hour disk positions), not structural
 * 15° column edges. Zone-band verticals at those x values must render under opaque tab fills to avoid interior seams.
 */
describe("phased hour x vs structural timezone columns", () => {
  it("does not place majorBoundaryXs on the structural center of the same hour index (UTC tape at 14:30)", () => {
    const w = 2400;
    const t0 = Date.UTC(2026, 3, 4, 14, 30, 0);
    const layout = buildUtcTopScaleLayout(t0, w, 80, RESOLVED_UTC_UTC24);
    const phasedX = layout.majorBoundaryXs[7]!;
    const structuralCenterX = layout.segments[7]!.centerX;
    expect(Math.abs(phasedX - structuralCenterX)).toBeGreaterThan(50);
  });
});

describe("structuralHourIndexFromReferenceLongitudeDeg", () => {
  it("maps 15° columns with east edge inclusive: −180° → 0, +180° → 23, −165° boundary → 1", () => {
    expect(structuralHourIndexFromReferenceLongitudeDeg(-180)).toBe(0);
    expect(structuralHourIndexFromReferenceLongitudeDeg(-165)).toBe(1);
    expect(structuralHourIndexFromReferenceLongitudeDeg(-165.0001)).toBe(0);
    expect(structuralHourIndexFromReferenceLongitudeDeg(0)).toBe(12);
    expect(structuralHourIndexFromReferenceLongitudeDeg(165)).toBe(23);
    expect(structuralHourIndexFromReferenceLongitudeDeg(180)).toBe(23);
  });

  it("matches the segment column that contains anchorX for UTC / Greenwich anchor", () => {
    const w = 1440;
    const t = Date.UTC(2025, 1, 1, 6, 0, 0);
    const layout = buildUtcTopScaleLayout(t, w, 80, RESOLVED_UTC_UTC24);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    const idx = structuralHourIndexFromReferenceLongitudeDeg(layout.topBandAnchor.referenceLongitudeDeg);
    expect(idx).toBe(12);
    const seg = layout.segments[idx]!;
    expect(layout.nowX).toBeCloseTo(seg.centerX, 7);
    expect(layout.nowX).toBeGreaterThanOrEqual(seg.x0 - 1e-4);
    expect(layout.nowX).toBeLessThanOrEqual(seg.x1 + 1e-4);
  });
});

describe("present-time indicator x (sector center vs anchor meridian)", () => {
  it("gives the same nowX for two longitudes in the same structural sector", () => {
    const w = 1600;
    const t = Date.UTC(2026, 4, 1, 12, 0, 0);
    const insideSector = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "UTC" },
      topBandMode: "utc24",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: 1.2 },
    });
    const sameSectorOther = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "UTC" },
      topBandMode: "utc24",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: 13.9 },
    });
    const a = buildUtcTopScaleLayout(t, w, 80, insideSector);
    const b = buildUtcTopScaleLayout(t, w, 80, sameSectorOther);
    expect(structuralHourIndexFromReferenceLongitudeDeg(1.2)).toBe(structuralHourIndexFromReferenceLongitudeDeg(13.9));
    expect(a.nowX).toBeCloseTo(b.nowX, 7);
    expect(a.topBandAnchor.anchorX).not.toBeCloseTo(b.topBandAnchor.anchorX, 5);
  });

  it("gives different nowX when anchor longitudes fall in adjacent sectors across a 15° boundary", () => {
    const w = 1400;
    const t = Date.UTC(2026, 4, 1, 12, 0, 0);
    const westOfPrimeMeridian = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "UTC" },
      topBandMode: "utc24",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: -0.0001 },
    });
    const eastOfPrimeMeridian = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "UTC" },
      topBandMode: "utc24",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: 0.0001 },
    });
    const layoutW = buildUtcTopScaleLayout(t, w, 80, westOfPrimeMeridian);
    const layoutE = buildUtcTopScaleLayout(t, w, 80, eastOfPrimeMeridian);
    expect(structuralHourIndexFromReferenceLongitudeDeg(-0.0001)).toBe(11);
    expect(structuralHourIndexFromReferenceLongitudeDeg(0.0001)).toBe(12);
    expect(layoutW.nowX).not.toBeCloseTo(layoutE.nowX, 3);
  });
});

describe("buildUtcTopScaleLayout", () => {
  it("places 24 equal-width segments with centers aligned to column midlines", () => {
    const width = 2400;
    const t0 = Date.UTC(2026, 3, 4, 0, 0, 0);
    const layout = buildUtcTopScaleLayout(t0, width);

    expect(layout.widthPx).toBe(2400);
    expect(layout.referenceNowMs).toBe(t0);
    expect(layout.segments).toHaveLength(24);
    expect(layout.segments[0]).toMatchObject({
      hour: 0,
      x0: 0,
      x1: 100,
      centerX: 50,
    });
    expect(layout.segments[23]).toMatchObject({
      hour: 23,
      x0: 2300,
      x1: 2400,
      centerX: 2350,
    });
    const sw = width / 24;
    for (let h = 0; h < 24; h += 1) {
      expect(layout.segments[h].centerX).toBeCloseTo((h + 0.5) * sw, 5);
    }
  });

  it("derives structural segment labels from UTC + longitude offset (solar hour); circle row uses fixed 00–23 UTC", () => {
    const width = 2400;
    const t0 = Date.UTC(2026, 3, 4, 0, 0, 0);
    const layout = buildUtcTopScaleLayout(t0, width, 80, RESOLVED_UTC_UTC24);
    const w = width;
    for (let h = 0; h < 24; h += 1) {
      const seg = layout.segments[h]!;
      const lon = longitudeDegFromMapX(seg.centerX, w);
      const utcMsOfDay = t0 - layout.utcDayStartMs;
      expect(seg.solarHour).toBe(solarLocalHour0To23FromUtcMsOfDay(utcMsOfDay, lon));
      expect(seg.label).toBe(seg.solarHour.toString().padStart(2, "0"));
    }
    // Midnight UTC: left column center ≈ −172.5° → solar hour 12; right column ≈ +172.5° → 11
    expect(layout.segments[0]!.solarHour).toBe(12);
    expect(layout.segments[0]!.label).toBe("12");
    expect(layout.segments[0]!.timezoneLetter).toBe("M");
    expect(layout.segments[0]!.nominalUtcOffsetHours).toBe(-12);
    expect(layout.segments[12]!.timezoneLetter).toBe("Z");
    expect(layout.segments[23]!.solarHour).toBe(11);
    expect(layout.segments[23]!.label).toBe("11");
    expect(layout.segments[23]!.timezoneLetter).toBe("L");
    const tapeAf = layout.phasedTapeAnchorFrac;
    expect(layout.topBandAnchor.referenceOffsetHours).toBe(0);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    expect(layout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(0, w), 5);
    expect(tapeAf).toBeCloseTo(layout.topBandAnchor.anchorFrac, 7);
    for (let h = 0; h < 24; h += 1) {
      expect(layout.circleMarkers[h]!.utcHour).toBe(h);
      expect(layout.circleMarkers[h]!.label).toBe(h.toString().padStart(2, "0"));
      expect(layout.circleMarkers[h]!.centerX).toBeCloseTo(
        topBandHourMarkerCenterX(h, layout.referenceFractionalHour, w, tapeAf),
        5,
      );
    }
  });

  it("wraps solar hours correctly across 0/23 for longitude and time-of-day", () => {
    const width = 480;
    const day = Date.UTC(2025, 6, 1, 0, 0, 0);
    // 23:30 UTC → utcMsOfDay = 23.5 h; at lon 0, local ≈ 23.5 → hour 23
    const t2330 = day + (23 * 3600 + 1800) * 1000;
    expect(solarLocalHour0To23FromUtcMsOfDay(t2330 - day, 0)).toBe(23);
    const layoutEdge = buildUtcTopScaleLayout(t2330, width);
    const mid = layoutEdge.segments[12]!;
    expect(mid.solarHour).toBe(solarLocalHour0To23FromUtcMsOfDay(t2330 - day, longitudeDegFromMapX(mid.centerX, width)));

    // Near day rollover: 23:45 UTC, positive lon pushes into next solar day → hour 0
    const t2345 = day + (23 * 3600 + 2700) * 1000;
    expect(solarLocalHour0To23FromUtcMsOfDay(t2345 - day, 15)).toBe(0);
  });

  it("shifts segment solar labels when UTC advances; circle row keeps 00–23 and phases centerX", () => {
    const width = 1920;
    const day = Date.UTC(2024, 5, 10, 0, 0, 0);
    const t0 = day;
    const t1 = day + 3600 * 1000;
    const a = buildUtcTopScaleLayout(t0, width, 80, RESOLVED_UTC_UTC24);
    const b = buildUtcTopScaleLayout(t1, width, 80, RESOLVED_UTC_UTC24);
    expect(a.segments[0]!.solarHour).toBe(12);
    expect(b.segments[0]!.solarHour).toBe(13);
    expect(a.circleMarkers[0]!.label).toBe("00");
    expect(b.circleMarkers[0]!.label).toBe("00");
    expect(b.circleMarkers[0]!.centerX).toBeCloseTo(
      topBandHourMarkerCenterX(0, b.referenceFractionalHour, width, b.phasedTapeAnchorFrac),
      5,
    );
    expect(b.circleMarkers[0]!.centerX).not.toBeCloseTo(b.segments[0]!.centerX, 5);
  });

  it("emits 25 major boundaries, 72 quarter-major ticks, and 192 quarter-minor ticks; tape x matches circle-row phasing", () => {
    const w = 1920;
    const layout = buildUtcTopScaleLayout(Date.UTC(2024, 0, 1, 12, 0, 0), w, 80, RESOLVED_UTC_UTC24);

    const ref = layout.referenceFractionalHour;
    const af = layout.phasedTapeAnchorFrac;
    expect(layout.majorBoundaryXs).toHaveLength(25);
    for (let i = 0; i <= 24; i += 1) {
      expect(layout.majorBoundaryXs[i]).toBeCloseTo(topBandHourMarkerCenterX(i, ref, w, af), 5);
    }
    expect(layout.majorBoundaryXs[0]).toBeCloseTo(layout.majorBoundaryXs[24]!, 5);

    expect(layout.quarterMajorTickXs).toHaveLength(72);
    expect(layout.quarterMajorTickXs[0]).toBeCloseTo(topBandHourMarkerCenterX(0.25, ref, w, af), 5);
    expect(layout.quarterMajorTickXs[1]).toBeCloseTo(topBandHourMarkerCenterX(0.5, ref, w, af), 5);
    expect(layout.quarterMajorTickXs[2]).toBeCloseTo(topBandHourMarkerCenterX(0.75, ref, w, af), 5);

    expect(layout.quarterMinorTickXs).toHaveLength(192);
    expect(layout.quarterMinorTickXs[0]).toBeCloseTo(topBandHourMarkerCenterX(1 / 12, ref, w, af), 5);
    expect(layout.quarterMinorTickXs[1]).toBeCloseTo(topBandHourMarkerCenterX(2 / 12, ref, w, af), 5);

    expect(layout.majorBoundaryXs[12]).toBeCloseTo(layout.circleMarkers[12]!.centerX, 5);
    expect(layout.majorBoundaryXs[12]).toBeCloseTo(layout.topBandAnchor.anchorX, 5);
  });

  it("exposes TopBandLayout and TopTapeTickHierarchy; segment edges stay longitude-mapped; tick x matches phased band", () => {
    const w = 1600;
    const layout = buildUtcTopScaleLayout(Date.UTC(2026, 2, 10, 9, 0, 0), w, 88, RESOLVED_UTC_UTC24);
    expect(layout.rows).toBeDefined();
    expect(layout.topBandLayout).toEqual({
      widthPx: w,
      totalHeightPx: layout.rows!.topBandHeightPx,
      circleBand: {
        y0: 0,
        y1: layout.rows!.circleBandH,
        height: layout.rows!.circleBandH,
      },
      tickBand: {
        y0: layout.rows!.circleBandH,
        y1: layout.rows!.circleBandH + layout.rows!.tickBandH,
        height: layout.rows!.tickBandH,
      },
      timezoneBand: {
        y0: layout.rows!.circleBandH + layout.rows!.tickBandH,
        y1: layout.rows!.topBandHeightPx,
        height: layout.rows!.timezoneBandH,
      },
    });
    expect(layout.tickHierarchy!.hour).toBe(layout.majorBoundaryXs);
    expect(layout.tickHierarchy!.quarterMajor).toBe(layout.quarterMajorTickXs);
    expect(layout.tickHierarchy!.quarterMinor).toBe(layout.quarterMinorTickXs);
    const ref = layout.referenceFractionalHour;
    const af = layout.phasedTapeAnchorFrac;
    for (let i = 0; i <= 24; i += 1) {
      expect(layout.majorBoundaryXs[i]).toBeCloseTo(topBandHourMarkerCenterX(i, ref, w, af), 7);
    }
    for (let h = 0; h < 24; h += 1) {
      const lon0 = -180 + 15 * h;
      expect(layout.segments[h]!.x0).toBeCloseTo(mapXFromLongitudeDeg(lon0, w), 7);
      expect(layout.segments[h]!.x1).toBeCloseTo(mapXFromLongitudeDeg(lon0 + 15, w), 7);
    }
  });

  it("utc24: UTC + auto anchor uses Greenwich (0°); nowX is sector center for that meridian, not exact anchor x", () => {
    const day = Date.UTC(2024, 5, 15, 0, 0, 0);
    const noon = day + 12 * 3600 * 1000;
    const w = 1000;
    const layout = buildUtcTopScaleLayout(noon, w, undefined, RESOLVED_UTC_UTC24);

    expect(utcDayStartMs(noon)).toBe(day);
    expect(layout.bandPhaseDayStartMs).toBe(day);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(0, w), 5);
    expect(layout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(0, w), 5);
    expect(layout.nowX).not.toBeCloseTo(layout.topBandAnchor.anchorX, 3);
  });

  it("utc24: nowX matches structural column center for the resolved anchor, not necessarily exact meridian x", () => {
    const w = 1333;
    const t = Date.UTC(2024, 5, 15, 12, 34, 56, 789);
    const layout = buildUtcTopScaleLayout(t, w, undefined, RESOLVED_UTC_UTC24);
    const lon = layout.topBandAnchor.referenceLongitudeDeg;
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(lon, w), 7);
  });

  it("utc24: nowX uses Greenwich sector center, not subsolar when they differ", () => {
    const w = 1737;
    const t = Date.UTC(2026, 2, 20, 15, 44, 12, 888);
    const subsolarDeg = computeUtcSubsolarLongitudeDeg(t);
    const layout = buildUtcTopScaleLayout(t, w, 80, RESOLVED_UTC_UTC24);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(0, w), 7);
    expect(mapXFromLongitudeDeg(subsolarDeg, w)).not.toBeCloseTo(layout.nowX, 3);
  });

  it("local12 / local24: same instant yields same nowX (same sector center for Berlin anchor)", () => {
    const w = 1100;
    const t = Date.UTC(2026, 8, 1, 14, 20, 0, 0);
    const local24 = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "Europe/Berlin" },
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
    });
    const local12 = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "Europe/Berlin" },
      topBandMode: "local12",
      topBandAnchor: { mode: "auto" },
    });
    const lon = buildUtcTopScaleLayout(t, w, 80, local24).topBandAnchor.referenceLongitudeDeg;
    const expectedNow = expectedPresentTimeIndicatorX(lon, w);
    for (const resolved of [local24, local12]) {
      const layout = buildUtcTopScaleLayout(t, w, 80, resolved);
      expect(layout.nowX).toBeCloseTo(expectedNow, 7);
    }
  });

  it("local12 / local24: upper phased tape uses structural column center (nowX) as anchor, not raw meridian frac", () => {
    const w = 1100;
    const t = Date.UTC(2026, 8, 1, 14, 20, 0, 0);
    for (const topBandMode of ["local12", "local24"] as const) {
      const resolved = resolveTopBandTimeFromConfig({
        ...DEFAULT_DISPLAY_TIME_CONFIG,
        referenceTimeZone: { source: "fixed", timeZone: "Europe/Berlin" },
        topBandMode,
        topBandAnchor: { mode: "auto" },
      });
      const layout = buildUtcTopScaleLayout(t, w, 80, resolved);
      const fh = layout.referenceFractionalHour;
      expect(layout.phasedTapeAnchorFrac).toBeCloseTo(layout.nowX / w, 7);
      expect(layout.phasedTapeAnchorFrac).not.toBeCloseTo(layout.topBandAnchor.anchorFrac, 3);
      expect(topBandHourMarkerCenterX(fh, fh, w, layout.phasedTapeAnchorFrac)).toBeCloseTo(layout.nowX, 5);
    }
  });

  it("returns empty geometry when width is zero", () => {
    const now = Date.now();
    const layout = buildUtcTopScaleLayout(now, 0);
    expect(layout.segments).toHaveLength(0);
    expect(layout.majorBoundaryXs).toHaveLength(0);
    expect(layout.quarterMajorTickXs).toHaveLength(0);
    expect(layout.quarterMinorTickXs).toHaveLength(0);
    expect(layout.circleMarkers).toHaveLength(0);
    expect(layout.referenceNowMs).toBe(now);
  });

  it("attaches row metrics and 24 circle markers when top band height is provided", () => {
    const t = Date.UTC(2026, 0, 1, 6, 30, 0);
    const layout = buildUtcTopScaleLayout(t, 1200, 104, RESOLVED_UTC_UTC24);
    expect(layout.rows).toEqual(computeUtcTopScaleRowMetrics(104));
    expect(layout.rows!.circleBandH + layout.rows!.tickBandH + layout.rows!.timezoneBandH).toBe(104);
    expect(layout.circleMarkers).toHaveLength(24);
    const sw = 1200 / 24;
    const stack = computeTopBandCircleStackMetrics(layout.rows!.circleBandH);
    const r = computeUtcCircleMarkerRadius(stack.diskBandH, sw);
    const af = layout.phasedTapeAnchorFrac;
    expect(layout.circleStack).toEqual(stack);
    for (let h = 0; h < 24; h += 1) {
      const seg = layout.segments[h]!;
      const cur = h.toString().padStart(2, "0");
      const ak = topBandMarkerAnnotationKind(h, "utc24");
      expect(layout.circleMarkers[h]).toEqual({
        centerX: topBandHourMarkerCenterX(h, layout.referenceFractionalHour, 1200, af),
        radiusPx: r,
        utcHour: h,
        label: cur,
        currentHourLabel: cur,
        nextHourLabel: topBandNextHourLabel(h, "utc24"),
        annotationKind: ak,
        annotationLabel: topBandMarkerAnnotationLabel(ak),
      });
      expect(layout.circleMarkers[h]!.centerX).not.toBeCloseTo(seg.centerX, 5);
    }
  });

  it("omits circle markers when width is set but top band height is not provided", () => {
    const layout = buildUtcTopScaleLayout(Date.UTC(2026, 0, 1, 0, 0, 0), 960);
    expect(layout.rows).toBeUndefined();
    expect(layout.circleMarkers).toHaveLength(0);
  });

  it("offsets every circle center from its same-index segment center when UTC fractional day is non-zero", () => {
    const width = 800;
    const t = Date.UTC(2025, 8, 15, 14, 27, 33, 250);
    const layout = buildUtcTopScaleLayout(t, width, 72, RESOLVED_UTC_UTC24);
    for (let h = 0; h < 24; h += 1) {
      expect(layout.circleMarkers[h]!.centerX).not.toBeCloseTo(layout.segments[h]!.centerX, 4);
    }
  });

  it("keeps layout.referenceFractionalHour in sync with referenceFractionalHourOfDay (utc24)", () => {
    const t = Date.UTC(2026, 4, 1, 7, 41, 22, 407);
    const layout = buildUtcTopScaleLayout(t, 1000, 80, RESOLVED_UTC_UTC24);
    expect(layout.referenceFractionalHour).toBeCloseTo(
      referenceFractionalHourOfDay(t, "utc24", "UTC"),
      7,
    );
    expect(layout.nowX).toBeCloseTo(
      expectedPresentTimeIndicatorX(layout.topBandAnchor.referenceLongitudeDeg, 1000),
      7,
    );
  });

  it("advances marker x smoothly when civil time advances by one second", () => {
    const w = 86400;
    const anchorFrac = 0.4;
    const h = 14;
    const t0 = referenceFractionalHourOfDay(Date.UTC(2026, 2, 3, 14, 30, 0, 0), "utc24", "UTC");
    const t1 = t0 + 1 / 3600;
    const x0 = topBandHourMarkerCenterX(h, t0, w, anchorFrac);
    const x1 = topBandHourMarkerCenterX(h, t1, w, anchorFrac);
    expect(x1 - x0).toBeCloseTo(-w / (24 * 3600), 5);
  });

  it("utc24: at 06:30 UTC, hour-06 and hour-07 markers straddle the anchor; sub-hour UTC uses fractional placement", () => {
    const w = 2400;
    const tHalfHour = Date.UTC(2026, 5, 15, 6, 30, 0, 0);
    const layoutHalf = buildUtcTopScaleLayout(tHalfHour, w, 80, RESOLVED_UTC_UTC24);
    expect(layoutHalf.referenceFractionalHour).toBeCloseTo(6.5, 5);
    const m6h = layoutHalf.circleMarkers[6]!.centerX;
    const m7h = layoutHalf.circleMarkers[7]!.centerX;
    expect((m6h + m7h) / 2).toBeCloseTo(layoutHalf.topBandAnchor.anchorX, 5);

    const tFrac = Date.UTC(2026, 5, 15, 6, 30, 45, 123);
    const layout = buildUtcTopScaleLayout(tFrac, w, 80, RESOLVED_UTC_UTC24);
    const expectedRef = 6 + 30 / 60 + 45 / 3600 + 123 / 3600000;
    expect(layout.referenceFractionalHour).toBeCloseTo(expectedRef, 5);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    const ref = layout.referenceFractionalHour;
    const m6 = layout.circleMarkers[6]!.centerX;
    const m7 = layout.circleMarkers[7]!.centerX;
    expect(m6 + (ref - 6) * (m7 - m6)).toBeCloseTo(layout.topBandAnchor.anchorX, 3);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(0, w), 5);
    for (let h = 0; h < 24; h += 1) {
      expect(layout.circleMarkers[h]!.centerX).toBeCloseTo(
        topBandHourMarkerCenterX(h, layout.referenceFractionalHour, w, layout.phasedTapeAnchorFrac),
        5,
      );
    }
  });

  it("utc24: tape phasing matches UTC when referenceTimeZone is America/New_York (anchor meridian still NYC longitude from auto mapping)", () => {
    const t = Date.UTC(2026, 8, 1, 14, 20, 0, 0);
    const w = 1920;
    const utcLayout = buildUtcTopScaleLayout(t, w, 80, RESOLVED_UTC_UTC24);
    const nyUtcLayout = buildUtcTopScaleLayout(t, w, 80, RESOLVED_NY_UTC24);
    expect(nyUtcLayout.referenceFractionalHour).toBeCloseTo(utcLayout.referenceFractionalHour, 7);
    expect(nyUtcLayout.bandPhaseDayStartMs).toBe(utcLayout.bandPhaseDayStartMs);
    const nycLon = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude;
    expect(nyUtcLayout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(nycLon, 3);
    expect(nyUtcLayout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(nycLon, w), 5);
    expect(nyUtcLayout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(nycLon, w), 5);
    expect(utcLayout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    expect(nyUtcLayout.nowX).not.toBeCloseTo(utcLayout.nowX, 5);
    for (let h = 0; h < 24; h += 1) {
      expect(nyUtcLayout.circleMarkers[h]!.centerX).not.toBeCloseTo(utcLayout.circleMarkers[h]!.centerX, 5);
    }
    const nyLocalFractional = referenceFractionalHourOfDay(t, "local24", "America/New_York");
    expect(Math.abs(nyLocalFractional - utcLayout.referenceFractionalHour)).toBeGreaterThan(0.25);
  });

  it("same reference zone: local12 / local24 / utc24 share anchorX (e.g. New York)", () => {
    const t = Date.UTC(2026, 4, 10, 18, 22, 0, 0);
    const w = 1600;
    const base: Omit<DisplayTimeConfig, "topBandMode"> = {
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
      topBandAnchor: { mode: "auto" },
    };
    const modes = ["local12", "local24", "utc24"] as const;
    const anchorXs = modes.map((topBandMode) =>
      buildUtcTopScaleLayout(t, w, 80, resolveTopBandTimeFromConfig({ ...base, topBandMode })).topBandAnchor.anchorX,
    );
    expect(anchorXs[0]).toBeCloseTo(anchorXs[1]!, 7);
    expect(anchorXs[1]).toBeCloseTo(anchorXs[2]!, 7);
  });
});

describe("utc24 reference meridian anchoring", () => {
  it("hour major ticks align with circle markers at noon and midnight (same phased anchor)", () => {
    const w = 1000;
    const noon = Date.UTC(2026, 3, 10, 12, 0, 0, 0);
    const layoutNoon = buildUtcTopScaleLayout(noon, w, 80, RESOLVED_UTC_UTC24);
    expect(layoutNoon.majorBoundaryXs[12]).toBeCloseTo(layoutNoon.circleMarkers[12]!.centerX, 5);

    const midnight = Date.UTC(2026, 3, 10, 0, 0, 0, 0);
    const layoutMid = buildUtcTopScaleLayout(midnight, w, 80, RESOLVED_UTC_UTC24);
    expect(layoutMid.majorBoundaryXs[0]).toBeCloseTo(layoutMid.circleMarkers[0]!.centerX, 5);
  });

  it("noon UTC: Greenwich anchor (~0°) matches subsolar; anchorX is exact meridian; nowX is sector center", () => {
    const noon = Date.UTC(2026, 3, 10, 12, 0, 0, 0);
    const w = 1000;
    expect(computeUtcSubsolarLongitudeDeg(noon)).toBeCloseTo(0, 5);
    const layout = buildUtcTopScaleLayout(noon, w, 80, RESOLVED_UTC_UTC24);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    expect(layout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(0, w), 5);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(0, w), 5);
  });

  it("midnight UTC: Greenwich anchor stays ~0° resolved lon; anchorX is exact meridian; nowX is sector center", () => {
    const midnight = Date.UTC(2026, 3, 10, 0, 0, 0, 0);
    const w = 1000;
    expect(computeUtcSubsolarLongitudeDeg(midnight)).toBeCloseTo(-180, 5);
    const layout = buildUtcTopScaleLayout(midnight, w, 80, RESOLVED_UTC_UTC24);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    expect(layout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(0, w), 5);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(0, w), 5);
  });

  it("same instant: UTC vs America/New_York yields different anchorX (Greenwich vs NYC meridians)", () => {
    const t = Date.UTC(2026, 8, 1, 14, 20, 0, 0);
    const w = 1920;
    const utcLayout = buildUtcTopScaleLayout(t, w, 80, RESOLVED_UTC_UTC24);
    const nyUtcLayout = buildUtcTopScaleLayout(t, w, 80, RESOLVED_NY_UTC24);
    const nycLon = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude;
    expect(utcLayout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(0, w), 5);
    expect(nyUtcLayout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(nycLon, w), 5);
    expect(nyUtcLayout.topBandAnchor.anchorX).not.toBeCloseTo(utcLayout.topBandAnchor.anchorX, 5);
    expect(nyUtcLayout.nowX).not.toBeCloseTo(utcLayout.nowX, 5);
    for (let h = 0; h < 24; h += 1) {
      expect(nyUtcLayout.circleMarkers[h]!.centerX).not.toBeCloseTo(utcLayout.circleMarkers[h]!.centerX, 5);
    }
  });
});

describe("topBandWrapOffsetsForCenteredExtent (phased top-band tiling)", () => {
  it("adds a +width duplicate when the disk straddles the left edge, and a −width duplicate when it straddles the right edge", () => {
    const w = 1000;
    const margin = 40;
    expect(topBandWrapOffsetsForCenteredExtent(15, margin, w)).toEqual([0, 1]);
    expect(topBandWrapOffsetsForCenteredExtent(985, margin, w)).toEqual([-1, 0]);
  });

  it("uses a single offset in the interior (no duplicate draws)", () => {
    const w = 1000;
    expect(topBandWrapOffsetsForCenteredExtent(500, 30, w)).toEqual([0]);
  });

  it("keeps anchor-phase x unchanged for k=0 (wrap is a pure render translation)", () => {
    const w = 1920;
    const cx = 333.3;
    expect(topBandWrapOffsetsForCenteredExtent(cx, 50, w)).toContain(0);
    expect(cx + 0 * w).toBe(cx);
  });

  it("when center+margin exceeds width, −width duplicate is included (matches render guard for edge disks)", () => {
    const w = 800;
    const cx = 790;
    const halfExt = 35;
    expect(cx + halfExt).toBeGreaterThan(w);
    expect(topBandWrapOffsetsForCenteredExtent(cx, halfExt, w)).toContain(-1);
  });
});

describe("topBandWrapOffsetsForSpan (structural column tiling)", () => {
  it("adds a −width duplicate for the eastmost column so its tab can continue past the left viewport edge", () => {
    const w = 2400;
    const sw = w / 24;
    const right = { x0: 23 * sw, x1: w };
    expect(topBandWrapOffsetsForSpan(right.x0, right.x1, w)).toEqual([-1, 0]);
  });

  it("keeps the interior columns to a single tile (no duplicate draws)", () => {
    const w = 2400;
    const sw = w / 24;
    expect(topBandWrapOffsetsForSpan(10 * sw, 11 * sw, w)).toEqual([0]);
  });

  it("preserves canonical west→east letters; wrap copies repeat the same structural hour index (no relabeling)", () => {
    const letters = CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST.join("");
    expect(letters[0]).toBe("M");
    expect(letters[23]).toBe("L");
    expect(militaryTimeZoneLetterFromStructuralColumnIndex(23)).toBe(letters[23]!);
  });

  it("returns [0] for degenerate spans", () => {
    expect(topBandWrapOffsetsForSpan(100, 100, 500)).toEqual([0]);
  });
});

describe("top band wrap half-extent helpers (Phase 8a seam continuity)", () => {
  it("TOP_BAND_DISK_WRAP_HALO_PAD_PX matches render halo + margin", () => {
    expect(TOP_BAND_DISK_WRAP_HALO_PAD_PX).toBeCloseTo(2.38, 5);
  });

  it("topBandDiskWrapHalfExtentPx is zero for non-positive radius", () => {
    expect(topBandDiskWrapHalfExtentPx(0)).toBe(0);
    expect(topBandDiskWrapHalfExtentPx(-3)).toBe(0);
  });

  it("topBandDiskWrapHalfExtentPx adds the disk halo pad to the radius", () => {
    expect(topBandDiskWrapHalfExtentPx(11.2)).toBeCloseTo(11.2 + TOP_BAND_DISK_WRAP_HALO_PAD_PX, 7);
  });

  it("topBandUpperNumeralWrapHalfExtentPx is at least one em wide for two-digit numerals", () => {
    const r = 14;
    const t = 18;
    expect(topBandUpperNumeralWrapHalfExtentPx(r, t)).toBeGreaterThanOrEqual(t * 0.95);
    expect(topBandUpperNumeralWrapHalfExtentPx(r, t)).toBeGreaterThanOrEqual(topBandDiskWrapHalfExtentPx(r));
  });

  it("topBandAnnotationWrapHalfExtentPx widens for noon/midnight vs disk-only none", () => {
    const r = 16;
    const a = 9;
    const disk = topBandDiskWrapHalfExtentPx(r);
    expect(topBandAnnotationWrapHalfExtentPx(r, a, "none")).toBe(disk);
    expect(topBandAnnotationWrapHalfExtentPx(r, a, "midnight")).toBeGreaterThan(disk);
    expect(topBandAnnotationWrapHalfExtentPx(r, a, "midnight")).toBeCloseTo(a * 4.25, 7);
  });

  it("includes a +width duplicate for midnight annotation near the left seam when text half-extent exceeds disk halo", () => {
    const w = 1000;
    const cx = 22;
    const r = 14;
    const ann = 8;
    const half = topBandAnnotationWrapHalfExtentPx(r, ann, "midnight");
    expect(half).toBeGreaterThan(topBandDiskWrapHalfExtentPx(r));
    expect(topBandWrapOffsetsForCenteredExtent(cx, half, w)).toEqual([0, 1]);
  });

  it("keeps structural column wrap tiling unchanged for the eastmost segment (span duplicate still −1,0)", () => {
    const w = 2400;
    const sw = w / 24;
    expect(topBandWrapOffsetsForSpan(23 * sw, w, w)).toEqual([-1, 0]);
  });
});

describe("Phase 10b — reference meridian indicator wrap helper", () => {
  it("presentTimeIndicatorWrapHalfExtentPx uses the wider of two strokes plus a fixed seam margin", () => {
    expect(presentTimeIndicatorWrapHalfExtentPx(4)).toBeCloseTo(4 * 0.5 + 2.5, 7);
    expect(presentTimeIndicatorWrapHalfExtentPx(4, 12)).toBeCloseTo(12 * 0.5 + 2.5, 7);
  });

  it("tiles a +width duplicate near the left seam when the reference meridian uses thick halo strokes", () => {
    const w = 1000;
    const ticks = TOP_CHROME_STYLE.ticks;
    const coreW = ticks.lineWidth * ticks.presentTimeTickWidthMulTapeTick;
    const haloW = coreW * ticks.presentTimeHaloWidthMul;
    const mapCoreW = ticks.lineWidth * ticks.referenceMeridianMapLineWidthMulTapeTick;
    const mapHaloW = mapCoreW * ticks.referenceMeridianMapHaloWidthMul;
    const half = presentTimeIndicatorWrapHalfExtentPx(Math.max(coreW, mapCoreW), Math.max(haloW, mapHaloW));
    expect(half).toBeGreaterThan(coreW * 0.5);
    expect(topBandWrapOffsetsForCenteredExtent(4, half, w)).toEqual([0, 1]);
  });

  it("tiles a −width duplicate near the right seam for the same wrap half-extent", () => {
    const w = 1000;
    const ticks = TOP_CHROME_STYLE.ticks;
    const coreW = ticks.lineWidth * ticks.presentTimeTickWidthMulTapeTick;
    const haloW = coreW * ticks.presentTimeHaloWidthMul;
    const mapCoreW = ticks.lineWidth * ticks.referenceMeridianMapLineWidthMulTapeTick;
    const mapHaloW = mapCoreW * ticks.referenceMeridianMapHaloWidthMul;
    const half = presentTimeIndicatorWrapHalfExtentPx(Math.max(coreW, mapCoreW), Math.max(haloW, mapHaloW));
    expect(topBandWrapOffsetsForCenteredExtent(996, half, w)).toEqual([-1, 0]);
  });
});

describe("topBandHourMarkerCenterX", () => {
  it("shifts x continuously with fractional civil hour (same hour index)", () => {
    const w = 1000;
    const anchorFrac = 0.5;
    const day = Date.UTC(2024, 1, 1, 0, 0, 0);
    const fracA = (day + 5.25 * 3600 * 1000 - day) / 86_400_000;
    const fracB = fracA + 60_000 / 86_400_000;
    const hourA = fracA * 24;
    const hourB = fracB * 24;
    const xA = topBandHourMarkerCenterX(7, hourA, w, anchorFrac);
    const xB = topBandHourMarkerCenterX(7, hourB, w, anchorFrac);
    expect(xB - xA).toBeCloseTo(-((hourB - hourA) / 24) * w, 5);
  });

  it("wrapFraction01 keeps phased offsets in [0, 1) for negative intermediates", () => {
    expect(wrapFraction01(-0.25)).toBeCloseTo(0.75, 7);
    expect(wrapFraction01(1.75)).toBeCloseTo(0.75, 7);
  });

  it("exposes 24 distinct positions one hour apart at a fixed fractional hour", () => {
    const w = 2400;
    const referenceFractionalHour = 0.37 * 24;
    const anchorFrac = 0.5;
    const xs = Array.from({ length: 24 }, (_, h) =>
      topBandHourMarkerCenterX(h, referenceFractionalHour, w, anchorFrac),
    ).sort((a, b) => a - b);
    const pitch = w / 24;
    for (let i = 1; i < 24; i += 1) {
      expect(xs[i]! - xs[i - 1]!).toBeCloseTo(pitch, 5);
    }
  });
});

describe("computeUtcTopScaleRowMetrics", () => {
  it("uses a three-band circle / tick / timezone split that sums to the top band height", () => {
    const r = computeUtcTopScaleRowMetrics(104);
    expect(r.topBandHeightPx).toBe(104);
    expect(r.circleBandH).toBeGreaterThanOrEqual(36);
    expect(r.tickBandH).toBeGreaterThanOrEqual(13);
    // Reference split at 104px height (circle + tick + NATO); NATO band is intentionally shorter than the prior ~36px slice.
    expect(r.timezoneBandH).toBeGreaterThanOrEqual(15);
    expect(r.circleBandH + r.tickBandH + r.timezoneBandH).toBe(104);
    expect(r).toEqual({ topBandHeightPx: 104, circleBandH: 57, tickBandH: 19, timezoneBandH: 28 });
  });

  it("allocates no height to the timezone row when timezoneLetterRowVisible is false", () => {
    const r = computeUtcTopScaleRowMetrics(104, { timezoneLetterRowVisible: false });
    expect(r.timezoneBandH).toBe(0);
    expect(r.tickBandH).toBeGreaterThanOrEqual(13);
    expect(r.circleBandH + r.tickBandH).toBe(104);
  });
});

describe("computeTopBandCircleStackMetrics", () => {
  it("uses tighter top/bottom padding for textTight than default at the same circle band height", () => {
    const h = 48;
    const def = computeTopBandCircleStackMetrics(h, "default");
    const tight = computeTopBandCircleStackMetrics(h, "textTight");
    expect(tight.padTopPx + tight.padBottomPx).toBeLessThan(def.padTopPx + def.padBottomPx);
    const stackSum = (s: ReturnType<typeof computeTopBandCircleStackMetrics>): number =>
      s.padTopPx +
      s.upperNumeralH +
      s.gapNumeralToDiskPx +
      s.diskBandH +
      s.gapDiskToAnnotationPx +
      s.annotationH +
      s.padBottomPx;
    expect(stackSum(tight)).toBe(h);
    expect(stackSum(def)).toBe(h);
  });
});

describe("militaryTimeZoneLetterFromLongitudeDeg", () => {
  it("maps mean solar offsets to NATO letters (J omitted east of Zulu; Libration −12h uses M not Y)", () => {
    expect(militaryTimeZoneLetterFromLongitudeDeg(0)).toBe("Z");
    expect(militaryTimeZoneLetterFromLongitudeDeg(15)).toBe("A");
    expect(militaryTimeZoneLetterFromLongitudeDeg(150)).toBe("K");
    expect(militaryTimeZoneLetterFromLongitudeDeg(165)).toBe("L");
    expect(militaryTimeZoneLetterFromLongitudeDeg(-15)).toBe("N");
    expect(militaryTimeZoneLetterFromLongitudeDeg(-172.5)).toBe("M");
    expect(militaryTimeZoneLetterFromLongitudeDeg(-180)).toBe("M");
    expect(militaryTimeZoneLetterFromLongitudeDeg(172.5)).toBe("M");
    expect(nominalUtcOffsetHoursFromLongitudeDeg(7.5)).toBe(1);
  });
});

describe("militaryZoneLetterFromStructuralHourIndex", () => {
  it("matches fixed sector mapping (alias retained for call sites)", () => {
    expect(MILITARY_ZONE_LETTERS_WEST_TO_EAST).toBe(STRUCTURAL_ZONE_LETTERS_WEST_TO_EAST);
    expect(CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST).toBe(STRUCTURAL_ZONE_LETTERS_WEST_TO_EAST);
    expect(militaryZoneLetterFromStructuralHourIndex(0)).toBe("M");
    expect(militaryZoneLetterFromStructuralHourIndex(12)).toBe("Z");
    expect(militaryZoneLetterFromStructuralHourIndex(23)).toBe("L");
    expect(militaryZoneLetterFromStructuralHourIndex(6)).toBe(structuralZoneLetterFromIndex(6));
  });
});

describe("top-strip timezone letters (fixed sector mapping)", () => {
  it("does not re-label the strip when the longitude anchor meridian changes", () => {
    const t = Date.UTC(2026, 0, 1, 12, 0, 0);
    const width = 1200;
    const greenwichResolved = resolveTopBandTimeFromConfig(DISPLAY_TIME_UTC_UTC24);
    const anchor75EResolved = resolveTopBandTimeFromConfig({
      ...DISPLAY_TIME_UTC_UTC24,
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: 7.5 },
    });
    const a = buildUtcTopScaleLayout(t, width, 80, greenwichResolved);
    const b = buildUtcTopScaleLayout(t, width, 80, anchor75EResolved);
    expect(a.segments.map((s) => s.timezoneLetter).join("")).toEqual(
      b.segments.map((s) => s.timezoneLetter).join(""),
    );
    expect(a.segments[0]!.timezoneLetter).toBe("M");
    expect(a.segments[12]!.timezoneLetter).toBe("Z");
    expect(b.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(7.5, 5);
  });

  it("keeps the same strip when anchor is fixed to Knoxville as for Greenwich (letters unchanged)", () => {
    const knox = REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!;
    const resolvedKnoxAnchor = resolveTopBandTimeFromConfig({
      ...DISPLAY_TIME_UTC_UTC24,
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: knox.longitude },
    });
    const t = Date.UTC(2026, 0, 1, 12, 0, 0);
    const knoxLayout = buildUtcTopScaleLayout(t, 1200, 80, resolvedKnoxAnchor);
    const greenwichLayout = buildUtcTopScaleLayout(t, 1200, 80, resolveTopBandTimeFromConfig(DISPLAY_TIME_UTC_UTC24));
    expect(knoxLayout.segments.map((s) => s.timezoneLetter)).toEqual(
      greenwichLayout.segments.map((s) => s.timezoneLetter),
    );
    expect(knoxLayout.segments[6]!.timezoneLetter).toBe("S");
  });
});

describe("militaryTimeZoneLetterFromStructuralColumnIndex", () => {
  it("agrees with west-edge longitude and canonical column letters", () => {
    for (let h = 0; h < 24; h += 1) {
      const lon0 = -180 + 15 * h;
      expect(militaryTimeZoneLetterFromStructuralColumnIndex(h)).toBe(militaryTimeZoneLetterFromLongitudeDeg(lon0));
      expect(militaryTimeZoneLetterFromStructuralColumnIndex(h)).toBe(CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST[h]);
    }
  });
});

describe("reference cities vs structural zone letters", () => {
  it("keeps Knoxville and NYC in distinct structural sectors; labels match military letters at city longitude", () => {
    const knox = REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!;
    const nyc = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!;
    const knoxH = structuralHourIndexFromReferenceLongitudeDeg(knox.longitude);
    const nycH = structuralHourIndexFromReferenceLongitudeDeg(nyc.longitude);
    expect(knoxH).toBe(6);
    expect(nycH).toBe(7);
    expect(structuralZoneLetterFromIndex(knoxH)).toBe("S");
    expect(structuralZoneLetterFromIndex(nycH)).toBe("R");
    expect(militaryTimeZoneLetterFromLongitudeDeg(knox.longitude)).toBe("S");
    expect(militaryTimeZoneLetterFromLongitudeDeg(nyc.longitude)).toBe("R");
  });
});

describe("computeUtcCircleMarkerRadius", () => {
  it("keeps marker diameter within the hourly column pitch", () => {
    const sw = 100;
    const r = computeUtcCircleMarkerRadius(40, sw);
    expect(r * 2).toBeLessThanOrEqual(sw * 0.92);
    expect(r).toBeGreaterThanOrEqual(4.2);
  });
});

describe("computeBottomChromeLayout", () => {
  it("records viewport width and clamps horizontal padding from tokens", () => {
    const r = computeBottomChromeLayout(900);
    expect(r.viewportWidthPx).toBe(900);
    expect(r.horizontalPaddingPx).toBeGreaterThanOrEqual(14);
    expect(r.horizontalPaddingPx).toBeLessThanOrEqual(26);
  });

  it("scales padding with viewport width within token bounds", () => {
    for (const w of [400, 1920, 2560]) {
      const r = computeBottomChromeLayout(w);
      expect(r.viewportWidthPx).toBe(w);
      expect(r.horizontalPaddingPx).toBeGreaterThanOrEqual(14);
      expect(r.horizontalPaddingPx).toBeLessThanOrEqual(26);
    }
  });
});

describe("buildBottomInformationBarState", () => {
  it("produces deterministic day and date strings when chromeTimeZone is UTC", () => {
    const t0 = 1_704_067_200_000;
    const ib = buildBottomInformationBarState({
      nowMs: t0,
      bottomBandWidthPx: 1920,
      chromeTimeZone: "UTC",
      topBandMode: "local24",
    });

    expect(ib.localMicroLabel).toBe("LOCAL TIME");
    expect(ib.localDateLine).toBe("Monday, January 1, 2024");
    expect(ib.bottomChromeLayout.viewportWidthPx).toBe(1920);
    expect(ib.rightPanelDateLine).toBe("January 1 2024");
    expect(ib.localTimeLine.length).toBeGreaterThan(4);
  });

  it("uses 24-hour wall clock for local24 and utc24 (no AM/PM)", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    for (const topBandMode of ["local24", "utc24"] as const) {
      const ib = buildBottomInformationBarState({
        nowMs: t,
        bottomBandWidthPx: 800,
        chromeTimeZone: "UTC",
        topBandMode,
      });
      expect(ib.localMicroLabel).toBe(topBandMode === "utc24" ? "UTC TIME" : "LOCAL TIME");
      expect(ib.localTimeLine).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(ib.localTimeLine).not.toMatch(/\b(AM|PM)\b/i);
      expect(ib.localTimeLine.startsWith("14:")).toBe(true);
    }
  });

  it("utc24: bottom label is UTC TIME and clock uses UTC even when reference zone is not UTC", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const ib = buildBottomInformationBarState({
      nowMs: t,
      bottomBandWidthPx: 800,
      chromeTimeZone: "America/New_York",
      topBandMode: "utc24",
    });
    expect(ib.localMicroLabel).toBe("UTC TIME");
    expect(ib.localTimeLine.startsWith("14:")).toBe(true);
  });

  it("uses 12-hour wall clock with AM/PM for local12", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const ib = buildBottomInformationBarState({
      nowMs: t,
      bottomBandWidthPx: 800,
      chromeTimeZone: "UTC",
      topBandMode: "local12",
    });
    expect(ib.localTimeLine).toMatch(/\b(AM|PM)\b/i);
    expect(ib.localTimeLine.startsWith("14:")).toBe(false);
  });
});

describe("buildDisplayChromeState", () => {
  it("exposes top band height as the layout slice to exclude from the scene viewport (full viewport minus top chrome)", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 800, height: 600, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
    const chrome = buildDisplayChromeState({ time, viewport, frame });
    expect(viewport.height - chrome.topBand.height).toBeGreaterThan(0);
    expect(chrome.topBand.height + (viewport.height - chrome.topBand.height)).toBe(viewport.height);
  });

  it("shrinks reserved top layout when the 24-hour indicator band is hidden", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 800, height: 600, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
    const withIndicators = buildDisplayChromeState({ time, viewport, frame });
    const hidden = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayChromeLayout: {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
          visible: false,
        },
      },
    });
    expect(hidden.topBand.height).toBeLessThan(withIndicators.topBand.height);
  });

  it("sizes bands from viewport height and anchors bottom chrome above the viewport bottom margin", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 1920, height: 1080, devicePixelRatio: 1 };
    const frame = { frameNumber: 42, now: time.now, deltaMs: time.deltaMs };

    const chrome = buildDisplayChromeState({ time, viewport, frame });
    const margin = computeBottomChromeOverlayBottomMarginPx(1080);

    expect(chrome.displayChromeLayout).toEqual(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    expect(chrome.effectiveTopBandHourMarkers).toEqual(
      resolveEffectiveTopBandHourMarkers(chrome.displayChromeLayout),
    );
    expect(chrome.topBand).toEqual({ x: 0, y: 0, width: 1920, height: 110 });
    expect(chrome.bottomBand.x).toBe(0);
    expect(chrome.bottomBand.width).toBe(1920);
    expect(chrome.bottomBand.y + chrome.bottomBand.height).toBe(1080 - margin);
    expect(margin).toBeGreaterThanOrEqual(36);
    expect(chrome.bottomBand.height).toBe(78);
  });

  it("embeds a top scale matching the top band width and time context", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 800, height: 600, devicePixelRatio: 2 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };

    const chrome = buildDisplayChromeState({ time, viewport, frame, displayTime: DISPLAY_TIME_UTC_UTC24 });

    expect(chrome.utcTopScale.widthPx).toBe(800);
    expect(chrome.utcTopScale.segments).toHaveLength(24);
    expect(chrome.utcTopScale.circleMarkers).toHaveLength(24);
    expect(
      buildUtcTopScaleLayout(
        time.now,
        800,
        chrome.topBand.height,
        RESOLVED_UTC_UTC24,
        undefined,
        chrome.displayChromeLayout,
        chrome.utcTopScale.rows,
        "textTight",
      ),
    ).toEqual(chrome.utcTopScale);
    expect(chrome.informationBar.localDateLine).toBe("Monday, January 1, 2024");
    expect(chrome.informationBar.bottomChromeLayout.viewportWidthPx).toBe(800);
    expect(chrome.frameNumber).toBe(1);
  });

  it("keeps the bottom information bar wall clock and date on the same resolved reference zone as the top band", () => {
    const dt: DisplayTimeConfig = {
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "UTC" },
      topBandMode: "local24",
    };
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const chrome = buildDisplayChromeState({
      time,
      viewport: { width: 400, height: 300, devicePixelRatio: 1 },
      frame: { frameNumber: 1, now: time.now, deltaMs: 0 },
      displayTime: dt,
    });
    const ib = buildBottomInformationBarState({
      nowMs: time.now,
      bottomBandWidthPx: 400,
      chromeTimeZone: resolveDisplayTimeReferenceZone(dt.referenceTimeZone),
      topBandMode: dt.topBandMode,
    });
    expect(chrome.informationBar.localDateLine).toBe(ib.localDateLine);
    expect(chrome.informationBar.localTimeLine).toBe(ib.localTimeLine);
  });

  it("applies geography fixedCoordinate meridian when top band anchor is auto", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 800, height: 600, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
    const displayTime: DisplayTimeConfig = {
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
    };
    const resolved = resolveTopBandTimeFromConfig(displayTime);
    const geo = {
      ...DEFAULT_GEOGRAPHY_CONFIG,
      referenceMode: "fixedCoordinate" as const,
      fixedCoordinate: { latitude: 0, longitude: 33, label: "x" },
    };
    const chrome = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayTime,
      geography: geo,
    });
    expect(chrome.geography).toBe(geo);
    expect(chrome.utcTopScale.topBandAnchor.anchorSource).toBe("geographyFixedCoordinate");
    expect(chrome.utcTopScale.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(33, 7);
    expect(
      buildUtcTopScaleLayout(
        time.now,
        800,
        chrome.topBand.height,
        resolved,
        geo,
        chrome.displayChromeLayout,
        chrome.utcTopScale.rows,
        "textTight",
      ),
    ).toEqual(chrome.utcTopScale);
  });

  it("keeps explicit Chrome fixedLongitude anchor when geography fixedCoordinate is also set", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 800, height: 600, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
    const displayTime: DisplayTimeConfig = {
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
      topBandMode: "local24",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: -47.5 },
    };
    const resolved = resolveTopBandTimeFromConfig(displayTime);
    const geo = {
      ...DEFAULT_GEOGRAPHY_CONFIG,
      referenceMode: "fixedCoordinate" as const,
      fixedCoordinate: { latitude: 0, longitude: 33, label: "x" },
    };
    const chrome = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayTime,
      geography: geo,
    });
    expect(chrome.utcTopScale.topBandAnchor.anchorSource).toBe("fixedLongitude");
    expect(chrome.utcTopScale.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(-47.5, 7);
    expect(
      buildUtcTopScaleLayout(
        time.now,
        800,
        chrome.topBand.height,
        resolved,
        geo,
        chrome.displayChromeLayout,
        chrome.utcTopScale.rows,
        "textTight",
      ),
    ).toEqual(chrome.utcTopScale);
  });

  it("omits bottom band height when bottomInformationBarVisible is false", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 1920, height: 1080, devicePixelRatio: 1 };
    const frame = { frameNumber: 42, now: time.now, deltaMs: time.deltaMs };
    const chrome = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayChromeLayout: {
        bottomInformationBarVisible: false,
        timezoneLetterRowVisible: true,
      },
    });
    expect(chrome.bottomBand.height).toBe(0);
    expect(chrome.bottomBand.y + chrome.bottomBand.height).toBe(1080);
  });

  it("collapses the top timezone letter row when timezoneLetterRowVisible is false", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 800, height: 600, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
    const chrome = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayChromeLayout: {
        bottomInformationBarVisible: true,
        timezoneLetterRowVisible: false,
      },
    });
    expect(chrome.utcTopScale.rows?.timezoneBandH).toBe(0);
    expect(chrome.utcTopScale.rows?.circleBandH).toBeGreaterThan(0);
    expect(chrome.utcTopScale.rows?.tickBandH).toBeGreaterThan(0);
  });
});

describe("chrome map integration layout (top/bottom seams vs chrome visibility)", () => {
  it("exposes top-strip map-face bezel tokens for the chrome→map transition", () => {
    expect(TOP_CHROME_STYLE.seams.mapFaceBezelDepthPx).toBeGreaterThan(0);
    expect(TOP_CHROME_STYLE.instrument.viewportSideBezelOnMap.length).toBeGreaterThan(10);
  });

  it("extends side bezels through the viewport when the bottom bar is hidden", () => {
    expect(
      computeChromeMapSideBezelVerticalSpan({
        viewportHeightPx: 900,
        topBandHeightPx: 100,
        bottomInformationBarVisible: false,
        bottomHudTopYPx: 999,
      }),
    ).toEqual({ y0: 100, y1: 900 });
  });

  it("stops side bezels at the bottom HUD top when the information bar is visible", () => {
    expect(
      computeChromeMapSideBezelVerticalSpan({
        viewportHeightPx: 1080,
        topBandHeightPx: 110,
        bottomInformationBarVisible: true,
        bottomHudTopYPx: 920,
      }),
    ).toEqual({ y0: 110, y1: 920 });
  });

  it("does not produce a downward span when the HUD top is above the top band (defensive clamp)", () => {
    expect(
      computeChromeMapSideBezelVerticalSpan({
        viewportHeightPx: 600,
        topBandHeightPx: 80,
        bottomInformationBarVisible: true,
        bottomHudTopYPx: 40,
      }),
    ).toEqual({ y0: 80, y1: 80 });
  });

  it("aligns side-bezel termination with buildDisplayChromeState.bottomBand.y when the bar is visible", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 1200, height: 900, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
    const chrome = buildDisplayChromeState({ time, viewport, frame });
    const span = computeChromeMapSideBezelVerticalSpan({
      viewportHeightPx: viewport.height,
      topBandHeightPx: chrome.topBand.height,
      bottomInformationBarVisible: chrome.displayChromeLayout.bottomInformationBarVisible,
      bottomHudTopYPx: chrome.bottomBand.y,
    });
    expect(span.y0).toBe(chrome.topBand.height);
    expect(span.y1).toBe(chrome.bottomBand.y);
  });

  it("computes a bounded map→HUD fade overlay rect from chrome layout when the bottom information bar is visible", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 1200, height: 900, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
    const chrome = buildDisplayChromeState({ time, viewport, frame });
    expect(chrome.displayChromeLayout.bottomInformationBarVisible).toBe(true);
    const seamY = chrome.topBand.y + chrome.topBand.height;
    const hudTop = chrome.bottomBand.y;
    expect(hudTop).toBeGreaterThan(seamY);
    const rect = computeBottomHudMapFadeOverlayRect({
      seamYPx: seamY,
      hudTopYPx: hudTop,
      viewportWidthPx: viewport.width,
      viewportHeightPx: viewport.height,
    });
    expect(rect).not.toBeNull();
    expect(rect!.fadeTopYPx).toBeGreaterThanOrEqual(seamY);
    expect(rect!.fadeTopYPx + rect!.heightPx).toBe(hudTop);
    expect(rect!.widthPx).toBe(viewport.width);
  });

  it("collapses the bottom HUD band to the viewport bottom when the information bar is hidden (no map→HUD fade pass)", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 1200, height: 900, devicePixelRatio: 1 };
    const frame = { frameNumber: 1, now: time.now, deltaMs: time.deltaMs };
    const chrome = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayChromeLayout: {
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        bottomInformationBarVisible: false,
      },
    });
    expect(chrome.displayChromeLayout.bottomInformationBarVisible).toBe(false);
    expect(chrome.bottomBand.height).toBe(0);
    expect(chrome.bottomBand.y).toBe(viewport.height);
  });

  it("keeps side bezels on the full viewport height when the bottom bar is omitted from layout", () => {
    const time = createTimeContext(1_704_067_200_000, 0, false);
    const viewport = { width: 800, height: 720, devicePixelRatio: 1 };
    const frame = { frameNumber: 2, now: time.now, deltaMs: time.deltaMs };
    const chrome = buildDisplayChromeState({
      time,
      viewport,
      frame,
      displayChromeLayout: {
        bottomInformationBarVisible: false,
        timezoneLetterRowVisible: true,
      },
    });
    const span = computeChromeMapSideBezelVerticalSpan({
      viewportHeightPx: viewport.height,
      topBandHeightPx: chrome.topBand.height,
      bottomInformationBarVisible: chrome.displayChromeLayout.bottomInformationBarVisible,
      bottomHudTopYPx: chrome.bottomBand.y,
    });
    expect(span.y1).toBe(viewport.height);
  });

  it("places map side bezel strokes only at viewport left/right crisp lines (not structural column x)", () => {
    expect(chromeMapSideBezelCrispXs(0, 0)).toBeNull();
    expect(chromeMapSideBezelCrispXs(0, 1000)).toEqual([1.5, 1000.5]);
    expect(chromeMapSideBezelCrispXs(12, 800)).toEqual([13.5, 812.5]);
  });
});

describe("resolveDisplayTimeReferenceZone", () => {
  it("uses the runtime default zone for source: system", () => {
    const z = resolveDisplayTimeReferenceZone({ source: "system" });
    expect(z).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });

  it("returns a valid fixed IANA zone unchanged", () => {
    expect(resolveDisplayTimeReferenceZone({ source: "fixed", timeZone: "Europe/Berlin" })).toBe("Europe/Berlin");
  });

  it("falls back to the system zone when the fixed string is invalid or blank", () => {
    const sys = Intl.DateTimeFormat().resolvedOptions().timeZone;
    expect(resolveDisplayTimeReferenceZone({ source: "fixed", timeZone: "Not/A_Valid_Zone" })).toBe(sys);
    expect(resolveDisplayTimeReferenceZone({ source: "fixed", timeZone: "   " })).toBe(sys);
  });
});

describe("topBandCircleLabel", () => {
  it("emits bare 12-hour numerals for local12 (no a/p suffix, two 12–11 cycles per day)", () => {
    expect(Array.from({ length: 24 }, (_, h) => topBandCircleLabel(h, "local12"))).toEqual([
      "12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
      "12", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11",
    ]);
  });

  it("emits padded 24-hour labels for local24 and utc24", () => {
    expect(topBandCircleLabel(7, "local24")).toBe("07");
    expect(topBandCircleLabel(7, "utc24")).toBe("07");
  });
});

describe("band phase (UTC vs reference zone)", () => {
  it("uses UTC midnight for band phase in utc24 and zone midnight for local24", () => {
    const t = Date.UTC(2024, 5, 15, 4, 30, 0);
    const utcLayout = buildUtcTopScaleLayout(t, 100, 80, RESOLVED_UTC_UTC24);
    const tokyoLayout = buildUtcTopScaleLayout(
      t,
      100,
      80,
      resolveTopBandTimeFromConfig({
        ...DEFAULT_DISPLAY_TIME_CONFIG,
        referenceTimeZone: { source: "fixed", timeZone: "Asia/Tokyo" },
        topBandMode: "local24",
        topBandAnchor: { mode: "auto" },
      }),
    );
    expect(utcLayout.bandPhaseDayStartMs).toBe(utcDayStartMs(t));
    expect(tokyoLayout.bandPhaseDayStartMs).toBe(zonedCalendarDayStartMs(t, "Asia/Tokyo"));
    expect(utcLayout.bandPhaseDayStartMs).not.toBe(tokyoLayout.bandPhaseDayStartMs);
  });
});

const DISPLAY_TIME_NY_LOCAL24: DisplayTimeConfig = {
  ...DEFAULT_DISPLAY_TIME_CONFIG,
  referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
  topBandMode: "local24",
  topBandAnchor: { mode: "auto" },
};

const DISPLAY_TIME_LONDON_LOCAL24: DisplayTimeConfig = {
  ...DEFAULT_DISPLAY_TIME_CONFIG,
  referenceTimeZone: { source: "fixed", timeZone: "Europe/London" },
  topBandMode: "local24",
  topBandAnchor: { mode: "auto" },
};

describe("top band longitude anchor (reference zone → meridian; civil IANA time separate)", () => {
  it("utc24: tape anchor follows Greenwich meridian x, not subsolar", () => {
    const w = 2000;
    const t6 = Date.UTC(2026, 0, 10, 6, 0, 0);
    const layout6 = buildUtcTopScaleLayout(t6, w, 80, RESOLVED_UTC_UTC24);
    const subsolar6 = computeUtcSubsolarLongitudeDeg(t6);
    expect(subsolar6).toBeCloseTo(-90, 5);
    expect(layout6.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    expect(layout6.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(0, w), 5);
    expect(layout6.topBandAnchor.anchorX).not.toBeCloseTo(mapXFromLongitudeDeg(subsolar6, w), 3);

    const noonUtc = Date.UTC(2026, 0, 10, 12, 0, 0);
    const noonBand = buildUtcTopScaleLayout(noonUtc, w, 80, RESOLVED_UTC_UTC24);
    expect(noonBand.referenceFractionalHour).toBeCloseTo(12, 5);
    expect(noonBand.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(0, 5);
    expect(noonBand.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(0, w), 5);
    expect(noonBand.circleMarkers[12]!.centerX).toBeCloseTo(noonBand.topBandAnchor.anchorX, 5);
    expect(noonBand.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(0, w), 5);
  });

  it("America/New_York: auto anchor uses New York reference city longitude, not offset×15° (e.g. −60° in EDT)", () => {
    const w = 2400;
    const probe = Date.UTC(2026, 0, 15, 17, 0, 0);
    const dayStartNy = zonedCalendarDayStartMs(probe, "America/New_York");
    const nowMs = dayStartNy + 12.5 * (86_400_000 / 24);
    const resolved = resolveTopBandTimeFromConfig(DISPLAY_TIME_NY_LOCAL24);
    const layout = buildUtcTopScaleLayout(nowMs, w, 80, resolved);
    const offsetH = utcOffsetHoursForTimeZone(nowMs, "America/New_York");
    const nycLon = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude;
    expect(layout.topBandAnchor.referenceOffsetHours).toBeCloseTo(offsetH, 5);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(nycLon, 3);
    expect(layout.topBandAnchor.referenceLongitudeDeg).not.toBeCloseTo(offsetH * 15, 1);
    expect(layout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(nycLon, w), 5);
    expect(layout.referenceFractionalHour).toBeCloseTo(12.5, 5);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(nycLon, w), 5);
    const tapeAf = layout.phasedTapeAnchorFrac;
    expect(tapeAf).toBeCloseTo(layout.nowX / w, 7);
    expect(tapeAf).not.toBeCloseTo(layout.topBandAnchor.anchorFrac, 3);
    const m12 = topBandHourMarkerCenterX(12, layout.referenceFractionalHour, w, tapeAf);
    const m13 = topBandHourMarkerCenterX(13, layout.referenceFractionalHour, w, tapeAf);
    expect((m12 + m13) / 2).toBeCloseTo(layout.nowX, 5);
    expect(layout.circleMarkers[12]!.centerX).toBeCloseTo(m12, 5);
  });

  it("at 12:30 New York local, anchor lies midway between hour-12 and hour-13 markers; nowX is structural sector center", () => {
    const w = 2400;
    const probe = Date.UTC(2026, 6, 10, 10, 0, 0);
    const dayStart = zonedCalendarDayStartMs(probe, "America/New_York");
    const nowMs = dayStart + 12.5 * 3600 * 1000;
    const resolved = resolveTopBandTimeFromConfig(DISPLAY_TIME_NY_LOCAL24);
    const layout = buildUtcTopScaleLayout(nowMs, w, 80, resolved);
    const nycLon = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude;
    expect(layout.referenceFractionalHour).toBeCloseTo(12.5, 5);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(nycLon, w), 5);
    const tapeAf = layout.phasedTapeAnchorFrac;
    const m12 = topBandHourMarkerCenterX(12, layout.referenceFractionalHour, w, tapeAf);
    const m13 = topBandHourMarkerCenterX(13, layout.referenceFractionalHour, w, tapeAf);
    expect((m12 + m13) / 2).toBeCloseTo(layout.nowX, 5);
  });

  it("New York local: at 12:15 / 12:30 / 12:45 anchor sits 25% / 50% / 75% from hour-12 toward hour-13 marker", () => {
    const w = 2400;
    const af = 0.33;
    const anchorX = af * w;
    for (const ref of [12.25, 12.5, 12.75] as const) {
      const m12 = topBandHourMarkerCenterX(12, ref, w, af);
      const m13 = topBandHourMarkerCenterX(13, ref, w, af);
      const t = ref - 12;
      expect(m12 + t * (m13 - m12)).toBeCloseTo(anchorX, 5);
    }
  });

  it("America/New_York at 12:33 AM local: nowX at sector center; anchor interpolates between hour 0 and 1 markers", () => {
    const w = 2400;
    const probe = Date.UTC(2026, 6, 10, 10, 0, 0);
    const dayStart = zonedCalendarDayStartMs(probe, "America/New_York");
    const nowMs = dayStart + 33 * 60 * 1000;
    const resolved = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
      topBandMode: "local12",
      topBandAnchor: { mode: "auto" },
    });
    const layout = buildUtcTopScaleLayout(nowMs, w, 80, resolved);
    const nycLon = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude;
    const fh = layout.referenceFractionalHour;
    expect(fh).toBeCloseTo(33 / 60, 5);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(nycLon, w), 5);
    const tapeAf = layout.phasedTapeAnchorFrac;
    const m0 = topBandHourMarkerCenterX(0, fh, w, tapeAf);
    const m1 = topBandHourMarkerCenterX(1, fh, w, tapeAf);
    expect(m0 + fh * (m1 - m0)).toBeCloseTo(layout.nowX, 3);
  });

  it("America/New_York at 12:19 AM local: first 12-hour label is 12; nowX at sector center", () => {
    const w = 1200;
    const probe = Date.UTC(2026, 6, 10, 10, 0, 0);
    const dayStart = zonedCalendarDayStartMs(probe, "America/New_York");
    const nowMs = dayStart + 19 * 60 * 1000;
    const resolved = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
      topBandMode: "local12",
      topBandAnchor: { mode: "auto" },
    });
    const layout = buildUtcTopScaleLayout(nowMs, w, 80, resolved);
    const nycLon = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude;
    expect(layout.circleMarkers[0]!.label).toBe("12");
    expect(layout.referenceFractionalHour).toBeCloseTo(19 / 60, 7);
    expect(layout.referenceFractionalHour).toBeLessThan(0.5);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(nycLon, w), 5);
  });

  it("America/New_York at 12:39 PM local: anchor 65% from hour-12 toward hour-13; nowX at sector center", () => {
    const w = 2400;
    const probe = Date.UTC(2026, 6, 10, 10, 0, 0);
    const dayStart = zonedCalendarDayStartMs(probe, "America/New_York");
    const nowMs = dayStart + (12 * 3600 + 39 * 60) * 1000;
    const resolved = resolveTopBandTimeFromConfig(DISPLAY_TIME_NY_LOCAL24);
    const layout = buildUtcTopScaleLayout(nowMs, w, 80, resolved);
    const nycLon = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude;
    expect(layout.referenceFractionalHour).toBeCloseTo(12 + 39 / 60, 5);
    expect(layout.nowX).toBeCloseTo(expectedPresentTimeIndicatorX(nycLon, w), 5);
    const fh = layout.referenceFractionalHour;
    const tapeAf = layout.phasedTapeAnchorFrac;
    const m12 = topBandHourMarkerCenterX(12, fh, w, tapeAf);
    const m13 = topBandHourMarkerCenterX(13, fh, w, tapeAf);
    expect(m12 + (39 / 60) * (m13 - m12)).toBeCloseTo(layout.nowX, 3);
  });

  it("Europe/London: auto anchor uses London reference city longitude (stable across DST)", () => {
    const w = 1800;
    const resolved = resolveTopBandTimeFromConfig(DISPLAY_TIME_LONDON_LOCAL24);
    const londonLon = REFERENCE_CITIES.find((c) => c.id === "city.london")!.longitude;
    const winter = Date.UTC(2026, 0, 15, 12, 0, 0);
    const layoutW = buildUtcTopScaleLayout(winter, w, 80, resolved);
    const summer = Date.UTC(2026, 6, 15, 12, 0, 0);
    const layoutS = buildUtcTopScaleLayout(summer, w, 80, resolved);
    expect(layoutW.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(londonLon, 5);
    expect(layoutS.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(londonLon, 5);
    const offW = utcOffsetHoursForTimeZone(winter, "Europe/London");
    const offS = utcOffsetHoursForTimeZone(summer, "Europe/London");
    expect(offS).not.toBe(offW);
    expect(layoutW.topBandAnchor.referenceOffsetHours).toBeCloseTo(offW, 5);
    expect(layoutS.topBandAnchor.referenceOffsetHours).toBeCloseTo(offS, 5);
  });

  it("Africa/Nairobi: unmapped zone falls back to Greenwich (0°)", () => {
    const t = Date.UTC(2026, 3, 10, 12, 0, 0);
    const resolved = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "Africa/Nairobi" },
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
    });
    const layout = buildUtcTopScaleLayout(t, 1000, 80, resolved);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBe(0);
    expect(layout.topBandAnchor.anchorX).toBeCloseTo(expectedTopTapeAnchorX(0, 1000), 5);
  });

  it("fixedLongitude mode pins the tape to the given meridian", () => {
    const t = Date.UTC(2026, 1, 1, 12, 0, 0);
    const resolved = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
      topBandMode: "local24",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: -50 },
    });
    const layout = buildUtcTopScaleLayout(t, 800, 80, resolved);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBe(-50);
  });

  it("fixedCity mode pins the tape to the chosen reference city longitude", () => {
    const t = Date.UTC(2026, 1, 1, 12, 0, 0);
    const tokyoLon = REFERENCE_CITIES.find((c) => c.id === "city.tokyo")!.longitude;
    const resolved = resolveTopBandTimeFromConfig({
      ...DEFAULT_DISPLAY_TIME_CONFIG,
      referenceTimeZone: { source: "fixed", timeZone: "America/New_York" },
      topBandMode: "local24",
      topBandAnchor: { mode: "fixedCity", cityId: "city.tokyo" },
    });
    const layout = buildUtcTopScaleLayout(t, 800, 80, resolved);
    expect(layout.topBandAnchor.referenceLongitudeDeg).toBeCloseTo(tokyoLon, 5);
  });

  it("keeps hour markers stable across the reference day wrap (no NaN, 24 markers)", () => {
    const resolved = resolveTopBandTimeFromConfig(DISPLAY_TIME_NY_LOCAL24);
    const probe = Date.UTC(2026, 2, 10, 10, 0, 0);
    const dayStart = zonedCalendarDayStartMs(probe, "America/New_York");
    const almostEnd = dayStart + 86_400_000 - 500;
    const layout = buildUtcTopScaleLayout(almostEnd, 1200, 80, resolved);
    expect(layout.circleMarkers).toHaveLength(24);
    for (const m of layout.circleMarkers) {
      expect(Number.isFinite(m.centerX)).toBe(true);
    }
    const nextStart = dayStart + 86_400_000;
    const layout2 = buildUtcTopScaleLayout(nextStart, 1200, 80, resolved);
    expect(layout2.circleMarkers[0]!.centerX).toBeCloseTo(
      topBandHourMarkerCenterX(0, 0, 1200, layout2.phasedTapeAnchorFrac),
      5,
    );
  });

  it("local24: nowX stable across reference-zone midnight (same NYC sector center; anchor meridian unchanged)", () => {
    const w = 1200;
    const resolved = resolveTopBandTimeFromConfig(DISPLAY_TIME_NY_LOCAL24);
    const probe = Date.UTC(2026, 6, 10, 10, 0, 0);
    const dayStart = zonedCalendarDayStartMs(probe, "America/New_York");
    const almostMidnight = dayStart + 86_400_000 - 60 * 1000;
    const justAfterMidnight = dayStart + 86_400_000;
    const before = buildUtcTopScaleLayout(almostMidnight, w, 80, resolved);
    const after = buildUtcTopScaleLayout(justAfterMidnight, w, 80, resolved);
    const nycLon = REFERENCE_CITIES.find((c) => c.id === "city.nyc")!.longitude;
    const expectedNow = expectedPresentTimeIndicatorX(nycLon, w);
    expect(before.nowX).toBeCloseTo(expectedNow, 5);
    expect(after.nowX).toBeCloseTo(expectedNow, 5);
    expect(before.topBandAnchor.anchorX).toBeCloseTo(after.topBandAnchor.anchorX, 5);
  });
});
