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
  DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
} from "./appConfig.ts";
import {
  blackOrWhiteForegroundForBackgroundCss,
} from "../color/contrastForegroundOnCssBackground.ts";
import { DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR } from "./appConfig.ts";
import { resolveEffectiveTopBandHourMarkers } from "./topBandHourMarkersResolver.ts";
import { normalizeDisplayChromeLayout } from "./v2/librationConfig.ts";
import { buildSemanticTopBandHourMarkers } from "./topBandHourMarkersSemanticPlan.ts";
import {
  structuralColumnCenterLongitudeDeg,
  STRUCTURAL_LONGITUDE_DEG_PER_HOUR,
} from "./topBandHourMarkersSemanticTypes.ts";
import { CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST } from "./structuralZoneLetters.ts";

describe("buildSemanticTopBandHourMarkers", () => {
  it("produces exactly 24 instances", () => {
    const eff = resolveEffectiveTopBandHourMarkers(DEFAULT_DISPLAY_CHROME_LAYOUT_CONFIG);
    const plan = buildSemanticTopBandHourMarkers(eff);
    expect(plan.instances).toHaveLength(24);
    expect(plan.instances[0]!.indicatorEntryNoonMidnightRole).toBe("midnight");
    expect(plan.instances[12]!.indicatorEntryNoonMidnightRole).toBe("noon");
    expect(plan.instances[7]!.indicatorEntryNoonMidnightRole).toBe("none");
  });

  it("omits instances when indicator entries area is not visible", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          indicatorEntriesAreaVisible: false,
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const plan = buildSemanticTopBandHourMarkers(eff);
    expect(eff.areaVisible).toBe(false);
    expect(plan.instances).toHaveLength(0);
    expect(plan.source).toBe(eff);
  });

  it("structural anchors match stable longitude centers and NATO letters", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const plan = buildSemanticTopBandHourMarkers(eff);

    expect(plan.instances[0]!.structuralAnchor.centerLongitudeDeg).toBe(
      -180 + STRUCTURAL_LONGITUDE_DEG_PER_HOUR / 2,
    );
    expect(plan.instances[0]!.structuralAnchor.structuralZoneLetter).toBe(
      CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST[0],
    );

    expect(plan.instances[23]!.structuralHour0To23).toBe(23);
    expect(plan.instances[23]!.structuralAnchor.centerLongitudeDeg).toBe(
      structuralColumnCenterLongitudeDeg(23),
    );
    expect(plan.instances[23]!.structuralAnchor.structuralZoneLetter).toBe(
      CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST[23],
    );

    for (let h = 0; h < 24; h += 1) {
      expect(plan.instances[h]!.structuralHour0To23).toBe(h);
      expect(plan.instances[h]!.structuralAnchor.centerLongitudeDeg).toBe(
        structuralColumnCenterLongitudeDeg(h),
      );
      expect(plan.instances[h]!.structuralAnchor.structuralZoneLetter).toBe(
        CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST[h],
      );
    }
  });

  it("custom off yields default text instances when indicator entries area is visible", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "zeroes-two", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.areaVisible).toBe(true);
    expect(eff.realization).toEqual({
      kind: "text",
      fontAssetId: DEFAULT_TOP_BAND_TEXT_HOUR_MARKER_FONT_ASSET_ID,
      resolvedAppearance: {
        color: blackOrWhiteForegroundForBackgroundCss(DEFAULT_INDICATOR_ENTRIES_AREA_BACKGROUND_COLOR),
      },
    });

    const plan = buildSemanticTopBandHourMarkers(eff);
    expect(plan.source.areaVisible).toBe(true);
    for (const inst of plan.instances) {
      expect(inst.realization).toEqual(eff.realization);
      expect(inst.content.kind).toBe("hour24Label");
    }
  });

  it("text realization maps to hour24Label semantic content", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "text", fontAssetId: "computer", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    const plan = buildSemanticTopBandHourMarkers(eff);
    expect(eff.content.kind).toBe("hour24");
    for (const inst of plan.instances) {
      expect(inst.content).toEqual({
        kind: "hour24Label",
        structuralHour0To23: inst.structuralHour0To23,
      });
    }
  });

  it("analogClock resolves to staticZoneAnchored localWallClock semantics with per-zone wall clock state", () => {
    const eff = resolveEffectiveTopBandHourMarkers(
      normalizeDisplayChromeLayout({
        hourMarkers: {
          realization: { kind: "analogClock", appearance: {} },
          layout: { sizeMultiplier: 1 },
        },
      }),
    );
    expect(eff.realization.kind).toBe("analogClock");
    expect(eff.behavior).toBe("staticZoneAnchored");
    const t = Date.UTC(2024, 5, 15, 12, 30, 0);
    const plan = buildSemanticTopBandHourMarkers(eff, { referenceNowMs: t });
    expect(plan.instances).toHaveLength(24);
    for (const inst of plan.instances) {
      expect(inst.behavior).toBe("staticZoneAnchored");
      expect(inst.content.kind).toBe("localWallClock");
      if (inst.content.kind === "localWallClock") {
        expect(inst.content.structuralHour0To23).toBe(inst.structuralHour0To23);
        const wc = inst.content.wallClock;
        expect(wc.continuousHour0To24).toBeGreaterThanOrEqual(0);
        expect(wc.continuousHour0To24).toBeLessThan(24);
        expect(wc.hour0To23).toBeGreaterThanOrEqual(0);
        expect(wc.hour0To23).toBeLessThanOrEqual(23);
        expect(wc.minute0To59).toBeGreaterThanOrEqual(0);
        expect(wc.minute0To59).toBeLessThanOrEqual(59);
      }
    }
    const h0 = plan.instances[0]!;
    const h12 = plan.instances[12]!;
    if (h0.content.kind === "localWallClock" && h12.content.kind === "localWallClock") {
      expect(h0.content.wallClock.continuousHour0To24).not.toBeCloseTo(
        h12.content.wallClock.continuousHour0To24,
        4,
      );
    }
  });

  it("radialLine and radialWedge map to matching realization kinds and localWallClock semantic content", () => {
    const ref = Date.UTC(2024, 5, 15, 18, 42, 30);
    const line = buildSemanticTopBandHourMarkers(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "radialLine", appearance: {} },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ),
      { referenceNowMs: ref },
    );
    expect(line.source.realization.kind).toBe("radialLine");
    expect(line.source.content.kind).toBe("localWallClock");
    for (const inst of line.instances) {
      expect(inst.realization.kind).toBe("radialLine");
      expect(inst.content.kind).toBe("localWallClock");
      if (inst.content.kind === "localWallClock") {
        expect(inst.content.wallClock.continuousMinute0To60).toBeGreaterThanOrEqual(0);
        expect(inst.content.wallClock.continuousMinute0To60).toBeLessThan(60);
      }
    }

    const wedge = buildSemanticTopBandHourMarkers(
      resolveEffectiveTopBandHourMarkers(
        normalizeDisplayChromeLayout({
          hourMarkers: {
            realization: { kind: "radialWedge", appearance: {} },
            layout: { sizeMultiplier: 1 },
          },
        }),
      ),
      { referenceNowMs: ref },
    );
    expect(wedge.source.realization.kind).toBe("radialWedge");
    expect(wedge.source.content.kind).toBe("localWallClock");
    for (const inst of wedge.instances) {
      expect(inst.realization.kind).toBe("radialWedge");
      expect(inst.content.kind).toBe("localWallClock");
    }
  });
});
