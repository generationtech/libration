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
import {
  defaultEventPlaybackConfig,
  getMilkyWayPlaybackCalendarBounds,
  normalizeEventPlayback,
} from "./eventPlaybackConfig";

const NOW = Date.UTC(2026, 7, 19, 15, 0, 0, 0);

describe("normalizeEventPlayback", () => {
  it("defaults MW playback to Strong+Prime, present start, and ephemeris-max end", () => {
    const n = defaultEventPlaybackConfig(NOW);
    expect(n.family).toBe("eclipses");
    expect(n.milkyWay.includeViewing).toBe(false);
    expect(n.milkyWay.includeStrong).toBe(true);
    expect(n.milkyWay.includePrime).toBe(true);
    expect(n.milkyWay.loop).toBe(true);
    expect(n.milkyWay.leadInId).toBe("1d");
    expect(n.milkyWay.postWaitId).toBe("1h");
    expect(n.milkyWay.startDateYmd).toBe("2026-08-19");
    expect(n.milkyWay.endDateYmd).toBe(getMilkyWayPlaybackCalendarBounds().maxYmd);
    expect(n.eclipse.includeSolar).toBe(true);
    expect(n.eclipse.includeLunar).toBe(true);
  });

  it("migrates legacy scene.eclipseTour when eclipse prefs are absent", () => {
    const n = normalizeEventPlayback(undefined, {
      nowMs: NOW,
      legacyEclipseTour: {
        startDateYmd: "2017-08-01",
        endDateYmd: "2017-09-15",
        includeSolar: false,
        includeLunar: true,
        loop: false,
        leadInId: "2d",
        postWaitId: "6h",
      },
    });
    expect(n.eclipse.startDateYmd).toBe("2017-08-01");
    expect(n.eclipse.includeSolar).toBe(false);
    expect(n.eclipse.includeLunar).toBe(true);
    expect(n.eclipse.loop).toBe(false);
    expect(n.eclipse.leadInId).toBe("2d");
    expect(n.eclipse.postWaitId).toBe("6h");
  });

  it("does not let legacy eclipseTour override explicit data.eventPlayback.eclipse", () => {
    const n = normalizeEventPlayback(
      {
        eclipse: {
          startDateYmd: "2024-04-01",
          endDateYmd: "2024-04-30",
          includeSolar: true,
          includeLunar: true,
          loop: true,
        },
      },
      {
        nowMs: NOW,
        legacyEclipseTour: { loop: false, includeSolar: false },
      },
    );
    expect(n.eclipse.startDateYmd).toBe("2024-04-01");
    expect(n.eclipse.loop).toBe(true);
    expect(n.eclipse.includeSolar).toBe(true);
  });

  it("clamps invalid Milky Way dates to the supported ephemeris range", () => {
    const n = normalizeEventPlayback(
      {
        milkyWay: {
          startDateYmd: "1500-01-01",
          endDateYmd: "2600-01-01",
        },
      },
      { nowMs: NOW },
    );
    const bounds = getMilkyWayPlaybackCalendarBounds();
    expect(n.milkyWay.startDateYmd).toBe(bounds.minYmd);
    expect(n.milkyWay.endDateYmd).toBe(bounds.maxYmd);
  });
});
