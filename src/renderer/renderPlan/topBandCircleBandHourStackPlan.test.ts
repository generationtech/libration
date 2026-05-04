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
  computeUtcCircleMarkerRadius,
  computeUtcTopScaleRowMetrics,
  resolveTopBandTimeFromConfig,
  topBandWrapOffsetsForCenteredExtent,
} from "../displayChrome";
import { structuralHourIndexFromReferenceLongitudeDeg } from "../structuralLongitudeGrid.ts";
import {
  cloneHourMarkersConfig,
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_DISPLAY_TIME_CONFIG,
  effectiveTopBandHourMarkerSelection,
  type TopBandTimeMode,
  type DisplayChromeLayoutConfig,
} from "../../config/appConfig";
import { resolveEffectiveTopBandHourMarkers } from "../../config/topBandHourMarkersResolver.ts";
import type { EffectiveTopBandHourMarkers } from "../../config/topBandHourMarkersTypes.ts";
import { loadBundledFontAssetRegistry } from "../../config/chromeTypography";
import { computeHourDiskLabelSizePx, TOP_CHROME_STYLE } from "../../config/topChromeStyle.ts";
import { topBandDiskWrapHalfExtentPx } from "../topBandHourDiskWrapExtents";
import {
  buildTopBandCircleBandHourStackRenderPlan,
  resolveTopBandInDiskHourMarkerSemanticPath,
  type TopBandInDiskHourMarkerSemanticRenderPath,
} from "./topBandCircleBandHourStackPlan";
import {
  hour0To23FromPad2TapeLabel,
  utcFocusAnnotationCenterY,
  utcFocusAnnotationMinGapPx,
  utcFocusLabelCenterXFromUtcHourFloat,
  utcFractionalHourOfDayMs,
} from "./utcTopTapeFocusTreatment.ts";
import { buildFullUtcTopBandHourDiskFixture, effectiveTopBandHourMarkersForLayout } from "./topBandInDiskHourMarkers.test-utils.ts";
import { noonHighlighted12SwashGeometryFromMarkerContentBox } from "../noonMidnightIndicatorRenderPlan.ts";

const GLYPH_CTX = { fontRegistry: loadBundledFontAssetRegistry() };

function estimateTextSpan(item: { x: number; text: string; font: { sizePx: number } }) {
  const width = item.text.length * item.font.sizePx * 0.56;
  return { minX: item.x - width * 0.5, maxX: item.x + width * 0.5 };
}

/** Default top-band hour markers: resolved global default font (zeroes-two baseline). */
const SEL_TEXT_DEFAULT = { kind: "text" as const, fontAssetId: "zeroes-two", sizeMultiplier: 1.25 };

const EFF_TEXT_DEFAULT = resolveEffectiveTopBandHourMarkers(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);

/** Structured segment-style text hour markers (dseg7modern-regular). */
const LAYOUT_LEGACY_SEGMENT_TEXT: DisplayChromeLayoutConfig = {
  ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  hourMarkers: {
    realization: { kind: "text", fontAssetId: "dseg7modern-regular", appearance: {} },
    layout: { sizeMultiplier: 1 },
  },
};

/** Structured analogClock glyph hour markers. */
const LAYOUT_LEGACY_ANALOG_GLYPH: DisplayChromeLayoutConfig = {
  ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  hourMarkers: {
    realization: { kind: "analogClock", appearance: {} },
    layout: { sizeMultiplier: 1 },
  },
};

const RESOLVED_UTC = resolveTopBandTimeFromConfig({
  ...DEFAULT_DISPLAY_TIME_CONFIG,
  referenceTimeZone: { source: "fixed", timeZone: "UTC" },
  topBandMode: "utc24",
  topBandAnchor: { mode: "auto" },
});

function buildStackFromFixture(
  f: ReturnType<typeof buildFullUtcTopBandHourDiskFixture>,
  args: {
    sel: ReturnType<typeof effectiveTopBandHourMarkerSelection>;
    eff: EffectiveTopBandHourMarkers;
    topBandYPx?: number;
    structuralZoneCenterXPx?: readonly number[];
    topBandMode?: TopBandTimeMode;
    readPointX?: number;
    /** Defaults to {@link FullUtcTopBandHourDiskFixture.referenceNowMs} so UTC focus matches tape labels. */
    nowMs?: number;
  },
) {
  return buildTopBandCircleBandHourStackRenderPlan({
    viewportWidthPx: f.viewportWidthPx,
    topBandOriginXPx: 0,
    topBandYPx: args.topBandYPx ?? 10,
    circleBandHeightPx: f.circleBandHeightPx,
    circleStack: f.circleStack,
    markers: f.markers,
    diskLabelSizePx: f.diskLabelSizePx,
    tickBandHeightPx: f.tickBandHeightPx,
    effectiveTopBandHourMarkerSelection: args.sel,
    effectiveTopBandHourMarkers: args.eff,
    glyphRenderContext: GLYPH_CTX,
    referenceFractionalHour: f.referenceFractionalHour,
    presentTimeStructuralHour0To23: f.presentTimeStructuralHour0To23,
    structuralZoneCenterXPx: args.structuralZoneCenterXPx ?? f.structuralZoneCenterXPx,
    topBandMode: args.topBandMode,
    readPointX: args.readPointX,
    nowMs: args.nowMs ?? f.referenceNowMs,
  });
}

function pad2HourLabel(h: number): string {
  const n = ((h % 24) + 24) % 24;
  return n < 10 ? `0${n}` : `${n}`;
}

function highlightedUtcHourDiskLabelFromPlan(
  plan: ReturnType<typeof buildTopBandCircleBandHourStackRenderPlan>,
  viewportWidthPx: number,
  diskBandH: number,
): string | undefined {
  const highlightRects = plan.items.filter(
    (i) =>
      i.kind === "rect" &&
      i.width < viewportWidthPx * 0.5 &&
      i.height < diskBandH * 2,
  );
  const highlight = highlightRects[0];
  if (highlight?.kind !== "rect") {
    return undefined;
  }
  const highlightCenterX = highlight.x + highlight.width * 0.5;
  const highlightedText = plan.items.find(
    (i) =>
      i.kind === "text" &&
      i.text !== "UTC Global Time" &&
      Math.abs(i.x - highlightCenterX) < 0.001,
  );
  return highlightedText?.kind === "text" ? highlightedText.text : undefined;
}

describe("resolveTopBandInDiskHourMarkerSemanticPath", () => {
  it("returns hourMarkerEntriesAbsent when indicator entries area is not visible (before tape column checks)", () => {
    const layout: DisplayChromeLayoutConfig = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
        indicatorEntriesAreaVisible: false,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    };
    const eff = resolveEffectiveTopBandHourMarkers(layout);
    expect(eff.areaVisible).toBe(false);
    expect(
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: effectiveTopBandHourMarkerSelection(layout),
        effectiveTopBandHourMarkers: eff,
        markerCount: 0,
        structuralZoneCenterXPx: undefined,
        referenceFractionalHour: undefined, presentTimeStructuralHour0To23: undefined,
      }),
    ).toEqual({ kind: "hourMarkerEntriesAbsent" } satisfies TopBandInDiskHourMarkerSemanticRenderPath);
  });

  const effText = effectiveTopBandHourMarkersForLayout({
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    hourMarkers: {
      realization: { kind: "text", fontAssetId: "computer", appearance: {} },
      layout: { sizeMultiplier: 1 },
    },
  });
  const effAnalog = effectiveTopBandHourMarkersForLayout({
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    hourMarkers: {
      realization: { kind: "analogClock", appearance: {} },
      layout: { sizeMultiplier: 1 },
    },
  });
  const structuralX = Array.from({ length: 24 }, (_, i) => i * 10);
  const effRadialLine = effectiveTopBandHourMarkersForLayout({
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    hourMarkers: {
      realization: { kind: "radialLine", appearance: {} },
      layout: { sizeMultiplier: 1 },
    },
  });
  const effRadialWedge = effectiveTopBandHourMarkersForLayout({
    ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    hourMarkers: {
      realization: { kind: "radialWedge", appearance: {} },
      layout: { sizeMultiplier: 1 },
    },
  });

  it("full-24 text, analog, radialLine, and radialWedge resolve to semantic paths", () => {
    const textPath = resolveTopBandInDiskHourMarkerSemanticPath({
      effectiveTopBandHourMarkerSelection: { kind: "text", fontAssetId: "computer", sizeMultiplier: 1 },
      effectiveTopBandHourMarkers: effText,
      markerCount: 24,
      structuralZoneCenterXPx: undefined,
      referenceFractionalHour: undefined, presentTimeStructuralHour0To23: undefined,
    });
    const analogPath = resolveTopBandInDiskHourMarkerSemanticPath({
      effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "analogClock", sizeMultiplier: 1 },
      effectiveTopBandHourMarkers: effAnalog,
      markerCount: 24,
      structuralZoneCenterXPx: structuralX,
      referenceFractionalHour: 14.25, presentTimeStructuralHour0To23: 11,
    });
    const linePath = resolveTopBandInDiskHourMarkerSemanticPath({
      effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialLine", sizeMultiplier: 1 },
      effectiveTopBandHourMarkers: effRadialLine,
      markerCount: 24,
      structuralZoneCenterXPx: structuralX,
      referenceFractionalHour: 14.25, presentTimeStructuralHour0To23: 11,
    });
    const wedgePath = resolveTopBandInDiskHourMarkerSemanticPath({
      effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialWedge", sizeMultiplier: 1 },
      effectiveTopBandHourMarkers: effRadialWedge,
      markerCount: 24,
      structuralZoneCenterXPx: structuralX,
      referenceFractionalHour: 14.25, presentTimeStructuralHour0To23: 11,
    });
    expect(textPath).toEqual({ kind: "semanticTextHourDisks" });
    expect(analogPath).toEqual({ kind: "semanticAnalogClockHourDisks" });
    expect(linePath).toEqual({ kind: "semanticRadialLineHourDisks" });
    expect(wedgePath).toEqual({ kind: "semanticRadialWedgeHourDisks" });
  });

  it("throws when effectiveTopBandHourMarkers is missing", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "text", fontAssetId: "zeroes-two", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: undefined,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceFractionalHour: undefined, presentTimeStructuralHour0To23: undefined,
      }),
    ).toThrow(/effectiveTopBandHourMarkers is required/);
  });

  it("throws when markerCount is not 24", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "text", fontAssetId: "computer", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effText,
        markerCount: 1,
        structuralZoneCenterXPx: undefined,
        referenceFractionalHour: undefined, presentTimeStructuralHour0To23: undefined,
      }),
    ).toThrow(/expected 24 tape columns/);
  });

  it("throws when text selection does not match text realization", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "text", fontAssetId: "computer", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effAnalog,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceFractionalHour: undefined, presentTimeStructuralHour0To23: undefined,
      }),
    ).toThrow(/text selection requires effective realization kind "text"/);
  });

  it("throws when analogClock is missing civil anchor inputs", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "analogClock", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effAnalog,
        markerCount: 24,
        structuralZoneCenterXPx: structuralX,
        referenceFractionalHour: undefined, presentTimeStructuralHour0To23: undefined,
      }),
    ).toThrow(/analogClock requires referenceFractionalHour and presentTimeStructuralHour0To23/);
  });

  it("throws when analogClock is missing structuralZoneCenterXPx (24)", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "analogClock", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effAnalog,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceFractionalHour: 14.25, presentTimeStructuralHour0To23: 11,
      }),
    ).toThrow(/structuralZoneCenterXPx with 24 entries/);
  });

  it("throws when radialLine is missing civil anchor inputs", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialLine", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effRadialLine,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceFractionalHour: undefined, presentTimeStructuralHour0To23: undefined,
      }),
    ).toThrow(/radialLine requires referenceFractionalHour and presentTimeStructuralHour0To23/);
  });

  it("throws when radialWedge is missing civil anchor inputs", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialWedge", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effRadialWedge,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceFractionalHour: undefined, presentTimeStructuralHour0To23: undefined,
      }),
    ).toThrow(/radialWedge requires referenceFractionalHour and presentTimeStructuralHour0To23/);
  });

  it("throws when radialLine is civilColumnAnchored but structuralZoneCenterXPx is not length 24", () => {
    const eff = effectiveTopBandHourMarkersForLayout({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        realization: { kind: "radialLine", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    });
    expect(eff.behavior).toBe("civilColumnAnchored");
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialLine", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: eff,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceFractionalHour: 14.25, presentTimeStructuralHour0To23: 11,
      }),
    ).toThrow(/radialLine with civilColumnAnchored requires structuralZoneCenterXPx/);
  });

  it("throws when radialLine selection does not match realization", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialLine", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effRadialWedge,
        markerCount: 24,
        structuralZoneCenterXPx: structuralX,
        referenceFractionalHour: 14.25, presentTimeStructuralHour0To23: 11,
      }),
    ).toThrow(/radialLine selection requires effective realization kind "radialLine"/);
  });
});

describe("buildTopBandCircleBandHourStackRenderPlan", () => {
  it("returns no items when viewport width is 0", () => {
    const plan = buildTopBandCircleBandHourStackRenderPlan({
      viewportWidthPx: 0,
      topBandOriginXPx: 0,
      topBandYPx: 0,
      circleBandHeightPx: 80,
      circleStack: computeTopBandCircleStackMetrics(80),
      markers: [],
      diskLabelSizePx: 14,
      effectiveTopBandHourMarkerSelection: SEL_TEXT_DEFAULT,
      effectiveTopBandHourMarkers: EFF_TEXT_DEFAULT,
      glyphRenderContext: GLYPH_CTX,
    });
    expect(plan.items).toHaveLength(0);
  });

  it("returns no render-plan items when indicator entries area is not visible", () => {
    const layoutHidden: DisplayChromeLayoutConfig = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        ...cloneHourMarkersConfig(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers),
        indicatorEntriesAreaVisible: false,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    };
    const effHidden = resolveEffectiveTopBandHourMarkers(layoutHidden);
    expect(effHidden.areaVisible).toBe(false);
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
    const plan = buildStackFromFixture(f, {
      sel: effectiveTopBandHourMarkerSelection(layoutHidden),
      eff: effHidden,
    });
    expect(plan.items).toHaveLength(0);
  });

  it("utc focus near left edge clips without wrap-around to the right", () => {
    const readPointX = 18;
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88 });
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX,
    });
    const utcH = new Date(f.referenceNowMs).getUTCHours();
    const allowed = new Set([pad2HourLabel(utcH - 1), pad2HourLabel(utcH), pad2HourLabel(utcH + 1)]);
    const utcTapeHourLabels = plan.items.filter(
      (i) => i.kind === "text" && /^\d{2}$/.test(i.text),
    );
    expect(utcTapeHourLabels.length).toBeGreaterThan(0);
    expect(readPointX).toBeLessThan(40);
    for (const t of utcTapeHourLabels) {
      expect(t.kind).toBe("text");
      if (t.kind === "text") {
        expect(allowed.has(t.text)).toBe(true);
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.x).toBeLessThanOrEqual(f.viewportWidthPx);
      }
    }
  });

  it("utc focus near right edge clips without wrap-around to the left", () => {
    const readPointX = 942;
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88 });
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX,
    });
    const utcH = new Date(f.referenceNowMs).getUTCHours();
    const allowed = new Set([pad2HourLabel(utcH - 1), pad2HourLabel(utcH), pad2HourLabel(utcH + 1)]);
    const utcTapeHourLabels = plan.items.filter(
      (i) => i.kind === "text" && /^\d{2}$/.test(i.text),
    );
    expect(utcTapeHourLabels.length).toBeGreaterThan(0);
    expect(readPointX).toBeGreaterThan(f.viewportWidthPx - 40);
    for (const t of utcTapeHourLabels) {
      expect(t.kind).toBe("text");
      if (t.kind === "text") {
        expect(allowed.has(t.text)).toBe(true);
        expect(t.x).toBeGreaterThanOrEqual(0);
        expect(t.x).toBeLessThanOrEqual(f.viewportWidthPx);
      }
    }
  });

  it("places UTC Global Time opposite the centerline side of the read point", () => {
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88 });
    const leftPlan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX: 200,
    });
    const rightPlan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX: 760,
    });
    const centerPlan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX: 480,
    });
    const leftAnno = leftPlan.items.find((i) => i.kind === "text" && i.text === "UTC Global Time");
    const rightAnno = rightPlan.items.find((i) => i.kind === "text" && i.text === "UTC Global Time");
    const centerAnno = centerPlan.items.find((i) => i.kind === "text" && i.text === "UTC Global Time");
    expect(leftAnno?.kind).toBe("text");
    expect(rightAnno?.kind).toBe("text");
    expect(centerAnno?.kind).toBe("text");
    if (leftAnno?.kind === "text" && rightAnno?.kind === "text" && centerAnno?.kind === "text") {
      expect(leftAnno.x).toBeGreaterThan(200);
      expect(rightAnno.x).toBeLessThan(760);
      expect(centerAnno.x).toBeGreaterThan(480);
    }
  });

  it("UTC focus centers on actual UTC hour, not nearest geometry", () => {
    const now = Date.UTC(2026, 3, 21, 15, 35, 0);
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88, nowMs: now });
    const centerXForHour16 = f.markers.find((m) => m.currentHourLabel === "16")!.centerX;
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX: centerXForHour16,
    });
    expect(
      highlightedUtcHourDiskLabelFromPlan(plan, f.viewportWidthPx, f.circleStack.diskBandH),
    ).toBe("15");
  });

  it("UTC focus positions the fractional instant at the read point (≈16:59 → hour 17 numerically closest)", () => {
    const refMs = Date.UTC(2026, 3, 21, 16, 59, 30, 250);
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88, nowMs: refMs });
    const readPointX = 333;
    const hourSpacingPx = f.viewportWidthPx / 24;
    const utcHourFloat = utcFractionalHourOfDayMs(refMs);
    const utcH = new Date(refMs).getUTCHours();
    const labels = [utcH - 1, utcH, utcH + 1].map((h) => pad2HourLabel(h));
    const distFromRead = (cx: number) => Math.abs(cx - readPointX);
    let closestLabel = labels[0]!;
    let closestDist = Number.POSITIVE_INFINITY;
    for (const lab of labels) {
      const lh = hour0To23FromPad2TapeLabel(lab);
      const cx = utcFocusLabelCenterXFromUtcHourFloat({
        readPointX,
        labelHour0To23: lh,
        utcHourFloat,
        hourSpacingPx,
      });
      const d = distFromRead(cx);
      if (d < closestDist) {
        closestDist = d;
        closestLabel = lab;
      }
    }
    expect(closestLabel).toBe("17");
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX,
      nowMs: refMs,
    });
    const label17 = plan.items.find((i) => i.kind === "text" && i.text === "17");
    expect(label17?.kind).toBe("text");
    if (label17?.kind === "text") {
      expect(distFromRead(label17.x)).toBe(closestDist);
    }
  });

  it("UTC focus disk label x follows readPoint + Δ×spacing, not civil marker.centerX", () => {
    const refMs = Date.UTC(2024, 5, 10, 16, 20, 0);
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88, nowMs: refMs });
    const readPointX = 123.456;
    const hourSpacingPx = f.viewportWidthPx / 24;
    const utcHourFloat = utcFractionalHourOfDayMs(refMs);
    const utcH = new Date(refMs).getUTCHours();
    const markerForCurrent = f.markers.find((m) => m.currentHourLabel === pad2HourLabel(utcH))!;
    const expectedCx = utcFocusLabelCenterXFromUtcHourFloat({
      readPointX,
      labelHour0To23: utcH,
      utcHourFloat,
      hourSpacingPx,
    });
    expect(Math.abs(expectedCx - markerForCurrent.centerX)).toBeGreaterThan(2);
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX,
      nowMs: refMs,
    });
    const text = plan.items.find((i) => i.kind === "text" && i.text === pad2HourLabel(utcH));
    expect(text?.kind).toBe("text");
    if (text?.kind === "text") {
      expect(text.x).toBeCloseTo(expectedCx, 5);
    }
  });

  it("highlights only the current UTC hour with native 24hr strip-scale anchor geometry (00/12 swash footprint)", () => {
    const refMs = Date.UTC(2024, 0, 15, 14, 12, 0);
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88, nowMs: refMs });
    const utcHour = new Date(refMs).getUTCHours();
    const readPointX = f.markers.find((m) => m.currentHourLabel === pad2HourLabel(utcHour))!.centerX;
    const hourSpacingPx = f.viewportWidthPx / 24;
    const utcHourFloat = utcFractionalHourOfDayMs(refMs);
    const expectedFocusedCx = utcFocusLabelCenterXFromUtcHourFloat({
      readPointX,
      labelHour0To23: utcHour,
      utcHourFloat,
      hourSpacingPx,
    });
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX,
      nowMs: refMs,
    });
    const highlightRects = plan.items.filter(
      (i) =>
        i.kind === "rect" &&
        i.width < f.viewportWidthPx * 0.5 &&
        i.height < f.circleStack.diskBandH * 2,
    );
    expect(highlightRects).toHaveLength(1);
    const highlight = highlightRects[0];
    expect(highlight?.kind).toBe("rect");
    if (highlight?.kind === "rect") {
      const highlightCenterX = highlight.x + highlight.width * 0.5;
      expect(Math.abs(highlightCenterX - expectedFocusedCx)).toBeLessThanOrEqual(0.001);
      const swash = noonHighlighted12SwashGeometryFromMarkerContentBox(f.diskLabelSizePx);
      expect(highlight.width).toBeCloseTo(swash.halfW * 2, 5);
      expect(highlight.height).toBeCloseTo(swash.extentAboveNumeralAnchor + swash.extentBelowNumeralAnchor, 5);
      const focusedMarker = f.markers.find((m) => m.currentHourLabel === pad2HourLabel(utcHour))!;
      const highlightedText = plan.items.find(
        (i) =>
          i.kind === "text" &&
          i.text === focusedMarker.currentHourLabel &&
          Math.abs(i.x - highlightCenterX) < 0.001,
      );
      expect(highlightedText?.kind).toBe("text");
    }
  });

  it("uses hour-marker typography for UTC annotation while preserving side-selection", () => {
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88 });
    const readPointX = 760;
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX,
    });
    const annotation = plan.items.find((i) => i.kind === "text" && i.text === "UTC Global Time");
    const hourDigitTexts = plan.items.filter(
      (i): i is Extract<(typeof plan.items)[number], { kind: "text" }> =>
        i.kind === "text" &&
        /^\d{2}$/.test(i.text) &&
        i.font.assetId === SEL_TEXT_DEFAULT.fontAssetId,
    );
    expect(annotation?.kind).toBe("text");
    expect(hourDigitTexts.length).toBeGreaterThan(0);
    if (annotation?.kind !== "text") {
      return;
    }
    const onAnnotationRow = hourDigitTexts.filter((h) => Math.abs(h.y - annotation.y) < 2);
    const pool = onAnnotationRow.length > 0 ? onAnnotationRow : hourDigitTexts;
    const hourText = pool.reduce((best, h) =>
      Math.abs(h.font.sizePx - annotation.font.sizePx) < Math.abs(best.font.sizePx - annotation.font.sizePx)
        ? h
        : best,
    );
    expect(annotation.font.assetId).toBe(hourText.font.assetId);
    expect(annotation.font.sizePx).toBeCloseTo(hourText.font.sizePx, 5);
    expect(annotation.y).toBeCloseTo(utcFocusAnnotationCenterY(10 + f.circleStack.padTopPx + f.circleStack.upperNumeralH + f.circleStack.gapNumeralToDiskPx, f.circleStack.diskBandH), 5);
    expect(annotation.x).toBeLessThan(readPointX);
    expect(annotation.x).toBeGreaterThan(0);
  });

  it("enforces visible horizontal separation between UTC annotation and focused-hour cluster", () => {
    const refMs = Date.UTC(2024, 5, 10, 16, 20, 0);
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88, nowMs: refMs });
    const readPointX = 760;
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX,
    });
    const annotation = plan.items.find((i) => i.kind === "text" && i.text === "UTC Global Time");
    expect(annotation?.kind).toBe("text");
    if (annotation?.kind !== "text") {
      return;
    }
    const utcH = new Date(refMs).getUTCHours();
    const hourSpacingPx = f.viewportWidthPx / 24;
    const utcHourFloat = utcFractionalHourOfDayMs(refMs);
    const coreMarkers = [utcH - 1, utcH, utcH + 1]
      .map((h) => f.markers.find((m) => m.currentHourLabel === pad2HourLabel(h)))
      .filter((m): m is (typeof f.markers)[number] => m !== undefined);
    const coreSpans = coreMarkers
      .map((marker) => {
        const lh = hour0To23FromPad2TapeLabel(marker.currentHourLabel);
        if (Number.isNaN(lh)) {
          return undefined;
        }
        const expectedCx = utcFocusLabelCenterXFromUtcHourFloat({
          readPointX,
          labelHour0To23: lh,
          utcHourFloat,
          hourSpacingPx,
        });
        if (expectedCx < 0 || expectedCx > f.viewportWidthPx) {
          return undefined;
        }
        return plan.items.find(
          (i) => i.kind === "text" && i.text === marker.currentHourLabel && Math.abs(i.x - expectedCx) < 0.001,
        );
      })
      .filter((item): item is Extract<(typeof plan.items)[number], { kind: "text" }> => item?.kind === "text")
      .map((item) => estimateTextSpan(item));
    expect(coreSpans.length).toBeGreaterThan(0);
    const clusterMinX = Math.min(...coreSpans.map((span) => span.minX));
    const clusterMaxX = Math.max(...coreSpans.map((span) => span.maxX));
    const annotationSpan = estimateTextSpan(annotation);
    const gap = annotation.x < readPointX
      ? clusterMinX - annotationSpan.maxX
      : annotationSpan.minX - clusterMaxX;
    const minGap = utcFocusAnnotationMinGapPx({
      hourSpacingPx: f.viewportWidthPx / 24,
      labelSizePx: f.diskLabelSizePx,
    });
    expect(gap).toBeGreaterThanOrEqual(minGap - 1);
    expect(annotationSpan.minX).toBeGreaterThanOrEqual(0);
    expect(annotationSpan.maxX).toBeLessThanOrEqual(f.viewportWidthPx);
  });

  it("UTC focus emits at most three distinct two-digit hour labels on the tape (prev / current / next only)", () => {
    const refMs = Date.UTC(2024, 5, 10, 16, 20, 0);
    const utcH = new Date(refMs).getUTCHours();
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88, nowMs: refMs });
    const readPointX = f.markers.find((m) => m.currentHourLabel === pad2HourLabel(utcH))!.centerX;
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX,
    });
    const allowed = new Set([pad2HourLabel(utcH - 1), pad2HourLabel(utcH), pad2HourLabel(utcH + 1)]);
    const tapeHourTexts = plan.items.filter((i) => i.kind === "text" && /^\d{2}$/.test(i.text));
    const distinct = new Set(tapeHourTexts.map((i) => (i.kind === "text" ? i.text : "")));
    expect(distinct.size).toBeLessThanOrEqual(3);
    for (const label of distinct) {
      expect(allowed.has(label)).toBe(true);
    }
  });

  it("keeps prev/current/next UTC hour markers fully visible when on-screen", () => {
    const refMs = Date.UTC(2024, 2, 5, 11, 0, 0);
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88, nowMs: refMs });
    const utcH = new Date(refMs).getUTCHours();
    const readPointX = f.markers.find((m) => m.currentHourLabel === pad2HourLabel(utcH))!.centerX;
    const hourSpacingPx = f.viewportWidthPx / 24;
    const utcHourFloat = utcFractionalHourOfDayMs(refMs);
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "utc24",
      readPointX,
      nowMs: refMs,
    });
    const coreIndices = [utcH - 1, utcH, utcH + 1]
      .map((h) => f.markers.findIndex((m) => m.currentHourLabel === pad2HourLabel(h)))
      .filter((idx) => idx >= 0);
    for (const idx of coreIndices) {
      const marker = f.markers[idx]!;
      const lh = hour0To23FromPad2TapeLabel(marker.currentHourLabel);
      if (Number.isNaN(lh)) {
        continue;
      }
      const expectedCx = utcFocusLabelCenterXFromUtcHourFloat({
        readPointX,
        labelHour0To23: lh,
        utcHourFloat,
        hourSpacingPx,
      });
      if (expectedCx < 0 || expectedCx > f.viewportWidthPx) {
        continue;
      }
      const textItem = plan.items.find(
        (i) => i.kind === "text" && i.text === marker.currentHourLabel && Math.abs(i.x - expectedCx) < 0.001,
      );
      expect(textItem?.kind).toBe("text");
      if (textItem?.kind === "text") {
        expect(textItem.opacity ?? 1).toBeCloseTo(1, 5);
      }
    }
  });

  it("keeps civil-mode rendering path unchanged", () => {
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 960, topBandHeightPx: 88 });
    const control = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: undefined,
      readPointX: undefined,
    });
    const local24 = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandMode: "local24",
      readPointX: 480,
    });
    expect(local24.items.length).toBe(control.items.length);
    expect(local24.items.some((i) => i.kind === "text" && i.text === "UTC Global Time")).toBe(false);
  });

  it("emits bed then lines then hour-disk text in order (full semantic tape; no disk circles or crown annotations)", () => {
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
    const m0 = f.markers[0]!;
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandYPx: 10,
    });
    expect(plan.items[0]?.kind).toBe("rect");
    expect(plan.items[1]?.kind).toBe("rect");
    expect(plan.items[2]?.kind).toBe("rect");
    expect(plan.items[3]?.kind).toBe("line");
    expect(plan.items[4]?.kind).toBe("line");
    expect(plan.items.some((i) => i.kind === "path2d")).toBe(false);
    expect(plan.items.some((i) => i.kind === "text" && i.text === m0.currentHourLabel)).toBe(true);
    expect(plan.items.some((i) => i.kind === "text" && (i.text === "NOON" || i.text === "MIDNIGHT"))).toBe(
      false,
    );
    expect(plan.items.some((i) => i.kind === "curvedText")).toBe(false);
  });

  it("applies effective text selection (font + size multiplier) to hour disk text", () => {
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
    const base = buildStackFromFixture(f, {
      sel: {
        kind: "text",
        fontAssetId: "dseg7modern-regular",
        sizeMultiplier: 1,
      },
      eff: effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "dseg7modern-regular", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    });
    const scaled = buildStackFromFixture(f, {
      sel: {
        kind: "text",
        fontAssetId: "computer",
        sizeMultiplier: 2,
      },
      eff: effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 2 },
        },
      }),
    });
    const label0 = f.markers[0]!.currentHourLabel;
    const baseText = base.items.find((i) => i.kind === "text" && i.text === label0);
    const scaledText = scaled.items.find((i) => i.kind === "text" && i.text === label0);
    expect(baseText?.kind).toBe("text");
    expect(scaledText?.kind).toBe("text");
    if (baseText?.kind === "text" && scaledText?.kind === "text") {
      expect(scaledText.font.assetId).toBe("computer");
      expect(scaledText.font.sizePx).toBeCloseTo(baseText.font.sizePx * 2, 5);
    }
  });

  it("text path uses fontAssetId from effective selection (canonical role + bundled font)", () => {
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
    const label0 = f.markers[0]!.currentHourLabel;
    const plan = buildStackFromFixture(f, {
      sel: {
        kind: "text",
        fontAssetId: "dseg7modern-regular",
        sizeMultiplier: 1,
      },
      eff: effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "dseg7modern-regular", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    });
    const textItem = plan.items.find((i) => i.kind === "text" && i.text === label0);
    expect(textItem?.kind).toBe("text");
    if (textItem?.kind === "text") {
      expect(textItem.font.assetId).toBe("dseg7modern-regular");
      expect(textItem.font.displayName.toLowerCase()).toContain("dseg");
    }
  });

  it("glyph analogClock ignores text font/size on selection (procedural disk content)", () => {
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
    const eff = effectiveTopBandHourMarkersForLayout({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        realization: { kind: "analogClock", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    });
    const label0 = f.markers[0]!.currentHourLabel;
    const plan = buildStackFromFixture(f, {
      sel: {
        kind: "glyph",
        glyphMode: "analogClock",
        sizeMultiplier: 2,
      },
      eff,
    });
    expect(plan.items.some((i) => i.kind === "text" && i.text === label0)).toBe(false);
    expect(plan.items.some((i) => i.kind === "path2d")).toBe(true);
    expect(plan.items.some((i) => i.kind === "line")).toBe(true);
  });

  it("glyph analogClock emits face path2d and hour hand line after disk layers", () => {
    const refMs = Date.UTC(2024, 0, 15, 12, 0, 0);
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80, nowMs: refMs });
    const eff = effectiveTopBandHourMarkersForLayout({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        realization: { kind: "analogClock", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    });
    const cx = f.structuralZoneCenterXPx[3]!;
    const plan = buildStackFromFixture(f, {
      sel: {
        kind: "glyph",
        glyphMode: "analogClock",
        sizeMultiplier: 1,
      },
      eff,
    });
    expect(plan.items.some((i) => i.kind === "path2d")).toBe(true);
    const hand = plan.items.find(
      (i) => i.kind === "line" && i.lineCap === "round" && i.x1 === cx,
    );
    expect(hand?.kind).toBe("line");
    if (hand?.kind === "line") {
      expect(hand.x2).toBeGreaterThan(hand.x1!);
    }
  });

  it("emits upper next-hour TextGlyph when the circle stack allocates an upper row", () => {
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 71 });
    const fCustomStack = {
      ...f,
      circleStack: {
        padTopPx: 4,
        upperNumeralH: 14,
        gapNumeralToDiskPx: 4,
        diskBandH: 30,
        gapDiskToAnnotationPx: 5,
        annotationH: 10,
        padBottomPx: 4,
      },
    };
    const m6 = fCustomStack.markers.find((m) => m.structuralHour0To23 === 6)!;
    const plan = buildTopBandCircleBandHourStackRenderPlan({
      viewportWidthPx: fCustomStack.viewportWidthPx,
      topBandOriginXPx: 0,
      topBandYPx: 10,
      circleBandHeightPx: fCustomStack.circleBandHeightPx,
      circleStack: fCustomStack.circleStack,
      markers: fCustomStack.markers,
      diskLabelSizePx: fCustomStack.diskLabelSizePx,
      tickBandHeightPx: fCustomStack.tickBandHeightPx,
      effectiveTopBandHourMarkerSelection: SEL_TEXT_DEFAULT,
      effectiveTopBandHourMarkers: EFF_TEXT_DEFAULT,
      glyphRenderContext: GLYPH_CTX,
      referenceFractionalHour: fCustomStack.referenceFractionalHour, presentTimeStructuralHour0To23: fCustomStack.presentTimeStructuralHour0To23,
      structuralZoneCenterXPx: fCustomStack.structuralZoneCenterXPx,
    });
    const upper = plan.items.filter((i) => i.kind === "text" && i.text === m6.nextHourLabel);
    expect(upper.length).toBeGreaterThanOrEqual(1);
    if (upper[0]?.kind === "text") {
      expect(upper[0].font.assetId).toBe("zeroes-two");
      expect(upper[0].font.displayName.toLowerCase()).toContain("zeroes");
      expect(upper[0].fill).toBe(TOP_CHROME_STYLE.topHourNumeral.color);
    }
  });

  it("hour column with annotationKind none still renders hour label; plan has no NOON/MIDNIGHT crown text", () => {
    const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400 });
    const m = f.markers.find((x) => x.annotationKind === "none");
    if (!m) {
      throw new Error("fixture: expected a marker with no annotation");
    }
    const plan = buildStackFromFixture(f, {
      sel: SEL_TEXT_DEFAULT,
      eff: EFF_TEXT_DEFAULT,
      topBandYPx: 0,
    });
    expect(m.annotationLabel).toBeUndefined();
    const texts = plan.items.filter((i) => i.kind === "text");
    const hourDiskTexts = texts.filter((t) => t.kind === "text" && t.text === m.currentHourLabel);
    expect(hourDiskTexts.length).toBeGreaterThanOrEqual(1);
    expect(texts.some((t) => t.kind === "text" && (t.text === "NOON" || t.text === "MIDNIGHT"))).toBe(false);
  });

  it("full layout: 24 markers yields 4 bed items + text rows (no standalone hour-disk path2d circles)", () => {
    const w = 960;
    const top = 88;
    const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
    const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
    const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
    const sw = w / 24;
    const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
    const diskLabelSizePx = computeHourDiskLabelSizePx(r, w);

    let expectedTextCount = 0;
    for (const m of scale.circleMarkers) {
      if (m.radiusPx <= 0) {
        const wdLabel = topBandWrapOffsetsForCenteredExtent(
          m.centerX,
          m.radiusPx > 0 ? topBandDiskWrapHalfExtentPx(m.radiusPx) : diskLabelSizePx,
          w,
        ).length;
        expectedTextCount += wdLabel;
        continue;
      }
      const wdLabel = topBandWrapOffsetsForCenteredExtent(
        m.centerX,
        m.radiusPx > 0 ? topBandDiskWrapHalfExtentPx(m.radiusPx) : diskLabelSizePx,
        w,
      ).length;
      expectedTextCount += wdLabel;
    }

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
      diskLabelSizePx,
      tickBandHeightPx: rows.tickBandH,
      effectiveTopBandHourMarkerSelection: SEL_TEXT_DEFAULT,
      effectiveTopBandHourMarkers: resolveEffectiveTopBandHourMarkers(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG),
      glyphRenderContext: GLYPH_CTX,
      referenceFractionalHour: scale.referenceFractionalHour, presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg),
      structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
    });

    expect(plan.items[0]?.kind).toBe("rect");
    const path2dItems = plan.items.filter((i) => i.kind === "path2d");
    expect(path2dItems.length).toBe(0);

    const textItems = plan.items.filter((i) => i.kind === "text");
    expect(plan.items.some((i) => i.kind === "curvedText")).toBe(false);
    expect(textItems.length).toBe(expectedTextCount);
    expect(textItems.some((t) => t.kind === "text" && (t.text === "NOON" || t.text === "MIDNIGHT"))).toBe(
      false,
    );
  });

  describe("Semantic text hour-disk pipeline (full 24)", () => {
    const LAYOUT_TEXT_COMPUTER: DisplayChromeLayoutConfig = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    };

    const LAYOUT_TEXT_COLORED: DisplayChromeLayoutConfig = {
      ...LAYOUT_TEXT_COMPUTER,
      hourMarkers: {
        realization: { kind: "text", fontAssetId: "computer", appearance: { color: "#c0ffee" } },
        layout: { sizeMultiplier: 1 },
      },
    };

    function buildFullUtcStackPlan(
      layout: DisplayChromeLayoutConfig,
      sel: ReturnType<typeof effectiveTopBandHourMarkerSelection>,
    ) {
      const w = 960;
      const top = 88;
      const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
      const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
      const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
      const sw = w / 24;
      const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
      const diskLabelSizePx = computeHourDiskLabelSizePx(r, w);
      return buildTopBandCircleBandHourStackRenderPlan({
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
        diskLabelSizePx,
        tickBandHeightPx: rows.tickBandH,
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: resolveEffectiveTopBandHourMarkers(layout),
        glyphRenderContext: GLYPH_CTX,
        referenceFractionalHour: scale.referenceFractionalHour, presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg),
        structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
      });
    }

    it("explicit-font hour disks use the selected bundled font (semantic path)", () => {
      const sel = effectiveTopBandHourMarkerSelection(LAYOUT_TEXT_COMPUTER);
      const plan = buildFullUtcStackPlan(LAYOUT_TEXT_COMPUTER, sel);
      const hourDiskTexts = plan.items.filter(
        (i) => i.kind === "text" && i.font.assetId === "computer",
      );
      expect(hourDiskTexts.length).toBeGreaterThanOrEqual(24);
      const labels = new Set(
        hourDiskTexts.map((i) => (i.kind === "text" ? i.text : "")),
      );
      expect(labels.size).toBe(24);
    });

    it("custom color applies to hour-disk text on the semantic path", () => {
      const sel = effectiveTopBandHourMarkerSelection(LAYOUT_TEXT_COLORED);
      const plan = buildFullUtcStackPlan(LAYOUT_TEXT_COLORED, sel);
      const hourDiskTexts = plan.items.filter(
        (i) => i.kind === "text" && i.font.assetId === "computer" && i.fill === "#c0ffee",
      );
      expect(hourDiskTexts.length).toBeGreaterThanOrEqual(24);
    });

    it("sizeMultiplier scales hour-disk font size on the semantic path", () => {
      const layout1x = LAYOUT_TEXT_COMPUTER;
      const layout2x: DisplayChromeLayoutConfig = {
        ...LAYOUT_TEXT_COMPUTER,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 2 },
        },
      };
      const p1 = buildFullUtcStackPlan(layout1x, effectiveTopBandHourMarkerSelection(layout1x));
      const p2 = buildFullUtcStackPlan(layout2x, effectiveTopBandHourMarkerSelection(layout2x));
      const t1 = p1.items.find((i) => i.kind === "text" && i.font.assetId === "computer");
      const t2 = p2.items.find((i) => i.kind === "text" && i.font.assetId === "computer");
      expect(t1?.kind).toBe("text");
      expect(t2?.kind).toBe("text");
      if (t1?.kind === "text" && t2?.kind === "text") {
        expect(t2.font.sizePx).toBeCloseTo(t1.font.sizePx * 2, 5);
      }
    });

    it("matches expected total text count for the same UTC tape (wrap only; no crown annotations)", () => {
      const w = 960;
      const top = 88;
      const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
      const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
      const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
      const sw = w / 24;
      const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
      const diskLabelSizePx = computeHourDiskLabelSizePx(r, w);

      let expectedTextCount = 0;
      for (const m of scale.circleMarkers) {
        if (m.radiusPx <= 0) {
          const wdLabel = topBandWrapOffsetsForCenteredExtent(
            m.centerX,
            m.radiusPx > 0 ? topBandDiskWrapHalfExtentPx(m.radiusPx) : diskLabelSizePx,
            w,
          ).length;
          expectedTextCount += wdLabel;
          continue;
        }
        const wdLabel = topBandWrapOffsetsForCenteredExtent(
          m.centerX,
          topBandDiskWrapHalfExtentPx(m.radiusPx),
          w,
        ).length;
        expectedTextCount += wdLabel;
      }

      const planDefault = buildFullUtcStackPlan(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG, SEL_TEXT_DEFAULT);
      const planComputer = buildFullUtcStackPlan(
        LAYOUT_TEXT_COMPUTER,
        effectiveTopBandHourMarkerSelection(LAYOUT_TEXT_COMPUTER),
      );
      expect(planDefault.items.filter((i) => i.kind === "text").length).toBe(expectedTextCount);
      expect(planComputer.items.filter((i) => i.kind === "text").length).toBe(expectedTextCount);
    });
  });

  describe("Semantic analog hour-disk pipeline (full 24)", () => {
    const LAYOUT_ANALOG_GLYPH: DisplayChromeLayoutConfig = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        realization: { kind: "analogClock", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    };

    it("routes analogClock through resolver → planner → layout → adapter; hour-hand tips vary by zone", () => {
      const w = 960;
      const top = 88;
      const refMs = Date.UTC(2024, 0, 15, 18, 45, 0);
      const scale = buildUtcTopScaleLayout(refMs, w, top, RESOLVED_UTC);
      const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
      const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
      const sw = w / 24;
      const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
      const diskLabelSizePx = computeHourDiskLabelSizePx(r, w);

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
        diskLabelSizePx,
        tickBandHeightPx: rows.tickBandH,
        effectiveTopBandHourMarkerSelection: effectiveTopBandHourMarkerSelection(LAYOUT_ANALOG_GLYPH),
        effectiveTopBandHourMarkers: resolveEffectiveTopBandHourMarkers(LAYOUT_ANALOG_GLYPH),
        glyphRenderContext: GLYPH_CTX,
        referenceFractionalHour: 14.25, presentTimeStructuralHour0To23: 11,
        structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
      });

      expect(
        resolveTopBandInDiskHourMarkerSemanticPath({
          effectiveTopBandHourMarkerSelection: effectiveTopBandHourMarkerSelection(LAYOUT_ANALOG_GLYPH),
          effectiveTopBandHourMarkers: resolveEffectiveTopBandHourMarkers(LAYOUT_ANALOG_GLYPH),
          markerCount: 24,
          structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
          referenceFractionalHour: 14.25, presentTimeStructuralHour0To23: 11,
        }).kind,
      ).toBe("semanticAnalogClockHourDisks");

      const handLines = plan.items.filter(
        (i): i is Extract<(typeof plan.items)[number], { kind: "line" }> =>
          i.kind === "line" && i.lineCap === "round",
      );
      expect(handLines.length).toBeGreaterThanOrEqual(24);
      const tips = handLines.map((ln) => ln.x2);
      expect(new Set(tips).size).toBeGreaterThan(3);
    });
  });

  describe("Semantic radial line hour-disk pipeline (full 24)", () => {
    const LAYOUT_RADIAL_LINE: DisplayChromeLayoutConfig = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        realization: { kind: "radialLine", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    };

    const LAYOUT_RADIAL_COLORED: DisplayChromeLayoutConfig = {
      ...LAYOUT_RADIAL_LINE,
      hourMarkers: {
        realization: { kind: "radialLine", appearance: { lineColor: "#ee00aa" } },
        layout: { sizeMultiplier: 1 },
      },
    };

    it("routes radialLine through resolver → planner → layout → adapter on full tape", () => {
      const w = 960;
      const top = 88;
      const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
      const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
      const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
      const sw = w / 24;
      const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
      const diskLabelSizePx = computeHourDiskLabelSizePx(r, w);

      const sel = effectiveTopBandHourMarkerSelection(LAYOUT_RADIAL_LINE);
      const eff = resolveEffectiveTopBandHourMarkers(LAYOUT_RADIAL_LINE);
      expect(
        resolveTopBandInDiskHourMarkerSemanticPath({
          effectiveTopBandHourMarkerSelection: sel,
          effectiveTopBandHourMarkers: eff,
          markerCount: 24,
          structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
          referenceFractionalHour: scale.referenceFractionalHour, presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg),
        }),
      ).toEqual({ kind: "semanticRadialLineHourDisks" } satisfies TopBandInDiskHourMarkerSemanticRenderPath);

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
        diskLabelSizePx,
        tickBandHeightPx: rows.tickBandH,
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
        glyphRenderContext: GLYPH_CTX,
        referenceFractionalHour: scale.referenceFractionalHour, presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg),
        structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
      });

      const expectedLineStroke =
        eff.realization.kind === "radialLine" ? eff.realization.resolvedAppearance.lineColor : "";
      expect(expectedLineStroke.length).toBeGreaterThan(0);
      const expectedFaceFill =
        eff.realization.kind === "radialLine" ? eff.realization.resolvedAppearance.faceFill : "";
      expect(expectedFaceFill.length).toBeGreaterThan(0);

      const markerFacePaths = plan.items.filter(
        (i): i is Extract<(typeof plan.items)[number], { kind: "path2d" }> =>
          i.kind === "path2d" &&
          i.pathKind === "descriptor" &&
          i.fill === expectedFaceFill &&
          i.stroke === undefined,
      );
      expect(markerFacePaths.length).toBeGreaterThanOrEqual(24);

      const radialLines = plan.items.filter(
        (i): i is Extract<(typeof plan.items)[number], { kind: "line" }> =>
          i.kind === "line" && i.strokeWidthPx === 3 && i.lineCap === "round",
      );
      expect(radialLines.length).toBeGreaterThanOrEqual(24);
      expect(radialLines.every((ln) => ln.stroke === expectedLineStroke)).toBe(true);
    });

    it("applies selection color to radial strokes on the semantic path", () => {
      const w = 960;
      const top = 88;
      const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
      const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
      const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
      const sw = w / 24;
      const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
      const diskLabelSizePx = computeHourDiskLabelSizePx(r, w);

      const sel = effectiveTopBandHourMarkerSelection(LAYOUT_RADIAL_COLORED);
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
        diskLabelSizePx,
        tickBandHeightPx: rows.tickBandH,
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: resolveEffectiveTopBandHourMarkers(LAYOUT_RADIAL_COLORED),
        glyphRenderContext: GLYPH_CTX,
        referenceFractionalHour: scale.referenceFractionalHour, presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg),
        structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
      });

      const coloredRadial = plan.items.filter(
        (i) => i.kind === "line" && i.stroke === "#ee00aa" && i.lineCap === "round",
      );
      expect(coloredRadial.length).toBeGreaterThanOrEqual(24);
    });
  });

  describe("Semantic radial wedge hour-disk pipeline (full 24)", () => {
    const LAYOUT_RADIAL_WEDGE: DisplayChromeLayoutConfig = {
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        realization: { kind: "radialWedge", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    };

    const LAYOUT_WEDGE_COLORED: DisplayChromeLayoutConfig = {
      ...LAYOUT_RADIAL_WEDGE,
      hourMarkers: {
        realization: { kind: "radialWedge", appearance: { fillColor: "#ee00aa" } },
        layout: { sizeMultiplier: 1 },
      },
    };

    const effResolvedWedge = resolveEffectiveTopBandHourMarkers(LAYOUT_RADIAL_WEDGE);
    const defaultWedgeFill =
      effResolvedWedge.realization.kind === "radialWedge"
        ? effResolvedWedge.realization.resolvedAppearance.fillColor
        : "";
    const defaultWedgeStroke =
      effResolvedWedge.realization.kind === "radialWedge"
        ? effResolvedWedge.realization.resolvedAppearance.strokeColor
        : "";
    const defaultMarkerFaceFill =
      effResolvedWedge.realization.kind === "radialWedge"
        ? effResolvedWedge.realization.resolvedAppearance.faceFill
        : "";

    it("routes radialWedge through resolver → planner → layout → adapter on full tape", () => {
      const w = 960;
      const top = 88;
      const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
      const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
      const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
      const sw = w / 24;
      const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
      const diskLabelSizePx = computeHourDiskLabelSizePx(r, w);

      const sel = effectiveTopBandHourMarkerSelection(LAYOUT_RADIAL_WEDGE);
      const eff = resolveEffectiveTopBandHourMarkers(LAYOUT_RADIAL_WEDGE);
      expect(
        resolveTopBandInDiskHourMarkerSemanticPath({
          effectiveTopBandHourMarkerSelection: sel,
          effectiveTopBandHourMarkers: eff,
          markerCount: 24,
          structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
          referenceFractionalHour: scale.referenceFractionalHour, presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg),
        }),
      ).toEqual({ kind: "semanticRadialWedgeHourDisks" } satisfies TopBandInDiskHourMarkerSemanticRenderPath);

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
        diskLabelSizePx,
        tickBandHeightPx: rows.tickBandH,
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
        glyphRenderContext: GLYPH_CTX,
        referenceFractionalHour: scale.referenceFractionalHour, presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg),
        structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
      });

      const markerFacePaths = plan.items.filter(
        (i): i is Extract<(typeof plan.items)[number], { kind: "path2d" }> =>
          i.kind === "path2d" &&
          i.pathKind === "descriptor" &&
          i.fill === defaultMarkerFaceFill &&
          i.stroke === undefined,
      );
      expect(markerFacePaths.length).toBeGreaterThanOrEqual(24);

      const wedgeFills = plan.items.filter(
        (i): i is Extract<(typeof plan.items)[number], { kind: "path2d" }> =>
          i.kind === "path2d" && i.fill === defaultWedgeFill,
      );
      expect(wedgeFills.length).toBeGreaterThanOrEqual(24);
      expect(
        wedgeFills.every(
          (p) => p.stroke === defaultWedgeStroke && p.stroke !== undefined && p.strokeWidthPx !== undefined,
        ),
      ).toBe(true);
    });

    it("applies selection color to wedge fills on the semantic path", () => {
      const w = 960;
      const top = 88;
      const scale = buildUtcTopScaleLayout(Date.now(), w, top, RESOLVED_UTC);
      const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
      const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
      const sw = w / 24;
      const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
      const diskLabelSizePx = computeHourDiskLabelSizePx(r, w);

      const sel = effectiveTopBandHourMarkerSelection(LAYOUT_WEDGE_COLORED);
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
        diskLabelSizePx,
        tickBandHeightPx: rows.tickBandH,
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: resolveEffectiveTopBandHourMarkers(LAYOUT_WEDGE_COLORED),
        glyphRenderContext: GLYPH_CTX,
        referenceFractionalHour: scale.referenceFractionalHour, presentTimeStructuralHour0To23: structuralHourIndexFromReferenceLongitudeDeg(scale.topBandAnchor.referenceLongitudeDeg),
        structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
      });

      const coloredWedges = plan.items.filter(
        (i) => i.kind === "path2d" && i.fill === "#ee00aa",
      );
      expect(coloredWedges.length).toBeGreaterThanOrEqual(24);
    });
  });

  describe("Phase C: truthful hour-disk interior path (full semantic tape)", () => {
    function hourDiskTextForStructuralHour(
      plan: ReturnType<typeof buildTopBandCircleBandHourStackRenderPlan>,
      currentHourLabel: string,
    ) {
      return plan.items.find((i) => i.kind === "text" && i.text === currentHourLabel);
    }

    it("text path uses fontAssetId from effective selection matching structured hourMarkers", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const label0 = f.markers[0]!.currentHourLabel;
      const sel = effectiveTopBandHourMarkerSelection({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      });
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      });
      const t = hourDiskTextForStructuralHour(
        buildStackFromFixture(f, { sel, eff, topBandYPx: 10 }),
        label0,
      );
      expect(t?.kind).toBe("text");
      if (t?.kind === "text") {
        expect(t.font.assetId).toBe("computer");
      }
    });

    it("text path follows structured fontAssetId (dotmatrix)", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const label0 = f.markers[0]!.currentHourLabel;
      const sel = effectiveTopBandHourMarkerSelection({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "dotmatrix-regular", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      });
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "dotmatrix-regular", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      });
      const t = hourDiskTextForStructuralHour(
        buildStackFromFixture(f, { sel, eff, topBandYPx: 10 }),
        label0,
      );
      expect(t?.kind).toBe("text");
      if (t?.kind === "text") {
        expect(t.font.assetId).toBe("dotmatrix-regular");
      }
    });

    it("segment-style structured text renders hour text with dseg7modern-regular", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const label0 = f.markers[0]!.currentHourLabel;
      const sel = effectiveTopBandHourMarkerSelection(LAYOUT_LEGACY_SEGMENT_TEXT);
      const eff = effectiveTopBandHourMarkersForLayout(LAYOUT_LEGACY_SEGMENT_TEXT);
      const plan = buildStackFromFixture(f, { sel, eff, topBandYPx: 10 });
      const t = hourDiskTextForStructuralHour(plan, label0);
      expect(t?.kind).toBe("text");
      if (t?.kind === "text") {
        expect(t.font.assetId).toBe("dseg7modern-regular");
      }
    });

    it("structured analogClock uses glyph procedural path (no hour-disk text)", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const label0 = f.markers[0]!.currentHourLabel;
      const sel = effectiveTopBandHourMarkerSelection(LAYOUT_LEGACY_ANALOG_GLYPH);
      expect(sel).toEqual({ kind: "glyph", glyphMode: "analogClock", sizeMultiplier: 1 });
      const eff = effectiveTopBandHourMarkersForLayout(LAYOUT_LEGACY_ANALOG_GLYPH);
      const plan = buildStackFromFixture(f, { sel, eff, topBandYPx: 10 });
      expect(plan.items.some((i) => i.kind === "text" && i.text === label0)).toBe(false);
      expect(plan.items.some((i) => i.kind === "line")).toBe(true);
    });

    it("glyph radialLine uses procedural path (marker-disk face + line), not hour text", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const label0 = f.markers[0]!.currentHourLabel;
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      });
      const plan = buildStackFromFixture(f, {
        sel: {
          kind: "glyph",
          glyphMode: "radialLine",
          sizeMultiplier: 1,
        },
        eff,
        topBandYPx: 10,
      });
      expect(plan.items.some((i) => i.kind === "text" && i.text === label0)).toBe(false);
      expect(eff.realization.kind).toBe("radialLine");
      const faceFill =
        eff.realization.kind === "radialLine" ? eff.realization.resolvedAppearance.faceFill : "";
      expect(
        plan.items.some(
          (i) => i.kind === "path2d" && i.pathKind === "descriptor" && i.fill === faceFill && i.stroke === undefined,
        ),
      ).toBe(true);
      expect(plan.items.filter((i) => i.kind === "line").length).toBeGreaterThan(0);
    });

    it("text hour disk uses default fill when effective selection has no color", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const label0 = f.markers[0]!.currentHourLabel;
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      });
      const plan = buildStackFromFixture(f, {
        sel: {
          kind: "text",
          fontAssetId: "computer",
          sizeMultiplier: 1,
        },
        eff,
        topBandYPx: 10,
      });
      const t = hourDiskTextForStructuralHour(plan, label0);
      expect(t?.kind).toBe("text");
      if (t?.kind === "text") {
        expect(t.fill).toBe(eff.indicatorEntriesArea.effectiveForegroundColor);
      }
    });

    it("text hour disk uses selection color fill when set", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const label0 = f.markers[0]!.currentHourLabel;
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: { color: "#c0ffee" } },
          layout: { sizeMultiplier: 1 },
        },
      });
      const plan = buildStackFromFixture(f, {
        sel: {
          kind: "text",
          fontAssetId: "computer",
          sizeMultiplier: 1,
        },
        eff,
        topBandYPx: 10,
      });
      const t = hourDiskTextForStructuralHour(plan, label0);
      expect(t?.kind).toBe("text");
      if (t?.kind === "text") {
        expect(t.fill).toBe("#c0ffee");
      }
    });

    it("glyph radialLine uses selection color for stroke", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "radialLine", appearance: { lineColor: "#ee00aa" } },
          layout: { sizeMultiplier: 1 },
        },
      });
      const plan = buildStackFromFixture(f, {
        sel: {
          kind: "glyph",
          glyphMode: "radialLine",
          sizeMultiplier: 1,
        },
        eff,
        topBandYPx: 10,
      });
      const radial = plan.items.find((i) => i.kind === "line" && i.stroke === "#ee00aa");
      expect(radial?.kind).toBe("line");
    });

    it("glyph radialLine uses authored face color for marker disk fill", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "radialLine", appearance: { faceColor: "#123456" } },
          layout: { sizeMultiplier: 1 },
        },
      });
      const plan = buildStackFromFixture(f, {
        sel: {
          kind: "glyph",
          glyphMode: "radialLine",
          sizeMultiplier: 1,
        },
        eff,
        topBandYPx: 10,
      });
      expect(
        plan.items.some(
          (i) =>
            i.kind === "path2d" &&
            i.pathKind === "descriptor" &&
            i.fill === "#123456" &&
            i.stroke === undefined,
        ),
      ).toBe(true);
    });

    it("glyph radialWedge uses selection color for fill", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "radialWedge", appearance: { fillColor: "#aabbcc" } },
          layout: { sizeMultiplier: 1 },
        },
      });
      const plan = buildStackFromFixture(f, {
        sel: {
          kind: "glyph",
          glyphMode: "radialWedge",
          sizeMultiplier: 1,
        },
        eff,
        topBandYPx: 10,
      });
      const wedge = plan.items.filter((i) => i.kind === "path2d").find((p) => p.fill === "#aabbcc");
      expect(wedge?.kind).toBe("path2d");
    });

    it("glyph radialWedge uses authored face color for disk and edge color for wedge stroke", () => {
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80 });
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: {
            kind: "radialWedge",
            appearance: { faceColor: "#abcdef", edgeColor: "#112233" },
          },
          layout: { sizeMultiplier: 1 },
        },
      });
      const plan = buildStackFromFixture(f, {
        sel: {
          kind: "glyph",
          glyphMode: "radialWedge",
          sizeMultiplier: 1,
        },
        eff,
        topBandYPx: 10,
      });
      expect(
        plan.items.some(
          (i) =>
            i.kind === "path2d" &&
            i.pathKind === "descriptor" &&
            i.fill === "#abcdef" &&
            i.stroke === undefined,
        ),
      ).toBe(true);
      expect(
        plan.items.some(
          (i) => i.kind === "path2d" && i.fill !== "#abcdef" && i.stroke === "#112233",
        ),
      ).toBe(true);
    });

    it("glyph analogClock uses selection color for ring stroke and hour hand", () => {
      const refMs = Date.UTC(2024, 0, 15, 12, 0, 0);
      const f = buildFullUtcTopBandHourDiskFixture({ widthPx: 400, topBandHeightPx: 80, nowMs: refMs });
      const cx = f.structuralZoneCenterXPx[3]!;
      const eff = effectiveTopBandHourMarkersForLayout({
        ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
        hourMarkers: {
          realization: { kind: "analogClock", appearance: { handColor: "#4466ff" } },
          layout: { sizeMultiplier: 1 },
        },
      });
      const plan = buildStackFromFixture(f, {
        sel: {
          kind: "glyph",
          glyphMode: "analogClock",
          sizeMultiplier: 1,
        },
        eff,
        topBandYPx: 10,
      });
      const faceRing = plan.items
        .filter((i) => i.kind === "path2d")
        .find((p) => p.stroke === "#4466ff" && p.fill !== undefined);
      const hand = plan.items
        .filter((i) => i.kind === "line")
        .find((ln) => ln.stroke === "#4466ff" && ln.x1 === cx);
      expect(faceRing?.kind).toBe("path2d");
      expect(hand?.kind).toBe("line");
    });
  });
});
