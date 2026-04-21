/*
 * Libration
 * Copyright (C) 2026 Ken McDonald
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, version 3.
 */

import { describe, expect, it } from "vitest";
import {
  applyBottomStack12hrColonAlignment,
  buildBottomTimeStackLines,
  formatBottomHudDateLine,
} from "./bottomTimeStackPlan.ts";

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
    expect(lines[1]!.text.startsWith("Refer")).toBe(true);
    expect(lines[2]!.text.startsWith("UTC")).toBe(true);
    const sys = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (sys !== "America/New_York") {
      expect(lines.some((l) => l.role === "spacer")).toBe(true);
      expect(lines[lines.length - 1]!.text.startsWith("Local")).toBe(true);
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
    expect(lines[1]!.text.startsWith("Refer")).toBe(false);
    expect(lines[1]!.text).toMatch(/\d{2}:\d{2}/);
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
