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
import { TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX, TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN } from "./appConfig";
import {
  DEFAULT_ANALOG_FACE_FILL,
  DEFAULT_ANALOG_HAND_COLOR,
  DEFAULT_ANALOG_RING_COLOR,
} from "./topBandHourMarkersDefaults.ts";
import { defaultBehaviorFor, resolveEffectiveTopBandHourMarkers } from "./topBandHourMarkersResolver";
import { getTopChromeStyle } from "./topChromeStyle.ts";
import { normalizeDisplayChromeLayout } from "./v2/librationConfig";

const inkNeutral = getTopChromeStyle("neutral").hourIndicatorEntries;
const inkPaper = getTopChromeStyle("paper").hourIndicatorEntries;

describe("defaultBehaviorFor", () => {
  it("maps realization kinds to resolver defaults", () => {
    expect(defaultBehaviorFor("text")).toBe("tapeAdvected");
    expect(defaultBehaviorFor("radialLine")).toBe("tapeAdvected");
    expect(defaultBehaviorFor("radialWedge")).toBe("tapeAdvected");
    expect(defaultBehaviorFor("analogClock")).toBe("staticZoneAnchored");
  });
});

describe("resolveEffectiveTopBandHourMarkers", () => {
  it("structured text uses persisted font + tapeAdvected + hour24", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "text", fontAssetId: "dseg7modern-regular", appearance: {} },
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
        fontAssetId: "dseg7modern-regular",
        resolvedAppearance: { color: inkNeutral.defaultForeground },
      },
      layout: { sizeMultiplier: 1 },
    });
  });

  it("structured text with computer font → hour24 content", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "text", fontAssetId: "computer", appearance: {} },
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
        fontAssetId: "computer",
        resolvedAppearance: { color: inkNeutral.defaultForeground },
      },
      layout: { sizeMultiplier: 1 },
    });
  });

  it("respects persisted behavior override", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            behavior: "staticZoneAnchored",
            realization: { kind: "text", fontAssetId: "computer", appearance: {} },
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
            realization: { kind: "analogClock", appearance: {} },
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
          ringStroke: DEFAULT_ANALOG_RING_COLOR,
          handStroke: DEFAULT_ANALOG_HAND_COLOR,
          faceFill: DEFAULT_ANALOG_FACE_FILL,
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
            realization: { kind: "radialLine", appearance: {} },
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
        resolvedAppearance: { lineColor: inkNeutral.defaultForeground },
      },
      layout: { sizeMultiplier: 1 },
    });
  });

  it("radial wedge mapping", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "radialWedge", appearance: {} },
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
        resolvedAppearance: { fillColor: inkNeutral.defaultRadialWedgeFill },
      },
      layout: { sizeMultiplier: 1 },
    });
  });

  it("size default and clamp", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
            layout: { sizeMultiplier: Number.NaN },
          },
        }),
      ).layout.sizeMultiplier,
    ).toBe(1);

    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
            layout: { sizeMultiplier: 0.3 },
          },
        }),
      ).layout.sizeMultiplier,
    ).toBe(TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN);

    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
            layout: { sizeMultiplier: 3 },
          },
        }),
      ).layout.sizeMultiplier,
    ).toBe(TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX);
  });

  it("appearance.color omitted when absent or blank; present when set", () => {
    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "text", fontAssetId: "computer", appearance: {} },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ).realization,
    ).toEqual({
      kind: "text",
      fontAssetId: "computer",
      resolvedAppearance: { color: inkNeutral.defaultForeground },
    });

    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "text", fontAssetId: "computer", appearance: { color: "  " } },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ).realization,
    ).toEqual({
      kind: "text",
      fontAssetId: "computer",
      resolvedAppearance: { color: inkNeutral.defaultForeground },
    });

    expect(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "text", fontAssetId: "computer", appearance: { color: "#abc" } },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ).realization,
    ).toEqual({
      kind: "text",
      fontAssetId: "computer",
      resolvedAppearance: { color: "#abc" },
    });
  });

  it("structured hourMarkers payload resolves consistently", () => {
    const structuredOnly = normalizeDisplayChromeLayout({
      hourMarkers: {
        realization: { kind: "text", fontAssetId: "computer", appearance: { color: "#abc" } },
        layout: { sizeMultiplier: 1.25 },
      },
    });
    expect(resolveEffectiveTopBandHourMarkers(structuredOnly).realization).toEqual({
      kind: "text",
      fontAssetId: "computer",
      resolvedAppearance: { color: "#abc" },
    });
    expect(resolveEffectiveTopBandHourMarkers(structuredOnly).layout.sizeMultiplier).toBe(1.25);
  });

  it("passes through optional content-row padding on the effective layout", () => {
    const lay = normalizeDisplayChromeLayout({
      hourMarkers: {
        realization: { kind: "text", fontAssetId: "zeroes-one", appearance: {} },
        layout: { sizeMultiplier: 1, contentPaddingTopPx: 2, contentPaddingBottomPx: -3 },
      },
    });
    expect(resolveEffectiveTopBandHourMarkers(lay).layout).toEqual({
      sizeMultiplier: 1,
      contentPaddingTopPx: 2,
      contentPaddingBottomPx: -3,
    });
  });

  it("appearance fields override defaults for glyph realizations", () => {
    const lay = normalizeDisplayChromeLayout({
      hourMarkers: {
        realization: {
          kind: "radialLine",
          appearance: { lineColor: "#00ff00" },
        },
        layout: { sizeMultiplier: 1 },
      },
    });
    const eff = resolveEffectiveTopBandHourMarkers(lay);
    expect(eff.realization).toEqual({
      kind: "radialLine",
      resolvedAppearance: { lineColor: "#00ff00" },
    });
  });

  it("analog appearance.handColor tints ring and hand when set", () => {
    const lay = normalizeDisplayChromeLayout({
      hourMarkers: {
        realization: { kind: "analogClock", appearance: { handColor: "#abc" } },
        layout: { sizeMultiplier: 1 },
      },
    });
    expect(resolveEffectiveTopBandHourMarkers(lay).realization).toEqual({
      kind: "analogClock",
      resolvedAppearance: {
        ringStroke: "#abc",
        handStroke: "#abc",
        faceFill: DEFAULT_ANALOG_FACE_FILL,
      },
    });
  });

  it("analog appearance.faceColor resolves without tinting ring/hand when hand absent", () => {
    const lay = normalizeDisplayChromeLayout({
      hourMarkers: {
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
        ringStroke: DEFAULT_ANALOG_RING_COLOR,
        handStroke: DEFAULT_ANALOG_HAND_COLOR,
        faceFill: "#112233",
      },
    });
  });

  it("indicatorEntriesAreaVisible false sets effective.enabled false", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaVisible: false,
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.enabled).toBe(false);
    expect(eff.realization.kind).toBe("text");
  });

  it("paper palette uses dark default text ink on light circle bed", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        topChromePalette: "paper",
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect((eff.realization as { resolvedAppearance: { color: string } }).resolvedAppearance.color).toBe(
      inkPaper.defaultForeground,
    );
  });
});
