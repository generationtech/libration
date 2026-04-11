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
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
  TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX,
  TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN,
} from "./appConfig";
import { defaultBehaviorFor, resolveEffectiveTopBandHourMarkers } from "./topBandHourMarkersResolver";
import { normalizeDisplayChromeLayout } from "./v2/librationConfig";

describe("defaultBehaviorFor", () => {
  it("maps realization kinds to resolver defaults", () => {
    expect(defaultBehaviorFor("text")).toBe("tapeAdvected");
    expect(defaultBehaviorFor("radialLine")).toBe("tapeAdvected");
    expect(defaultBehaviorFor("radialWedge")).toBe("tapeAdvected");
    expect(defaultBehaviorFor("analogClock")).toBe("staticZoneAnchored");
  });
});

describe("resolveEffectiveTopBandHourMarkers", () => {
  it("custom off → enabled + default text font + tapeAdvected + hour24", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: false,
            realization: { kind: "text", fontAssetId: "dseg7modern-regular" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ),
    ).toEqual({
      enabled: true,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization: {
        kind: "text",
        fontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
      },
      layout: { sizeMultiplier: 1 },
    });
  });

  it("text mode (custom on) → text realization with font; hour24 content", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "text", fontAssetId: "computer" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ),
    ).toEqual({
      enabled: true,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization: { kind: "text", fontAssetId: "computer" },
      layout: { sizeMultiplier: 1 },
    });
  });

  it("respects persisted behavior override", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            behavior: "staticZoneAnchored",
            realization: { kind: "text", fontAssetId: "computer" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ).behavior,
    ).toBe("staticZoneAnchored");
  });

  it("analog clock → analogClock realization + localWallClock + staticZoneAnchored behavior", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "analogClock" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ),
    ).toEqual({
      enabled: true,
      behavior: "staticZoneAnchored",
      content: { kind: "localWallClock" },
      realization: {
        kind: "analogClock",
        resolvedAppearance: {
          ringStroke: undefined,
          handStroke: undefined,
          faceFill: undefined,
        },
      },
      layout: { sizeMultiplier: 1 },
    });
  });

  it("radial line mapping", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "radialLine" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ),
    ).toEqual({
      enabled: true,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization: {
        kind: "radialLine",
        resolvedAppearance: { lineColor: undefined },
      },
      layout: { sizeMultiplier: 1 },
    });
  });

  it("radial wedge mapping", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "radialWedge" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ),
    ).toEqual({
      enabled: true,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization: {
        kind: "radialWedge",
        resolvedAppearance: { fillColor: undefined },
      },
      layout: { sizeMultiplier: 1 },
    });
  });

  it("size default and clamp", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: false,
            realization: { kind: "text", fontAssetId: "zeroes-one" },
            layout: { sizeMultiplier: Number.NaN },
          },
        }),
      ).layout.sizeMultiplier,
    ).toBe(1);

    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "text", fontAssetId: "zeroes-one" },
            layout: { sizeMultiplier: 0.3 },
          },
        }),
      ).layout.sizeMultiplier,
    ).toBe(TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN);

    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "text", fontAssetId: "zeroes-one" },
            layout: { sizeMultiplier: 3 },
          },
        }),
      ).layout.sizeMultiplier,
    ).toBe(TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX);
  });

  it("color omitted when absent or blank; present when set (custom on)", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "text", fontAssetId: "computer" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ).realization,
    ).toEqual({ kind: "text", fontAssetId: "computer" });

    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "text", fontAssetId: "computer", color: "  " },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ).realization,
    ).toEqual({ kind: "text", fontAssetId: "computer" });

    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "text", fontAssetId: "computer", color: "#abc" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ).realization,
    ).toEqual({ kind: "text", fontAssetId: "computer", color: "#abc" });
  });

  it("structured hourMarkers payload resolves consistently", () => {
    const structuredOnly = normalizeDisplayChromeLayout({
      hourMarkers: {
        customRepresentationEnabled: true,
        realization: { kind: "text", fontAssetId: "computer", color: "#abc" },
        layout: { sizeMultiplier: 1.25 },
      },
    });
    expect(resolveEffectiveTopBandHourMarkers(structuredOnly).realization).toEqual({
      kind: "text",
      fontAssetId: "computer",
      color: "#abc",
    });
    expect(resolveEffectiveTopBandHourMarkers(structuredOnly).layout.sizeMultiplier).toBe(1.25);
  });

  it("appearance fields override legacy color for glyph realizations", () => {
    const lay = normalizeDisplayChromeLayout({
      hourMarkers: {
        customRepresentationEnabled: true,
        realization: {
          kind: "radialLine",
          color: "#ff0000",
          appearance: { lineColor: "#00ff00" },
        },
        layout: { sizeMultiplier: 1 },
      },
    });
    const eff = resolveEffectiveTopBandHourMarkers(lay);
    expect(eff.realization).toEqual({
      kind: "radialLine",
      color: "#ff0000",
      resolvedAppearance: { lineColor: "#00ff00" },
    });
  });

  it("legacy color maps into resolved analog strokes when appearance omits hand", () => {
    const lay = normalizeDisplayChromeLayout({
      hourMarkers: {
        customRepresentationEnabled: true,
        realization: { kind: "analogClock", color: "#abc" },
        layout: { sizeMultiplier: 1 },
      },
    });
    expect(resolveEffectiveTopBandHourMarkers(lay).realization).toEqual({
      kind: "analogClock",
      color: "#abc",
      resolvedAppearance: {
        ringStroke: "#abc",
        handStroke: "#abc",
        faceFill: undefined,
      },
    });
  });

  it("analog appearance.faceColor resolves without tinting ring/hand when legacy absent", () => {
    const lay = normalizeDisplayChromeLayout({
      hourMarkers: {
        customRepresentationEnabled: true,
        realization: {
          kind: "analogClock",
          appearance: { faceColor: "#112233" },
        },
        layout: { sizeMultiplier: 1 },
      },
    });
    expect(resolveEffectiveTopBandHourMarkers(lay).realization).toEqual({
      kind: "analogClock",
      resolvedAppearance: {
        ringStroke: undefined,
        handStroke: undefined,
        faceFill: "#112233",
      },
    });
  });
});
