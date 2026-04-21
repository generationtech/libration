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
import { buildBottomTimeStackLines, formatBottomHudDateLine } from "./bottomTimeStackPlan.ts";

describe("buildBottomTimeStackLines", () => {
  it("places reference-city date above reference-city time with no labels", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "UTC",
      topBandMode: "local24",
    });
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({ role: "date", text: "January 1 2024" });
    expect(lines[1]!.role).toBe("time");
    if (lines[1]!.role === "time") {
      expect(lines[1]!.text).toMatch(/14:05:06/);
    }
  });

  it("omits date when bottomTimeStackShowDate is false", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "UTC",
      topBandMode: "local24",
      bottomTimeStack: { bottomTimeStackShowDate: false, bottomTimeStackShowTime: true },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.role).toBe("time");
  });

  it("omits time when bottomTimeStackShowTime is false", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "UTC",
      topBandMode: "local24",
      bottomTimeStack: { bottomTimeStackShowDate: true, bottomTimeStackShowTime: false },
    });
    expect(lines).toHaveLength(1);
    expect(lines[0]!.role).toBe("date");
  });

  it("uses reference IANA zone for date; utc24 formats the time row in UTC", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "America/New_York",
      topBandMode: "utc24",
    });
    expect(lines[0]).toMatchObject({ role: "date" });
    const timeLine = lines.find((l) => l.role === "time");
    expect(timeLine?.role).toBe("time");
    if (timeLine?.role === "time") {
      expect(timeLine.text).toMatch(/14:05:06/);
    }
  });

  it("follows top-band 12-hour mode for the time row", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "UTC",
      topBandMode: "local12",
    });
    const timeLine = lines.find((l) => l.role === "time");
    expect(timeLine?.role).toBe("time");
    if (timeLine?.role === "time") {
      expect(timeLine.text).toMatch(/\b(AM|PM)\b/i);
    }
  });

  it("includes seconds in the time string when bottomTimeShowSeconds is true", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "UTC",
      topBandMode: "local24",
      bottomTimeStack: { bottomTimeShowSeconds: true },
    });
    const timeLine = lines.find((l) => l.role === "time");
    expect(timeLine?.role).toBe("time");
    if (timeLine?.role === "time") {
      expect(timeLine.text).toMatch(/14:05:06/);
    }
  });

  it("omits seconds from the time string when bottomTimeShowSeconds is false", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "UTC",
      topBandMode: "local24",
      bottomTimeStack: { bottomTimeShowSeconds: false },
    });
    const timeLine = lines.find((l) => l.role === "time");
    expect(timeLine?.role).toBe("time");
    if (timeLine?.role === "time") {
      expect(timeLine.text).toMatch(/14:05\b/);
      expect(timeLine.text).not.toMatch(/14:05:06/);
    }
  });

  it("utc24 still omits seconds when bottomTimeShowSeconds is false", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "America/New_York",
      topBandMode: "utc24",
      bottomTimeStack: { bottomTimeShowSeconds: false },
    });
    const timeLine = lines.find((l) => l.role === "time");
    expect(timeLine?.text).toMatch(/14:05\b/);
    expect(timeLine?.text).not.toMatch(/14:05:06/);
  });
});

describe("buildBottomTimeStackLines hour-label mode (America/New_York)", () => {
  const referenceTimeZone = "America/New_York";
  /** July 15 2024 07:35:30 UTC → 03:35:30 in New York (EDT). */
  const nowMs = Date.UTC(2024, 6, 15, 7, 35, 30);

  it("local12: time row is reference-city 12-hour wall clock", () => {
    const lines = buildBottomTimeStackLines({ nowMs, referenceTimeZone, topBandMode: "local12" });
    const timeLine = lines.find((l) => l.role === "time");
    expect(timeLine?.text).toMatch(/\b(AM|PM)\b/i);
    expect(timeLine?.text).toMatch(/3:35:30/);
  });

  it("local24: time row is reference-city 24-hour wall clock", () => {
    const lines = buildBottomTimeStackLines({ nowMs, referenceTimeZone, topBandMode: "local24" });
    const timeLine = lines.find((l) => l.role === "time");
    expect(timeLine?.text).toMatch(/03:35:30/);
    expect(timeLine?.text).not.toMatch(/\b(AM|PM)\b/i);
  });

  it("utc24: time row is UTC 24-hour for the same instant", () => {
    const lines = buildBottomTimeStackLines({ nowMs, referenceTimeZone, topBandMode: "utc24" });
    const timeLine = lines.find((l) => l.role === "time");
    expect(timeLine?.text).toMatch(/07:35:30/);
  });

  it("utc24: date row stays on the reference-zone calendar when UTC calendar date differs", () => {
    const edgeMs = Date.UTC(2024, 0, 1, 4, 30, 0);
    const lines = buildBottomTimeStackLines({
      nowMs: edgeMs,
      referenceTimeZone,
      topBandMode: "utc24",
    });
    const dateLine = lines.find((l) => l.role === "date");
    expect(dateLine?.text).toMatch(/December 31 2023/);
    const timeLine = lines.find((l) => l.role === "time");
    expect(timeLine?.text).toMatch(/04:30:00/);
  });
});

describe("formatBottomHudDateLine", () => {
  it("uses the reference zone civil calendar", () => {
    const t = Date.UTC(2024, 0, 1, 4, 30, 0);
    expect(formatBottomHudDateLine(t, "America/New_York")).toMatch(/December 31 2023/);
  });
});
