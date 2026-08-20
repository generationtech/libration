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

/**
 * Group partitioned Milky Way Viewing Windows into tour events.
 * Does not redefine Viewing/Strong/Prime — consumes enumerator output.
 */

import { formatEclipseCalendarDate } from "../eclipse/eclipseEventCopy";
import { eventPlaybackOffsetMs, type EventPlaybackOffsetId } from "./eventPlaybackOffsets";
import { milkyWayViewingLevelRank, type MilkyWayViewingLevel } from "../milkyWayViewingPolicy";
import type { MilkyWayViewingWindow } from "../milkyWayViewingWindows";

/** Adjacent partitioned intervals closer than this are one nightly opportunity. */
const GROUP_GAP_MS = 2 * 60_000;

export type MilkyWayTourEvent = {
  readonly id: string;
  readonly cityId: string;
  readonly startUtcMs: number;
  readonly endUtcMs: number;
  readonly peakUtcMs: number;
  readonly bestLevel: MilkyWayViewingLevel;
  readonly peakAltitudeDeg: number;
  readonly constituentIntervals: readonly MilkyWayViewingWindow[];
};

export type MilkyWayPlaybackScheduledEvent = MilkyWayTourEvent & {
  readonly title: string;
  readonly dateLabel: string;
  readonly leadInUtcMs: number;
  readonly transitionEndUtcMs: number;
};

function milkyWayLevelTitle(level: MilkyWayViewingLevel): string {
  switch (level) {
    case "prime":
      return "Prime window";
    case "strong":
      return "Strong window";
    case "viewing":
      return "Viewing window";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function groupMilkyWayWindowsForTour(
  windows: readonly MilkyWayViewingWindow[],
): MilkyWayTourEvent[] {
  if (windows.length === 0) {
    return [];
  }
  const sorted = [...windows].sort(
    (a, b) => a.startUtcMs - b.startUtcMs || milkyWayViewingLevelRank(b.level) - milkyWayViewingLevelRank(a.level),
  );
  const groups: MilkyWayViewingWindow[][] = [];
  let current: MilkyWayViewingWindow[] = [sorted[0]!];
  for (let i = 1; i < sorted.length; i += 1) {
    const next = sorted[i]!;
    const prev = current[current.length - 1]!;
    if (next.startUtcMs <= prev.endUtcMs + GROUP_GAP_MS) {
      current.push(next);
    } else {
      groups.push(current);
      current = [next];
    }
  }
  groups.push(current);
  return groups.map((constituents) => {
    const first = constituents[0]!;
    const last = constituents[constituents.length - 1]!;
    let best = first;
    for (const w of constituents) {
      const rank = milkyWayViewingLevelRank(w.level);
      const bestRank = milkyWayViewingLevelRank(best.level);
      if (rank > bestRank || (rank === bestRank && w.peakAltitudeDeg > best.peakAltitudeDeg)) {
        best = w;
      }
    }
    return {
      id: `milky-way-tour:${first.cityId}:${first.startUtcMs}`,
      cityId: first.cityId,
      startUtcMs: first.startUtcMs,
      endUtcMs: last.endUtcMs,
      peakUtcMs: best.peakUtcMs,
      bestLevel: best.level,
      peakAltitudeDeg: best.peakAltitudeDeg,
      constituentIntervals: constituents,
    };
  });
}

export function scheduleMilkyWayTourEvents(
  events: readonly MilkyWayTourEvent[],
  rangeStartUtcMs: number,
  rangeEndUtcMs: number,
  leadInId: EventPlaybackOffsetId,
  postWaitId: EventPlaybackOffsetId,
): MilkyWayPlaybackScheduledEvent[] {
  const leadInMs = eventPlaybackOffsetMs(leadInId);
  const postWaitMs = eventPlaybackOffsetMs(postWaitId);
  return events.map((event) => ({
    ...event,
    title: milkyWayLevelTitle(event.bestLevel),
    dateLabel: formatEclipseCalendarDate({
      year: new Date(event.peakUtcMs).getUTCFullYear(),
      month: new Date(event.peakUtcMs).getUTCMonth() + 1,
      day: new Date(event.peakUtcMs).getUTCDate(),
    }),
    leadInUtcMs: Math.max(rangeStartUtcMs, event.startUtcMs - leadInMs),
    transitionEndUtcMs: Math.min(rangeEndUtcMs, event.endUtcMs + postWaitMs),
  }));
}
