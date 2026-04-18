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
  blackOrWhiteForegroundForBackgroundCss,
  rgbaForegroundWithAlpha,
} from "../color/contrastForegroundOnCssBackground.ts";
import {
  halfwayRgbStringBetweenCssColors,
  interpolateRgbStringBetweenCssColors,
} from "../color/halfwayRgbBetweenCssColors.ts";
import {
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR,
  TOP_BAND_HOUR_MARKER_SIZE_MULT_MAX,
  TOP_BAND_HOUR_MARKER_SIZE_MULT_MIN,
} from "./appConfig";
import { defaultBehaviorFor, resolveEffectiveTopBandHourMarkers } from "./topBandHourMarkersResolver";
import { normalizeDisplayChromeLayout } from "./v2/librationConfig";

const INDICATOR_ENTRIES_AREA_DEFAULT = {
  effectiveBackgroundColor: DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR,
  effectiveForegroundColor: blackOrWhiteForegroundForBackgroundCss(
    DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR,
  ),
} as const;

const NOON_MIDNIGHT_DISABLED = { noonMidnightCustomization: { enabled: false as const } };

/** Default radial wedge fill: midpoint between indicator row background and contrast foreground. */
function defaultNonTextMidpointFill(): string {
  return halfwayRgbStringBetweenCssColors(
    INDICATOR_ENTRIES_AREA_DEFAULT.effectiveBackgroundColor,
    INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor,
  );
}

function defaultRadialWedgeStrokeFromIndicatorRow(): string {
  return rgbaForegroundWithAlpha(INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor, 0.45);
}

/** Default analog clock face fill when no faceColor override: 1/4 from row background toward resolved stroke color. */
function defaultAnalogFaceFillFromIndicatorRow(): string {
  return interpolateRgbStringBetweenCssColors(
    INDICATOR_ENTRIES_AREA_DEFAULT.effectiveBackgroundColor,
    INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor,
    0.25,
  );
}

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
      areaVisible: true,
      indicatorEntriesArea: INDICATOR_ENTRIES_AREA_DEFAULT,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization: {
        kind: "text",
        fontAssetId: "dseg7modern-regular",
        resolvedAppearance: { color: INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor },
      },
      layout: { sizeMultiplier: 1 },
      ...NOON_MIDNIGHT_DISABLED,
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
      areaVisible: true,
      indicatorEntriesArea: INDICATOR_ENTRIES_AREA_DEFAULT,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization: {
        kind: "text",
        fontAssetId: "computer",
        resolvedAppearance: { color: INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor },
      },
      layout: { sizeMultiplier: 1 },
      ...NOON_MIDNIGHT_DISABLED,
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
      areaVisible: true,
      indicatorEntriesArea: INDICATOR_ENTRIES_AREA_DEFAULT,
      behavior: "staticZoneAnchored",
      content: { kind: "localWallClock" },
      realization: {
        kind: "analogClock",
        resolvedAppearance: {
          ringStroke: INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor,
          handStroke: INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor,
          faceFill: defaultAnalogFaceFillFromIndicatorRow(),
        },
      },
      layout: { sizeMultiplier: 1 },
      ...NOON_MIDNIGHT_DISABLED,
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
      areaVisible: true,
      indicatorEntriesArea: INDICATOR_ENTRIES_AREA_DEFAULT,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization: {
        kind: "radialLine",
        resolvedAppearance: { lineColor: INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor },
      },
      layout: { sizeMultiplier: 1 },
      ...NOON_MIDNIGHT_DISABLED,
    });
  });

  it("non-text realization ignores authored noonMidnightCustomization in the effective model", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
          noonMidnightCustomization: { enabled: true, expressionMode: "semanticGlyph" },
        },
      }),
    );
    expect(eff.noonMidnightCustomization).toEqual({ enabled: false });
  });

  it("noon/midnight boxedNumber resolves halfway box color from indicator row bg/fg", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
          noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
        },
      }),
    );
    expect(eff.noonMidnightCustomization).toEqual({
      enabled: true,
      expressionMode: "boxedNumber",
      boxedNumberBoxColor: halfwayRgbStringBetweenCssColors(
        INDICATOR_ENTRIES_AREA_DEFAULT.effectiveBackgroundColor,
        INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor,
      ),
    });
  });

  it("canonical default hour markers yield effective noon/midnight customization for text realization", () => {
    const eff = resolveEffectiveTopBandHourMarkers(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    expect(eff.noonMidnightCustomization).toEqual({
      enabled: true,
      expressionMode: "boxedNumber",
      boxedNumberBoxColor: halfwayRgbStringBetweenCssColors(
        INDICATOR_ENTRIES_AREA_DEFAULT.effectiveBackgroundColor,
        INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor,
      ),
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
      areaVisible: true,
      indicatorEntriesArea: INDICATOR_ENTRIES_AREA_DEFAULT,
      behavior: "tapeAdvected",
      content: { kind: "hour24" },
      realization: {
        kind: "radialWedge",
        resolvedAppearance: {
          fillColor: defaultNonTextMidpointFill(),
          strokeColor: defaultRadialWedgeStrokeFromIndicatorRow(),
        },
      },
      layout: { sizeMultiplier: 1 },
      ...NOON_MIDNIGHT_DISABLED,
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
    ).toBe(1.25);

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
      resolvedAppearance: { color: INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor },
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
      resolvedAppearance: { color: INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor },
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
        faceFill: interpolateRgbStringBetweenCssColors(
          INDICATOR_ENTRIES_AREA_DEFAULT.effectiveBackgroundColor,
          "#abc",
          0.25,
        ),
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
        ringStroke: INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor,
        handStroke: INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor,
        faceFill: "#112233",
      },
    });
  });

  it("indicatorEntriesAreaVisible false sets effective.areaVisible false", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaVisible: false,
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.areaVisible).toBe(false);
    expect(eff.realization.kind).toBe("text");
  });

  it("areaVisible defaults true when indicatorEntriesAreaVisible is omitted", () => {
    const hourMarkers = { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers };
    delete (hourMarkers as { indicatorEntriesAreaVisible?: boolean }).indicatorEntriesAreaVisible;
    const layout = { ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG, hourMarkers };
    expect(resolveEffectiveTopBandHourMarkers(layout).areaVisible).toBe(true);
  });

  it("text markers without author color use contrast-derived foreground", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect((eff.realization as { resolvedAppearance: { color: string } }).resolvedAppearance.color).toBe(
      INDICATOR_ENTRIES_AREA_DEFAULT.effectiveForegroundColor,
    );
  });

  it("light indicator entries background yields dark foreground", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaBackgroundColor: "#ffffff",
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.indicatorEntriesArea.effectiveBackgroundColor).toBe("#ffffff");
    expect(eff.indicatorEntriesArea.effectiveForegroundColor).toBe("#000000");
    expect((eff.realization as { resolvedAppearance: { color: string } }).resolvedAppearance.color).toBe(
      "#000000",
    );
  });

  it("dark indicator entries background yields light foreground", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaBackgroundColor: "#000000",
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.indicatorEntriesArea.effectiveForegroundColor).toBe("#ffffff");
  });

  it("text appearance.color overrides ink only; indicator entries background is unchanged", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaBackgroundColor: "#112233",
          realization: { kind: "text", fontAssetId: "computer", appearance: { color: "#fedcba" } },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.indicatorEntriesArea.effectiveBackgroundColor).toBe("#112233");
    expect((eff.realization as { resolvedAppearance: { color: string } }).resolvedAppearance.color).toBe("#fedcba");
  });

  it("analogClock default face fill is one quarter of the way from indicator row background toward resolved stroke color", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "analogClock", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.realization.kind).toBe("analogClock");
    if (eff.realization.kind !== "analogClock") {
      throw new Error("expected analogClock");
    }
    const { effectiveBackgroundColor, effectiveForegroundColor } = eff.indicatorEntriesArea;
    expect(eff.realization.resolvedAppearance.faceFill).toBe(
      interpolateRgbStringBetweenCssColors(effectiveBackgroundColor, effectiveForegroundColor, 0.25),
    );
  });

  it("analogClock default face fill differs from noon/midnight boxedNumber midpoint for the same row bg/fg", () => {
    const analog = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "analogClock", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const textBoxed = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
          noonMidnightCustomization: { enabled: true, expressionMode: "boxedNumber" },
        },
      }),
    );
    expect(analog.realization.kind).toBe("analogClock");
    expect(textBoxed.noonMidnightCustomization.enabled).toBe(true);
    if (analog.realization.kind !== "analogClock" || !textBoxed.noonMidnightCustomization.enabled) {
      throw new Error("unexpected effective models");
    }
    const boxedMid = textBoxed.noonMidnightCustomization.boxedNumberBoxColor;
    expect(boxedMid).toBe(
      halfwayRgbStringBetweenCssColors(
        analog.indicatorEntriesArea.effectiveBackgroundColor,
        analog.indicatorEntriesArea.effectiveForegroundColor,
      ),
    );
    expect(analog.realization.resolvedAppearance.faceFill).not.toBe(boxedMid);
    expect(analog.realization.resolvedAppearance.faceFill).toBe(
      interpolateRgbStringBetweenCssColors(
        analog.indicatorEntriesArea.effectiveBackgroundColor,
        analog.indicatorEntriesArea.effectiveForegroundColor,
        0.25,
      ),
    );
  });

  it("radialWedge default fill is halfway between indicator row background and contrast foreground", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "radialWedge", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.realization.kind).toBe("radialWedge");
    if (eff.realization.kind !== "radialWedge") {
      throw new Error("expected radialWedge");
    }
    expect(eff.realization.resolvedAppearance.fillColor).toBe(
      halfwayRgbStringBetweenCssColors(
        eff.indicatorEntriesArea.effectiveBackgroundColor,
        eff.indicatorEntriesArea.effectiveForegroundColor,
      ),
    );
    expect(eff.realization.resolvedAppearance.strokeColor).toBe(
      rgbaForegroundWithAlpha(eff.indicatorEntriesArea.effectiveForegroundColor, 0.45),
    );
  });

  it("radialWedge appearance.fillColor overrides derived default fill", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "radialWedge", appearance: { fillColor: "#c0ffee" } },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.realization.kind).toBe("radialWedge");
    if (eff.realization.kind !== "radialWedge") {
      throw new Error("expected radialWedge");
    }
    expect(eff.realization.resolvedAppearance.fillColor).toBe("#c0ffee");
    expect(eff.realization.resolvedAppearance.strokeColor).toBe(
      rgbaForegroundWithAlpha(eff.indicatorEntriesArea.effectiveForegroundColor, 0.45),
    );
  });

  it("radialLine uses contrast foreground on light and dark indicator entries backgrounds", () => {
    const light = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaBackgroundColor: "#ffffff",
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const dark = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaBackgroundColor: "#000000",
          realization: { kind: "radialLine", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(light.realization.kind).toBe("radialLine");
    expect(dark.realization.kind).toBe("radialLine");
    if (light.realization.kind !== "radialLine" || dark.realization.kind !== "radialLine") {
      throw new Error("expected radialLine");
    }
    expect(light.realization.resolvedAppearance.lineColor).toBe("#000000");
    expect(dark.realization.resolvedAppearance.lineColor).toBe("#ffffff");
  });

  it("radialWedge default stroke tracks contrast foreground on light and dark indicator entries backgrounds", () => {
    const light = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaBackgroundColor: "#ffffff",
          realization: { kind: "radialWedge", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const dark = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaBackgroundColor: "#000000",
          realization: { kind: "radialWedge", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(light.realization.kind).toBe("radialWedge");
    expect(dark.realization.kind).toBe("radialWedge");
    if (light.realization.kind !== "radialWedge" || dark.realization.kind !== "radialWedge") {
      throw new Error("expected radialWedge");
    }
    expect(light.realization.resolvedAppearance.strokeColor).toBe(rgbaForegroundWithAlpha("#000000", 0.45));
    expect(dark.realization.resolvedAppearance.strokeColor).toBe(rgbaForegroundWithAlpha("#ffffff", 0.45));
  });

  it("analogClock without handColor uses contrast strokes on light and dark indicator entries backgrounds", () => {
    const lightBg = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaBackgroundColor: "#ffffff",
          realization: { kind: "analogClock", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const darkBg = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaBackgroundColor: "#000000",
          realization: { kind: "analogClock", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const rLight = lightBg.realization;
    const rDark = darkBg.realization;
    if (rLight.kind !== "analogClock" || rDark.kind !== "analogClock") {
      throw new Error("expected analogClock");
    }
    expect(rLight.resolvedAppearance.handStroke).toBe("#000000");
    expect(rLight.resolvedAppearance.ringStroke).toBe("#000000");
    expect(rDark.resolvedAppearance.handStroke).toBe("#ffffff");
    expect(rDark.resolvedAppearance.ringStroke).toBe("#ffffff");
    expect(rLight.resolvedAppearance.faceFill).toBe(
      interpolateRgbStringBetweenCssColors("#ffffff", "#000000", 0.25),
    );
    expect(rDark.resolvedAppearance.faceFill).toBe(
      interpolateRgbStringBetweenCssColors("#000000", "#ffffff", 0.25),
    );
  });
});
