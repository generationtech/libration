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
 * App-side adapters: merged event-playback lookup from the v2 document.
 * Next/previous discovery is incremental; do not enumerate centuries of MW windows.
 */

import type { LibrationConfigV2 } from "../config/v2/librationConfig";
import {
  buildDefaultSceneConfigFromLayerFlags,
  lunarEclipsePresentationFromScene,
  solarEclipsePresentationFromScene,
} from "../config/v2/sceneConfig";
import { effectiveDemoWallClockZone } from "../components/config/demoTimeStartIso";
import { resolveReferenceFrameCivilTimeZone } from "../core/displayTimeReference";
import { formatIsoCalendarYmd } from "../core/eclipse/eclipseTourAppearance";
import {
  listEclipseTourEvents,
  scheduleEclipseTourEvents,
} from "../core/eclipse/eclipseTourCatalog";
import { eclipseTourRangeUtcMs } from "../core/eclipse/eclipseTourRange";
import { eclipseTourStructuralKey } from "../core/eclipse/eclipseTourSequence";
import {
  createMergedEventPlaybackNavigator,
  findNextPlaybackEvent,
  findPreviousPlaybackEvent,
  type EventPlaybackListedEvent,
  type EventPlaybackLookupQuery,
} from "../core/eventPlayback/eventPlaybackLookup";
import type { EventPlaybackNavigator } from "../core/eventPlayback/eventPlaybackSequence";
import { resolveReferenceCityObserverLocation } from "../core/referenceCityObserver";
import { getCalendarYmdInZone } from "../core/wallTimeInZone";
import { REFERENCE_CITIES } from "../data/referenceCities";
import type { EclipseTourScheduledEvent } from "../core/eclipse/eclipseTourCatalog";

export type { EventPlaybackListedEvent, EventPlaybackLookupQuery } from "../core/eventPlayback/eventPlaybackLookup";

function sceneFromV2(v2: LibrationConfigV2) {
  return v2.scene ?? buildDefaultSceneConfigFromLayerFlags(v2.layers);
}

export function eventPlaybackUseUtcCivilFrame(v2: LibrationConfigV2): boolean {
  return v2.chrome.displayTime.topBandMode === "utc24";
}

export function eventPlaybackCivilZone(v2: LibrationConfigV2): string {
  return effectiveDemoWallClockZone(
    v2.chrome.displayTime.topBandMode,
    resolveReferenceFrameCivilTimeZone(v2.chrome.displayTime),
  );
}

export function eventPlaybackStartYmdFromNow(v2: LibrationConfigV2, nowMs: number = Date.now()): string {
  const ymd = getCalendarYmdInZone(nowMs, eventPlaybackCivilZone(v2));
  return formatIsoCalendarYmd(ymd.y, ymd.m, ymd.d);
}

function typeFilterKey(v2: LibrationConfigV2): string {
  const scene = sceneFromV2(v2);
  const solar = solarEclipsePresentationFromScene(scene);
  const lunar = lunarEclipsePresentationFromScene(scene);
  return [
    `${solar.showTypeTotal},${solar.showTypeAnnular},${solar.showTypePartial},${solar.showTypeHybrid}`,
    `${lunar.showTypeTotal},${lunar.showTypePartial},${lunar.showTypePenumbral}`,
  ].join("|");
}

export function eventPlaybackRangeUtcMs(
  v2: LibrationConfigV2,
): { readonly startUtcMs: number; readonly endUtcMs: number } | null {
  const pb = v2.data.eventPlayback;
  return eclipseTourRangeUtcMs(
    pb.startDateYmd,
    pb.endDateYmd,
    eventPlaybackUseUtcCivilFrame(v2),
    eventPlaybackCivilZone(v2),
  );
}

export function eventPlaybackStructuralFingerprint(v2: LibrationConfigV2): string {
  const pb = v2.data.eventPlayback;
  const observer = resolveReferenceCityObserverLocation(v2.chrome.displayTime);
  const mwCity = pb.milkyWayEnabled ? (observer?.cityId ?? "") : "";
  return [
    pb.startDateYmd,
    pb.endDateYmd,
    pb.solarEnabled ? "S" : "",
    pb.lunarEnabled ? "L" : "",
    pb.milkyWayEnabled ? "M" : "",
    pb.leadInId,
    pb.postWaitId,
    typeFilterKey(v2),
    mwCity,
    eclipseTourStructuralKey({
      startDateYmd: pb.startDateYmd,
      endDateYmd: pb.endDateYmd,
      includeSolar: pb.solarEnabled,
      includeLunar: pb.lunarEnabled,
      leadInId: pb.leadInId,
      postWaitId: pb.postWaitId,
      solarTypes: typeFilterKey(v2).split("|")[0] ?? "",
      lunarTypes: typeFilterKey(v2).split("|")[1] ?? "",
    }),
  ].join("|");
}

export function eventPlaybackLookupQuery(v2: LibrationConfigV2): EventPlaybackLookupQuery | null {
  const bounds = eventPlaybackRangeUtcMs(v2);
  if (!bounds) {
    return null;
  }
  const pb = v2.data.eventPlayback;
  const scene = sceneFromV2(v2);
  const observer = resolveReferenceCityObserverLocation(v2.chrome.displayTime);
  const cityName = observer
    ? REFERENCE_CITIES.find((c) => c.id === observer.cityId)?.name ?? observer.cityId
    : "";
  return {
    rangeStartUtcMs: bounds.startUtcMs,
    rangeEndUtcMs: bounds.endUtcMs,
    leadInId: pb.leadInId,
    postWaitId: pb.postWaitId,
    solarEnabled: pb.solarEnabled,
    lunarEnabled: pb.lunarEnabled,
    milkyWayEnabled: pb.milkyWayEnabled,
    solarPresentation: solarEclipsePresentationFromScene(scene),
    lunarPresentation: lunarEclipsePresentationFromScene(scene),
    observer,
    cityName,
  };
}

export function eventPlaybackNavigatorForV2(v2: LibrationConfigV2): EventPlaybackNavigator<EventPlaybackListedEvent> | null {
  const query = eventPlaybackLookupQuery(v2);
  if (!query) {
    return null;
  }
  return createMergedEventPlaybackNavigator(query);
}

export function findFirstPlaybackEvent(v2: LibrationConfigV2): EventPlaybackListedEvent | null {
  const query = eventPlaybackLookupQuery(v2);
  if (!query) {
    return null;
  }
  return findNextPlaybackEvent(query, query.rangeStartUtcMs, { includeIntersecting: true });
}

export function findNextPlaybackEventForV2(
  v2: LibrationConfigV2,
  current: EventPlaybackListedEvent,
): EventPlaybackListedEvent | null {
  const query = eventPlaybackLookupQuery(v2);
  if (!query) {
    return null;
  }
  return findNextPlaybackEvent(query, current.eventStartUtcMs, {
    includeIntersecting: false,
    excludeEventId: current.eventId,
  });
}

export function findPreviousPlaybackEventForV2(
  v2: LibrationConfigV2,
  current: EventPlaybackListedEvent,
): EventPlaybackListedEvent | null {
  const query = eventPlaybackLookupQuery(v2);
  if (!query) {
    return null;
  }
  return findPreviousPlaybackEvent(query, current.eventStartUtcMs, current.eventId);
}

/** Eclipse-only catalog listing for tests. Not used by Start. */
export function buildEclipsePlaybackSchedule(v2: LibrationConfigV2): EclipseTourScheduledEvent[] {
  const scene = sceneFromV2(v2);
  const pb = v2.data.eventPlayback;
  const bounds = eventPlaybackRangeUtcMs(v2);
  if (!bounds || (!pb.solarEnabled && !pb.lunarEnabled)) {
    return [];
  }
  const events = listEclipseTourEvents({
    startUtcMs: bounds.startUtcMs,
    endUtcMs: bounds.endUtcMs,
    includeSolar: pb.solarEnabled,
    includeLunar: pb.lunarEnabled,
    solarPresentation: solarEclipsePresentationFromScene(scene),
    lunarPresentation: lunarEclipsePresentationFromScene(scene),
  });
  return scheduleEclipseTourEvents(
    events,
    bounds.startUtcMs,
    bounds.endUtcMs,
    pb.leadInId,
    pb.postWaitId,
  );
}

export function eventPlaybackLiveLoop(v2: LibrationConfigV2): boolean {
  return v2.data.eventPlayback.loop;
}

export function resetEventPlaybackScheduleCacheForTests(): void {
  // Incremental lookup is uncached; kept for call-site compatibility.
}

/** @deprecated Use {@link buildEclipsePlaybackSchedule}. */
export function buildEclipseTourSchedule(v2: LibrationConfigV2): EclipseTourScheduledEvent[] {
  return buildEclipsePlaybackSchedule(v2);
}

/** @deprecated Use {@link eventPlaybackStructuralFingerprint}. */
export function eclipseTourStructuralFingerprint(v2: LibrationConfigV2): string {
  return eventPlaybackStructuralFingerprint(v2);
}

/** @deprecated Use {@link eventPlaybackStartYmdFromNow}. */
export function eclipseTourStartYmdFromNow(v2: LibrationConfigV2, nowMs?: number): string {
  return eventPlaybackStartYmdFromNow(v2, nowMs);
}

export { eventPlaybackShouldDeactivate as eclipseTourShouldDeactivate } from "../core/eventPlayback/eventPlaybackSequence";
