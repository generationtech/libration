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
  applyBottomStack12hrColonAlignment,
  buildBottomTimeStackLines,
  formatBottomHudDateLine,
} from "./bottomTimeStackPlan.ts";
import { formatBottomTimeStackClockLine } from "./bottomChromeTypes.ts";
import { resolveBottomChromeTypography } from "./bottomChrome.ts";

describe("buildBottomTimeStackLines", () => {
  it("orders rows as date, reference, UTC, then local with spacer when local is distinct", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      bottomTimeStack: {
        bottomTimeStackShowRefer: true,
        bottomTimeStackShowUtc: true,
        bottomTimeStackShowLocal: true,
      },
    });
    expect(lines[0]!.role).toBe("date");
    const c1 = lines[1]!;
    const c2 = lines[2]!;
    expect(c1.role).toBe("clock");
    expect(c2.role).toBe("clock");
    if (c1.role === "clock" && c2.role === "clock") {
      const sys = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (sys === "America/New_York") {
        expect(c1.label).toBeNull();
        expect(c2.label).toBe("UTC");
      } else {
        expect(c1.label).toBe("Refer");
        expect(c2.label).toBe("UTC");
      }
    }
    const sys = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (sys !== "America/New_York") {
      expect(lines.some((l) => l.role === "spacer")).toBe(true);
      const localLine = lines.filter((l): l is Extract<typeof l, { role: "clock" }> => l.role === "clock").at(-1)!;
      expect(localLine.label).toBe("Local");
    }
  });

  it("uses no clock labels when exactly one clock row is enabled", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "UTC",
      topBandMode: "local24",
      bottomTimeStack: {
        bottomTimeStackShowRefer: true,
        bottomTimeStackShowUtc: false,
        bottomTimeStackShowLocal: false,
      },
    });
    expect(lines).toHaveLength(2);
    expect(lines[1]!.role).toBe("clock");
    const clk = lines[1]!;
    expect(clk.role).toBe("clock");
    if (clk.role === "clock") {
      expect(clk.label).toBeNull();
      expect(clk.timeText).toMatch(/\d{2}:\d{2}/);
    }
  });

  it("suppresses Refer when local is hidden only because it matches reference, but keeps UTC label", () => {
    const t = Date.UTC(2024, 0, 1, 14, 5, 6);
    if (Intl.DateTimeFormat().resolvedOptions().timeZone !== "UTC") {
      return;
    }
    const lines = buildBottomTimeStackLines({
      nowMs: t,
      referenceTimeZone: "UTC",
      topBandMode: "local24",
      bottomTimeStack: {
        bottomTimeStackShowRefer: true,
        bottomTimeStackShowUtc: true,
        bottomTimeStackShowLocal: true,
      },
    });
    const clocks = lines.filter((l): l is Extract<typeof l, { role: "clock" }> => l.role === "clock");
    expect(clocks).toHaveLength(2);
    expect(clocks[0]!.label).toBeNull();
    expect(clocks[0]!.timeText).toMatch(/14:05/);
    expect(clocks[1]!.label).toBe("UTC");
  });

  it("aligns colon positions across multiple clock bodies (24h)", () => {
    const lines = buildBottomTimeStackLines({
      nowMs: Date.UTC(2024, 0, 1, 8, 5, 6),
      referenceTimeZone: "America/New_York",
      topBandMode: "local24",
      bottomTimeStack: {
        bottomTimeStackShowRefer: true,
        bottomTimeStackShowUtc: true,
        bottomTimeStackShowLocal: true,
      },
    });
    const texts = lines
      .filter((l): l is Extract<typeof l, { role: "clock" }> => l.role === "clock")
      .map((l) => l.timeText);
    const colonIdx = texts.map((s) => s.indexOf(":"));
    if (new Set(colonIdx).size === 1) {
      expect(colonIdx.every((i) => i === colonIdx[0])).toBe(true);
    }
  });
});

describe("resolveBottomChromeTypography", () => {
  it("does not shrink stack text when line count changes", () => {
    const a = resolveBottomChromeTypography(1200, 2);
    const b = resolveBottomChromeTypography(1200, 6);
    expect(a.primaryTimePx).toBe(b.primaryTimePx);
    expect(a.secondaryReadoutPx).toBe(b.primaryTimePx);
  });
});

describe("applyBottomStack12hrColonAlignment", () => {
  it("prefixes one space before a single-digit 12-hour hour without adding a leading zero", () => {
    expect(applyBottomStack12hrColonAlignment("7:05 PM", true)).toBe(" 7:05 PM");
    expect(applyBottomStack12hrColonAlignment("11:05 PM", true)).toBe("11:05 PM");
  });
});

describe("formatBottomHudDateLine", () => {
  it("uses the reference IANA zone for the calendar day", () => {
    const t = Date.UTC(2024, 0, 1, 4, 30, 0);
    expect(formatBottomHudDateLine(t, "America/New_York")).toMatch(/December 31 2023/);
  });
});

describe("formatBottomTimeStackClockLine", () => {
  it("joins label and timeText like legacy single string", () => {
    const s = formatBottomTimeStackClockLine({
      role: "clock",
      label: "UTC",
      timeText: "19:45:00",
    });
    expect(s).toBe("UTC  19:45:00");
  });
});
