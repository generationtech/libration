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
 * Read-only Eclipse Tour enumeration over the bundled solar/lunar authority.
 * Do not call from the animation frame; callers cache by config fingerprint.
 */

import {
  LUNAR_ECLIPSE_AUTHORITY_METADATA,
  LUNAR_ECLIPSE_EVENTS,
  lunarEclipsesIntersecting,
  SOLAR_ECLIPSE_AUTHORITY_METADATA,
  SOLAR_ECLIPSE_EVENTS,
  solarEclipsesIntersecting,
} from "./eclipseAuthority";
import { formatEclipseCalendarDate, lunarEclipseTypeTitle, solarEclipseTypeTitle } from "./eclipseEventCopy";
import {
  eclipseTourOffsetMs,
  utcYmdFromUnixMs,
  type EclipseTourDateBounds,
  type EclipseTourOffsetId,
} from "./eclipseTourAppearance";
import { lunarEclipseTypeVisible, type LunarEclipsePresentation } from "./lunarEclipseAppearance";
import { solarEclipseTypeVisible, type SolarEclipsePresentation } from "./solarEclipseAppearance";
import type { LunarEclipseEvent, LunarEclipseSubtype } from "./lunarEclipseTypes";
import type { SolarEclipseEvent, SolarEclipseSubtype } from "./solarEclipseTypes";

export type EclipseTourEventKind = "solar" | "lunar";

export type EclipseTourEvent = {
  readonly eventId: string;
  readonly kind: EclipseTourEventKind;
  readonly subtype: SolarEclipseSubtype | LunarEclipseSubtype;
  readonly title: string;
  readonly dateLabel: string;
  readonly sortTimeUtcMs: number;
  readonly eventStartUtcMs: number;
  readonly greatestUtcMs: number;
  readonly eventEndUtcMs: number;
};

export type EclipseTourAuthorityRange = {
  readonly solarStartMs: number;
  readonly solarEndMs: number;
  readonly lunarStartMs: number;
  readonly lunarEndMs: number;
  /** Inclusive combined start (earliest family start). */
  readonly combinedStartMs: number;
  /** Exclusive combined end (latest family exclusive end). */
  readonly combinedEndMs: number;
  readonly calendarBounds: EclipseTourDateBounds;
};

export function getEclipseTourAuthorityRange(): EclipseTourAuthorityRange {
  const solar = SOLAR_ECLIPSE_AUTHORITY_METADATA.supportedUtcRange;
  const lunar = LUNAR_ECLIPSE_AUTHORITY_METADATA.supportedUtcRange;
  const combinedStartMs = Math.min(solar.startMs, lunar.startMs);
  const combinedEndMs = Math.max(solar.endMs, lunar.endMs);
  return {
    solarStartMs: solar.startMs,
    solarEndMs: solar.endMs,
    lunarStartMs: lunar.startMs,
    lunarEndMs: lunar.endMs,
    combinedStartMs,
    combinedEndMs,
    calendarBounds: {
      minYmd: utcYmdFromUnixMs(combinedStartMs),
      maxYmd: utcYmdFromUnixMs(combinedEndMs - 1),
    },
  };
}

function kindRank(kind: EclipseTourEventKind): number {
  return kind === "lunar" ? 1 : 0;
}

function compareTourEvents(a: EclipseTourEvent, b: EclipseTourEvent): number {
  if (a.sortTimeUtcMs !== b.sortTimeUtcMs) {
    return a.sortTimeUtcMs - b.sortTimeUtcMs;
  }
  if (a.kind !== b.kind) {
    return kindRank(a.kind) - kindRank(b.kind);
  }
  return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
}

function solarToTourEvent(event: SolarEclipseEvent): EclipseTourEvent {
  return {
    eventId: event.id,
    kind: "solar",
    subtype: event.subtype,
    title: solarEclipseTypeTitle(event.subtype),
    dateLabel: formatEclipseCalendarDate(event),
    sortTimeUtcMs: event.greatestEclipseUtcMs,
    eventStartUtcMs: event.globalStartMs,
    greatestUtcMs: event.greatestEclipseUtcMs,
    eventEndUtcMs: event.globalEndMs,
  };
}

function lunarToTourEvent(event: LunarEclipseEvent): EclipseTourEvent {
  return {
    eventId: event.id,
    kind: "lunar",
    subtype: event.subtype,
    title: lunarEclipseTypeTitle(event.subtype),
    dateLabel: formatEclipseCalendarDate(event),
    sortTimeUtcMs: event.greatestEclipseUtcMs,
    eventStartUtcMs: event.globalStartMs,
    greatestUtcMs: event.greatestEclipseUtcMs,
    eventEndUtcMs: event.globalEndMs,
  };
}

export type ListEclipseTourEventsQuery = {
  readonly startUtcMs: number;
  readonly endUtcMs: number;
  readonly includeSolar: boolean;
  readonly includeLunar: boolean;
  readonly solarPresentation: SolarEclipsePresentation;
  readonly lunarPresentation: LunarEclipsePresentation;
};

/**
 * Events whose authoritative `[globalStartMs, globalEndMs]` intersects `[startUtcMs, endUtcMs]`.
 * Sorted by greatest-eclipse UTC, then kind, then id.
 */
export function listEclipseTourEvents(query: ListEclipseTourEventsQuery): EclipseTourEvent[] {
  if (!(query.endUtcMs >= query.startUtcMs) || (!query.includeSolar && !query.includeLunar)) {
    return [];
  }
  const out: EclipseTourEvent[] = [];
  if (query.includeSolar) {
    for (const event of solarEclipsesIntersecting(query.startUtcMs, query.endUtcMs)) {
      if (solarEclipseTypeVisible(event.subtype, query.solarPresentation)) {
        out.push(solarToTourEvent(event));
      }
    }
  }
  if (query.includeLunar) {
    for (const event of lunarEclipsesIntersecting(query.startUtcMs, query.endUtcMs)) {
      if (lunarEclipseTypeVisible(event.subtype, query.lunarPresentation)) {
        out.push(lunarToTourEvent(event));
      }
    }
  }
  out.sort(compareTourEvents);
  return out;
}

export function eclipseTourCatalogCounts(): { readonly solar: number; readonly lunar: number } {
  return {
    solar: SOLAR_ECLIPSE_EVENTS.length,
    lunar: LUNAR_ECLIPSE_EVENTS.length,
  };
}

export type EclipseTourScheduledEvent = EclipseTourEvent & {
  readonly leadInUtcMs: number;
  readonly transitionEndUtcMs: number;
};

export function scheduleEclipseTourEvents(
  events: readonly EclipseTourEvent[],
  rangeStartUtcMs: number,
  rangeEndUtcMs: number,
  leadInId: EclipseTourOffsetId,
  postWaitId: EclipseTourOffsetId,
): EclipseTourScheduledEvent[] {
  const leadInMs = eclipseTourOffsetMs(leadInId);
  const postWaitMs = eclipseTourOffsetMs(postWaitId);
  return events.map((event) => ({
    ...event,
    leadInUtcMs: Math.max(rangeStartUtcMs, event.eventStartUtcMs - leadInMs),
    transitionEndUtcMs: Math.min(rangeEndUtcMs, event.eventEndUtcMs + postWaitMs),
  }));
}
