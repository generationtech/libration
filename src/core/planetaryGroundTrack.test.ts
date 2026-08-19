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
  PLANETARY_GROUND_TRACK_SAMPLE_INTERVAL_MS,
  resetPlanetaryGroundTrackCacheForTests,
  samplePlanetaryGroundTrack,
} from "./planetaryGroundTrack";
import { planetarySubpoint } from "./planetarySubpoint";

const UTC = Date.UTC(2026, 7, 19, 15, 30, 0, 0);

describe("samplePlanetaryGroundTrack", () => {
  it("places the current sample on planetarySubpoint at the canonical instant", () => {
    resetPlanetaryGroundTrackCacheForTests();
    const geom = samplePlanetaryGroundTrack("mars", UTC, 24, 24);
    expect(geom).not.toBeNull();
    const now = planetarySubpoint("mars", UTC)!;
    expect(geom!.current.latDeg).toBeCloseTo(now.latDeg, 10);
    expect(geom!.current.lonDeg).toBeCloseTo(now.lonDeg, 10);
  });

  it("samples past and future windows at 15-minute cadence", () => {
    resetPlanetaryGroundTrackCacheForTests();
    const geom = samplePlanetaryGroundTrack("jupiter", UTC, 24, 24)!;
    expect(geom.past.length).toBeGreaterThan(0);
    expect(geom.future.length).toBeGreaterThan(0);
    const hours = 24;
    const expectedPast = Math.ceil((hours * 3600 * 1000) / PLANETARY_GROUND_TRACK_SAMPLE_INTERVAL_MS);
    expect(geom.past.length).toBe(expectedPast);
  });

  it("returns null outside the authority span", () => {
    expect(samplePlanetaryGroundTrack("venus", Date.UTC(1400, 0, 1), 24, 24)).toBeNull();
  });
});
