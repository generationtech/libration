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
import {
  listMilkyWayViewingWindows,
  type MilkyWayViewingObserver,
  type MilkyWayViewingWindow,
} from "../milkyWayViewingWindows";

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
      return "Milky Way · Prime";
    case "strong":
      return "Milky Way · Strong";
    case "viewing":
      return "Milky Way · Viewing";
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

export function scheduleMilkyWayTourEvent(
  event: MilkyWayTourEvent,
  rangeStartUtcMs: number,
  rangeEndUtcMs: number,
  leadInId: EventPlaybackOffsetId,
  postWaitId: EventPlaybackOffsetId,
): MilkyWayPlaybackScheduledEvent {
  const leadInMs = eventPlaybackOffsetMs(leadInId);
  const postWaitMs = eventPlaybackOffsetMs(postWaitId);
  return {
    ...event,
    title: milkyWayLevelTitle(event.bestLevel),
    dateLabel: formatEclipseCalendarDate({
      year: new Date(event.peakUtcMs).getUTCFullYear(),
      month: new Date(event.peakUtcMs).getUTCMonth() + 1,
      day: new Date(event.peakUtcMs).getUTCDate(),
    }),
    leadInUtcMs: Math.max(rangeStartUtcMs, event.startUtcMs - leadInMs),
    transitionEndUtcMs: Math.min(rangeEndUtcMs, event.endUtcMs + postWaitMs),
  };
}

export function scheduleMilkyWayTourEvents(
  events: readonly MilkyWayTourEvent[],
  rangeStartUtcMs: number,
  rangeEndUtcMs: number,
  leadInId: EventPlaybackOffsetId,
  postWaitId: EventPlaybackOffsetId,
): MilkyWayPlaybackScheduledEvent[] {
  return events.map((event) =>
    scheduleMilkyWayTourEvent(event, rangeStartUtcMs, rangeEndUtcMs, leadInId, postWaitId),
  );
}

const DAY_MS = 86_400_000;
const SEARCH_CHUNKS_MS = [30 * DAY_MS, 90 * DAY_MS, 365 * DAY_MS] as const;
const CHUNK_PAD_MS = DAY_MS;

function searchChunkMs(expansion: number): number {
  return SEARCH_CHUNKS_MS[Math.min(expansion, SEARCH_CHUNKS_MS.length - 1)]!;
}

export type FindMilkyWayTourEventQuery = {
  readonly observer: MilkyWayViewingObserver;
  readonly rangeStartUtcMs: number;
  readonly rangeEndUtcMs: number;
  readonly levels: readonly MilkyWayViewingLevel[];
  readonly excludeEventId?: string;
};

function groupedInSpan(
  observer: MilkyWayViewingObserver,
  startUtcMs: number,
  endUtcMs: number,
  levels: readonly MilkyWayViewingLevel[],
): MilkyWayTourEvent[] {
  if (!(endUtcMs > startUtcMs) || levels.length === 0) {
    return [];
  }
  const listed = listMilkyWayViewingWindows({
    observer,
    startUtcMs,
    endUtcMs,
    levels,
  });
  return groupMilkyWayWindowsForTour(listed.windows);
}

function isEligibleTourEvent(
  event: MilkyWayTourEvent,
  query: FindMilkyWayTourEventQuery,
): boolean {
  if (query.excludeEventId && event.id === query.excludeEventId) {
    return false;
  }
  if (event.endUtcMs <= query.rangeStartUtcMs) {
    return false;
  }
  if (event.startUtcMs > query.rangeEndUtcMs) {
    return false;
  }
  return true;
}

/**
 * Next grouped MW opportunity at or after `afterUtcMs`.
 * When `includeIntersecting` is true, an event already underway is returned rather than skipped.
 */
export function findNextMilkyWayTourEvent(
  query: FindMilkyWayTourEventQuery & {
    readonly afterUtcMs: number;
    readonly includeIntersecting: boolean;
  },
): MilkyWayTourEvent | null {
  if (query.levels.length === 0) {
    return null;
  }
  const lookback = query.includeIntersecting ? DAY_MS : 0;
  let cursor = Math.max(query.rangeStartUtcMs, query.afterUtcMs - lookback);
  let expansion = 0;
  while (cursor < query.rangeEndUtcMs) {
    const chunkMs = searchChunkMs(expansion);
    const chunkEnd = Math.min(query.rangeEndUtcMs, cursor + chunkMs);
    const grouped = groupedInSpan(
      query.observer,
      Math.max(query.rangeStartUtcMs, cursor - CHUNK_PAD_MS),
      Math.min(query.rangeEndUtcMs + CHUNK_PAD_MS, chunkEnd + CHUNK_PAD_MS),
      query.levels,
    );
    for (const event of grouped) {
      if (!isEligibleTourEvent(event, query)) {
        continue;
      }
      if (query.includeIntersecting && event.startUtcMs <= query.afterUtcMs && event.endUtcMs > query.afterUtcMs) {
        return event;
      }
      if (event.startUtcMs > query.afterUtcMs) {
        return event;
      }
    }
    cursor = chunkEnd;
    expansion += 1;
  }
  return null;
}

export function findPreviousMilkyWayTourEvent(
  query: FindMilkyWayTourEventQuery & {
    readonly beforeUtcMs: number;
  },
): MilkyWayTourEvent | null {
  if (query.levels.length === 0) {
    return null;
  }
  let cursor = Math.min(query.rangeEndUtcMs, query.beforeUtcMs);
  let expansion = 0;
  while (cursor > query.rangeStartUtcMs) {
    const chunkMs = searchChunkMs(expansion);
    const chunkStart = Math.max(query.rangeStartUtcMs, cursor - chunkMs);
    const grouped = groupedInSpan(
      query.observer,
      Math.max(query.rangeStartUtcMs, chunkStart - CHUNK_PAD_MS),
      Math.min(query.rangeEndUtcMs + CHUNK_PAD_MS, cursor + CHUNK_PAD_MS),
      query.levels,
    );
    for (let i = grouped.length - 1; i >= 0; i -= 1) {
      const event = grouped[i]!;
      if (!isEligibleTourEvent(event, query)) {
        continue;
      }
      if (event.startUtcMs < query.beforeUtcMs) {
        return event;
      }
    }
    cursor = chunkStart;
    expansion += 1;
  }
  return null;
}
