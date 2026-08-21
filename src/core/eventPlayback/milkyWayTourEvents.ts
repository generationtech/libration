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
 * Adapt Milky Way Viewing Windows into playback events.
 * One window is one event. Incremental next/previous; no full-range enumeration.
 */

import { formatEclipseCalendarDate } from "../eclipse/eclipseEventCopy";
import { eventPlaybackOffsetMs, type EventPlaybackOffsetId } from "./eventPlaybackOffsets";
import {
  listMilkyWayViewingWindows,
  type MilkyWayViewingObserver,
  type MilkyWayViewingWindow,
} from "../milkyWayViewingWindows";

export type MilkyWayTourEvent = {
  readonly id: string;
  readonly cityId: string;
  readonly startUtcMs: number;
  readonly endUtcMs: number;
  readonly peakUtcMs: number;
  readonly peakAltitudeDeg: number;
  readonly window: MilkyWayViewingWindow;
};

export type MilkyWayPlaybackScheduledEvent = MilkyWayTourEvent & {
  readonly title: string;
  readonly dateLabel: string;
  readonly leadInUtcMs: number;
  readonly transitionEndUtcMs: number;
};

export function milkyWayTourEventFromWindow(window: MilkyWayViewingWindow): MilkyWayTourEvent {
  return {
    id: `milky-way-tour:${window.cityId}:${window.startUtcMs}`,
    cityId: window.cityId,
    startUtcMs: window.startUtcMs,
    endUtcMs: window.endUtcMs,
    peakUtcMs: window.peakUtcMs,
    peakAltitudeDeg: window.peakAltitudeDeg,
    window,
  };
}

export function groupMilkyWayWindowsForTour(
  windows: readonly MilkyWayViewingWindow[],
): MilkyWayTourEvent[] {
  return [...windows]
    .sort((a, b) => a.startUtcMs - b.startUtcMs)
    .map(milkyWayTourEventFromWindow);
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
    title: "Milky Way viewing",
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
  readonly excludeEventId?: string;
};

function groupedInSpan(
  observer: MilkyWayViewingObserver,
  startUtcMs: number,
  endUtcMs: number,
): MilkyWayTourEvent[] {
  if (!(endUtcMs > startUtcMs)) {
    return [];
  }
  const listed = listMilkyWayViewingWindows({
    observer,
    startUtcMs,
    endUtcMs,
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
 * Next MW opportunity at or after `afterUtcMs`.
 * When `includeIntersecting` is true, an event already underway is returned rather than skipped.
 */
export function findNextMilkyWayTourEvent(
  query: FindMilkyWayTourEventQuery & {
    readonly afterUtcMs: number;
    readonly includeIntersecting: boolean;
  },
): MilkyWayTourEvent | null {
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
  let cursor = Math.min(query.rangeEndUtcMs, query.beforeUtcMs);
  let expansion = 0;
  while (cursor > query.rangeStartUtcMs) {
    const chunkMs = searchChunkMs(expansion);
    const chunkStart = Math.max(query.rangeStartUtcMs, cursor - chunkMs);
    const grouped = groupedInSpan(
      query.observer,
      Math.max(query.rangeStartUtcMs, chunkStart - CHUNK_PAD_MS),
      Math.min(query.rangeEndUtcMs + CHUNK_PAD_MS, cursor + CHUNK_PAD_MS),
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
