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
import { REFERENCE_CITIES } from "../data/referenceCities";
import { collectProductEventNotices } from "./collectProductEventNotices";
import { resolveEclipseFrame } from "./eclipse/eclipseEventService";
import { normalizeLunarEclipsePresentation } from "./eclipse/lunarEclipseAppearance";
import { normalizeSolarEclipsePresentation } from "./eclipse/solarEclipseAppearance";
import { resolveReferenceCityEclipseCircumstances } from "./eclipse/referenceCityEclipseCircumstances";
import {
  DEFAULT_MILKY_WAY_PRESENTATION,
  mergeMilkyWayPresentation,
} from "./milkyWayPresentation";
import { resetMilkyWayEventLabelCacheForTests } from "./milkyWayEventLabel";
import { resetMilkyWayViewingWindowCacheForTests } from "./milkyWayViewingWindows";

const knoxvilleCity = REFERENCE_CITIES.find((c) => c.id === "city.knoxville")!;
const KNOX = {
  cityId: knoxvilleCity.id,
  latitudeDeg: knoxvilleCity.latitude,
  longitudeDeg: knoxvilleCity.longitude,
};
const eventsOn = mergeMilkyWayPresentation(DEFAULT_MILKY_WAY_PRESENTATION, {
  viewingEventsEnabled: true,
  showViewingEventLabels: true,
  eventLabelAdvanceHorizonId: "2d",
});

function eclipseInput(utcMs: number, horizonMs: number) {
  const frame = resolveEclipseFrame(utcMs, { horizonMs });
  const circumstances = resolveReferenceCityEclipseCircumstances(frame, KNOX);
  return {
    frame,
    solarEnabled: true,
    lunarEnabled: true,
    solar: normalizeSolarEclipsePresentation({ forecastHorizonDays: 30 }),
    lunar: normalizeLunarEclipsePresentation({ forecastHorizonDays: 30 }),
    circumstances,
    cityName: "Knoxville",
  };
}

describe("collectProductEventNotices", () => {
  it("can show solar, lunar, and Milky Way candidates together with a bounded stack", () => {
    resetMilkyWayViewingWindowCacheForTests();
    resetMilkyWayEventLabelCacheForTests();
    const utcMs = Date.UTC(2026, 7, 11, 6, 0, 0, 0);
    const stack = collectProductEventNotices({
      eclipseInput: eclipseInput(utcMs, 30 * 86_400_000),
      chromeStatusEnabled: true,
      eclipseUnsupported: false,
      timeZone: "America/New_York",
      displayTimeMode: "12hr",
      milkyWayPresentation: eventsOn,
      milkyWayObserver: KNOX,
      productUtcMs: utcMs,
    });
    const families = new Set(stack.visible.map((n) => n.family));
    expect(stack.visible.length).toBeGreaterThan(0);
    expect(stack.visible.length).toBeLessThanOrEqual(2);
    expect(stack.visible.some((n) => n.family === "solarEclipse" || n.family === "lunarEclipse")).toBe(true);
    if (stack.visible.length + stack.overflowCount >= 3) {
      expect(stack.overflowText).toMatch(/\+\d more event/);
    }
    expect(families.size).toBeGreaterThanOrEqual(1);
  });

  it("keeps eclipse HUD meaning on eclipse notices and compact MW copy", () => {
    resetMilkyWayViewingWindowCacheForTests();
    resetMilkyWayEventLabelCacheForTests();
    const utcMs = Date.parse("2017-08-19T15:00:00.000Z");
    const stack = collectProductEventNotices({
      eclipseInput: eclipseInput(utcMs, 7 * 86_400_000),
      chromeStatusEnabled: true,
      eclipseUnsupported: false,
      timeZone: "America/New_York",
      displayTimeMode: "12hr",
      milkyWayPresentation: eventsOn,
      milkyWayObserver: KNOX,
      productUtcMs: utcMs,
    });
    const solar = stack.visible.find((n) => n.family === "solarEclipse");
    expect(solar).toBeTruthy();
    expect(solar!.text).toMatch(/Eclipse/);
    expect(solar!.text).not.toMatch(/Milky Way/);
    const mw = [...stack.visible].find((n) => n.family === "milkyWay");
    if (mw) {
      expect(mw.text.startsWith("Milky Way viewing")).toBe(true);
    }
  });

  it("does not emit MW notices when viewing events are off, independent of playback", () => {
    resetMilkyWayEventLabelCacheForTests();
    const utcMs = Date.UTC(2026, 7, 19, 6, 0, 0, 0);
    const stack = collectProductEventNotices({
      eclipseInput: eclipseInput(utcMs, 7 * 86_400_000),
      chromeStatusEnabled: true,
      eclipseUnsupported: false,
      timeZone: "America/New_York",
      displayTimeMode: "12hr",
      milkyWayPresentation: DEFAULT_MILKY_WAY_PRESENTATION,
      milkyWayObserver: KNOX,
      productUtcMs: utcMs,
    });
    expect(stack.visible.some((n) => n.family === "milkyWay")).toBe(false);
    expect(collectProductEventNotices.length).toBe(1);
  });

  it("still emits MW notices when eclipse chrome status is off", () => {
    resetMilkyWayViewingWindowCacheForTests();
    resetMilkyWayEventLabelCacheForTests();
    const utcMs = Date.UTC(2026, 7, 19, 6, 0, 0, 0);
    const stack = collectProductEventNotices({
      eclipseInput: eclipseInput(utcMs, 7 * 86_400_000),
      chromeStatusEnabled: false,
      eclipseUnsupported: false,
      timeZone: "America/New_York",
      displayTimeMode: "12hr",
      milkyWayPresentation: eventsOn,
      milkyWayObserver: KNOX,
      productUtcMs: utcMs,
    });
    expect(stack.visible.some((n) => n.family === "solarEclipse" || n.family === "lunarEclipse")).toBe(false);
    expect(stack.visible.some((n) => n.family === "milkyWay")).toBe(true);
    expect(stack.visible[0]!.text).toMatch(/Milky Way viewing/);
  });

  it("drops MW notices after the window when nothing else is in horizon", () => {
    resetMilkyWayViewingWindowCacheForTests();
    resetMilkyWayEventLabelCacheForTests();
    const utcMs = Date.UTC(2026, 0, 15, 12, 0, 0, 0);
    const stack = collectProductEventNotices({
      eclipseInput: eclipseInput(utcMs, 0),
      chromeStatusEnabled: true,
      eclipseUnsupported: false,
      timeZone: "America/New_York",
      displayTimeMode: "12hr",
      milkyWayPresentation: mergeMilkyWayPresentation(eventsOn, { eventLabelAdvanceHorizonId: "6h" }),
      milkyWayObserver: KNOX,
      productUtcMs: utcMs,
    });
    expect(stack.visible.some((n) => n.family === "milkyWay")).toBe(false);
  });
});
