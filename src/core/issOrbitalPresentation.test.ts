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
  DEFAULT_ISS_ORBITAL_PRESENTATION,
  DEFAULT_ISS_ORBIT_BASE_COLOR,
  DEFAULT_ISS_ORBIT_FUTURE_MINUTES,
  DEFAULT_ISS_ORBIT_PAST_MINUTES,
  normalizeIssOrbitalPresentation,
  selectIssTrackTemporalWindow,
} from "./issOrbitalPresentation";

describe("issOrbitalPresentation", () => {
  it("fills missing keys with factory defaults", () => {
    expect(normalizeIssOrbitalPresentation(undefined)).toEqual(DEFAULT_ISS_ORBITAL_PRESENTATION);
    expect(normalizeIssOrbitalPresentation({})).toEqual(DEFAULT_ISS_ORBITAL_PRESENTATION);
    expect(DEFAULT_ISS_ORBIT_PAST_MINUTES).toBe(60);
    expect(DEFAULT_ISS_ORBIT_FUTURE_MINUTES).toBe(30);
  });

  it("preserves explicit persisted values", () => {
    const next = normalizeIssOrbitalPresentation({
      trackEnabled: false,
      pastEnabled: false,
      futureEnabled: true,
      pastMinutes: 15,
      futureMinutes: 15,
      baseColor: "#112233",
      pastColor: "#ff0000",
      futureColor: "#00ff00",
      lineThickness: "thick",
      glyphType: "silhouette",
      glyphSize: "large",
      dotColor: "#abcdef",
      glyphColor: "#fedcba",
      labelEnabled: false,
    });
    expect(next.trackEnabled).toBe(false);
    expect(next.pastEnabled).toBe(false);
    expect(next.futureEnabled).toBe(true);
    expect(next.pastMinutes).toBe(15);
    expect(next.futureMinutes).toBe(15);
    expect(next.baseColor).toBe("#112233");
    expect(next.pastColor).toBe("#ff0000");
    expect(next.futureColor).toBe("#00ff00");
    expect(next.lineThickness).toBe("thick");
    expect(next.glyphType).toBe("silhouette");
    expect(next.glyphSize).toBe("large");
    expect(next.dotColor).toBe("#abcdef");
    expect(next.glyphColor).toBe("#fedcba");
    expect(next.labelEnabled).toBe(false);
  });

  it("uses baseColor as fallback for a missing past color", () => {
    const next = normalizeIssOrbitalPresentation({ baseColor: "#123456" });
    expect(next.baseColor).toBe("#123456");
    expect(next.pastColor).toBe("#123456");
    expect(next.futureColor).not.toBe("#123456");
  });

  it("rejects unknown duration/thickness/glyph ids", () => {
    const next = normalizeIssOrbitalPresentation({
      pastMinutes: 90,
      futureMinutes: 60,
      lineThickness: "chunky",
      glyphType: "emoji",
      glyphSize: "tiny",
      baseColor: "not-a-color",
    });
    expect(next.pastMinutes).toBe(DEFAULT_ISS_ORBIT_PAST_MINUTES);
    expect(next.futureMinutes).toBe(DEFAULT_ISS_ORBIT_FUTURE_MINUTES);
    expect(next.lineThickness).toBe("normal");
    expect(next.glyphType).toBe("dot");
    expect(next.glyphSize).toBe("normal");
    expect(next.baseColor).toBe(DEFAULT_ISS_ORBIT_BASE_COLOR);
  });

  it("splits past and future by timestamp vs product UTC", () => {
    const now = 1_000_000;
    const samples = [
      { timeMs: now - 30 * 60_000, id: "p30" },
      { timeMs: now - 10 * 60_000, id: "p10" },
      { timeMs: now + 10 * 60_000, id: "f10" },
      { timeMs: now + 40 * 60_000, id: "f40" },
    ];
    const current = { timeMs: now, id: "now" };
    const windowed = selectIssTrackTemporalWindow(samples, now, {
      pastEnabled: true,
      futureEnabled: true,
      pastMinutes: 15,
      futureMinutes: 30,
      current,
    });
    expect(windowed.past.map((s) => s.id)).toEqual(["p10", "now"]);
    expect(windowed.future.map((s) => s.id)).toEqual(["now", "f10"]);
  });

  it("omits a disabled temporal side without dropping the current join when the other side is on", () => {
    const now = 50_000;
    const samples = [
      { timeMs: now - 10_000, id: "p" },
      { timeMs: now + 10_000, id: "f" },
    ];
    const current = { timeMs: now, id: "now" };
    const pastOnly = selectIssTrackTemporalWindow(samples, now, {
      pastEnabled: true,
      futureEnabled: false,
      pastMinutes: 60,
      futureMinutes: 30,
      current,
    });
    expect(pastOnly.future).toEqual([]);
    expect(pastOnly.past.map((s) => s.id)).toEqual(["p", "now"]);
  });
});
