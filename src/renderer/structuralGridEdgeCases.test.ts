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

/**
 * Phase 9a — structural / seam / 15° boundary edge cases.
 * Longitude-first 24-sector model: invariants at ±180°, sector edges, and viewport wrap tiling.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_DISPLAY_TIME_CONFIG, DEFAULT_GEOGRAPHY_CONFIG } from "../config/appConfig";
import {
  CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST,
  STRUCTURAL_ZONE_COLUMN_COUNT,
  structuralZoneLetterFromIndex,
} from "../config/structuralZoneLetters";
import {
  longitudeDegFromMapX,
  mapXFromLongitudeDeg,
} from "../core/equirectangularProjection";
import {
  buildUtcTopScaleLayout,
  militaryTimeZoneLetterFromLongitudeDeg,
  militaryTimeZoneLetterFromStructuralColumnIndex,
  nominalUtcOffsetHoursFromLongitudeDeg,
  presentTimeIndicatorXFromReferenceLongitudeDeg,
  resolveTopBandTimeFromConfig,
  roundedMeanSolarUtcOffsetHours,
  structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg,
  structuralHourIndexFromReferenceLongitudeDeg,
  topBandWrapOffsetsForSpan,
} from "./displayChrome";
import { resolveTopBandAnchorLongitudeDeg } from "./topBandAnchorLongitude";

/** Intentionally small epsilons for boundary-adjacent longitudes (float-safe). */
const EPS = 1e-6;

describe("Phase 9a — structuralHourIndexFromReferenceLongitudeDeg (±180°, 15° edges)", () => {
  it("maps exactly 24 fixed sectors; indices are always in 0…23", () => {
    const samples: number[] = [
      -180,
      180,
      -179.999_999,
      179.999_999,
      0,
      ...Array.from({ length: 25 }, (_, i) => -180 + (i * 360) / 24),
    ];
    for (const lon of samples) {
      const h = structuralHourIndexFromReferenceLongitudeDeg(lon);
      expect(h).toBeGreaterThanOrEqual(0);
      expect(h).toBeLessThanOrEqual(23);
    }
    expect(STRUCTURAL_ZONE_COLUMN_COUNT).toBe(24);
  });

  it("IDL seam: −180° and +180° fall in westmost and eastmost columns (wrap-identical meridian, distinct sectors)", () => {
    expect(structuralHourIndexFromReferenceLongitudeDeg(-180)).toBe(0);
    expect(structuralHourIndexFromReferenceLongitudeDeg(180)).toBe(23);
    expect(structuralHourIndexFromReferenceLongitudeDeg(-179.999_999)).toBe(0);
    expect(structuralHourIndexFromReferenceLongitudeDeg(179.999_999)).toBe(23);
  });

  it("is monotone non-decreasing in east longitude over [−180°, +180°] (stable west→east column ordering)", () => {
    const steps = 400;
    let prev = structuralHourIndexFromReferenceLongitudeDeg(-180);
    for (let i = 1; i <= steps; i += 1) {
      const lon = -180 + (i / steps) * 360;
      const h = structuralHourIndexFromReferenceLongitudeDeg(lon);
      expect(h).toBeGreaterThanOrEqual(prev);
      prev = h;
    }
  });

  it("half-open longitudes except eastern rim: interior boundaries belong to the eastern sector", () => {
    expect(structuralHourIndexFromReferenceLongitudeDeg(-165 - EPS)).toBe(0);
    expect(structuralHourIndexFromReferenceLongitudeDeg(-165)).toBe(1);
    expect(structuralHourIndexFromReferenceLongitudeDeg(-165 + EPS)).toBe(1);
    expect(structuralHourIndexFromReferenceLongitudeDeg(0 - EPS)).toBe(11);
    expect(structuralHourIndexFromReferenceLongitudeDeg(0)).toBe(12);
    expect(structuralHourIndexFromReferenceLongitudeDeg(0 + EPS)).toBe(12);
    expect(structuralHourIndexFromReferenceLongitudeDeg(165 - EPS)).toBe(22);
    expect(structuralHourIndexFromReferenceLongitudeDeg(165)).toBe(23);
    expect(structuralHourIndexFromReferenceLongitudeDeg(165 + EPS)).toBe(23);
  });

  it("clamps out-of-range longitudes before indexing (deterministic, no extra sectors)", () => {
    expect(structuralHourIndexFromReferenceLongitudeDeg(-400)).toBe(0);
    expect(structuralHourIndexFromReferenceLongitudeDeg(400)).toBe(23);
  });

  it("returns 0 for non-finite longitude (defensive)", () => {
    expect(structuralHourIndexFromReferenceLongitudeDeg(Number.NaN)).toBe(0);
    expect(structuralHourIndexFromReferenceLongitudeDeg(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("each sector index appears at its geometric center longitude", () => {
    for (let h = 0; h < 24; h += 1) {
      const centerLon = -180 + 15 * h + 7.5;
      expect(structuralHourIndexFromReferenceLongitudeDeg(centerLon)).toBe(h);
    }
  });
});

describe("Phase 9a — structuralBlockCenterLongitudeDeg & present-time x (sector centers vs seam)", () => {
  it("uses the same column center for all longitudes within a sector (anchor independence of column center)", () => {
    const c0 = structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(-179);
    const c1 = structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(-170);
    expect(c0).toBe(c1);
    expect(c0).toBeCloseTo(-172.5, 7);

    const cLast = structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(179.9);
    expect(cLast).toBeCloseTo(172.5, 7);
    expect(structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(180)).toBeCloseTo(172.5, 7);
  });

  it("present-time x uses structural column center longitude, not raw meridian x (longitude-first tape)", () => {
    const w = 1737;
    const lon = 3.7;
    const ix = structuralHourIndexFromReferenceLongitudeDeg(lon);
    const centerLon = structuralBlockCenterLongitudeDegFromReferenceLongitudeDeg(lon);
    expect(presentTimeIndicatorXFromReferenceLongitudeDeg(lon, w)).toBeCloseTo(
      mapXFromLongitudeDeg(centerLon, w),
      7,
    );
    expect(mapXFromLongitudeDeg(lon, w)).not.toBeCloseTo(mapXFromLongitudeDeg(centerLon, w), 3);
    expect(ix).toBe(structuralHourIndexFromReferenceLongitudeDeg(centerLon));
  });
});

describe("Phase 9a — military letter / offset helpers (west-edge column rule, ties at ±7.5°)", () => {
  it("structural column letter matches canonical ring and west-edge longitude letter for every column", () => {
    for (let h = 0; h < 24; h += 1) {
      const lon0 = -180 + 15 * h;
      expect(militaryTimeZoneLetterFromStructuralColumnIndex(h)).toBe(
        CANONICAL_MILITARY_ZONE_LETTERS_WEST_TO_EAST[h],
      );
      expect(militaryTimeZoneLetterFromStructuralColumnIndex(h)).toBe(
        structuralZoneLetterFromIndex(h),
      );
      expect(militaryTimeZoneLetterFromStructuralColumnIndex(h)).toBe(militaryTimeZoneLetterFromLongitudeDeg(lon0));
    }
  });

  it("mean-solar offset ties at half-hour meridians resolve away from 0 (documented rounding)", () => {
    expect(roundedMeanSolarUtcOffsetHours(7.5)).toBe(1);
    expect(roundedMeanSolarUtcOffsetHours(-7.5)).toBe(-1);
    expect(nominalUtcOffsetHoursFromLongitudeDeg(7.5)).toBe(1);
    expect(nominalUtcOffsetHoursFromLongitudeDeg(-7.5)).toBe(-1);
  });

  it("column letters use west-edge longitudes; raw ±180° meridians round to ±12h offset both → M (Libration, not Y)", () => {
    expect(militaryTimeZoneLetterFromLongitudeDeg(-180)).toBe("M");
    expect(militaryTimeZoneLetterFromLongitudeDeg(180)).toBe("M");
    expect(militaryTimeZoneLetterFromStructuralColumnIndex(0)).toBe("M");
    expect(militaryTimeZoneLetterFromLongitudeDeg(165)).toBe("L");
    expect(militaryTimeZoneLetterFromStructuralColumnIndex(23)).toBe("L");
    expect(militaryTimeZoneLetterFromLongitudeDeg(165)).toBe(militaryTimeZoneLetterFromStructuralColumnIndex(23));
  });
});

describe("Phase 9a — equirectangular seam vs structural grid (shared widthPx basis)", () => {
  it("maps −180° to x=0 and +180° to x=width; inverse recovers rim longitudes", () => {
    const w = 2400;
    expect(mapXFromLongitudeDeg(-180, w)).toBe(0);
    expect(mapXFromLongitudeDeg(180, w)).toBe(w);
    expect(longitudeDegFromMapX(0, w)).toBeCloseTo(-180, 7);
    expect(longitudeDegFromMapX(w, w)).toBeCloseTo(180, 7);
  });

  it("structural segment edges align with mapX lon0/lon1 (continuous strip, no Greenwich-only special case)", () => {
    const w = 1200;
    const layout = buildUtcTopScaleLayout(Date.UTC(2026, 0, 1, 12, 0, 0), w, 80, resolveTopBandTimeFromConfig(DEFAULT_DISPLAY_TIME_CONFIG));
    expect(layout.segments).toHaveLength(24);
    for (let h = 0; h < 24; h += 1) {
      const lon0 = -180 + 15 * h;
      const lon1 = h === 23 ? 180 : -180 + 15 * (h + 1);
      const seg = layout.segments[h]!;
      expect(seg.x0).toBeCloseTo(mapXFromLongitudeDeg(lon0, w), 7);
      expect(seg.x1).toBeCloseTo(mapXFromLongitudeDeg(lon1, w), 7);
      expect(seg.centerLongitudeDeg).toBeCloseTo(lon0 + 7.5, 7);
    }
  });
});

describe("Phase 9a — topBandWrapOffsetsForSpan (viewport seam tiling for structural columns)", () => {
  it("westmost column span uses a single tile; eastmost column uses −1 and 0 (duplicate west copy)", () => {
    const w = 2400;
    const sw = w / 24;
    expect(topBandWrapOffsetsForSpan(0, sw, w)).toEqual([0]);
    expect(topBandWrapOffsetsForSpan(23 * sw, w, w)).toEqual([-1, 0]);
  });

  it("interior structural column span does not request seam duplicates", () => {
    const w = 1000;
    const sw = w / 24;
    expect(topBandWrapOffsetsForSpan(5 * sw, 6 * sw, w)).toEqual([0]);
  });
});

describe("Phase 9a — chrome anchor / geography vs structural strip (independence where required)", () => {
  it("fixedLongitude anchor: geography fixedCoordinate does not change resolved anchor or structural letters", () => {
    const t = Date.UTC(2026, 2, 15, 8, 0, 0);
    const w = 1600;
    const withGeo = resolveTopBandAnchorLongitudeDeg({
      nowMs: t,
      referenceTimeZone: "America/New_York",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: -47.5 },
      geography: {
        ...DEFAULT_GEOGRAPHY_CONFIG,
        referenceMode: "fixedCoordinate",
        fixedCoordinate: { latitude: 0, longitude: 33, label: "probe" },
      },
    });
    const baseline = resolveTopBandAnchorLongitudeDeg({
      nowMs: t,
      referenceTimeZone: "America/New_York",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: -47.5 },
    });
    expect(withGeo.anchorSource).toBe("fixedLongitude");
    expect(withGeo.referenceLongitudeDeg).toBe(-47.5);
    expect(baseline.referenceLongitudeDeg).toBe(-47.5);

    const layoutA = buildUtcTopScaleLayout(t, w, 88, {
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      topBandAnchor: { mode: "fixedLongitude", longitudeDeg: -47.5 },
    });
    const layoutB = buildUtcTopScaleLayout(
      t,
      w,
      88,
      {
        referenceTimeZone: "America/New_York",
        topBandMode: "local24",
        topBandAnchor: { mode: "fixedLongitude", longitudeDeg: -47.5 },
      },
      {
        ...DEFAULT_GEOGRAPHY_CONFIG,
        referenceMode: "fixedCoordinate",
        fixedCoordinate: { latitude: 0, longitude: 33, label: "probe" },
      },
    );
    expect(layoutA.segments.map((s) => s.timezoneLetter).join("")).toBe(
      layoutB.segments.map((s) => s.timezoneLetter).join(""),
    );
  });

  it("auto anchor: geography fixedCoordinate overrides zone meridian; structural strip still fixed west→east ring", () => {
    const t = Date.UTC(2026, 4, 1, 12, 0, 0);
    const w = 1400;
    const zoneOnly = buildUtcTopScaleLayout(t, w, 88, {
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      topBandAnchor: { mode: "auto" },
    });
    const withSydneyGeo = buildUtcTopScaleLayout(
      t,
      w,
      88,
      {
        referenceTimeZone: "America/New_York",
        topBandMode: "local24",
        topBandAnchor: { mode: "auto" },
      },
      {
        ...DEFAULT_GEOGRAPHY_CONFIG,
        referenceMode: "fixedCoordinate",
        fixedCoordinate: { latitude: -33, longitude: 151.2, label: "Sydney area" },
      },
    );
    expect(zoneOnly.segments.map((s) => s.timezoneLetter)).toEqual(
      withSydneyGeo.segments.map((s) => s.timezoneLetter),
    );
    expect(zoneOnly.topBandAnchor.referenceLongitudeDeg).not.toBeCloseTo(
      withSydneyGeo.topBandAnchor.referenceLongitudeDeg,
      1,
    );
  });
});
