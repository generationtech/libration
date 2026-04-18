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
  boxedNumberStrokeHalfExtentsFromMarkerContentBox,
  TEXT_WORDS_NOON_MIDNIGHT_LAYOUT_SIZE_FRAC,
  tryEmitNoonMidnightIndicatorDiskContent,
} from "./noonMidnightIndicatorRenderPlan.ts";
import type { RenderPlan } from "./renderPlan/renderPlanTypes.ts";

type PlanItem = RenderPlan["items"][number];

describe("boxedNumberStrokeHalfExtentsFromMarkerContentBox", () => {
  it("scales half extents with marker content box size (layout.size), not hardcoded px", () => {
    const a = boxedNumberStrokeHalfExtentsFromMarkerContentBox(24, "12");
    const b = boxedNumberStrokeHalfExtentsFromMarkerContentBox(48, "12");
    expect(b.halfW).toBeCloseTo(a.halfW * 2, 8);
    expect(b.halfH).toBeCloseTo(a.halfH * 2, 8);
  });

  it("widens for longer labels at the same box size", () => {
    const short = boxedNumberStrokeHalfExtentsFromMarkerContentBox(40, "0");
    const long = boxedNumberStrokeHalfExtentsFromMarkerContentBox(40, "0000");
    expect(long.halfW).toBeGreaterThan(short.halfW);
  });
});

describe("tryEmitNoonMidnightIndicatorDiskContent", () => {
  it("textWords + radialWedge keeps wedge path then NOON/MIDNIGHT text overlay (realization-local)", () => {
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
    const midTextIdx = midItems.findIndex(
      (i) => i.kind === "text" && "text" in i && i.text === "MIDNIGHT",
    );
    expect(midWedgeIdx).toBeGreaterThanOrEqual(0);
    expect(midTextIdx).toBeGreaterThan(midWedgeIdx);
  });

  it("textWords NOON/MIDNIGHT word overlay uses smaller layout than full marker box (reduces crowding)", () => {
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
    const items: PlanItem[] = [];
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
      items,
    );
    const noonWord = items.find((i) => i.kind === "text" && "text" in i && i.text === "NOON");
    expect(noonWord?.kind === "text").toBe(true);
    if (noonWord?.kind === "text") {
      expect(noonWord.font.sizePx).toBeLessThan(markerSize * 0.9);
      expect(noonWord.font.sizePx).toBeCloseTo(markerSize * TEXT_WORDS_NOON_MIDNIGHT_LAYOUT_SIZE_FRAC, 5);
    }
  });

  it("textWords + radialLine keeps radial stroke then NOON/MIDNIGHT text overlay (realization-local)", () => {
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

  it("boxedNumber includes rect stroke with resolved box color for text", () => {
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
    const box = items.find((i) => i.kind === "rect");
    expect(box).toBeDefined();
    if (eff.noonMidnightCustomization.enabled && eff.noonMidnightCustomization.expressionMode === "boxedNumber") {
      expect(box && "stroke" in box ? box.stroke : undefined).toBe(eff.noonMidnightCustomization.boxedNumberBoxColor);
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
    const numeralBoxSide = 2 * half * 0.52;
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

  it("boxedNumber plaque uses materially larger strip-scale frame and stronger stroke than a numeral-tight box", () => {
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
    const box = items.find((i) => i.kind === "rect");
    expect(box && "strokeWidthPx" in box ? box.strokeWidthPx : undefined).toBe(Math.max(3, size * 0.17));
    const { halfW, halfH } = boxedNumberStrokeHalfExtentsFromMarkerContentBox(size, tape);
    expect(halfH / size).toBeGreaterThanOrEqual(0.6);
    expect(halfH).toBeCloseTo(size * 0.62, 8);
    expect(halfW).toBeGreaterThanOrEqual(size * 0.72);
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
    const { halfW, halfH } = boxedNumberStrokeHalfExtentsFromMarkerContentBox(size, tape);
    const box = items.find((i) => i.kind === "rect");
    expect(box && "width" in box ? box.width : undefined).toBeCloseTo(halfW * 2, 8);
    expect(box && "height" in box ? box.height : undefined).toBeCloseTo(halfH * 2, 8);
    expect(box && "x" in box ? box.x : undefined).toBeCloseTo(cx - halfW, 8);
    expect(box && "y" in box ? box.y : undefined).toBeCloseTo(cy - halfH, 8);
    expect(box && "strokeWidthPx" in box ? box.strokeWidthPx : undefined).toBe(Math.max(3, size * 0.17));
    if (eff.noonMidnightCustomization.enabled && eff.noonMidnightCustomization.expressionMode === "boxedNumber") {
      expect(box && "stroke" in box ? box.stroke : undefined).toBe(eff.noonMidnightCustomization.boxedNumberBoxColor);
    }
    const rectIdx = items.findIndex((i) => i.kind === "rect");
    const lastClockIdx = items.findLastIndex((i) => i.kind === "path2d" || i.kind === "line");
    expect(rectIdx).toBeGreaterThan(lastClockIdx);
  });

  it("boxedNumber + radialLine emits radial then box then numeral (z-order)", () => {
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
    const rectIdx = kinds.indexOf("rect");
    const textIndices = kinds
      .map((k, i) => (k === "text" ? i : -1))
      .filter((i) => i >= 0);
    expect(lineIdx).toBeGreaterThanOrEqual(0);
    expect(rectIdx).toBeGreaterThan(lineIdx);
    expect(textIndices.length).toBeGreaterThan(0);
    expect(textIndices.every((ti) => ti > rectIdx)).toBe(true);
  });

  it("boxedNumber + radialWedge emits wedge path then box then numeral (z-order)", () => {
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
    const rectIdx = kinds.indexOf("rect");
    const textIndices = kinds.map((k, i) => (k === "text" ? i : -1)).filter((i) => i >= 0);
    expect(wedgeIdx).toBeGreaterThanOrEqual(0);
    expect(rectIdx).toBeGreaterThan(wedgeIdx);
    expect(textIndices.length).toBeGreaterThan(0);
    expect(textIndices.every((ti) => ti > rectIdx)).toBe(true);
  });
});
