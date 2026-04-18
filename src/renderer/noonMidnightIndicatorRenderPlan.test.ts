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
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  effectiveTopBandHourMarkerSelection,
} from "../config/appConfig.ts";
import { resolveEffectiveTopBandHourMarkers } from "../config/topBandHourMarkersResolver.ts";
import { hourMarkerRepresentationSpecForTopBandEffectiveSelection } from "../config/topBandVisualPolicy.ts";
import { defaultFontAssetRegistry } from "../typography/fontAssetRegistry.ts";
import {
  boxedNumberHighlightHalfExtentsFromMarkerContentBox,
  noonHighlighted12SwashGeometryFromMarkerContentBox,
  noonHighlighted12SwashHalfExtentsFromMarkerContentBox,
  SEMANTIC_NUMERAL_IN_DIAMOND_FRAC,
  TEXT_WORDS_NOON_LAYOUT_SIZE_FRAC,
  tryEmitNoonMidnightIndicatorDiskContent,
} from "./noonMidnightIndicatorRenderPlan.ts";
import type { RenderPlan } from "./renderPlan/renderPlanTypes.ts";

type PlanItem = RenderPlan["items"][number];

describe("boxedNumberHighlightHalfExtentsFromMarkerContentBox", () => {
  it("scales half extents with marker content box size (layout.size), not hardcoded px", () => {
    const a = boxedNumberHighlightHalfExtentsFromMarkerContentBox(24, "6");
    const b = boxedNumberHighlightHalfExtentsFromMarkerContentBox(48, "6");
    expect(b.halfW).toBeCloseTo(a.halfW * 2, 8);
    expect(b.halfH).toBeCloseTo(a.halfH * 2, 8);
  });

  it("widens for longer labels at the same box size", () => {
    const short = boxedNumberHighlightHalfExtentsFromMarkerContentBox(40, "0");
    const long = boxedNumberHighlightHalfExtentsFromMarkerContentBox(40, "0000");
    expect(long.halfW).toBeGreaterThan(short.halfW);
  });

  it("reserves a broad, low-profile highlighter span behind typical two-digit tape numerals", () => {
    const { halfW, halfH } = boxedNumberHighlightHalfExtentsFromMarkerContentBox(40, "10");
    expect(halfH).toBeCloseTo(40 * 0.3, 8);
    expect(halfW).toBeGreaterThanOrEqual(40 * 0.62);
    expect(halfW / halfH).toBeGreaterThan(1.4);
  });
});

describe("noonHighlighted12SwashGeometryFromMarkerContentBox", () => {
  it("uses entry-slot scale only (no label-length term) with asymmetric vertical extents and upward center bias", () => {
    const s = 40;
    const g = noonHighlighted12SwashGeometryFromMarkerContentBox(s);
    expect(g.halfW).toBeCloseTo(s * 1.06, 8);
    expect(g.halfHAbove).toBeCloseTo(s * 0.62, 8);
    expect(g.halfHBelow).toBeCloseTo(s * 0.58, 8);
    expect(g.cyOffset).toBeCloseTo(s * -0.038, 8);
    expect(g.halfHAbove).toBeGreaterThan(g.halfHBelow);
  });

  it("exceeds prior dedicated noon half-extents (0.92 / 0.44) and boxed-number midnight at the same box size", () => {
    const s = 40;
    const g = noonHighlighted12SwashGeometryFromMarkerContentBox(s);
    const prevHalfW = s * 0.92;
    const prevHalfH = s * 0.44;
    expect(g.halfW).toBeGreaterThan(prevHalfW);
    expect(g.halfHAbove + g.halfHBelow).toBeGreaterThan(2 * prevHalfH);
    const midnight = boxedNumberHighlightHalfExtentsFromMarkerContentBox(s, "00");
    expect(g.halfW).toBeGreaterThan(midnight.halfW);
    expect((g.halfHAbove + g.halfHBelow) / 2).toBeGreaterThan(midnight.halfH);
  });

  it("halfExtents helper reports mean vertical half-height for comparisons", () => {
    const s = 48;
    const g = noonHighlighted12SwashGeometryFromMarkerContentBox(s);
    const { halfW, halfH } = noonHighlighted12SwashHalfExtentsFromMarkerContentBox(s);
    expect(halfW).toBeCloseTo(g.halfW, 8);
    expect(halfH).toBeCloseTo((g.halfHAbove + g.halfHBelow) / 2, 8);
  });

  it("is materially wider and taller than the legacy text-fit noon model for the same box", () => {
    const s = 48;
    const g = noonHighlighted12SwashGeometryFromMarkerContentBox(s);
    const n = 2;
    const legacyHalfH = s * 0.42;
    const legacyHalfW = Math.max(
      s * 0.88,
      n * s * 0.26 + s * 0.34,
    );
    expect(g.halfW).toBeGreaterThan(legacyHalfW);
    expect((g.halfHAbove + g.halfHBelow) / 2).toBeGreaterThan(legacyHalfH);
    expect(g.halfW / ((g.halfHAbove + g.halfHBelow) / 2)).toBeGreaterThan(1.75);
  });
});

describe("tryEmitNoonMidnightIndicatorDiskContent", () => {
  it("textWords midnight strip overlay is MID even when resolver displayLabel is MIDNIGHT", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const items: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 0,
        tapeHourLabel: "00",
        displayLabel: "MIDNIGHT",
        layout: { cx: 0, cy: 0, size: 24 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    expect(items.some((i) => i.kind === "text" && "text" in i && i.text === "MID")).toBe(true);
    expect(items.some((i) => i.kind === "text" && "text" in i && i.text === "MIDNIGHT")).toBe(false);
  });

  it("textWords + text realization emits only strip NOON/MID (not resolver MIDNIGHT); no duplicate label path", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const midItems: PlanItem[] = [];
    expect(
      tryEmitNoonMidnightIndicatorDiskContent(
        {
          realizationKind: "text",
          customization: eff.noonMidnightCustomization,
          structuralHour0To23: 0,
          tapeHourLabel: "00",
          displayLabel: "MIDNIGHT",
          layout: { cx: 10, cy: 20, size: 32 },
          markerColor: "#223344",
          hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
          effectiveTopBandHourMarkerSelection: sel,
          effectiveTopBandHourMarkers: eff,
        },
        { fontRegistry: defaultFontAssetRegistry },
        midItems,
      ),
    ).toBe(true);
    expect(midItems.filter((i) => i.kind === "text").map((i) => (i as { text?: string }).text)).toEqual(["MID"]);
    expect(midItems.some((i) => i.kind === "text" && "text" in i && i.text === "MIDNIGHT")).toBe(false);

    const noonItems: PlanItem[] = [];
    expect(
      tryEmitNoonMidnightIndicatorDiskContent(
        {
          realizationKind: "text",
          customization: eff.noonMidnightCustomization,
          structuralHour0To23: 12,
          tapeHourLabel: "12",
          displayLabel: "NOON",
          layout: { cx: 10, cy: 20, size: 32 },
          markerColor: "#223344",
          hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
          effectiveTopBandHourMarkerSelection: sel,
          effectiveTopBandHourMarkers: eff,
        },
        { fontRegistry: defaultFontAssetRegistry },
        noonItems,
      ),
    ).toBe(true);
    expect(noonItems.filter((i) => i.kind === "text").map((i) => (i as { text?: string }).text)).toEqual(["NOON"]);
  });

  it("textWords + radialWedge keeps wedge path then NOON/MID text overlay (realization-local)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialWedge", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialWedge", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const noonItems: PlanItem[] = [];
    expect(
      tryEmitNoonMidnightIndicatorDiskContent(
        {
          realizationKind: "radialWedge",
          customization: eff.noonMidnightCustomization,
          structuralHour0To23: 12,
          tapeHourLabel: "12",
          displayLabel: "NOON",
          layout: { cx: 100, cy: 50, size: 24 },
          markerColor: "#223344",
          hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
          effectiveTopBandHourMarkerSelection: sel,
          effectiveTopBandHourMarkers: eff,
        },
        { fontRegistry: defaultFontAssetRegistry },
        noonItems,
      ),
    ).toBe(true);
    const noonKinds = noonItems.map((i) => i.kind);
    const wedgeIdx = noonKinds.findIndex((k) => k === "path2d");
    const noonTextIdx = noonItems.findIndex(
      (i) => i.kind === "text" && "text" in i && i.text === "NOON",
    );
    expect(wedgeIdx).toBeGreaterThanOrEqual(0);
    expect(noonTextIdx).toBeGreaterThan(wedgeIdx);

    const midItems: PlanItem[] = [];
    expect(
      tryEmitNoonMidnightIndicatorDiskContent(
        {
          realizationKind: "radialWedge",
          customization: eff.noonMidnightCustomization,
          structuralHour0To23: 0,
          tapeHourLabel: "00",
          displayLabel: "MIDNIGHT",
          layout: { cx: 100, cy: 50, size: 24 },
          markerColor: "#223344",
          hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
          effectiveTopBandHourMarkerSelection: sel,
          effectiveTopBandHourMarkers: eff,
        },
        { fontRegistry: defaultFontAssetRegistry },
        midItems,
      ),
    ).toBe(true);
    const midWedgeIdx = midItems.map((i) => i.kind).indexOf("path2d");
    const midTextIdx = midItems.findIndex((i) => i.kind === "text" && "text" in i && i.text === "MID");
    expect(midWedgeIdx).toBeGreaterThanOrEqual(0);
    expect(midTextIdx).toBeGreaterThan(midWedgeIdx);
  });

  it("textWords NOON and MID word overlays use bounded layout fraction vs marker box", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const markerSize = 62;
    const noonItems: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "NOON",
        layout: { cx: 100, cy: 50, size: markerSize },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      noonItems,
    );
    const noonWord = noonItems.find((i) => i.kind === "text" && "text" in i && i.text === "NOON");
    expect(noonWord?.kind === "text").toBe(true);
    if (noonWord?.kind === "text") {
      expect(noonWord.font.sizePx).toBeLessThan(markerSize * 0.72);
      expect(noonWord.font.sizePx).toBeCloseTo(markerSize * TEXT_WORDS_NOON_LAYOUT_SIZE_FRAC, 5);
    }

    const midItems: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 0,
        tapeHourLabel: "00",
        displayLabel: "MIDNIGHT",
        layout: { cx: 100, cy: 50, size: markerSize },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      midItems,
    );
    const midWord = midItems.find((i) => i.kind === "text" && "text" in i && i.text === "MID");
    expect(midWord?.kind === "text").toBe(true);
    if (midWord?.kind === "text") {
      expect(midWord.font.sizePx).toBeCloseTo(markerSize * TEXT_WORDS_NOON_LAYOUT_SIZE_FRAC, 5);
      if (noonWord?.kind === "text") {
        expect(midWord.font.sizePx).toBeCloseTo(noonWord.font.sizePx, 5);
      }
    }
  });

  it("textWords + radialLine keeps radial stroke then NOON/MID text overlay (realization-local)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const items: PlanItem[] = [];
    const handled = tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "NOON",
        layout: { cx: 100, cy: 50, size: 24 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    expect(handled).toBe(true);
    const kinds = items.map((i) => i.kind);
    expect(kinds[0]).toBe("line");
    expect(items.some((i) => i.kind === "text" && "text" in i && i.text === "NOON")).toBe(true);
    const lineIdx = kinds.indexOf("line");
    const textIdx = kinds.findIndex((k, idx) => k === "text" && items[idx] && "text" in items[idx]! && items[idx]!.text === "NOON");
    expect(textIdx).toBeGreaterThan(lineIdx);
  });

  it("textWords + analogClock emits clock then word overlay", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "analogClock", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "analogClock", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "textWords" },
      },
    });
    const items: PlanItem[] = [];
    const handled = tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "analogClock",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "NOON",
        layout: { cx: 100, cy: 50, size: 24 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
        continuousHour0To24: 12,
        continuousMinute0To60: 0,
        analogResolvedAppearance: {
          ringStroke: "#111",
          handStroke: "#222",
          faceFill: "#333",
        },
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    expect(handled).toBe(true);
    const kinds = items.map((i) => i.kind);
    const pathIdx = kinds.indexOf("path2d");
    const textIdx = kinds.findIndex((k, idx) => k === "text" && items[idx] && "text" in items[idx]! && items[idx]!.text === "NOON");
    expect(pathIdx).toBeGreaterThanOrEqual(0);
    expect(textIdx).toBeGreaterThan(pathIdx);
  });

  it("boxedNumber uses filled highlight rect (no stroke) with resolved treatment color for text", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const items: PlanItem[] = [];
    const handled = tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "text",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 0,
        tapeHourLabel: "00",
        displayLabel: "00",
        layout: { cx: 80, cy: 40, size: 20 },
        markerColor: "#334455",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    expect(handled).toBe(true);
    expect(eff.noonMidnightCustomization.enabled && eff.noonMidnightCustomization.expressionMode === "boxedNumber").toBe(
      true,
    );
    const highlight = items.find((i) => i.kind === "rect");
    expect(highlight).toBeDefined();
    if (highlight && highlight.kind === "rect") {
      expect(highlight.stroke).toBeUndefined();
      expect(highlight.strokeWidthPx).toBeUndefined();
      expect(highlight.fill).toMatch(/^rgba\(/);
      const alpha = Number(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/.exec(highlight.fill ?? "")?.[1]);
      expect(alpha).toBeCloseTo(0.72, 5);
    }
    if (
      highlight &&
      highlight.kind === "rect" &&
      eff.noonMidnightCustomization.enabled &&
      eff.noonMidnightCustomization.expressionMode === "boxedNumber"
    ) {
      const c = eff.noonMidnightCustomization.boxedNumberBoxColor;
      const m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(c);
      expect(m).toBeTruthy();
      if (m && highlight.fill) {
        expect(highlight.fill).toContain(m[1]!);
        expect(highlight.fill).toContain(m[2]!);
        expect(highlight.fill).toContain(m[3]!);
      }
    }
    const rectIdx = items.findIndex((i) => i.kind === "rect");
    const textIdx = items.findIndex((i) => i.kind === "text");
    expect(rectIdx).toBeLessThan(textIdx);
  });

  it("semanticGlyph midnight uses heavier stroke than noon for hollow/stroked parity at strip scale", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "semanticGlyph" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "semanticGlyph" },
      },
    });
    const shared = {
      realizationKind: "radialLine" as const,
      customization: eff.noonMidnightCustomization,
      tapeHourLabel: "12",
      displayLabel: "12",
      layout: { cx: 100, cy: 50, size: 40 },
      markerColor: "#aabbcc",
      hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
      effectiveTopBandHourMarkerSelection: sel,
      effectiveTopBandHourMarkers: eff,
    };
    const noonItems: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      { ...shared, structuralHour0To23: 12 },
      { fontRegistry: defaultFontAssetRegistry },
      noonItems,
    );
    const midItems: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      { ...shared, structuralHour0To23: 0, tapeHourLabel: "00", displayLabel: "00" },
      { fontRegistry: defaultFontAssetRegistry },
      midItems,
    );
    const noonP = noonItems.find((i) => i.kind === "path2d" && i.pathKind === "descriptor");
    const midP = midItems.find((i) => i.kind === "path2d" && i.pathKind === "descriptor");
    expect(noonP?.kind === "path2d").toBe(true);
    expect(midP?.kind === "path2d").toBe(true);
    if (noonP?.kind === "path2d" && midP?.kind === "path2d") {
      expect((midP.strokeWidthPx ?? 0) > (noonP.strokeWidthPx ?? 0)).toBe(true);
    }
  });

  it("semanticGlyph noon uses diamond path (four line segments) and fill+stroke; midnight is stroke-only", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "semanticGlyph" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "semanticGlyph" },
      },
    });
    const noonItems: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "12",
        layout: { cx: 100, cy: 50, size: 40 },
        markerColor: "#aabbcc",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      noonItems,
    );
    const noonPath = noonItems.find((i) => i.kind === "path2d" && i.pathKind === "descriptor");
    expect(noonPath && noonPath.kind === "path2d" && noonPath.pathKind === "descriptor").toBe(true);
    if (noonPath?.kind === "path2d" && noonPath.pathKind === "descriptor") {
      const cmds = noonPath.pathDescriptor.commands;
      expect(cmds.map((c) => c.kind)).toEqual(["moveTo", "lineTo", "lineTo", "lineTo", "closePath"]);
      expect(noonPath.fill).toBeDefined();
      expect(noonPath.stroke).toBeDefined();
      const halfExpect = 40 * 0.74;
      const move = cmds[0];
      expect(move?.kind === "moveTo" && move.y).toBeCloseTo(50 - halfExpect, 5);
    }

    const midItems: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 0,
        tapeHourLabel: "00",
        displayLabel: "00",
        layout: { cx: 100, cy: 50, size: 40 },
        markerColor: "#aabbcc",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      midItems,
    );
    const midPath = midItems.find((i) => i.kind === "path2d" && i.pathKind === "descriptor");
    expect(midPath?.kind === "path2d" && midPath.pathKind === "descriptor").toBe(true);
    if (midPath?.kind === "path2d" && midPath.pathKind === "descriptor") {
      expect(midPath.fill).toBeUndefined();
      expect(midPath.stroke).toBeDefined();
      expect(midPath.strokeWidthPx ?? 0).toBeGreaterThanOrEqual(2);
    }
    const glyphTextIdx = noonItems.findIndex((i) => i.kind === "text");
    const glyphPathIdx = noonItems.findIndex((i) => i.kind === "path2d");
    expect(glyphTextIdx).toBeGreaterThan(glyphPathIdx);
    const size = 40;
    const half = size * 0.74;
    const numeralBoxSide = 2 * half * SEMANTIC_NUMERAL_IN_DIAMOND_FRAC;
    const t = noonItems[glyphTextIdx];
    expect(t?.kind === "text").toBe(true);
    if (t?.kind === "text") {
      expect(t.font.sizePx).toBeCloseTo(numeralBoxSide, 5);
      expect(t.x).toBeCloseTo(100, 5);
      expect(t.y).toBeCloseTo(50, 5);
    }
  });

  it("semanticGlyph + analogClock emits clock then diamond then inscribed numeral (z-order)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "analogClock", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "semanticGlyph" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "analogClock", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "semanticGlyph" },
      },
    });
    const items: PlanItem[] = [];
    const handled = tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "analogClock",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "12",
        layout: { cx: 100, cy: 50, size: 32 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
        continuousHour0To24: 12,
        continuousMinute0To60: 0,
        analogResolvedAppearance: {
          ringStroke: "#111",
          handStroke: "#222",
          faceFill: "#333",
        },
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    expect(handled).toBe(true);
    expect(items[0]?.kind).toBe("path2d");
    expect(items[1]?.kind).toBe("line");
    expect(items[2]?.kind).toBe("line");
    expect(items[3]?.kind).toBe("path2d");
    const textIdx = items.findIndex((i) => i.kind === "text" && "text" in i && i.text === "12");
    expect(textIdx).toBeGreaterThan(3);
  });

  it("boxedNumber highlight is a broad flat swash (not a tight backing plate or strip-scale plaque)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const size = 40;
    const tape = "12";
    const items: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "text",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: tape,
        displayLabel: "12",
        layout: { cx: 0, cy: 0, size },
        markerColor: "#000",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    const highlight = items.find((i) => i.kind === "rect");
    expect(highlight?.kind === "rect" && highlight.stroke).toBeUndefined();
    const g = noonHighlighted12SwashGeometryFromMarkerContentBox(size);
    const meanHalfH = (g.halfHAbove + g.halfHBelow) / 2;
    expect(meanHalfH / size).toBeGreaterThan(0.55);
    expect(g.halfW).toBeGreaterThan(size * 0.92);
    expect(g.halfW / meanHalfH).toBeGreaterThan(1.35);
    const textItem = items.find((i) => i.kind === "text");
    expect(textItem?.kind === "text").toBe(true);
    if (textItem?.kind === "text") {
      expect(textItem.text).toBe("12");
      // Scaled {@link boxedNumberTapeNumeralLayout} increases layout.size; resolved sizePx also applies inset + role typography.
      expect(textItem.font.sizePx).toBeGreaterThan(size);
    }
  });

  it("solarLunarPictogram midnight moon is weighted to balance sun (fill, scale, stroke)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "solarLunarPictogram" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "solarLunarPictogram" },
      },
    });
    const noonItems: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "12",
        layout: { cx: 100, cy: 50, size: 40 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      noonItems,
    );
    const midItems: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 0,
        tapeHourLabel: "00",
        displayLabel: "00",
        layout: { cx: 100, cy: 50, size: 40 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      midItems,
    );
    const noonDisk = noonItems.find((i) => i.kind === "path2d" && i.pathKind === "descriptor");
    const moonPath = midItems.find((i) => i.kind === "path2d" && i.pathKind === "descriptor");
    expect(noonDisk?.kind === "path2d" && noonDisk.pathKind === "descriptor").toBe(true);
    expect(moonPath?.kind === "path2d" && moonPath.pathKind === "descriptor").toBe(true);
    if (noonDisk?.kind === "path2d" && moonPath?.kind === "path2d") {
      expect(moonPath.strokeWidthPx).toBeGreaterThanOrEqual(noonDisk.strokeWidthPx ?? 0);
      expect(moonPath.fill?.endsWith("38")).toBe(true);
    }
  });

  it("solarLunarPictogram emits pictogram paths only (no embedded hour numeral text)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "solarLunarPictogram" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "solarLunarPictogram" },
      },
    });
    const items: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "12",
        layout: { cx: 100, cy: 50, size: 24 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    expect(items.some((i) => i.kind === "text")).toBe(false);
    expect(items.some((i) => i.kind === "path2d" || i.kind === "line")).toBe(true);
  });

  it("solarLunarPictogram + analogClock emits clock then pictogram only (no hour numeral)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "analogClock", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "solarLunarPictogram" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "analogClock", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "solarLunarPictogram" },
      },
    });
    const items: PlanItem[] = [];
    const handled = tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "analogClock",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "12",
        layout: { cx: 100, cy: 50, size: 32 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
        continuousHour0To24: 12,
        continuousMinute0To60: 0,
        analogResolvedAppearance: {
          ringStroke: "#111",
          handStroke: "#222",
          faceFill: "#333",
        },
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    expect(handled).toBe(true);
    expect(items[0]?.kind).toBe("path2d");
    expect(items[1]?.kind).toBe("line");
    expect(items[2]?.kind).toBe("line");
    expect(items[3]?.kind).toBe("path2d");
    expect(items.some((i) => i.kind === "text")).toBe(false);
  });

  it("boxedNumber + analogClock uses marker-content-box stroke extents (same model as text/radial)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "analogClock", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "analogClock", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const cx = 100;
    const cy = 50;
    const size = 24;
    const tape = "12";
    const items: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "analogClock",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: tape,
        displayLabel: "12",
        layout: { cx, cy, size },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
        continuousHour0To24: 12,
        continuousMinute0To60: 0,
        analogResolvedAppearance: {
          ringStroke: "#111",
          handStroke: "#222",
          faceFill: "#333",
        },
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    const g = noonHighlighted12SwashGeometryFromMarkerContentBox(size);
    const cySwash = cy + g.cyOffset;
    const rects = items.filter((i): i is Extract<PlanItem, { kind: "rect" }> => i.kind === "rect");
    expect(rects.length).toBe(1);
    const main = rects[0]!;
    expect(main.width).toBeCloseTo(g.halfW * 2, 8);
    expect(main.height).toBeCloseTo(g.halfHAbove + g.halfHBelow, 8);
    expect(main.x).toBeCloseTo(cx - g.halfW, 8);
    expect(main.y).toBeCloseTo(cySwash - g.halfHAbove, 8);
    expect(main.stroke).toBeUndefined();
    if (main.fill) {
      expect(main.fill).toMatch(/^rgba\(/);
    }
    if (eff.noonMidnightCustomization.enabled && eff.noonMidnightCustomization.expressionMode === "boxedNumber") {
      const c = eff.noonMidnightCustomization.boxedNumberBoxColor;
      const m = /^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i.exec(c);
      if (m && main.fill) {
        expect(main.fill).toContain(m[1]!);
      }
    }
    const rectIdx = items.findIndex((i) => i.kind === "rect");
    const lastClockIdx = items.findLastIndex((i) => i.kind === "path2d" || i.kind === "line");
    expect(rectIdx).toBeGreaterThan(lastClockIdx);
  });

  it("boxedNumber + radialLine emits radial then highlight then numeral (z-order)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialLine", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const items: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialLine",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "12",
        layout: { cx: 100, cy: 50, size: 24 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    const kinds = items.map((i) => i.kind);
    const lineIdx = kinds.indexOf("line");
    const rectIndices = kinds.map((k, i) => (k === "rect" ? i : -1)).filter((i) => i >= 0);
    expect(rectIndices.length).toBe(1);
    const lastRectIdx = Math.max(...rectIndices);
    const textIndices = kinds
      .map((k, i) => (k === "text" ? i : -1))
      .filter((i) => i >= 0);
    expect(lineIdx).toBeGreaterThanOrEqual(0);
    expect(rectIndices[0]!).toBeGreaterThan(lineIdx);
    expect(lastRectIdx).toBeGreaterThan(lineIdx);
    expect(textIndices.length).toBeGreaterThan(0);
    expect(textIndices.every((ti) => ti > lastRectIdx)).toBe(true);
  });

  it("boxedNumber + radialWedge emits wedge path then highlight then numeral (z-order)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialWedge", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "radialWedge", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const items: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "radialWedge",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "12",
        layout: { cx: 100, cy: 50, size: 24 },
        markerColor: "#223344",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    const kinds = items.map((i) => i.kind);
    const wedgeIdx = kinds.indexOf("path2d");
    const rectIndices = kinds.map((k, i) => (k === "rect" ? i : -1)).filter((i) => i >= 0);
    expect(rectIndices.length).toBe(1);
    const lastRectIdx = Math.max(...rectIndices);
    const textIndices = kinds.map((k, i) => (k === "text" ? i : -1)).filter((i) => i >= 0);
    expect(wedgeIdx).toBeGreaterThanOrEqual(0);
    expect(rectIndices[0]!).toBeGreaterThan(wedgeIdx);
    expect(lastRectIdx).toBeGreaterThan(wedgeIdx);
    expect(textIndices.length).toBeGreaterThan(0);
    expect(textIndices.every((ti) => ti > lastRectIdx)).toBe(true);
  });

  it("boxedNumber midnight 00 highlight rect stays centered on layout cy (not noon-12 asymmetric swash)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const cx = 50;
    const cy = 30;
    const size = 36;
    const items: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "text",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 0,
        tapeHourLabel: "00",
        displayLabel: "00",
        layout: { cx, cy, size },
        markerColor: "#000",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    const r = items.find((i): i is Extract<PlanItem, { kind: "rect" }> => i.kind === "rect");
    expect(r?.kind === "rect").toBe(true);
    const { halfW, halfH } = boxedNumberHighlightHalfExtentsFromMarkerContentBox(size, "00");
    if (r?.kind === "rect") {
      expect(r.x).toBeCloseTo(cx - halfW, 8);
      expect(r.y).toBeCloseTo(cy - halfH, 8);
      expect(r.width).toBeCloseTo(halfW * 2, 8);
      expect(r.height).toBeCloseTo(halfH * 2, 8);
    }
  });

  it("noon boxedNumber 12 highlight extends materially beyond the scaled tape numeral on all sides (render plan)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const size = 48;
    const cx = 120;
    const cy = 60;
    const items: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "text",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "12",
        layout: { cx, cy, size },
        markerColor: "#000",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    const textItem = items.find((i) => i.kind === "text");
    const rects = items.filter((i): i is Extract<PlanItem, { kind: "rect" }> => i.kind === "rect");
    expect(rects.length).toBe(1);
    expect(textItem?.kind === "text").toBe(true);
    const g = noonHighlighted12SwashGeometryFromMarkerContentBox(size);
    const main = rects[0]!;
    expect(main.width).toBeCloseTo(g.halfW * 2, 5);
    expect(main.height).toBeCloseTo(g.halfHAbove + g.halfHBelow, 5);
    // Swash is driven by marker content box `size`; numeral layout is scaled up — highlight should still span well past the glyph.
    const scaledNumeralLayoutSide = size * 1.12;
    expect(g.halfW).toBeGreaterThan(scaledNumeralLayoutSide * 0.72);
    expect((g.halfHAbove + g.halfHBelow) / 2).toBeGreaterThan(scaledNumeralLayoutSide * 0.36);
    if (textItem?.kind === "text") {
      expect(Math.abs(cx - textItem.x)).toBeLessThan(1e-6);
      expect(Math.abs(cy - textItem.y)).toBeLessThan(1e-6);
    }
  });

  it("noon boxedNumber 12 pushes single strip swash rect then text (paint order)", () => {
    const layout = DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG;
    const eff = resolveEffectiveTopBandHourMarkers({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const sel = effectiveTopBandHourMarkerSelection({
      ...layout,
      hourMarkers: {
        ...layout.hourMarkers,
        realization: { kind: "text", fontAssetId: "computer", appearance: {} },
        noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
      },
    });
    const items: PlanItem[] = [];
    tryEmitNoonMidnightIndicatorDiskContent(
      {
        realizationKind: "text",
        customization: eff.noonMidnightCustomization,
        structuralHour0To23: 12,
        tapeHourLabel: "12",
        displayLabel: "12",
        layout: { cx: 0, cy: 0, size: 32 },
        markerColor: "#445566",
        hourSpec: hourMarkerRepresentationSpecForTopBandEffectiveSelection(sel),
        effectiveTopBandHourMarkerSelection: sel,
        effectiveTopBandHourMarkers: eff,
      },
      { fontRegistry: defaultFontAssetRegistry },
      items,
    );
    const kinds = items.map((i) => i.kind);
    expect(kinds.filter((k) => k === "rect").length).toBe(1);
    expect(kinds[0]).toBe("rect");
    expect(kinds[1]).toBe("text");
    const main = items[0];
    expect(main?.kind === "rect").toBe(true);
    if (main?.kind === "rect") {
      const am = Number(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)$/.exec(main.fill ?? "")?.[1]);
      expect(am).toBeCloseTo(0.72, 5);
    }
  });
});
