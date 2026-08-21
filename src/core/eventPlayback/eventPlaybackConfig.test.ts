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
  defaultEventPlaybackConfig,
  eventPlaybackHasEnabledType,
  eventPlaybackStartBlockedReason,
  getEventPlaybackCalendarBounds,
  normalizeEventPlayback,
} from "./eventPlaybackConfig";

const NOW = Date.UTC(2026, 7, 19, 15, 0, 0, 0);

describe("normalizeEventPlayback", () => {
  it("factory-enables solar, lunar, and Milky Way", () => {
    const n = defaultEventPlaybackConfig(NOW);
    expect(n.solarEnabled).toBe(true);
    expect(n.lunarEnabled).toBe(true);
    expect(n.milkyWayEnabled).toBe(true);
    expect(n.loop).toBe(true);
    expect(n.leadInId).toBe("1d");
    expect(n.postWaitId).toBe("1h");
    expect(n.startDateYmd).toBe("2026-08-19");
    expect(n.endDateYmd).toBe(getEventPlaybackCalendarBounds().maxYmd);
    expect("includeViewing" in n).toBe(false);
    expect("includePrime" in n).toBe(false);
  });

  it("migrates legacy scene.eclipseTour to solar/lunar-only shared prefs", () => {
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
    expect(n.startDateYmd).toBe("2017-08-01");
    expect(n.solarEnabled).toBe(false);
    expect(n.lunarEnabled).toBe(true);
    expect(n.milkyWayEnabled).toBe(false);
    expect(n.loop).toBe(false);
    expect(n.leadInId).toBe("2d");
    expect(n.postWaitId).toBe("6h");
  });

  it("does not let legacy eclipseTour override explicit nested eclipse prefs", () => {
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
    expect(n.startDateYmd).toBe("2024-04-01");
    expect(n.loop).toBe(true);
    expect(n.solarEnabled).toBe(true);
    expect(n.milkyWayEnabled).toBe(false);
  });

  it("migrates LIB-052 eclipse family without enabling Milky Way", () => {
    const n = normalizeEventPlayback(
      {
        family: "eclipses",
        eclipse: {
          startDateYmd: "2026-01-01",
          endDateYmd: "2026-12-31",
          includeSolar: true,
          includeLunar: false,
          loop: true,
          leadInId: "1d",
          postWaitId: "1h",
        },
        milkyWay: {
          includeViewing: true,
          includeStrong: true,
          includePrime: true,
        },
      },
      { nowMs: NOW },
    );
    expect(n.solarEnabled).toBe(true);
    expect(n.lunarEnabled).toBe(false);
    expect(n.milkyWayEnabled).toBe(false);
    expect(n.startDateYmd).toBe("2026-01-01");
  });

  it("migrates LIB-052 Milky Way family without enabling solar/lunar", () => {
    const n = normalizeEventPlayback(
      {
        family: "milkyWay",
        eclipse: {
          includeSolar: true,
          includeLunar: true,
        },
        milkyWay: {
          startDateYmd: "2026-08-19",
          endDateYmd: "2026-12-31",
          includeViewing: false,
          includeStrong: true,
          includePrime: true,
          loop: true,
          leadInId: "2d",
          postWaitId: "6h",
        },
      },
      { nowMs: NOW },
    );
    expect(n.milkyWayEnabled).toBe(true);
    expect(n.solarEnabled).toBe(false);
    expect(n.lunarEnabled).toBe(false);
    expect(n.startDateYmd).toBe("2026-08-19");
    expect(n.endDateYmd).toBe("2026-12-31");
    expect(n.leadInId).toBe("2d");
    expect(n.postWaitId).toBe("6h");
    expect("includePrime" in n).toBe(false);
  });

  it("clamps invalid shared dates to the union authority range", () => {
    const n = normalizeEventPlayback(
      {
        startDateYmd: "1500-01-01",
        endDateYmd: "2600-01-01",
      },
      { nowMs: NOW },
    );
    const bounds = getEventPlaybackCalendarBounds();
    expect(n.startDateYmd).toBe(bounds.minYmd);
    expect(n.endDateYmd).toBe(bounds.maxYmd);
  });

  it("preserves explicit false on the new model", () => {
    const n = normalizeEventPlayback(
      {
        solarEnabled: false,
        lunarEnabled: false,
        milkyWayEnabled: true,
        includeStrong: false,
        includePrime: false,
        includeViewing: true,
      },
      { nowMs: NOW },
    );
    expect(n.solarEnabled).toBe(false);
    expect(n.lunarEnabled).toBe(false);
    expect(n.milkyWayEnabled).toBe(true);
    expect("includeViewing" in n).toBe(false);
  });

  it("blocks Start when no event types are selected", () => {
    const none = normalizeEventPlayback(
      { solarEnabled: false, lunarEnabled: false, milkyWayEnabled: false },
      { nowMs: NOW },
    );
    expect(eventPlaybackHasEnabledType(none)).toBe(false);
    expect(eventPlaybackStartBlockedReason(none, true)).toBe("Select at least one event type");
    const mwOnly = normalizeEventPlayback(
      {
        solarEnabled: false,
        lunarEnabled: false,
        milkyWayEnabled: true,
        includeViewing: false,
        includeStrong: false,
        includePrime: false,
      },
      { nowMs: NOW },
    );
    expect(eventPlaybackHasEnabledType(mwOnly)).toBe(true);
    expect(eventPlaybackStartBlockedReason(mwOnly, true)).toBeNull();
    expect("includePrime" in mwOnly).toBe(false);
  });
});
