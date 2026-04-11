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
  demoStartCalendarDateFromCommittedIso,
  demoStartEditableTimeTextFromCommittedIso,
  demoStartTimeEntryUses12HourClock,
  demoStartTimeFieldPlaceholder,
  demoTimeStartIsoUtcNow,
  effectiveDemoWallClockZone,
  isValidCommitIsoText,
  isValidUtcTimeCommitText,
  mergeDemoWallTimeTextIntoCommittedIso,
  mergeDemoWallYmdIntoCommittedIso,
  mergeUtcTimeTextIntoCommittedIso,
  mergeUtcYmdIntoCommittedIso,
  parseUtcTimeOfDayText,
  utcCalendarDateFromCommittedIso,
  utcEditableTimeTextFromCommittedIso,
} from "./demoTimeStartIso";
import { formatWallClockInTimeZone } from "../../core/timeFormat";

describe("demoTimeStartIso", () => {
  it("demoTimeStartIsoUtcNow returns Date#toISOString for the given instant", () => {
    expect(demoTimeStartIsoUtcNow(Date.UTC(2031, 0, 9, 8, 7, 6, 50))).toBe("2031-01-09T08:07:06.050Z");
  });

  it("effectiveDemoWallClockZone matches bottom-bar policy", () => {
    expect(effectiveDemoWallClockZone("utc24", "America/New_York")).toBe("UTC");
    expect(effectiveDemoWallClockZone("local24", "America/New_York")).toBe("America/New_York");
  });

  it("utcCalendarDateFromCommittedIso returns UTC YYYY-MM-DD (legacy UTC-only helper)", () => {
    expect(utcCalendarDateFromCommittedIso("2030-06-15T12:00:00.000Z")).toBe("2030-06-15");
    expect(utcCalendarDateFromCommittedIso(" 2045-01-02T00:00:00.000Z ")).toBe("2045-01-02");
  });

  it("utcCalendarDateFromCommittedIso returns null for non-parseable strings", () => {
    expect(utcCalendarDateFromCommittedIso("")).toBeNull();
    expect(utcCalendarDateFromCommittedIso("not-a-date")).toBeNull();
  });

  it("demoStartCalendarDateFromCommittedIso uses reference zone for local modes", () => {
    const iso = "2030-06-15T16:03:03.000Z";
    expect(demoStartCalendarDateFromCommittedIso(iso, "utc24", "UTC")).toBe("2030-06-15");
    expect(demoStartCalendarDateFromCommittedIso(iso, "local24", "America/New_York")).toBe("2030-06-15");
  });

  it("mergeUtcYmdIntoCommittedIso preserves UTC time-of-day (legacy)", () => {
    expect(mergeUtcYmdIntoCommittedIso("2030-06-15T12:34:56.789Z", "2045-07-20")).toBe(
      "2045-07-20T12:34:56.789Z",
    );
  });

  it("mergeUtcYmdIntoCommittedIso returns null for bad inputs", () => {
    expect(mergeUtcYmdIntoCommittedIso("invalid", "2045-07-20")).toBeNull();
    expect(mergeUtcYmdIntoCommittedIso("2030-06-15T12:00:00.000Z", "not-ymd")).toBeNull();
  });

  it("mergeDemoWallYmdIntoCommittedIso preserves wall time in the reference zone", () => {
    const iso = "2030-06-15T16:03:03.172Z";
    const merged = mergeDemoWallYmdIntoCommittedIso(iso, "2030-06-16", "local24", "America/New_York");
    expect(merged).toBe("2030-06-16T16:03:03.172Z");
  });

  it("isValidCommitIsoText matches Date.parse finiteness", () => {
    expect(isValidCommitIsoText("2045-07-20T06:00:00.000Z")).toBe(true);
    expect(isValidCommitIsoText("")).toBe(false);
    expect(isValidCommitIsoText("   ")).toBe(false);
    expect(isValidCommitIsoText("2045-07-20T")).toBe(false);
    expect(isValidCommitIsoText("not-a-date")).toBe(false);
  });

  describe("parseUtcTimeOfDayText (wall grammar)", () => {
    it("accepts 24-hour H:MM and HH:MM:SS", () => {
      expect(parseUtcTimeOfDayText("6:15")).toEqual({
        hour: 6,
        minute: 15,
        second: 0,
        secondProvided: false,
      });
      expect(parseUtcTimeOfDayText("06:15")).toEqual({
        hour: 6,
        minute: 15,
        second: 0,
        secondProvided: false,
      });
      expect(parseUtcTimeOfDayText("18:15:30")).toEqual({
        hour: 18,
        minute: 15,
        second: 30,
        secondProvided: true,
      });
    });

    it("accepts compact 12-hour forms like 3pm", () => {
      expect(parseUtcTimeOfDayText("3pm")).toEqual({
        hour: 15,
        minute: 0,
        second: 0,
        secondProvided: false,
      });
    });

    it("accepts 12-hour forms", () => {
      expect(parseUtcTimeOfDayText("6pm")).toEqual({
        hour: 18,
        minute: 0,
        second: 0,
        secondProvided: false,
      });
      expect(parseUtcTimeOfDayText("6:15 pm")).toEqual({
        hour: 18,
        minute: 15,
        second: 0,
        secondProvided: false,
      });
      expect(parseUtcTimeOfDayText("6:15 PM UTC")).toEqual({
        hour: 18,
        minute: 15,
        second: 0,
        secondProvided: false,
      });
      expect(parseUtcTimeOfDayText("11:05 am")).toEqual({
        hour: 11,
        minute: 5,
        second: 0,
        secondProvided: false,
      });
      expect(parseUtcTimeOfDayText("12:00 am")).toEqual({
        hour: 0,
        minute: 0,
        second: 0,
        secondProvided: false,
      });
      expect(parseUtcTimeOfDayText("12:00 pm")).toEqual({
        hour: 12,
        minute: 0,
        second: 0,
        secondProvided: false,
      });
    });

    it("accepts Z / UTC / Zulu suffix on 24-hour times", () => {
      expect(parseUtcTimeOfDayText("18:15Z")).toEqual({
        hour: 18,
        minute: 15,
        second: 0,
        secondProvided: false,
      });
      expect(parseUtcTimeOfDayText("18:15:30 Zulu")).toEqual({
        hour: 18,
        minute: 15,
        second: 30,
        secondProvided: true,
      });
    });

    it("rejects empty and partial input", () => {
      expect(parseUtcTimeOfDayText("")).toBeNull();
      expect(parseUtcTimeOfDayText("18")).toBeNull();
      expect(parseUtcTimeOfDayText("not-a-time")).toBeNull();
      expect(parseUtcTimeOfDayText("25:00")).toBeNull();
    });
  });

  describe("mergeUtcTimeTextIntoCommittedIso (legacy UTC frame)", () => {
    it("preserves UTC calendar date when only time changes", () => {
      expect(mergeUtcTimeTextIntoCommittedIso("2030-06-15T12:34:56.789Z", "06:00:00")).toBe(
        "2030-06-15T06:00:00.789Z",
      );
    });

    it("preserves committed seconds when omitted in time text", () => {
      expect(mergeUtcTimeTextIntoCommittedIso("2030-06-15T12:34:56.789Z", "14:30")).toBe(
        "2030-06-15T14:30:56.789Z",
      );
    });

    it("replaces seconds when provided", () => {
      expect(mergeUtcTimeTextIntoCommittedIso("2030-06-15T12:00:00.000Z", "14:30:15")).toBe(
        "2030-06-15T14:30:15.000Z",
      );
    });
  });

  describe("mergeDemoWallTimeTextIntoCommittedIso", () => {
    it("commits wall time in America/New_York to the correct UTC instant", () => {
      const iso = "2030-06-15T16:03:03.172Z";
      const merged = mergeDemoWallTimeTextIntoCommittedIso(iso, "1:00:00 PM", "local12", "America/New_York");
      expect(merged).toBe("2030-06-15T17:00:00.172Z");
    });

    it("preserves wall date when only time changes (NY)", () => {
      const iso = "2030-06-15T16:03:03.172Z";
      const merged = mergeDemoWallTimeTextIntoCommittedIso(iso, "11:00:00", "local24", "America/New_York");
      expect(merged).toBe("2030-06-15T15:00:00.172Z");
    });
  });

  it("demoStartEditableTimeTextFromCommittedIso matches formatWallClockInTimeZone for NY local24", () => {
    const iso = "2030-06-15T16:03:03.172Z";
    const t = Date.parse(iso);
    expect(demoStartEditableTimeTextFromCommittedIso(iso, "local24", "America/New_York")).toBe(
      formatWallClockInTimeZone(t, "America/New_York", false),
    );
  });

  it("utcEditableTimeTextFromCommittedIso defaults to 24-hour UTC wall time when mode omitted", () => {
    expect(utcEditableTimeTextFromCommittedIso("2030-06-15T12:34:56.000Z")).toBe("12:34:56");
    expect(utcEditableTimeTextFromCommittedIso("2030-06-15T12:34:56.789Z")).toBe("12:34:56");
  });

  it("utcEditableTimeTextFromCommittedIso uses 24-hour for local24 and utc24 (legacy: always UTC civil)", () => {
    expect(utcEditableTimeTextFromCommittedIso("2030-06-15T15:22:52.000Z", "utc24")).toBe("15:22:52");
    expect(utcEditableTimeTextFromCommittedIso("2030-06-15T15:22:52.000Z", "local24")).toBe("15:22:52");
    expect(utcEditableTimeTextFromCommittedIso("2030-06-15T15:22:52.172Z", "utc24")).toBe("15:22:52");
  });

  it("utcEditableTimeTextFromCommittedIso uses 12-hour for local12 (legacy: UTC civil)", () => {
    const t1522 = Date.parse("2030-06-15T15:22:52.000Z");
    const t0030 = Date.parse("2030-06-15T00:30:00.000Z");
    const t1553 = Date.parse("2030-06-15T15:53:03.172Z");
    expect(utcEditableTimeTextFromCommittedIso("2030-06-15T15:22:52.000Z", "local12")).toBe(
      formatWallClockInTimeZone(t1522, "UTC", true),
    );
    expect(utcEditableTimeTextFromCommittedIso("2030-06-15T00:30:00.000Z", "local12")).toBe(
      formatWallClockInTimeZone(t0030, "UTC", true),
    );
    expect(utcEditableTimeTextFromCommittedIso("2030-06-15T15:53:03.172Z", "local12")).toBe(
      formatWallClockInTimeZone(t1553, "UTC", true),
    );
  });

  it("utcEditableTimeTextFromCommittedIso omits milliseconds in display while ISO keeps sub-second precision on merge", () => {
    const iso = "2030-06-15T12:34:56.789Z";
    expect(utcEditableTimeTextFromCommittedIso(iso)).toBe("12:34:56");
    expect(mergeUtcTimeTextIntoCommittedIso(iso, utcEditableTimeTextFromCommittedIso(iso))).toBe(iso);
  });

  it("demoStartTimeEntryUses12HourClock matches top band mode mapping", () => {
    expect(demoStartTimeEntryUses12HourClock("local12")).toBe(true);
    expect(demoStartTimeEntryUses12HourClock("local24")).toBe(false);
    expect(demoStartTimeEntryUses12HourClock("utc24")).toBe(false);
  });

  it("demoStartTimeFieldPlaceholder reflects entry style", () => {
    expect(demoStartTimeFieldPlaceholder("local12")).toContain("3pm");
    expect(demoStartTimeFieldPlaceholder("utc24")).toContain("15:22");
    expect(demoStartTimeFieldPlaceholder("local12")).not.toMatch(/\.\d{3}/);
    expect(demoStartTimeFieldPlaceholder("utc24")).not.toMatch(/\.\d{3}/);
  });

  it("isValidUtcTimeCommitText mirrors parse success", () => {
    expect(isValidUtcTimeCommitText("14:30")).toBe(true);
    expect(isValidUtcTimeCommitText("2:30 PM")).toBe(true);
    expect(isValidUtcTimeCommitText("nope")).toBe(false);
  });
});
