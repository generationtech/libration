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
});
