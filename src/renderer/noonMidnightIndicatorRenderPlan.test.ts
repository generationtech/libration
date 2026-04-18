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
    }
    const glyphTextIdx = noonItems.findIndex((i) => i.kind === "text");
    const glyphPathIdx = noonItems.findIndex((i) => i.kind === "path2d");
    expect(glyphTextIdx).toBeGreaterThan(glyphPathIdx);
  });

  it("solarLunarPictogram emits decoration before numeral text (z-order)", () => {
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
    const textIdx = items.findIndex((i) => i.kind === "text");
    const firstDecor = items.findIndex((i) => i.kind === "path2d" || i.kind === "line");
    expect(firstDecor).toBeGreaterThanOrEqual(0);
    expect(textIdx).toBeGreaterThan(firstDecor);
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
});
