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
import { MILKY_WAY_VIEWING_POLICY_VERSION } from "../milkyWayViewingPolicy";
import type { MilkyWayViewingWindow } from "../milkyWayViewingWindows";
import { groupMilkyWayWindowsForTour, scheduleMilkyWayTourEvents } from "./milkyWayTourEvents";

function win(start: number, end: number, peakAlt = 24): MilkyWayViewingWindow {
  return {
    id: `milky-way:city.knoxville:${start}`,
    policyVersion: MILKY_WAY_VIEWING_POLICY_VERSION,
    cityId: "city.knoxville",
    startUtcMs: start,
    endUtcMs: end,
    peakUtcMs: start + (end - start) / 2,
    peakAltitudeDeg: peakAlt,
    nightlyMaximumAltitudeDeg: 25,
    peakAltitudeQuality01: peakAlt / 25,
    minimumSunAltitudeDeg: -20,
    representativeMoonlight01: 0.02,
    peakMoonAboveHorizon: false,
    peakIlluminatedFraction: 0.05,
  };
}

describe("groupMilkyWayWindowsForTour", () => {
  it("maps each window to one playback event", () => {
    const night = [win(1_000, 2_000, 24.5)];
    const grouped = groupMilkyWayWindowsForTour(night);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.startUtcMs).toBe(1_000);
    expect(grouped[0]!.endUtcMs).toBe(2_000);
    expect(grouped[0]!.peakAltitudeDeg).toBe(24.5);
    expect(grouped[0]!.id).toBe("milky-way-tour:city.knoxville:1000");
  });

  it("does not merge separate windows", () => {
    const a = win(1_000, 2_000);
    const b = win(2_000 + 10 * 60_000, 3_000 + 10 * 60_000);
    expect(groupMilkyWayWindowsForTour([a, b])).toHaveLength(2);
  });

  it("schedules lead-in at start minus offset and post-wait at end", () => {
    const grouped = groupMilkyWayWindowsForTour([win(10_000, 12_000, 24)]);
    const scheduled = scheduleMilkyWayTourEvents(grouped, -10_000_000, 100_000, "1h", "immediate");
    expect(scheduled).toHaveLength(1);
    expect(scheduled[0]!.leadInUtcMs).toBe(10_000 - 3_600_000);
    expect(scheduled[0]!.transitionEndUtcMs).toBe(12_000);
    expect(scheduled[0]!.title).toBe("Milky Way viewing");
  });
});
