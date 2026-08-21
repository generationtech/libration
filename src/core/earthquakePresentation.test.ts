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
  DEFAULT_EARTHQUAKE_PRESENTATION,
  earthquakeLabelEligible,
  earthquakeMarkerEligible,
  earthquakePassesAgeFilter,
  earthquakePassesMagnitudeFilter,
  earthquakePassesTypeFilter,
  formatEarthquakeMarkerLabel,
  normalizeEarthquakePresentation,
  type EarthquakeMinMagnitudeId,
  type EarthquakePresentation,
} from "./earthquakePresentation";

const NOW = 1_700_000_000_000;

function presentation(
  patch: Partial<EarthquakePresentation> = {},
): EarthquakePresentation {
  return { ...DEFAULT_EARTHQUAKE_PRESENTATION, ...patch };
}

describe("LIB-059 earthquake presentation config", () => {
  it("normalizes missing keys to factory defaults", () => {
    expect(normalizeEarthquakePresentation(undefined)).toEqual(
      DEFAULT_EARTHQUAKE_PRESENTATION,
    );
    expect(normalizeEarthquakePresentation({})).toEqual(
      DEFAULT_EARTHQUAKE_PRESENTATION,
    );
    expect(DEFAULT_EARTHQUAKE_PRESENTATION).toEqual({
      minMagnitude: "2.5",
      maxAge: "24h",
      showLabels: true,
      labelMinMagnitude: "4",
      earthquakesOnly: true,
      showLabelOnHover: true,
    });
  });

  it("preserves explicit values", () => {
    const explicit = normalizeEarthquakePresentation({
      minMagnitude: "5",
      maxAge: "1h",
      showLabels: false,
      labelMinMagnitude: "follow",
      earthquakesOnly: false,
      showLabelOnHover: false,
    });
    expect(explicit).toEqual({
      minMagnitude: "5",
      maxAge: "1h",
      showLabels: false,
      labelMinMagnitude: "follow",
      earthquakesOnly: false,
      showLabelOnHover: false,
    });
  });
});

describe("LIB-059 magnitude filter", () => {
  const mags = [0.5, 1.5, 2.5, 3.2, 4.6, 6.0] as const;
  const thresholds: Array<{ id: EarthquakeMinMagnitudeId; min: number | null }> =
    [
      { id: "all", min: null },
      { id: "1", min: 1 },
      { id: "2", min: 2 },
      { id: "2.5", min: 2.5 },
      { id: "3", min: 3 },
      { id: "4", min: 4 },
      { id: "4.5", min: 4.5 },
      { id: "5", min: 5 },
    ];

  it("includes events at the exact threshold", () => {
    for (const { id, min } of thresholds) {
      for (const mag of mags) {
        const expected = min === null || mag >= min;
        expect(earthquakePassesMagnitudeFilter(mag, id)).toBe(expected);
      }
    }
  });

  it("hides null magnitude unless threshold is All", () => {
    expect(earthquakePassesMagnitudeFilter(undefined, "all")).toBe(true);
    expect(earthquakePassesMagnitudeFilter(undefined, "2.5")).toBe(false);
    expect(earthquakePassesMagnitudeFilter(undefined, "5")).toBe(false);
  });
});

describe("LIB-059 event-age filter", () => {
  it("uses inclusive max-age against provider event time", () => {
    const cases: Array<[number, boolean, EarthquakePresentation["maxAge"]]> = [
      [30 * 60 * 1000, true, "1h"],
      [60 * 60 * 1000, true, "1h"],
      [3 * 60 * 60 * 1000, true, "3h"],
      [6 * 60 * 60 * 1000, true, "6h"],
      [12 * 60 * 60 * 1000, true, "12h"],
      [24 * 60 * 60 * 1000, true, "24h"],
      [25 * 60 * 60 * 1000, false, "24h"],
    ];
    for (const [ageMs, expected, maxAge] of cases) {
      expect(
        earthquakePassesAgeFilter(NOW - ageMs, NOW, maxAge),
      ).toBe(expected);
    }
  });

  it("treats timestamps up to 2 min in the future as age 0 and excludes farther future", () => {
    expect(earthquakePassesAgeFilter(NOW + 90_000, NOW, "1h")).toBe(true);
    expect(earthquakePassesAgeFilter(NOW + 2 * 60 * 1000, NOW, "1h")).toBe(true);
    expect(earthquakePassesAgeFilter(NOW + 2 * 60 * 1000 + 1, NOW, "1h")).toBe(
      false,
    );
  });
});

describe("LIB-059 labels vs markers", () => {
  it("keeps a marker below the label threshold unlabeled", () => {
    const pres = presentation({ minMagnitude: "2.5", labelMinMagnitude: "4" });
    expect(
      earthquakeMarkerEligible({
        magnitude: 3.2,
        eventTimeMs: NOW - 60_000,
        properties: { type: "earthquake" },
        productUtcMs: NOW,
        presentation: pres,
      }),
    ).toBe(true);
    expect(earthquakeLabelEligible({ magnitude: 3.2, presentation: pres })).toBe(
      false,
    );
    expect(earthquakeLabelEligible({ magnitude: 4.0, presentation: pres })).toBe(
      true,
    );
  });

  it("emits no labels when Show labels is off", () => {
    const pres = presentation({ showLabels: false, labelMinMagnitude: "follow" });
    expect(earthquakeLabelEligible({ magnitude: 6, presentation: pres })).toBe(
      false,
    );
  });

  it("does not let Show label on hover change persistent-label eligibility", () => {
    const on = presentation({
      showLabels: true,
      labelMinMagnitude: "4",
      showLabelOnHover: true,
    });
    const off = presentation({
      showLabels: true,
      labelMinMagnitude: "4",
      showLabelOnHover: false,
    });
    expect(earthquakeLabelEligible({ magnitude: 3.1, presentation: on })).toBe(
      false,
    );
    expect(earthquakeLabelEligible({ magnitude: 3.1, presentation: off })).toBe(
      false,
    );
    expect(earthquakeLabelEligible({ magnitude: 5.2, presentation: on })).toBe(
      true,
    );
    expect(earthquakeLabelEligible({ magnitude: 5.2, presentation: off })).toBe(
      true,
    );
  });
});

describe("LIB-059 event type filter", () => {
  it("factory earthquakes-only keeps earthquake and excludes quarry blast and explosion", () => {
    expect(earthquakePassesTypeFilter({ type: "earthquake" }, true)).toBe(true);
    expect(earthquakePassesTypeFilter({ type: "quarry blast" }, true)).toBe(
      false,
    );
    expect(earthquakePassesTypeFilter({ type: "explosion" }, true)).toBe(false);
    expect(earthquakePassesTypeFilter({ type: "ice quake" }, true)).toBe(false);
    expect(earthquakePassesTypeFilter({}, true)).toBe(false);
    expect(earthquakePassesTypeFilter({ type: "quarry blast" }, false)).toBe(
      true,
    );
  });
});

describe("LIB-059 compact label formatter", () => {
  it("uses magnitude plus place without the provider title", () => {
    expect(formatEarthquakeMarkerLabel(4.6, "12 km SW of Ridgecrest, CA")).toBe(
      "M4.6 · 12 km SW of Ridgecrest, CA",
    );
    expect(formatEarthquakeMarkerLabel(5, "Aegean Sea")).toBe("M5 · Aegean Sea");
    expect(formatEarthquakeMarkerLabel(undefined, "Honshu, Japan")).toBe(
      "Honshu, Japan",
    );
  });
});

describe("LIB-059 filter pass cost", () => {
  it("filters 1000 synthetic features without throwing", () => {
    const pres = presentation();
    const t0 = performance.now();
    let visible = 0;
    for (let i = 0; i < 1000; i++) {
      const mag = (i % 70) / 10;
      const ageMs = (i % 30) * 60 * 60 * 1000;
      if (
        earthquakeMarkerEligible({
          magnitude: mag,
          eventTimeMs: NOW - ageMs,
          properties: { type: i % 17 === 0 ? "quarry blast" : "earthquake" },
          productUtcMs: NOW,
          presentation: pres,
        })
      ) {
        visible += 1;
      }
    }
    const elapsedMs = performance.now() - t0;
    expect(visible).toBeGreaterThan(0);
    expect(visible).toBeLessThan(1000);
    expect(elapsedMs).toBeLessThan(50);
  });
});
