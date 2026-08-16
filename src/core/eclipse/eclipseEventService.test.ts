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
  resetEclipseEventServiceCacheForTests,
  resolveEclipseFrame,
} from "./eclipseEventService";
import { haversineKm } from "./besselianGeographic";

describe("EclipseEventService", () => {
  it("returns explicit unsupported outside 1900–2100, not an empty eclipse", () => {
    resetEclipseEventServiceCacheForTests();
    const outside = resolveEclipseFrame(Date.UTC(1899, 11, 31, 23, 59, 59, 0));
    expect(outside.support).toEqual({
      supported: false,
      reason: "outside-authority-range",
    });
    expect(outside.activeSolar).toBeNull();
    expect(outside.solarGeometry).toBeNull();
    expect(outside.activeLunar).toBeNull();
    expect(outside.lunarGeometry).toBeNull();
    expect(outside.upcomingSolar).toEqual([]);
    expect(outside.horizonMs).toBe(0);

    const quiet = resolveEclipseFrame(Date.parse("2020-01-01T00:00:00.000Z"));
    expect(quiet.support).toEqual({ supported: true });
    expect(quiet.activeSolar).toBeNull();
    expect(quiet.solarGeometry).toBeNull();
  });

  it("resolves the 2024 total at an arbitrary product UTC and is stable when paused", () => {
    resetEclipseEventServiceCacheForTests();
    const utc = Date.parse("2024-04-08T18:17:15.000Z");
    const a = resolveEclipseFrame(utc);
    const b = resolveEclipseFrame(utc);
    expect(a).toBe(b);
    expect(a.activeSolar?.id).toBe("nasa-5mcse-solar-9561");
    expect(a.activeSolar?.subtype).toBe("total");
    expect(a.solarGeometry?.centralPoint).not.toBeNull();

    const later = resolveEclipseFrame(utc + 15 * 60_000);
    expect(later.activeSolar?.id).toBe(a.activeSolar?.id);
    expect(later.solarGeometry?.centralPoint).not.toBeNull();
    const d = haversineKm(
      a.solarGeometry!.centralPoint!.latDeg,
      a.solarGeometry!.centralPoint!.lonDeg,
      later.solarGeometry!.centralPoint!.latDeg,
      later.solarGeometry!.centralPoint!.lonDeg,
    );
    expect(d).toBeGreaterThan(50);
  });

  it("returns no upcoming events for a live-only horizon", () => {
    resetEclipseEventServiceCacheForTests();
    const utc = Date.parse("2024-04-03T18:00:00.000Z");
    const liveOnly = resolveEclipseFrame(utc, { horizonMs: 0 });
    expect(liveOnly.upcomingSolar).toEqual([]);
    expect(liveOnly.forecastSelections).toEqual([]);
    expect(liveOnly.activeSolar).toBeNull();
  });

  it("resolves the 2024 total as upcoming inside a 7-day horizon and as active at T", () => {
    resetEclipseEventServiceCacheForTests();
    const before = Date.parse("2024-04-03T18:00:00.000Z");
    const horizonMs = 7 * 86_400_000;
    const upcoming = resolveEclipseFrame(before, { horizonMs });
    expect(upcoming.support).toEqual({ supported: true });
    expect(upcoming.upcomingSolar.map((e) => e.id)).toEqual(["nasa-5mcse-solar-9561"]);
    expect(upcoming.forecastSelections).toHaveLength(1);
    expect(upcoming.forecastSelections[0]?.lifecycle).toBe("upcoming");
    expect(upcoming.forecastSelections[0]?.nearestUpcoming).toBe(true);
    expect(upcoming.forecastSelections[0]?.event.id).toBe("nasa-5mcse-solar-9561");
    expect(upcoming.solarGeometry).toBeNull();

    const activeUtc = Date.parse("2024-04-08T18:17:15.000Z");
    const active = resolveEclipseFrame(activeUtc, { horizonMs });
    expect(active.activeSolar?.id).toBe("nasa-5mcse-solar-9561");
    expect(active.upcomingSolar.every((e) => e.id !== "nasa-5mcse-solar-9561")).toBe(true);
    expect(active.forecastSelections.some((s) => s.lifecycle === "active" && s.event.id === "nasa-5mcse-solar-9561")).toBe(
      true,
    );
    expect(active.solarGeometry?.centralPoint).not.toBeNull();
  });

  it("returns more than one upcoming event for a long horizon, ordered by start", () => {
    resetEclipseEventServiceCacheForTests();
    const utc = Date.parse("2023-10-01T00:00:00.000Z");
    const frame = resolveEclipseFrame(utc, { horizonMs: 365 * 86_400_000 });
    expect(frame.upcomingSolar.length).toBeGreaterThan(1);
    for (let i = 1; i < frame.upcomingSolar.length; i += 1) {
      expect(frame.upcomingSolar[i]!.globalStartMs).toBeGreaterThan(frame.upcomingSolar[i - 1]!.globalStartMs);
    }
    expect(frame.forecastSelections.filter((s) => s.nearestUpcoming)).toHaveLength(1);
    expect(frame.forecastSelections.find((s) => s.nearestUpcoming)?.event.id).toBe(frame.upcomingSolar[0]!.id);
  });

  it("reconstructs forecast vs live immediately on a UTC jump", () => {
    resetEclipseEventServiceCacheForTests();
    const horizonMs = 7 * 86_400_000;
    const before = resolveEclipseFrame(Date.parse("2024-04-03T18:00:00.000Z"), { horizonMs });
    const max = resolveEclipseFrame(Date.parse("2024-04-08T18:17:15.000Z"), { horizonMs });
    const after = resolveEclipseFrame(Date.parse("2024-04-09T00:00:00.000Z"), { horizonMs });
    expect(before.upcomingSolar[0]?.id).toBe("nasa-5mcse-solar-9561");
    expect(before.activeSolar).toBeNull();
    expect(max.activeSolar?.id).toBe("nasa-5mcse-solar-9561");
    expect(after.activeSolar).toBeNull();
    expect(after.upcomingSolar.map((e) => e.id)).not.toContain("nasa-5mcse-solar-9561");
  });

  it("exposes truncated coverage near the authority edges without inventing events", () => {
    resetEclipseEventServiceCacheForTests();
    const spanStart = Date.UTC(1900, 0, 1, 0, 0, 0, 0);
    const spanEnd = Date.UTC(2101, 0, 1, 0, 0, 0, 0);
    const beforeStart = resolveEclipseFrame(spanStart - 20 * 86_400_000, { horizonMs: 30 * 86_400_000 });
    expect(beforeStart.support.supported).toBe(false);
    expect(beforeStart.forecastCoverage.truncated).toBe(true);
    expect(beforeStart.forecastCoverage.queryStartMs).toBe(spanStart);
    expect(beforeStart.upcomingSolar.every((e) => e.globalStartMs >= spanStart)).toBe(true);

    const nearEnd = resolveEclipseFrame(spanEnd - 10 * 86_400_000, { horizonMs: 90 * 86_400_000 });
    expect(nearEnd.support.supported).toBe(true);
    expect(nearEnd.forecastCoverage.truncated).toBe(true);
    expect(nearEnd.forecastCoverage.queryEndMs).toBe(spanEnd);
    expect(nearEnd.upcomingSolar.every((e) => e.globalStartMs < spanEnd)).toBe(true);

    const afterEnd = resolveEclipseFrame(spanEnd, { horizonMs: 7 * 86_400_000 });
    expect(afterEnd.support.supported).toBe(false);
    expect(afterEnd.forecastCoverage.truncated).toBe(true);
    expect(afterEnd.upcomingSolar).toEqual([]);
    expect(afterEnd.activeSolar).toBeNull();
    expect(afterEnd.activeLunar).toBeNull();
  });

  it("resolves the 2022 total lunar eclipse at product UTC and clears outside the span", () => {
    resetEclipseEventServiceCacheForTests();
    const utc = Date.parse("2022-05-16T04:11:29.000Z");
    const a = resolveEclipseFrame(utc);
    expect(a.activeLunar?.id).toBe("nasa-5mcle-lunar-9700");
    expect(a.activeLunar?.subtype).toBe("total");
    expect(a.lunarGeometry?.phase).toBe("total-umbral");
    expect(a.activeSolar).toBeNull();
    const paused = resolveEclipseFrame(utc);
    expect(paused).toBe(a);
    const later = resolveEclipseFrame(utc + 20 * 60_000);
    expect(later.activeLunar?.id).toBe(a.activeLunar?.id);
    expect(later.lunarGeometry?.axisDistanceEarthRadii).not.toBe(a.lunarGeometry?.axisDistanceEarthRadii);
    const after = resolveEclipseFrame(Date.parse("2022-05-16T12:00:00.000Z"));
    expect(after.activeLunar).toBeNull();
    expect(after.lunarGeometry).toBeNull();
  });
});
