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
  EVENT_NOTICE_MAX_VISIBLE,
  arbitrateEventNotices,
  formatEventNoticeOverflow,
  type EventNotice,
} from "./eventNotices";

function notice(partial: Partial<EventNotice> & Pick<EventNotice, "id" | "family" | "lifecycle" | "text">): EventNotice {
  return {
    startUtcMs: 1_000,
    endUtcMs: null,
    sortTimeUtcMs: partial.startUtcMs ?? 1_000,
    ...partial,
  };
}

describe("arbitrateEventNotices", () => {
  it("keeps active notices ahead of nearer upcoming notices", () => {
    const stack = arbitrateEventNotices([
      notice({
        id: "mw",
        family: "milkyWay",
        lifecycle: "upcoming",
        text: "Milky Way viewing · tonight",
        startUtcMs: 2_000,
        sortTimeUtcMs: 2_000,
      }),
      notice({
        id: "lunar",
        family: "lunarEclipse",
        lifecycle: "active",
        text: "Lunar eclipse · active",
        startUtcMs: 8_000,
        sortTimeUtcMs: 8_000,
      }),
    ]);
    expect(stack.visible.map((n) => n.id)).toEqual(["lunar", "mw"]);
    expect(stack.overflowCount).toBe(0);
  });

  it("orders upcoming notices by urgency then family rank then id", () => {
    const stack = arbitrateEventNotices([
      notice({
        id: "solar-b",
        family: "solarEclipse",
        lifecycle: "upcoming",
        text: "Solar eclipse · in 6d",
        startUtcMs: 6_000,
        sortTimeUtcMs: 6_000,
      }),
      notice({
        id: "mw",
        family: "milkyWay",
        lifecycle: "upcoming",
        text: "Milky Way viewing · tonight",
        startUtcMs: 2_000,
        sortTimeUtcMs: 2_000,
      }),
      notice({
        id: "solar-a",
        family: "solarEclipse",
        lifecycle: "upcoming",
        text: "Solar eclipse · in 2d",
        startUtcMs: 3_000,
        sortTimeUtcMs: 3_000,
      }),
    ]);
    expect(stack.visible.map((n) => n.id)).toEqual(["mw", "solar-a"]);
    expect(stack.overflowCount).toBe(1);
    expect(stack.overflowText).toBe("+1 more event");
  });

  it("bounds the visible stack and formats overflow copy", () => {
    expect(EVENT_NOTICE_MAX_VISIBLE).toBe(2);
    expect(formatEventNoticeOverflow(0)).toBeNull();
    expect(formatEventNoticeOverflow(1)).toBe("+1 more event");
    expect(formatEventNoticeOverflow(2)).toBe("+2 more events");
    const stack = arbitrateEventNotices(
      [
        notice({ id: "a", family: "solarEclipse", lifecycle: "active", text: "Solar eclipse · active" }),
        notice({ id: "b", family: "lunarEclipse", lifecycle: "active", text: "Lunar eclipse · active" }),
        notice({ id: "c", family: "milkyWay", lifecycle: "upcoming", text: "Milky Way viewing · tonight" }),
      ],
      2,
    );
    expect(stack.visible).toHaveLength(2);
    expect(stack.visible.every((n) => n.lifecycle === "active")).toBe(true);
    expect(stack.overflowText).toBe("+1 more event");
  });

  it("uses a stable family tie-break when start times match", () => {
    const stack = arbitrateEventNotices([
      notice({
        id: "mw",
        family: "milkyWay",
        lifecycle: "upcoming",
        text: "Milky Way viewing · in 2d",
        startUtcMs: 5_000,
        sortTimeUtcMs: 5_000,
      }),
      notice({
        id: "solar",
        family: "solarEclipse",
        lifecycle: "upcoming",
        text: "Solar eclipse · in 2d",
        startUtcMs: 5_000,
        sortTimeUtcMs: 5_000,
      }),
    ]);
    expect(stack.visible.map((n) => n.id)).toEqual(["solar", "mw"]);
  });

  it("drops blank text and duplicate ids", () => {
    const stack = arbitrateEventNotices([
      notice({ id: "dup", family: "milkyWay", lifecycle: "upcoming", text: "Milky Way viewing · tonight" }),
      notice({ id: "dup", family: "milkyWay", lifecycle: "upcoming", text: "Milky Way viewing · tonight" }),
      notice({ id: "blank", family: "solarEclipse", lifecycle: "upcoming", text: "  " }),
    ]);
    expect(stack.visible).toHaveLength(1);
    expect(stack.visible[0]!.id).toBe("dup");
  });
});
