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
import { normalizeLunarEclipsePresentation } from "../eclipse/lunarEclipseAppearance";
import { normalizeSolarEclipsePresentation } from "../eclipse/solarEclipseAppearance";
import {
  comparePlaybackEvents,
  findNextPlaybackEvent,
  findPreviousPlaybackEvent,
  type EventPlaybackListedEvent,
  type EventPlaybackLookupQuery,
} from "./eventPlaybackLookup";
import { findNextMilkyWayTourEvent } from "./milkyWayTourEvents";
import {
  milkyWayEnumerateStatsForTests,
  resetMilkyWayViewingWindowCacheForTests,
  type MilkyWayViewingObserver,
} from "../milkyWayViewingWindows";
import {
  eventPlaybackNavigatorFromArray,
  startEventPlaybackSequence,
  stepEventPlaybackSequence,
} from "./eventPlaybackSequence";

const KNOXVILLE: MilkyWayViewingObserver = {
  cityId: "city.knoxville",
  latitudeDeg: 35.9606,
  longitudeDeg: -83.9207,
};

const DAY_MS = 86_400_000;

function listed(
  partial: Omit<EventPlaybackListedEvent, "leadInUtcMs" | "transitionEndUtcMs"> & {
    leadInUtcMs?: number;
    transitionEndUtcMs?: number;
  },
): EventPlaybackListedEvent {
  return {
    leadInUtcMs: partial.eventStartUtcMs - DAY_MS,
    transitionEndUtcMs: partial.eventEndUtcMs + 3_600_000,
    ...partial,
  };
}

const MAR_29_SOLAR = listed({
  eventId: "solar-mar-29",
  sourceId: "solarEclipse",
  eventStartUtcMs: Date.UTC(2026, 2, 29, 10, 0, 0),
  eventEndUtcMs: Date.UTC(2026, 2, 29, 14, 0, 0),
  peakUtcMs: Date.UTC(2026, 2, 29, 12, 0, 0),
  title: "Total solar eclipse",
  dateLabel: "Mar 29 2026",
});
const APR_4_MW = listed({
  eventId: "mw-apr-4",
  sourceId: "milkyWayViewing",
  eventStartUtcMs: Date.UTC(2026, 3, 4, 4, 0, 0),
  eventEndUtcMs: Date.UTC(2026, 3, 4, 8, 0, 0),
  peakUtcMs: Date.UTC(2026, 3, 4, 6, 0, 0),
  title: "Milky Way viewing",
  dateLabel: "Apr 4 2026",
});
const APR_14_LUNAR = listed({
  eventId: "lunar-apr-14",
  sourceId: "lunarEclipse",
  eventStartUtcMs: Date.UTC(2026, 3, 14, 2, 0, 0),
  eventEndUtcMs: Date.UTC(2026, 3, 14, 6, 0, 0),
  peakUtcMs: Date.UTC(2026, 3, 14, 4, 0, 0),
  title: "Total lunar eclipse",
  dateLabel: "Apr 14 2026",
});
const APR_30_MW = listed({
  eventId: "mw-apr-30",
  sourceId: "milkyWayViewing",
  eventStartUtcMs: Date.UTC(2026, 3, 30, 4, 0, 0),
  eventEndUtcMs: Date.UTC(2026, 3, 30, 8, 0, 0),
  peakUtcMs: Date.UTC(2026, 3, 30, 6, 0, 0),
  title: "Milky Way viewing",
  dateLabel: "Apr 30 2026",
});

function baseQuery(overrides: Partial<EventPlaybackLookupQuery> = {}): EventPlaybackLookupQuery {
  return {
    rangeStartUtcMs: Date.UTC(2026, 0, 1),
    rangeEndUtcMs: Date.UTC(2027, 0, 1),
    leadInId: "1d",
    postWaitId: "1h",
    solarEnabled: true,
    lunarEnabled: true,
    milkyWayEnabled: true,
    solarPresentation: normalizeSolarEclipsePresentation(undefined),
    lunarPresentation: normalizeLunarEclipsePresentation(undefined),
    observer: KNOXVILLE,
    cityName: "Knoxville",
    ...overrides,
  };
}

describe("comparePlaybackEvents", () => {
  it("orders a mixed solar / MW / lunar / MW stream by event start", () => {
    const shuffled = [APR_14_LUNAR, APR_30_MW, MAR_29_SOLAR, APR_4_MW];
    const ordered = [...shuffled].sort(comparePlaybackEvents);
    expect(ordered.map((e) => e.eventId)).toEqual([
      "solar-mar-29",
      "mw-apr-4",
      "lunar-apr-14",
      "mw-apr-30",
    ]);
  });
});

describe("array-backed merged navigator", () => {
  const events = [MAR_29_SOLAR, APR_4_MW, APR_14_LUNAR, APR_30_MW];
  const nav = eventPlaybackNavigatorFromArray(events);

  it("Next and Previous cross event families", () => {
    expect(nav.findNext(MAR_29_SOLAR)?.eventId).toBe("mw-apr-4");
    expect(nav.findNext(APR_4_MW)?.eventId).toBe("lunar-apr-14");
    expect(nav.findPrevious(APR_14_LUNAR)?.eventId).toBe("mw-apr-4");
    expect(nav.findPrevious(APR_4_MW)?.eventId).toBe("solar-mar-29");
  });

  it("loops to the earliest enabled event", () => {
    const started = startEventPlaybackSequence(MAR_29_SOLAR, true, "k", nav);
    let state = started.state;
    for (const id of ["mw-apr-4", "lunar-apr-14", "mw-apr-30"]) {
      const step = stepEventPlaybackSequence(state, state.current!.transitionEndUtcMs, nav);
      expect(step.state.current?.eventId).toBe(id);
      state = step.state;
    }
    const wrap = stepEventPlaybackSequence(state, state.current!.transitionEndUtcMs, nav);
    expect(wrap.state.current?.eventId).toBe("solar-mar-29");
  });
});

describe("live catalog lookup", () => {
  it("solar-only returns solar events", () => {
    const query = baseQuery({ lunarEnabled: false, milkyWayEnabled: false });
    const first = findNextPlaybackEvent(query, query.rangeStartUtcMs, { includeIntersecting: true });
    expect(first?.sourceId).toBe("solarEclipse");
    const next = findNextPlaybackEvent(query, first!.eventStartUtcMs, {
      includeIntersecting: false,
      excludeEventId: first!.eventId,
    });
    expect(next?.sourceId).toBe("solarEclipse");
  });

  it("lunar-only returns lunar events", () => {
    const query = baseQuery({ solarEnabled: false, milkyWayEnabled: false });
    const first = findNextPlaybackEvent(query, query.rangeStartUtcMs, { includeIntersecting: true });
    expect(first?.sourceId).toBe("lunarEclipse");
  });

  it("MW-only Start discovers the next grouped window without enumerating to 2499", () => {
    resetMilkyWayViewingWindowCacheForTests();
    const query = baseQuery({
      solarEnabled: false,
      lunarEnabled: false,
      rangeStartUtcMs: Date.UTC(2026, 7, 19),
      rangeEndUtcMs: Date.UTC(2499, 11, 31),
    });
    const t0 = Date.now();
    const first = findNextPlaybackEvent(query, query.rangeStartUtcMs, { includeIntersecting: true });
    const ms = Date.now() - t0;
    expect(first?.sourceId).toBe("milkyWayViewing");
    expect(ms).toBeLessThan(2_000);
    const stats = milkyWayEnumerateStatsForTests();
    expect(stats.lastSpanMs).toBeLessThan(40 * DAY_MS);
    expect(stats.totalSpanMs).toBeLessThan(120 * DAY_MS);
  });

  it("merged solar+lunar+MW walk visits multiple families in UTC order", () => {
    const query = baseQuery();
    const seen: string[] = [];
    let cursor = findNextPlaybackEvent(query, query.rangeStartUtcMs, { includeIntersecting: true });
    expect(cursor).not.toBeNull();
    let prevStart = -Infinity;
    for (let i = 0; i < 40 && cursor; i += 1) {
      expect(cursor.eventStartUtcMs).toBeGreaterThanOrEqual(prevStart);
      prevStart = cursor.eventStartUtcMs;
      seen.push(cursor.sourceId);
      cursor = findNextPlaybackEvent(query, cursor.eventStartUtcMs, {
        includeIntersecting: false,
        excludeEventId: cursor.eventId,
      });
    }
    expect(new Set(seen).has("solarEclipse")).toBe(true);
    expect(new Set(seen).has("lunarEclipse")).toBe(true);
    expect(new Set(seen).has("milkyWayViewing")).toBe(true);
  });

  it("Previous from a lunar event can resolve to a prior MW or solar event", () => {
    const query = baseQuery();
    const first = findNextPlaybackEvent(query, query.rangeStartUtcMs, { includeIntersecting: true });
    expect(first).not.toBeNull();
    let current = first!;
    while (current.sourceId !== "lunarEclipse") {
      const next = findNextPlaybackEvent(query, current.eventStartUtcMs, {
        includeIntersecting: false,
        excludeEventId: current.eventId,
      });
      expect(next).not.toBeNull();
      current = next!;
    }
    if (current.eventId === first!.eventId) {
      const next = findNextPlaybackEvent(query, current.eventStartUtcMs, {
        includeIntersecting: false,
        excludeEventId: current.eventId,
      });
      expect(next).not.toBeNull();
      current = next!;
      while (current.sourceId !== "lunarEclipse") {
        const later = findNextPlaybackEvent(query, current.eventStartUtcMs, {
          includeIntersecting: false,
          excludeEventId: current.eventId,
        });
        expect(later).not.toBeNull();
        current = later!;
      }
    }
    const prev = findPreviousPlaybackEvent(query, current.eventStartUtcMs, current.eventId);
    expect(prev).not.toBeNull();
    expect(prev!.eventStartUtcMs).toBeLessThan(current.eventStartUtcMs);
    expect(prev!.sourceId === "solarEclipse" || prev!.sourceId === "milkyWayViewing").toBe(true);
  });

  it("overlapping next event does not rewind product time", () => {
    const overlapping = listed({
      eventId: "mw-overlap",
      sourceId: "milkyWayViewing",
      eventStartUtcMs: MAR_29_SOLAR.eventStartUtcMs + 3_600_000,
      eventEndUtcMs: MAR_29_SOLAR.eventEndUtcMs + 8_600_000,
      peakUtcMs: MAR_29_SOLAR.peakUtcMs + 3_600_000,
      title: "Milky Way viewing",
      dateLabel: "Mar 29 2026",
      leadInUtcMs: MAR_29_SOLAR.leadInUtcMs + 1_000,
      transitionEndUtcMs: MAR_29_SOLAR.transitionEndUtcMs + 8_600_000,
    });
    const nav = eventPlaybackNavigatorFromArray([MAR_29_SOLAR, overlapping]);
    const started = startEventPlaybackSequence(MAR_29_SOLAR, false, "k", nav);
    const product = MAR_29_SOLAR.transitionEndUtcMs;
    const step = stepEventPlaybackSequence(started.state, product, nav);
    expect(step.state.current?.eventId).toBe("mw-overlap");
    expect(Date.parse(step.jumpToIsoUtc!)).toBe(product);
  });
});

describe("incremental MW grouped search", () => {
  it("finds the next grouped Knoxville opportunity in a 30-day chunk", () => {
    resetMilkyWayViewingWindowCacheForTests();
    const after = Date.UTC(2026, 7, 19);
    const found = findNextMilkyWayTourEvent({
      observer: KNOXVILLE,
      rangeStartUtcMs: after,
      rangeEndUtcMs: Date.UTC(2499, 11, 31),
      afterUtcMs: after,
      includeIntersecting: true,
    });
    expect(found).not.toBeNull();
    expect(found!.startUtcMs).toBeGreaterThanOrEqual(after - DAY_MS);
    const stats = milkyWayEnumerateStatsForTests();
    expect(stats.lastSpanMs).toBeLessThan(40 * DAY_MS);
  });
});
