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
import {
  cloneHourMarkersConfig,
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_DISPLAY_TIME_CONFIG,
  effectiveTopBandHourMarkerSelection,
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
  buildFullUtcTopBandHourDiskFixture,
  effectiveTopBandHourMarkersForLayout,
} from "./topBandInDiskHourMarkers.test-utils.ts";

const GLYPH_CTX = { fontRegistry: loadBundledFontAssetRegistry() };

/** Default top-band hour markers: strip look, role default font (no explicit font in selection). */
const SEL_TEXT_DEFAULT = { kind: "text" as const, fontAssetId: undefined, sizeMultiplier: 1.25 };

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
    referenceNowMs?: number;
    structuralZoneCenterXPx?: readonly number[];
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
    referenceNowMs: args.referenceNowMs ?? f.referenceNowMs,
    referenceFractionalHour: f.referenceFractionalHour,
    presentTimeStructuralHour0To23: f.presentTimeStructuralHour0To23,
    structuralZoneCenterXPx: args.structuralZoneCenterXPx ?? f.structuralZoneCenterXPx,
  });
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
        referenceNowMs: undefined,
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
  const refMs = Date.now();
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
      referenceNowMs: undefined,
    });
    const analogPath = resolveTopBandInDiskHourMarkerSemanticPath({
      effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "analogClock", sizeMultiplier: 1 },
      effectiveTopBandHourMarkers: effAnalog,
      markerCount: 24,
      structuralZoneCenterXPx: structuralX,
      referenceNowMs: refMs,
    });
    const linePath = resolveTopBandInDiskHourMarkerSemanticPath({
      effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialLine", sizeMultiplier: 1 },
      effectiveTopBandHourMarkers: effRadialLine,
      markerCount: 24,
      structuralZoneCenterXPx: structuralX,
      referenceNowMs: refMs,
    });
    const wedgePath = resolveTopBandInDiskHourMarkerSemanticPath({
      effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialWedge", sizeMultiplier: 1 },
      effectiveTopBandHourMarkers: effRadialWedge,
      markerCount: 24,
      structuralZoneCenterXPx: structuralX,
      referenceNowMs: refMs,
    });
    expect(textPath).toEqual({ kind: "semanticTextHourDisks" });
    expect(analogPath).toEqual({ kind: "semanticAnalogClockHourDisks" });
    expect(linePath).toEqual({ kind: "semanticRadialLineHourDisks" });
    expect(wedgePath).toEqual({ kind: "semanticRadialWedgeHourDisks" });
  });

  it("throws when effectiveTopBandHourMarkers is missing", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "text", fontAssetId: undefined, sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: undefined,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceNowMs: undefined,
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
        referenceNowMs: undefined,
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
        referenceNowMs: undefined,
      }),
    ).toThrow(/text selection requires effective realization kind "text"/);
  });

  it("throws when analogClock is missing referenceNowMs", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "analogClock", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effAnalog,
        markerCount: 24,
        structuralZoneCenterXPx: structuralX,
        referenceNowMs: undefined,
      }),
    ).toThrow(/analogClock requires referenceNowMs/);
  });

  it("throws when analogClock is missing structuralZoneCenterXPx (24)", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "analogClock", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effAnalog,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceNowMs: refMs,
      }),
    ).toThrow(/structuralZoneCenterXPx with 24 entries/);
  });

  it("throws when radialLine is missing referenceNowMs", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialLine", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effRadialLine,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceNowMs: undefined,
      }),
    ).toThrow(/radialLine requires referenceNowMs/);
  });

  it("throws when radialWedge is missing referenceNowMs", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialWedge", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effRadialWedge,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceNowMs: undefined,
      }),
    ).toThrow(/radialWedge requires referenceNowMs/);
  });

  it("throws when radialLine is staticZoneAnchored but structuralZoneCenterXPx is not length 24", () => {
    const eff = effectiveTopBandHourMarkersForLayout({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        realization: { kind: "radialLine", appearance: {} },
        layout: { sizeMultiplier: 1 },
      },
    });
    expect(eff.behavior).toBe("staticZoneAnchored");
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialLine", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: eff,
        markerCount: 24,
        structuralZoneCenterXPx: undefined,
        referenceNowMs: refMs,
      }),
    ).toThrow(/radialLine with staticZoneAnchored requires structuralZoneCenterXPx/);
  });

  it("throws when radialLine selection does not match realization", () => {
    expect(() =>
      resolveTopBandInDiskHourMarkerSemanticPath({
        effectiveTopBandHourMarkerSelection: { kind: "glyph", glyphMode: "radialLine", sizeMultiplier: 1 },
        effectiveTopBandHourMarkers: effRadialWedge,
        markerCount: 24,
        structuralZoneCenterXPx: structuralX,
        referenceNowMs: refMs,
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
      referenceNowMs: refMs,
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
      referenceNowMs: fCustomStack.referenceNowMs,
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
      referenceNowMs: scale.referenceNowMs,
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
        referenceNowMs: scale.referenceNowMs,
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
        referenceNowMs: refMs,
        structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
      });

      expect(
        resolveTopBandInDiskHourMarkerSemanticPath({
          effectiveTopBandHourMarkerSelection: effectiveTopBandHourMarkerSelection(LAYOUT_ANALOG_GLYPH),
          effectiveTopBandHourMarkers: resolveEffectiveTopBandHourMarkers(LAYOUT_ANALOG_GLYPH),
          markerCount: 24,
          structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
          referenceNowMs: refMs,
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
          referenceNowMs: scale.referenceNowMs,
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
        referenceNowMs: scale.referenceNowMs,
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
        referenceNowMs: scale.referenceNowMs,
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
          referenceNowMs: scale.referenceNowMs,
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
        referenceNowMs: scale.referenceNowMs,
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
        referenceNowMs: scale.referenceNowMs,
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
        referenceNowMs: refMs,
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
