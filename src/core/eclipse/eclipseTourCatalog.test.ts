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
import { getLunarEclipseEventById, getSolarEclipseEventById } from "./eclipseAuthority";
import {
  clampIsoCalendarYmd,
  compareIsoCalendarYmd,
  eclipseTourOffsetMs,
  normalizeEclipseTourPresentation,
  utcYmdFromUnixMs,
} from "./eclipseTourAppearance";
import {
  eclipseTourCatalogCounts,
  getEclipseTourAuthorityRange,
  listEclipseTourEvents,
  scheduleEclipseTourEvents,
} from "./eclipseTourCatalog";
import { eclipseTourRangeUtcMs } from "./eclipseTourRange";
import { normalizeLunarEclipsePresentation } from "./lunarEclipseAppearance";
import { normalizeSolarEclipsePresentation } from "./solarEclipseAppearance";

const SOLAR_ALL = normalizeSolarEclipsePresentation(undefined);
const LUNAR_ALL = normalizeLunarEclipsePresentation(undefined);
const SOLAR_NO_PARTIAL = normalizeSolarEclipsePresentation({ showTypePartial: false });
const LUNAR_NO_PENUMBRAL = normalizeLunarEclipsePresentation({ showTypePenumbral: false });

describe("eclipse tour appearance", () => {
  it("clamps inverted and out-of-range dates; factories missing end to max", () => {
    const bounds = { minYmd: "1900-01-01", maxYmd: "2100-12-31" };
    const inverted = normalizeEclipseTourPresentation(
      { startDateYmd: "2020-06-01", endDateYmd: "2019-01-01" },
      bounds,
      Date.UTC(2020, 0, 15),
    );
    expect(inverted.startDateYmd).toBe("2020-06-01");
    expect(inverted.endDateYmd).toBe("2020-06-01");

    const beyond = normalizeEclipseTourPresentation(
      { startDateYmd: "1800-01-01", endDateYmd: "2200-01-01" },
      bounds,
      Date.UTC(2020, 0, 15),
    );
    expect(beyond.startDateYmd).toBe("1900-01-01");
    expect(beyond.endDateYmd).toBe("2100-12-31");

    const missing = normalizeEclipseTourPresentation(undefined, bounds, Date.UTC(2026, 7, 18));
    expect(missing.startDateYmd).toBe("2026-08-18");
    expect(missing.endDateYmd).toBe("2100-12-31");
    expect(missing.includeSolar).toBe(true);
    expect(missing.includeLunar).toBe(true);
    expect(missing.loop).toBe(true);
    expect(missing.leadInId).toBe("1d");
    expect(missing.postWaitId).toBe("1h");
    expect(eclipseTourOffsetMs("immediate")).toBe(0);
    expect(eclipseTourOffsetMs("1w")).toBe(7 * 86_400_000);
    expect(clampIsoCalendarYmd("2099-01-01", bounds.minYmd, bounds.maxYmd)).toBe("2099-01-01");
    expect(compareIsoCalendarYmd("2020-01-02", "2020-01-01")).toBeGreaterThan(0);
  });
});

describe("eclipse tour catalog", () => {
  const range = getEclipseTourAuthorityRange();

  it("reports authority spans from metadata, not guessed constants", () => {
    expect(range.solarStartMs).toBe(Date.UTC(1900, 0, 1));
    expect(range.solarEndMs).toBe(Date.UTC(2101, 0, 1));
    expect(range.lunarStartMs).toBe(Date.UTC(1900, 0, 1));
    expect(range.lunarEndMs).toBe(Date.UTC(2101, 0, 1));
    expect(range.combinedStartMs).toBe(range.solarStartMs);
    expect(range.combinedEndMs).toBe(range.solarEndMs);
    expect(range.calendarBounds.minYmd).toBe("1900-01-01");
    expect(range.calendarBounds.maxYmd).toBe("2100-12-31");
    const counts = eclipseTourCatalogCounts();
    expect(counts.solar).toBeGreaterThan(400);
    expect(counts.lunar).toBeGreaterThan(200);
  });

  it("enumerates 2017-08-21 solar with deterministic mixed-family order", () => {
    const solar = getSolarEclipseEventById("nasa-5mcse-solar-9546");
    expect(solar?.subtype).toBe("total");
    expect(utcYmdFromUnixMs(solar!.greatestEclipseUtcMs)).toBe("2017-08-21");

    const startUtcMs = Date.UTC(2017, 7, 1);
    const endUtcMs = Date.UTC(2017, 8, 15) - 1;
    const both = listEclipseTourEvents({
      startUtcMs,
      endUtcMs,
      includeSolar: true,
      includeLunar: true,
      solarPresentation: SOLAR_ALL,
      lunarPresentation: LUNAR_ALL,
    });
    expect(both.some((e) => e.eventId === "nasa-5mcse-solar-9546")).toBe(true);
    for (let i = 1; i < both.length; i += 1) {
      expect(both[i]!.sortTimeUtcMs).toBeGreaterThanOrEqual(both[i - 1]!.sortTimeUtcMs);
    }
    const solarOnly = listEclipseTourEvents({
      startUtcMs,
      endUtcMs,
      includeSolar: true,
      includeLunar: false,
      solarPresentation: SOLAR_ALL,
      lunarPresentation: LUNAR_ALL,
    });
    expect(solarOnly.every((e) => e.kind === "solar")).toBe(true);
    const lunarOnly = listEclipseTourEvents({
      startUtcMs,
      endUtcMs,
      includeSolar: false,
      includeLunar: true,
      solarPresentation: SOLAR_ALL,
      lunarPresentation: LUNAR_ALL,
    });
    expect(lunarOnly.every((e) => e.kind === "lunar")).toBe(true);
  });

  it("includes an event already underway at range start", () => {
    const total = getSolarEclipseEventById("nasa-5mcse-solar-9561")!;
    const during = listEclipseTourEvents({
      startUtcMs: total.greatestEclipseUtcMs,
      endUtcMs: total.greatestEclipseUtcMs + 60_000,
      includeSolar: true,
      includeLunar: false,
      solarPresentation: SOLAR_ALL,
      lunarPresentation: LUNAR_ALL,
    });
    expect(during.map((e) => e.eventId)).toContain(total.id);
  });

  it("respects subtype filters and returns nothing for an empty range", () => {
    const startUtcMs = Date.UTC(2017, 0, 1);
    const endUtcMs = Date.UTC(2018, 0, 1) - 1;
    const filtered = listEclipseTourEvents({
      startUtcMs,
      endUtcMs,
      includeSolar: true,
      includeLunar: true,
      solarPresentation: SOLAR_NO_PARTIAL,
      lunarPresentation: LUNAR_NO_PENUMBRAL,
    });
    expect(filtered.some((e) => e.kind === "solar" && e.subtype === "partial")).toBe(false);
    expect(filtered.some((e) => e.kind === "lunar" && e.subtype === "penumbral")).toBe(false);

    const none = listEclipseTourEvents({
      startUtcMs: Date.UTC(2017, 0, 2),
      endUtcMs: Date.UTC(2017, 0, 3),
      includeSolar: true,
      includeLunar: true,
      solarPresentation: SOLAR_ALL,
      lunarPresentation: LUNAR_ALL,
    });
    expect(none).toEqual([]);
  });

  it("clamps lead-in and post-wait to the configured range", () => {
    const event = getSolarEclipseEventById("nasa-5mcse-solar-9546")!;
    const tourEvent = listEclipseTourEvents({
      startUtcMs: event.globalStartMs,
      endUtcMs: event.globalEndMs,
      includeSolar: true,
      includeLunar: false,
      solarPresentation: SOLAR_ALL,
      lunarPresentation: LUNAR_ALL,
    })[0]!;
    const rangeStart = event.globalStartMs;
    const rangeEnd = event.globalEndMs;
    const scheduled = scheduleEclipseTourEvents([tourEvent], rangeStart, rangeEnd, "1w", "1w");
    expect(scheduled[0]!.leadInUtcMs).toBe(rangeStart);
    expect(scheduled[0]!.transitionEndUtcMs).toBe(rangeEnd);

    const wide = scheduleEclipseTourEvents(
      [tourEvent],
      event.globalStartMs - 10 * 86_400_000,
      event.globalEndMs + 10 * 86_400_000,
      "immediate",
      "immediate",
    );
    expect(wide[0]!.leadInUtcMs).toBe(event.globalStartMs);
    expect(wide[0]!.transitionEndUtcMs).toBe(event.globalEndMs);
    expect(getLunarEclipseEventById("nasa-5mcle-lunar-9700")?.subtype).toBe("total");
  });

  it("UTC date-only range uses start of start day and end of end day", () => {
    const bounds = eclipseTourRangeUtcMs("2017-08-21", "2017-08-21", true, "UTC");
    expect(bounds).toEqual({
      startUtcMs: Date.UTC(2017, 7, 21, 0, 0, 0, 0),
      endUtcMs: Date.UTC(2017, 7, 21, 23, 59, 59, 999),
    });
  });

  it("enumerates the full combined catalog without duplicates in acceptable time", () => {
    const t0 = performance.now();
    const all = listEclipseTourEvents({
      startUtcMs: range.combinedStartMs,
      endUtcMs: range.combinedEndMs - 1,
      includeSolar: true,
      includeLunar: true,
      solarPresentation: SOLAR_ALL,
      lunarPresentation: LUNAR_ALL,
    });
    const elapsedMs = performance.now() - t0;
    const ids = new Set(all.map((e) => e.eventId));
    expect(ids.size).toBe(all.length);
    expect(all.length).toBe(eclipseTourCatalogCounts().solar + eclipseTourCatalogCounts().lunar);
    expect(elapsedMs).toBeLessThan(250);
  });
});
