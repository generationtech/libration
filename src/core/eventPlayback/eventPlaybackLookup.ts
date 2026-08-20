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
 * Navigation seam for event playback. Domain astronomy stays in each source.
 * The sequencer only asks for next/previous eligible events and merges by UTC.
 */

import {
  activeLunarEclipseAt,
  activeSolarEclipseAt,
  LUNAR_ECLIPSE_EVENTS,
  nextLunarEclipseAfter,
  nextSolarEclipseAfter,
  SOLAR_ECLIPSE_EVENTS,
} from "../eclipse/eclipseAuthority";
import { formatEclipseCalendarDate, lunarEclipseTypeTitle, solarEclipseTypeTitle } from "../eclipse/eclipseEventCopy";
import { lunarEclipseTypeVisible, type LunarEclipsePresentation } from "../eclipse/lunarEclipseAppearance";
import type { LunarEclipseEvent } from "../eclipse/lunarEclipseTypes";
import { solarEclipseTypeVisible, type SolarEclipsePresentation } from "../eclipse/solarEclipseAppearance";
import type { SolarEclipseEvent } from "../eclipse/solarEclipseTypes";
import { eventPlaybackOffsetMs, type EventPlaybackOffsetId } from "./eventPlaybackOffsets";
import type { EventPlaybackTimedEvent } from "./eventPlaybackSequence";
import {
  findNextMilkyWayTourEvent,
  findPreviousMilkyWayTourEvent,
  scheduleMilkyWayTourEvent,
  type MilkyWayPlaybackScheduledEvent,
} from "./milkyWayTourEvents";
import type { MilkyWayViewingLevel } from "../milkyWayViewingPolicy";
import type { MilkyWayViewingObserver } from "../milkyWayViewingWindows";

export const EVENT_PLAYBACK_SOURCE_IDS = ["solarEclipse", "lunarEclipse", "milkyWayViewing"] as const;
export type EventPlaybackSourceId = (typeof EVENT_PLAYBACK_SOURCE_IDS)[number];

const SOURCE_RANK: Record<EventPlaybackSourceId, number> = {
  solarEclipse: 0,
  lunarEclipse: 1,
  milkyWayViewing: 2,
};

export type EventPlaybackListedEvent = EventPlaybackTimedEvent & {
  readonly eventId: string;
  readonly sourceId: EventPlaybackSourceId;
  readonly eventStartUtcMs: number;
  readonly eventEndUtcMs: number;
  readonly peakUtcMs: number;
  readonly title: string;
  readonly dateLabel: string;
  readonly milkyWay?: Pick<
    MilkyWayPlaybackScheduledEvent,
    "cityId" | "bestLevel" | "peakAltitudeDeg" | "startUtcMs" | "endUtcMs"
  > & { readonly cityName: string };
};

export type EventPlaybackLookupQuery = {
  readonly rangeStartUtcMs: number;
  readonly rangeEndUtcMs: number;
  readonly leadInId: EventPlaybackOffsetId;
  readonly postWaitId: EventPlaybackOffsetId;
  readonly solarEnabled: boolean;
  readonly lunarEnabled: boolean;
  readonly milkyWayEnabled: boolean;
  readonly milkyWayLevels: readonly MilkyWayViewingLevel[];
  readonly solarPresentation: SolarEclipsePresentation;
  readonly lunarPresentation: LunarEclipsePresentation;
  readonly observer: MilkyWayViewingObserver | null;
  readonly cityName: string;
};

export function comparePlaybackEvents(a: EventPlaybackListedEvent, b: EventPlaybackListedEvent): number {
  if (a.eventStartUtcMs !== b.eventStartUtcMs) {
    return a.eventStartUtcMs - b.eventStartUtcMs;
  }
  if (a.peakUtcMs !== b.peakUtcMs) {
    return a.peakUtcMs - b.peakUtcMs;
  }
  const rank = SOURCE_RANK[a.sourceId] - SOURCE_RANK[b.sourceId];
  if (rank !== 0) {
    return rank;
  }
  return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
}

function scheduleTimes(
  eventStartUtcMs: number,
  eventEndUtcMs: number,
  rangeStartUtcMs: number,
  rangeEndUtcMs: number,
  leadInId: EventPlaybackOffsetId,
  postWaitId: EventPlaybackOffsetId,
): { leadInUtcMs: number; transitionEndUtcMs: number } {
  const leadInMs = eventPlaybackOffsetMs(leadInId);
  const postWaitMs = eventPlaybackOffsetMs(postWaitId);
  return {
    leadInUtcMs: Math.max(rangeStartUtcMs, eventStartUtcMs - leadInMs),
    transitionEndUtcMs: Math.min(rangeEndUtcMs, eventEndUtcMs + postWaitMs),
  };
}

function solarToListed(
  event: SolarEclipseEvent,
  query: EventPlaybackLookupQuery,
): EventPlaybackListedEvent {
  const times = scheduleTimes(
    event.globalStartMs,
    event.globalEndMs,
    query.rangeStartUtcMs,
    query.rangeEndUtcMs,
    query.leadInId,
    query.postWaitId,
  );
  return {
    eventId: event.id,
    sourceId: "solarEclipse",
    eventStartUtcMs: event.globalStartMs,
    eventEndUtcMs: event.globalEndMs,
    peakUtcMs: event.greatestEclipseUtcMs,
    title: solarEclipseTypeTitle(event.subtype),
    dateLabel: formatEclipseCalendarDate(event),
    ...times,
  };
}

function lunarToListed(
  event: LunarEclipseEvent,
  query: EventPlaybackLookupQuery,
): EventPlaybackListedEvent {
  const times = scheduleTimes(
    event.globalStartMs,
    event.globalEndMs,
    query.rangeStartUtcMs,
    query.rangeEndUtcMs,
    query.leadInId,
    query.postWaitId,
  );
  return {
    eventId: event.id,
    sourceId: "lunarEclipse",
    eventStartUtcMs: event.globalStartMs,
    eventEndUtcMs: event.globalEndMs,
    peakUtcMs: event.greatestEclipseUtcMs,
    title: lunarEclipseTypeTitle(event.subtype),
    dateLabel: formatEclipseCalendarDate(event),
    ...times,
  };
}

function milkyWayToListed(
  event: MilkyWayPlaybackScheduledEvent,
  cityName: string,
): EventPlaybackListedEvent {
  return {
    eventId: event.id,
    sourceId: "milkyWayViewing",
    eventStartUtcMs: event.startUtcMs,
    eventEndUtcMs: event.endUtcMs,
    peakUtcMs: event.peakUtcMs,
    title: event.title,
    dateLabel: event.dateLabel,
    leadInUtcMs: event.leadInUtcMs,
    transitionEndUtcMs: event.transitionEndUtcMs,
    milkyWay: {
      cityId: event.cityId,
      cityName,
      bestLevel: event.bestLevel,
      peakAltitudeDeg: event.peakAltitudeDeg,
      startUtcMs: event.startUtcMs,
      endUtcMs: event.endUtcMs,
    },
  };
}

function solarEligible(event: SolarEclipseEvent, query: EventPlaybackLookupQuery): boolean {
  if (!query.solarEnabled) {
    return false;
  }
  if (!solarEclipseTypeVisible(event.subtype, query.solarPresentation)) {
    return false;
  }
  if (event.globalEndMs < query.rangeStartUtcMs || event.globalStartMs > query.rangeEndUtcMs) {
    return false;
  }
  return true;
}

function lunarEligible(event: LunarEclipseEvent, query: EventPlaybackLookupQuery): boolean {
  if (!query.lunarEnabled) {
    return false;
  }
  if (!lunarEclipseTypeVisible(event.subtype, query.lunarPresentation)) {
    return false;
  }
  if (event.globalEndMs < query.rangeStartUtcMs || event.globalStartMs > query.rangeEndUtcMs) {
    return false;
  }
  return true;
}

function findNextSolar(
  query: EventPlaybackLookupQuery,
  afterUtcMs: number,
  includeIntersecting: boolean,
  excludeEventId: string | undefined,
): EventPlaybackListedEvent | null {
  if (!query.solarEnabled) {
    return null;
  }
  const candidates: EventPlaybackListedEvent[] = [];
  if (includeIntersecting) {
    const active = activeSolarEclipseAt(afterUtcMs);
    if (
      active &&
      active.id !== excludeEventId &&
      solarEligible(active, query) &&
      active.globalEndMs > afterUtcMs
    ) {
      candidates.push(solarToListed(active, query));
    }
  }
  let next = nextSolarEclipseAfter(afterUtcMs);
  while (next) {
    if (next.globalStartMs > query.rangeEndUtcMs) {
      break;
    }
    if (next.id !== excludeEventId && solarEligible(next, query) && next.globalStartMs > afterUtcMs) {
      candidates.push(solarToListed(next, query));
      break;
    }
    next = nextSolarEclipseAfter(next.globalStartMs);
  }
  return pickEarliest(candidates);
}

function findNextLunar(
  query: EventPlaybackLookupQuery,
  afterUtcMs: number,
  includeIntersecting: boolean,
  excludeEventId: string | undefined,
): EventPlaybackListedEvent | null {
  if (!query.lunarEnabled) {
    return null;
  }
  const candidates: EventPlaybackListedEvent[] = [];
  if (includeIntersecting) {
    const active = activeLunarEclipseAt(afterUtcMs);
    if (
      active &&
      active.id !== excludeEventId &&
      lunarEligible(active, query) &&
      active.globalEndMs > afterUtcMs
    ) {
      candidates.push(lunarToListed(active, query));
    }
  }
  let next = nextLunarEclipseAfter(afterUtcMs);
  while (next) {
    if (next.globalStartMs > query.rangeEndUtcMs) {
      break;
    }
    if (next.id !== excludeEventId && lunarEligible(next, query) && next.globalStartMs > afterUtcMs) {
      candidates.push(lunarToListed(next, query));
      break;
    }
    next = nextLunarEclipseAfter(next.globalStartMs);
  }
  return pickEarliest(candidates);
}

function findNextMilkyWay(
  query: EventPlaybackLookupQuery,
  afterUtcMs: number,
  includeIntersecting: boolean,
  excludeEventId: string | undefined,
): EventPlaybackListedEvent | null {
  if (!query.milkyWayEnabled || !query.observer || query.milkyWayLevels.length === 0) {
    return null;
  }
  const found = findNextMilkyWayTourEvent({
    observer: query.observer,
    rangeStartUtcMs: query.rangeStartUtcMs,
    rangeEndUtcMs: query.rangeEndUtcMs,
    levels: query.milkyWayLevels,
    afterUtcMs,
    includeIntersecting,
    excludeEventId,
  });
  if (!found) {
    return null;
  }
  return milkyWayToListed(
    scheduleMilkyWayTourEvent(found, query.rangeStartUtcMs, query.rangeEndUtcMs, query.leadInId, query.postWaitId),
    query.cityName,
  );
}

function pickEarliest(candidates: Array<EventPlaybackListedEvent | null>): EventPlaybackListedEvent | null {
  let best: EventPlaybackListedEvent | null = null;
  for (const c of candidates) {
    if (!c) {
      continue;
    }
    if (!best || comparePlaybackEvents(c, best) < 0) {
      best = c;
    }
  }
  return best;
}

function pickLatest(candidates: Array<EventPlaybackListedEvent | null>): EventPlaybackListedEvent | null {
  let best: EventPlaybackListedEvent | null = null;
  for (const c of candidates) {
    if (!c) {
      continue;
    }
    if (!best || comparePlaybackEvents(c, best) > 0) {
      best = c;
    }
  }
  return best;
}

export function findNextPlaybackEvent(
  query: EventPlaybackLookupQuery,
  afterUtcMs: number,
  options: { readonly includeIntersecting: boolean; readonly excludeEventId?: string } = {
    includeIntersecting: false,
  },
): EventPlaybackListedEvent | null {
  return pickEarliest([
    findNextSolar(query, afterUtcMs, options.includeIntersecting, options.excludeEventId),
    findNextLunar(query, afterUtcMs, options.includeIntersecting, options.excludeEventId),
    findNextMilkyWay(query, afterUtcMs, options.includeIntersecting, options.excludeEventId),
  ]);
}

function previousSolar(
  query: EventPlaybackLookupQuery,
  beforeUtcMs: number,
  excludeEventId: string | undefined,
): EventPlaybackListedEvent | null {
  if (!query.solarEnabled) {
    return null;
  }
  let best: EventPlaybackListedEvent | null = null;
  for (const event of SOLAR_ECLIPSE_EVENTS) {
    if (event.globalStartMs >= beforeUtcMs) {
      break;
    }
    if (event.id === excludeEventId || !solarEligible(event, query)) {
      continue;
    }
    const listed = solarToListed(event, query);
    best = listed;
  }
  return best;
}

function previousLunar(
  query: EventPlaybackLookupQuery,
  beforeUtcMs: number,
  excludeEventId: string | undefined,
): EventPlaybackListedEvent | null {
  if (!query.lunarEnabled) {
    return null;
  }
  let best: EventPlaybackListedEvent | null = null;
  for (const event of LUNAR_ECLIPSE_EVENTS) {
    if (event.globalStartMs >= beforeUtcMs) {
      break;
    }
    if (event.id === excludeEventId || !lunarEligible(event, query)) {
      continue;
    }
    best = lunarToListed(event, query);
  }
  return best;
}

function previousMilkyWay(
  query: EventPlaybackLookupQuery,
  beforeUtcMs: number,
  excludeEventId: string | undefined,
): EventPlaybackListedEvent | null {
  if (!query.milkyWayEnabled || !query.observer || query.milkyWayLevels.length === 0) {
    return null;
  }
  const found = findPreviousMilkyWayTourEvent({
    observer: query.observer,
    rangeStartUtcMs: query.rangeStartUtcMs,
    rangeEndUtcMs: query.rangeEndUtcMs,
    levels: query.milkyWayLevels,
    beforeUtcMs,
    excludeEventId,
  });
  if (!found) {
    return null;
  }
  return milkyWayToListed(
    scheduleMilkyWayTourEvent(found, query.rangeStartUtcMs, query.rangeEndUtcMs, query.leadInId, query.postWaitId),
    query.cityName,
  );
}

export function findPreviousPlaybackEvent(
  query: EventPlaybackLookupQuery,
  beforeUtcMs: number,
  excludeEventId?: string,
): EventPlaybackListedEvent | null {
  return pickLatest([
    previousSolar(query, beforeUtcMs, excludeEventId),
    previousLunar(query, beforeUtcMs, excludeEventId),
    previousMilkyWay(query, beforeUtcMs, excludeEventId),
  ]);
}

export function createMergedEventPlaybackNavigator(query: EventPlaybackLookupQuery): {
  findNext(current: EventPlaybackListedEvent): EventPlaybackListedEvent | null;
  findPrevious(current: EventPlaybackListedEvent): EventPlaybackListedEvent | null;
  findEarliest(): EventPlaybackListedEvent | null;
  findLatest(): EventPlaybackListedEvent | null;
} {
  return {
    findNext(current) {
      return findNextPlaybackEvent(query, current.eventStartUtcMs, {
        includeIntersecting: false,
        excludeEventId: current.eventId,
      });
    },
    findPrevious(current) {
      return findPreviousPlaybackEvent(query, current.eventStartUtcMs, current.eventId);
    },
    findEarliest() {
      return findNextPlaybackEvent(query, query.rangeStartUtcMs, { includeIntersecting: true });
    },
    findLatest() {
      return findPreviousPlaybackEvent(query, query.rangeEndUtcMs + 1);
    },
  };
}
