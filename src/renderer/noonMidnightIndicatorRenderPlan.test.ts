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
import { tryEmitNoonMidnightIndicatorDiskContent } from "./noonMidnightIndicatorRenderPlan.ts";

describe("tryEmitNoonMidnightIndicatorDiskContent", () => {
  it("emits text-only for radialLine + textWords at noon and skips default radial", () => {
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
    const items: { kind: string; text?: string }[] = [];
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
    expect(items.some((i) => i.kind === "text" && i.text === "NOON")).toBe(true);
    expect(items.some((i) => i.kind === "line")).toBe(false);
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
    const items: { kind: string; stroke?: string }[] = [];
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
      expect(box?.stroke).toBe(eff.noonMidnightCustomization.boxedNumberBoxColor);
    }
  });
});
