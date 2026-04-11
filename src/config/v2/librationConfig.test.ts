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
import librationConfigSource from "./librationConfig.ts?raw";
import { createLayerRegistryFromConfig } from "../../app/bootstrap";
import {
  DEFAULT_APP_CONFIG,
  DEFAULT_DATA_CONFIG,
  DEFAULT_DEMO_TIME_CONFIG,
  DEMO_TIME_SPEED_MAX,
  DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
  DEFAULT_GEOGRAPHY_CONFIG,
  DEFAULT_PIN_PRESENTATION,
  effectiveTopBandHourMarkerSelection,
  resolveCitiesForPins,
  type AppConfig,
} from "../appConfig";
import { ALL_DISPLAY_PRESET_IDS, getAppConfigForPreset } from "../displayPresets";
import { normalizeHourMarkersInput } from "../topBandHourMarkersPersistenceAdapter";
import {
  appConfigToV2,
  assertIsNormalizedLibrationConfig,
  cloneV2,
  defaultLibrationConfigV2,
  normalizeCustomPinsArray,
  normalizeDisplayChromeLayout,
  normalizeData,
  normalizeGeography,
  normalizeLibrationConfig,
  normalizePinPresentation,
  v2ToAppConfig,
} from "./librationConfig";

function sortLayerIds(registry: ReturnType<typeof createLayerRegistryFromConfig>): string[] {
  return [...registry.getLayers().map((l) => l.id)].sort();
}

describe("librationConfig v2 (Phase 1)", () => {
  it("cloneV2 returns a normalized deep clone", () => {
    const base = normalizeLibrationConfig(defaultLibrationConfigV2());
    const c = cloneV2(base);
    expect(c).toEqual(base);
    expect(c).not.toBe(base);
    expect(c.pins.reference.visibleCityIds).not.toBe(base.pins.reference.visibleCityIds);
  });

  it("default alignment: defaultLibrationConfigV2 equals appConfigToV2(DEFAULT_APP_CONFIG)", () => {
    expect(defaultLibrationConfigV2()).toEqual(appConfigToV2(DEFAULT_APP_CONFIG));
  });

  it("default normalization sets pins.custom to an empty array", () => {
    expect(defaultLibrationConfigV2().pins.custom).toEqual([]);
    expect(appConfigToV2(DEFAULT_APP_CONFIG).pins.custom).toEqual([]);
  });

  it("normalizeDisplayChromeLayout coerces invalid values to defaults", () => {
    expect(normalizeDisplayChromeLayout(undefined)).toEqual(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    expect(normalizeDisplayChromeLayout(null)).toEqual(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    expect(
      normalizeDisplayChromeLayout({
        bottomInformationBarVisible: "no",
        timezoneLetterRowVisible: 1,
      }),
    ).toEqual(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    expect(
      normalizeDisplayChromeLayout({
        bottomInformationBarVisible: false,
        timezoneLetterRowVisible: true,
      }),
    ).toEqual({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      bottomInformationBarVisible: false,
      timezoneLetterRowVisible: true,
    });
    expect(
      normalizeDisplayChromeLayout({
        bottomInformationBarVisible: true,
        timezoneLetterRowVisible: true,
        topChromeTheme: "neon",
      }),
    ).toEqual(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    expect(
      normalizeDisplayChromeLayout({
        bottomInformationBarVisible: true,
        timezoneLetterRowVisible: true,
        topChromeTheme: "paper",
      }).topChromeTheme,
    ).toBe("paper");
  });

  it("normalizeDisplayChromeLayout ignores unknown obsolete flat hour-marker property names", () => {
    const baseline = normalizeDisplayChromeLayout({});
    expect(
      normalizeDisplayChromeLayout({
        // Historical names; not part of the schema — ensures stray keys do not affect output.
        hourMarkerNumericRepresentation: "segment",
        topBandHourMarkersCustomRepresentationEnabled: true,
      }),
    ).toEqual(baseline);
  });

  it("normalizeDisplayChromeLayout normalizes only structured hourMarkers", () => {
    expect(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          customRepresentationEnabled: true,
          realization: { kind: "text", fontAssetId: "zeroes-one", color: "  #aabbcc  " },
          layout: { sizeMultiplier: 5 },
        },
      }),
    ).toEqual({
      ...DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
      hourMarkers: {
        customRepresentationEnabled: true,
        realization: { kind: "text", fontAssetId: "zeroes-one", color: "#aabbcc" },
        layout: { sizeMultiplier: 2 },
      },
    });
    expect(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          customRepresentationEnabled: true,
          realization: { kind: "text", fontAssetId: "kremlin" },
          layout: { sizeMultiplier: 0.25 },
        },
      }).hourMarkers.layout.sizeMultiplier,
    ).toBe(0.5);
  });

  it("effectiveTopBandHourMarkerSelection reads structured hourMarkers only", () => {
    expect(effectiveTopBandHourMarkerSelection(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG)).toEqual({
      kind: "text",
      fontAssetId: undefined,
      sizeMultiplier: 1,
    });
    expect(
      effectiveTopBandHourMarkerSelection(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "text", fontAssetId: "dotmatrix-regular" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ),
    ).toEqual({
      kind: "text",
      fontAssetId: "dotmatrix-regular",
      sizeMultiplier: 1,
    });
    expect(
      effectiveTopBandHourMarkerSelection(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            customRepresentationEnabled: true,
            realization: { kind: "radialWedge" },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ),
    ).toEqual({ kind: "glyph", glyphMode: "radialWedge", sizeMultiplier: 1 });
  });

  it("normalizeHourMarkersInput defaults for empty hourMarkers on layout input", () => {
    expect(normalizeHourMarkersInput(undefined)).toEqual(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG.hourMarkers);
  });

  it("normalizeData coerces invalid values to defaults", () => {
    expect(normalizeData(undefined)).toEqual(DEFAULT_DATA_CONFIG);
    expect(normalizeData(null)).toEqual(DEFAULT_DATA_CONFIG);
    expect(
      normalizeData({
        mode: "live",
        showDataAnnotations: "yes",
      }),
    ).toEqual(DEFAULT_DATA_CONFIG);
    expect(
      normalizeData({
        mode: "demo",
        showDataAnnotations: true,
      }),
    ).toEqual({
      mode: "demo",
      showDataAnnotations: true,
      demoTime: { ...DEFAULT_DEMO_TIME_CONFIG },
    });
  });

  it("normalizeData coerces demoTime fields safely", () => {
    expect(
      normalizeData({
        mode: "demo",
        showDataAnnotations: false,
        demoTime: {
          enabled: "yes" as unknown as boolean,
          startIsoUtc: "",
          speedMultiplier: -1,
        },
      }),
    ).toEqual({
      mode: "demo",
      showDataAnnotations: false,
      demoTime: {
        enabled: false,
        startIsoUtc: DEFAULT_DEMO_TIME_CONFIG.startIsoUtc,
        speedMultiplier: DEFAULT_DEMO_TIME_CONFIG.speedMultiplier,
      },
    });
    const validStart = "2040-01-01T00:00:00.000Z";
    expect(
      normalizeData({
        mode: "demo",
        demoTime: { enabled: true, startIsoUtc: validStart, speedMultiplier: 120 },
      }).demoTime,
    ).toEqual({
      enabled: true,
      startIsoUtc: validStart,
      speedMultiplier: 120,
    });
  });

  it("normalizeData clamps speedMultiplier to DEMO_TIME_SPEED_MAX", () => {
    const start = "2040-01-01T00:00:00.000Z";
    expect(
      normalizeData({
        mode: "demo",
        demoTime: {
          enabled: true,
          startIsoUtc: start,
          speedMultiplier: DEMO_TIME_SPEED_MAX + 1_000_000,
        },
      }).demoTime,
    ).toEqual({
      enabled: true,
      startIsoUtc: start,
      speedMultiplier: DEMO_TIME_SPEED_MAX,
    });
    expect(
      normalizeData({
        mode: "demo",
        demoTime: {
          enabled: true,
          startIsoUtc: start,
          speedMultiplier: DEMO_TIME_SPEED_MAX,
        },
      }).demoTime.speedMultiplier,
    ).toBe(DEMO_TIME_SPEED_MAX);
  });

  it("normalizePinPresentation coerces invalid values to defaults", () => {
    expect(normalizePinPresentation(undefined)).toEqual(DEFAULT_PIN_PRESENTATION);
    expect(normalizePinPresentation(null)).toEqual(DEFAULT_PIN_PRESENTATION);
    expect(
      normalizePinPresentation({
        showLabels: "yes",
        labelMode: "bogus",
        scale: 99,
      }),
    ).toEqual(DEFAULT_PIN_PRESENTATION);
    expect(
      normalizePinPresentation({
        showLabels: false,
        labelMode: "city",
        scale: "large",
      }),
    ).toEqual({
      showLabels: false,
      labelMode: "city",
      scale: "large",
    });
  });

  it("normalizeCustomPinsArray drops invalid entries and duplicate ids", () => {
    expect(
      normalizeCustomPinsArray([
        { id: "a", label: "A", latitude: 1, longitude: 2, enabled: true },
        null,
        { id: "", label: "x", latitude: 0, longitude: 0, enabled: true },
        { id: "b", label: "B", latitude: NaN, longitude: 0, enabled: true },
        { id: "a", label: "dup", latitude: 3, longitude: 4, enabled: false },
        { id: "c", label: "C", latitude: -10, longitude: 180, enabled: false },
      ]),
    ).toEqual([
      { id: "a", label: "A", latitude: 1, longitude: 2, enabled: true },
      { id: "c", label: "C", latitude: -10, longitude: 180, enabled: false },
    ]);
  });

  it("round-trip preserves custom pins on AppConfig", () => {
    const cfg: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      customPins: [
        { id: "p1", label: "One", latitude: 10.5, longitude: -20, enabled: true },
        { id: "p2", label: "Two", latitude: 0, longitude: 0, enabled: false },
      ],
    };
    expect(v2ToAppConfig(appConfigToV2(cfg))).toEqual(cfg);
  });

  it("round-trip preserves pin presentation on AppConfig", () => {
    const cfg: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      pinPresentation: {
        showLabels: false,
        labelMode: "city",
        scale: "large",
      },
    };
    expect(v2ToAppConfig(appConfigToV2(cfg))).toEqual(cfg);
  });

  it("round-trip preserves hour marker color on AppConfig (structured hourMarkers)", () => {
    const displayChromeLayout = normalizeDisplayChromeLayout({
      hourMarkers: {
        customRepresentationEnabled: true,
        realization: { kind: "text", fontAssetId: "zeroes-one", color: "#aabbcc" },
        layout: { sizeMultiplier: 1 },
      },
    });
    const cfg: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      displayChromeLayout,
    };
    expect(v2ToAppConfig(appConfigToV2(cfg))).toEqual(cfg);
  });

  it("round-trip preserves data domain on AppConfig", () => {
    const cfg: AppConfig = {
      ...DEFAULT_APP_CONFIG,
      data: {
        ...DEFAULT_DATA_CONFIG,
        mode: "demo",
        showDataAnnotations: true,
        demoTime: {
          enabled: true,
          startIsoUtc: "2042-03-04T08:00:00.000Z",
          speedMultiplier: 120,
        },
      },
    };
    expect(v2ToAppConfig(appConfigToV2(cfg))).toEqual(cfg);
  });

  it("round-trip: DEFAULT_APP_CONFIG -> v2 -> AppConfig is deep-equal to original", () => {
    const back = v2ToAppConfig(appConfigToV2(DEFAULT_APP_CONFIG));
    expect(back).toEqual(DEFAULT_APP_CONFIG);
  });

  it("round-trip: every factory preset via getAppConfigForPreset", () => {
    for (const id of ALL_DISPLAY_PRESET_IDS) {
      const original = getAppConfigForPreset(id);
      const back = v2ToAppConfig(appConfigToV2(original));
      expect(back).toEqual(original);
    }
  });

  it("normalized-shape invariants for appConfigToV2", () => {
    const samples: AppConfig[] = [
      DEFAULT_APP_CONFIG,
      getAppConfigForPreset("minimal"),
      getAppConfigForPreset("featuredCities"),
    ];
    for (const cfg of samples) {
      const v2 = appConfigToV2(cfg);
      assertIsNormalizedLibrationConfig(v2);
      expect(v2.meta.schemaVersion).toBe(2);
      expect(typeof v2.layers).toBe("object");
      expect(v2.pins.reference.visibleCityIds).toEqual([...cfg.visibleCityIds]);
      expect(Array.isArray(v2.pins.custom)).toBe(true);
      expect(v2.pins.custom).toEqual(normalizeCustomPinsArray(cfg.customPins));
      expect(v2.pins.presentation).toEqual(cfg.pinPresentation);
      expect(v2.geography).toEqual(DEFAULT_GEOGRAPHY_CONFIG);
      expect(v2.chrome.layout).toEqual(cfg.displayChromeLayout);
      expect(v2.data).toEqual(normalizeData(cfg.data));
      expect(normalizeLibrationConfig(v2)).toEqual(v2);
    }
  });

  it("v2ToAppConfig maps enabled custom pins into derived AppConfig", () => {
    const base = defaultLibrationConfigV2();
    const v2 = normalizeLibrationConfig({
      ...base,
      pins: {
        ...base.pins,
        custom: [
          { id: "x", label: "X", latitude: 1, longitude: 2, enabled: true },
          { id: "y", label: "Y", latitude: 3, longitude: 4, enabled: false },
        ],
      },
    });
    const app = v2ToAppConfig(v2);
    expect(app.customPins).toEqual([
      { id: "x", label: "X", latitude: 1, longitude: 2, enabled: true },
      { id: "y", label: "Y", latitude: 3, longitude: 4, enabled: false },
    ]);
  });

  it("pin-resolution equivalence: default and featuredCities preset", () => {
    const cases: AppConfig[] = [
      DEFAULT_APP_CONFIG,
      getAppConfigForPreset("featuredCities"),
    ];
    for (const original of cases) {
      const rt = v2ToAppConfig(appConfigToV2(original));
      expect(resolveCitiesForPins(rt)).toEqual(resolveCitiesForPins(original));
    }
  });

  it("layer registry equivalence after round-trip (all presets)", () => {
    for (const id of ALL_DISPLAY_PRESET_IDS) {
      const original = getAppConfigForPreset(id);
      const rt = v2ToAppConfig(appConfigToV2(original));
      const a = createLayerRegistryFromConfig(original);
      const b = createLayerRegistryFromConfig(rt);
      expect(sortLayerIds(b)).toEqual(sortLayerIds(a));
    }
  });

  it("normalizeGeography coerces invalid values to defaults", () => {
    expect(normalizeGeography(undefined)).toEqual(DEFAULT_GEOGRAPHY_CONFIG);
    expect(normalizeGeography({ referenceMode: "bogus" })).toEqual(DEFAULT_GEOGRAPHY_CONFIG);
    expect(
      normalizeGeography({
        referenceMode: "fixedCoordinate",
        fixedCoordinate: {
          latitude: NaN,
          longitude: 500,
          label: 123 as unknown as string,
        },
      }),
    ).toEqual({
      referenceMode: "fixedCoordinate",
      fixedCoordinate: { latitude: 0, longitude: 180, label: "" },
      showFixedCoordinateLabelInTimezoneStrip: false,
    });
  });

  it("normalizeGeography coerces invalid showFixedCoordinateLabelInTimezoneStrip to default", () => {
    expect(
      normalizeGeography({
        referenceMode: "greenwich",
        fixedCoordinate: { latitude: 0, longitude: 0, label: "" },
        showFixedCoordinateLabelInTimezoneStrip: "yes" as unknown as boolean,
      }),
    ).toEqual(DEFAULT_GEOGRAPHY_CONFIG);
  });

  it("normalizeDisplayChromeLayout: unusable hourMarkers falls back to defaults", () => {
    expect(normalizeDisplayChromeLayout({ hourMarkers: {} })).toEqual(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    expect(normalizeDisplayChromeLayout({ hourMarkers: { customRepresentationEnabled: true } })).toEqual(
      DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG,
    );
  });

  it("customRepresentationEnabled false on structured input resets canonical default text realization", () => {
    const lay = normalizeDisplayChromeLayout({
      hourMarkers: {
        customRepresentationEnabled: false,
        realization: { kind: "text", fontAssetId: "flip-clock" },
        layout: { sizeMultiplier: 1.5 },
      },
    });
    expect(lay.hourMarkers.customRepresentationEnabled).toBe(false);
    expect(lay.hourMarkers.realization).toEqual({
      kind: "text",
      fontAssetId: "zeroes-one",
    });
    expect(lay.hourMarkers.layout.sizeMultiplier).toBe(1.5);
  });

  it("assertIsNormalizedLibrationConfig validates structured hourMarkers", () => {
    assertIsNormalizedLibrationConfig(appConfigToV2(DEFAULT_APP_CONFIG));
    assertIsNormalizedLibrationConfig(
      normalizeLibrationConfig({
        ...defaultLibrationConfigV2(),
        chrome: {
          ...defaultLibrationConfigV2().chrome,
          layout: normalizeDisplayChromeLayout({
            hourMarkers: {
              customRepresentationEnabled: true,
              realization: { kind: "text", fontAssetId: "flip-clock" },
              layout: { sizeMultiplier: 1.75 },
            },
          }),
        },
      }),
    );
  });

  it("dependency boundary: librationConfig.ts imports only appConfig and hour-marker adapters", () => {
    const src = librationConfigSource;
    const importFrom = /from\s+["']([^"']+)["']/g;
    const specifiers: string[] = [];
    let m: RegExpExecArray | null;
    while ((m = importFrom.exec(src)) !== null) {
      specifiers.push(m[1]);
    }
    const allowed = new Set(["../appConfig", "../topBandHourMarkersPersistenceAdapter.ts"]);
    for (const spec of specifiers) {
      expect(allowed.has(spec), `unexpected import ${spec}`).toBe(true);
    }
  });
});
