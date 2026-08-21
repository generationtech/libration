/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, version 3.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
 */

import { describe, expect, it } from "vitest";
import { REFERENCE_CITIES } from "../data/referenceCities";
import {
  formatMilkyWayEventLabelText,
  resetMilkyWayEventLabelCacheForTests,
  resolveMilkyWayEventMapLabel,
} from "./milkyWayEventLabel";
import {
  DEFAULT_MILKY_WAY_PRESENTATION,
  mergeMilkyWayPresentation,
} from "./milkyWayPresentation";
import {
  findNextMilkyWayViewingWindow,
  resetMilkyWayViewingWindowCacheForTests,
  type MilkyWayViewingObserver,
} from "./milkyWayViewingWindows";

const knoxvilleCity = REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!;
const KNOXVILLE: MilkyWayViewingObserver = {
  cityId: knoxvilleCity.id,
  latitudeDeg: knoxvilleCity.latitude,
  longitudeDeg: knoxvilleCity.longitude,
};

const ARCTIC: MilkyWayViewingObserver = {
  cityId: "test.arctic",
  latitudeDeg: 65,
  longitudeDeg: 0,
};

const labelsOn = mergeMilkyWayPresentation(DEFAULT_MILKY_WAY_PRESENTATION, {
  viewingEventsEnabled: true,
  showViewingEventLabels: true,
  eventLabelAdvanceHorizonId: "2d",
});

describe("formatMilkyWayEventLabelText", () => {
  it("uses compact city · Milky Way copy and countdown only when upcoming", () => {
    expect(
      formatMilkyWayEventLabelText({
        cityName: "Knoxville",
        lifecycle: "upcoming",
        relative: "tonight",
      }),
    ).toBe("Knoxville · Milky Way · tonight");
    expect(
      formatMilkyWayEventLabelText({
        cityName: "Knoxville",
        lifecycle: "active",
        relative: "tonight",
      }),
    ).toBe("Knoxville · Milky Way viewing");
  });
});

describe("resolveMilkyWayEventMapLabel", () => {
  it("returns upcoming then active for Knoxville around a known window", () => {
    resetMilkyWayViewingWindowCacheForTests();
    resetMilkyWayEventLabelCacheForTests();
    const origin = Date.UTC(2026, 7, 19, 6, 0, 0, 0);
    const next = findNextMilkyWayViewingWindow({
      observer: KNOXVILLE,
      afterUtcMs: origin,
      horizonMs: 2 * 86_400_000,
    });
    expect(next).not.toBeNull();
    const upcoming = resolveMilkyWayEventMapLabel({
      presentation: labelsOn,
      observer: KNOXVILLE,
      cityName: "Knoxville",
      productUtcMs: origin,
      timeZone: "America/New_York",
    });
    expect(upcoming?.lifecycle).toBe("upcoming");
    expect(upcoming?.text.startsWith("Knoxville ·")).toBe(true);
    expect(upcoming?.text).toMatch(/Milky Way|MW viewing/);
    const mid = Math.floor((next!.startUtcMs + next!.endUtcMs) / 2);
    resetMilkyWayEventLabelCacheForTests();
    const active = resolveMilkyWayEventMapLabel({
      presentation: labelsOn,
      observer: KNOXVILLE,
      cityName: "Knoxville",
      productUtcMs: mid,
      timeZone: "America/New_York",
    });
    expect(active?.lifecycle).toBe("active");
    expect(active?.text).toBe("Knoxville · Milky Way viewing");
    expect(active?.latDeg).toBeTypeOf("number");
    expect(upcoming?.lonDeg).toBeTypeOf("number");
  });

  it("does not fabricate a label when no selected window is in horizon", () => {
    resetMilkyWayViewingWindowCacheForTests();
    resetMilkyWayEventLabelCacheForTests();
    const label = resolveMilkyWayEventMapLabel({
      presentation: labelsOn,
      observer: ARCTIC,
      cityName: "Arctic",
      productUtcMs: Date.UTC(2026, 7, 19, 6, 0, 0, 0),
    });
    expect(label).toBeNull();
  });

  it("requires the viewing-event master and label toggle", () => {
    resetMilkyWayEventLabelCacheForTests();
    const origin = Date.UTC(2026, 7, 19, 6, 0, 0, 0);
    expect(
      resolveMilkyWayEventMapLabel({
        presentation: DEFAULT_MILKY_WAY_PRESENTATION,
        observer: KNOXVILLE,
        cityName: "Knoxville",
        productUtcMs: origin,
      }),
    ).toBeNull();
    expect(
      resolveMilkyWayEventMapLabel({
        presentation: mergeMilkyWayPresentation(labelsOn, { showViewingEventLabels: false }),
        observer: KNOXVILLE,
        cityName: "Knoxville",
        productUtcMs: origin,
      }),
    ).toBeNull();
  });

  it("reuses the 1-minute lookup cache on a second call", () => {
    resetMilkyWayViewingWindowCacheForTests();
    resetMilkyWayEventLabelCacheForTests();
    const origin = Date.UTC(2026, 7, 19, 6, 0, 0, 0);
    const t0 = Date.now();
    resolveMilkyWayEventMapLabel({
      presentation: labelsOn,
      observer: KNOXVILLE,
      cityName: "Knoxville",
      productUtcMs: origin,
    });
    const cold = Date.now() - t0;
    const t1 = Date.now();
    resolveMilkyWayEventMapLabel({
      presentation: labelsOn,
      observer: KNOXVILLE,
      cityName: "Knoxville",
      productUtcMs: origin + 1_000,
    });
    const warm = Date.now() - t1;
    expect(warm).toBeLessThanOrEqual(cold);
    expect(warm).toBeLessThan(250);
  });
});
