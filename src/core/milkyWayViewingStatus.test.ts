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
  formatMilkyWayViewingActiveLines,
  formatMilkyWayViewingNoticeText,
  formatMilkyWayViewingWindowLocalRange,
  milkyWayViewingEventState,
  milkyWayViewingFeasibilityCopy,
  MILKY_WAY_VIEWING_WINDOW_HONEST_COPY,
  resolveMilkyWayViewingStatus,
} from "./milkyWayViewingStatus";
import type { MilkyWayViewingWindow } from "./milkyWayViewingWindows";
import { MILKY_WAY_VIEWING_POLICY_VERSION } from "./milkyWayViewingPolicy";

function windowAt(start: number, end: number): MilkyWayViewingWindow {
  return {
    id: `milky-way:city.knoxville:${start}`,
    policyVersion: MILKY_WAY_VIEWING_POLICY_VERSION,
    cityId: "city.knoxville",
    startUtcMs: start,
    endUtcMs: end,
    peakUtcMs: start + (end - start) / 2,
    peakAltitudeDeg: 24.8,
    nightlyMaximumAltitudeDeg: 25,
    peakAltitudeQuality01: 0.96,
    minimumSunAltitudeDeg: -30,
    representativeMoonlight01: 0.01,
    peakMoonAboveHorizon: false,
    peakIlluminatedFraction: 0.04,
  };
}

describe("milkyWayViewingStatus", () => {
  it("keeps honest window copy without claiming guaranteed visibility", () => {
    expect(MILKY_WAY_VIEWING_WINDOW_HONEST_COPY).toMatch(/favorably elevated/);
    expect(MILKY_WAY_VIEWING_WINDOW_HONEST_COPY).not.toMatch(/definitely be visible/i);
  });

  it("classifies upcoming / active / completed from product time", () => {
    const w = windowAt(1_000, 2_000);
    expect(milkyWayViewingEventState(w, 500)).toBe("upcoming");
    expect(milkyWayViewingEventState(w, 1_500)).toBe("active");
    expect(milkyWayViewingEventState(w, 2_000)).toBe("completed");
  });

  it("formats Knoxville local times including DST", () => {
    const winter = windowAt(
      Date.UTC(2026, 0, 15, 5, 0, 0, 0),
      Date.UTC(2026, 0, 15, 6, 30, 0, 0),
    );
    const summer = windowAt(
      Date.UTC(2026, 6, 15, 4, 0, 0, 0),
      Date.UTC(2026, 6, 15, 5, 30, 0, 0),
    );
    const winterText = formatMilkyWayViewingWindowLocalRange(
      winter,
      "America/New_York",
      "12hr",
    );
    const summerText = formatMilkyWayViewingWindowLocalRange(
      summer,
      "America/New_York",
      "12hr",
    );
    expect(winterText).toMatch(/12:00 AM/);
    expect(summerText).toMatch(/12:00 AM/);
    expect(winterText).toMatch(/Jan 15/);
    expect(summerText).toMatch(/Jul 15/);
  });

  it("formats Tokyo on a different calendar date than Knoxville for the same UTC", () => {
    const w = windowAt(
      Date.UTC(2026, 7, 21, 15, 0, 0, 0),
      Date.UTC(2026, 7, 21, 16, 30, 0, 0),
    );
    const tokyo = formatMilkyWayViewingWindowLocalRange(w, "Asia/Tokyo", "24hr");
    const knox = formatMilkyWayViewingWindowLocalRange(w, "America/New_York", "24hr");
    expect(tokyo).toMatch(/Aug 22/);
    expect(knox).toMatch(/Aug 21/);
  });

  it("resolves active vs next window without Date.now", () => {
    const a = windowAt(1000, 2000);
    const b = windowAt(5000, 6000);
    const inside = resolveMilkyWayViewingStatus([a, b], 1500);
    expect(inside.active?.id).toBe(a.id);
    expect(inside.next?.id).toBe(b.id);
    const after = resolveMilkyWayViewingStatus([a, b], 2500);
    expect(after.active).toBeNull();
    expect(after.next?.id).toBe(b.id);
  });

  it("formats compact HUD notice copy", () => {
    const w = windowAt(Date.UTC(2026, 7, 20, 2, 7, 0, 0), Date.UTC(2026, 7, 20, 2, 46, 0, 0));
    expect(formatMilkyWayViewingNoticeText(w, Date.UTC(2026, 7, 19, 6, 0, 0, 0), "America/New_York")).toBe(
      "Milky Way viewing · tonight",
    );
    expect(formatMilkyWayViewingNoticeText(w, w.startUtcMs + 1_000, "America/New_York")).toBe(
      "Milky Way viewing",
    );
  });

  it("surfaces Moon-below-horizon and near-new-Moon as explanatory copy", () => {
    const down = windowAt(1_000, 2_000);
    expect(formatMilkyWayViewingActiveLines(down, 1_500, "America/New_York", "12hr", 24.8).join(" ")).toMatch(
      /Moon below horizon/,
    );
    const nearNew: MilkyWayViewingWindow = {
      ...down,
      peakMoonAboveHorizon: true,
      peakIlluminatedFraction: 0.04,
    };
    expect(formatMilkyWayViewingActiveLines(nearNew, 1_500, "America/New_York", "12hr", 24.8).join(" ")).toMatch(
      /near new Moon/,
    );
  });

  it("explains high-latitude and empty-range feasibility", () => {
    expect(milkyWayViewingFeasibilityCopy("gcNeverRises")).toMatch(/does not rise/);
    expect(milkyWayViewingFeasibilityCopy("gcInsufficient")).toMatch(/sufficiently/);
    expect(milkyWayViewingFeasibilityCopy("ok")).toBeNull();
  });
});
