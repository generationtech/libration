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
 * App-side adapters: build event-playback schedules from the v2 document.
 * Enumeration is cached off the animation frame.
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
import type { EventPlaybackFamilyId } from "../core/eventPlayback/eventPlaybackConfig";
import { milkyWayPlaybackLevels } from "../core/eventPlayback/eventPlaybackConfig";
import type { EventPlaybackTimedEvent } from "../core/eventPlayback/eventPlaybackSequence";
import {
  groupMilkyWayWindowsForTour,
  scheduleMilkyWayTourEvents,
  type MilkyWayPlaybackScheduledEvent,
} from "../core/eventPlayback/milkyWayTourEvents";
import { listMilkyWayViewingWindows } from "../core/milkyWayViewingWindows";
import { resolveReferenceCityObserverLocation } from "../core/referenceCityObserver";
import { getCalendarYmdInZone } from "../core/wallTimeInZone";
import { REFERENCE_CITIES } from "../data/referenceCities";
import type { EclipseTourScheduledEvent } from "../core/eclipse/eclipseTourCatalog";

export type EventPlaybackListedEvent = EventPlaybackTimedEvent & {
  readonly title: string;
  readonly dateLabel: string;
  readonly milkyWay?: Pick<
    MilkyWayPlaybackScheduledEvent,
    "cityId" | "bestLevel" | "peakAltitudeDeg" | "startUtcMs" | "endUtcMs"
  > & { readonly cityName: string };
};

const scheduleCache = new Map<string, EventPlaybackListedEvent[]>();

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

export function eventPlaybackStructuralFingerprint(v2: LibrationConfigV2): string {
  const pb = v2.data.eventPlayback;
  const observer = resolveReferenceCityObserverLocation(v2.chrome.displayTime);
  if (pb.family === "milkyWay") {
    return [
      "milkyWay",
      pb.milkyWay.endDateYmd,
      pb.milkyWay.includeViewing ? "V" : "",
      pb.milkyWay.includeStrong ? "S" : "",
      pb.milkyWay.includePrime ? "P" : "",
      pb.milkyWay.leadInId,
      pb.milkyWay.postWaitId,
      observer?.cityId ?? "",
    ].join("|");
  }
  return [
    "eclipses",
    eclipseTourStructuralKey({
      startDateYmd: "",
      endDateYmd: pb.eclipse.endDateYmd,
      includeSolar: pb.eclipse.includeSolar,
      includeLunar: pb.eclipse.includeLunar,
      leadInId: pb.eclipse.leadInId,
      postWaitId: pb.eclipse.postWaitId,
      solarTypes: typeFilterKey(v2).split("|")[0] ?? "",
      lunarTypes: typeFilterKey(v2).split("|")[1] ?? "",
    }),
  ].join("|");
}

function scheduleCacheKey(v2: LibrationConfigV2): string {
  const pb = v2.data.eventPlayback;
  if (pb.family === "milkyWay") {
    const observer = resolveReferenceCityObserverLocation(v2.chrome.displayTime);
    return [
      eventPlaybackStructuralFingerprint(v2),
      pb.milkyWay.startDateYmd,
      observer?.latitudeDeg.toFixed(4) ?? "",
      observer?.longitudeDeg.toFixed(4) ?? "",
    ].join("|");
  }
  return [eventPlaybackStructuralFingerprint(v2), pb.eclipse.startDateYmd].join("|");
}

function eclipseToListed(event: EclipseTourScheduledEvent): EventPlaybackListedEvent {
  return {
    leadInUtcMs: event.leadInUtcMs,
    transitionEndUtcMs: event.transitionEndUtcMs,
    title: event.title,
    dateLabel: event.dateLabel,
  };
}

function milkyWayToListed(
  event: MilkyWayPlaybackScheduledEvent,
  cityName: string,
): EventPlaybackListedEvent {
  return {
    leadInUtcMs: event.leadInUtcMs,
    transitionEndUtcMs: event.transitionEndUtcMs,
    title: event.title,
    dateLabel: event.dateLabel,
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

export function buildEclipsePlaybackSchedule(v2: LibrationConfigV2): EclipseTourScheduledEvent[] {
  const scene = sceneFromV2(v2);
  const tour = v2.data.eventPlayback.eclipse;
  const bounds = eclipseTourRangeUtcMs(
    tour.startDateYmd,
    tour.endDateYmd,
    eventPlaybackUseUtcCivilFrame(v2),
    eventPlaybackCivilZone(v2),
  );
  if (!bounds || (!tour.includeSolar && !tour.includeLunar)) {
    return [];
  }
  const events = listEclipseTourEvents({
    startUtcMs: bounds.startUtcMs,
    endUtcMs: bounds.endUtcMs,
    includeSolar: tour.includeSolar,
    includeLunar: tour.includeLunar,
    solarPresentation: solarEclipsePresentationFromScene(scene),
    lunarPresentation: lunarEclipsePresentationFromScene(scene),
  });
  return scheduleEclipseTourEvents(
    events,
    bounds.startUtcMs,
    bounds.endUtcMs,
    tour.leadInId,
    tour.postWaitId,
  );
}

export function buildMilkyWayPlaybackSchedule(v2: LibrationConfigV2): EventPlaybackListedEvent[] {
  const mw = v2.data.eventPlayback.milkyWay;
  const levels = milkyWayPlaybackLevels(mw);
  const observer = resolveReferenceCityObserverLocation(v2.chrome.displayTime);
  if (!observer || levels.length === 0) {
    return [];
  }
  const bounds = eclipseTourRangeUtcMs(
    mw.startDateYmd,
    mw.endDateYmd,
    eventPlaybackUseUtcCivilFrame(v2),
    eventPlaybackCivilZone(v2),
  );
  if (!bounds) {
    return [];
  }
  const listed = listMilkyWayViewingWindows({
    observer,
    startUtcMs: bounds.startUtcMs,
    endUtcMs: bounds.endUtcMs + 1,
    levels,
  });
  const grouped = groupMilkyWayWindowsForTour(listed.windows);
  const scheduled = scheduleMilkyWayTourEvents(
    grouped,
    bounds.startUtcMs,
    bounds.endUtcMs,
    mw.leadInId,
    mw.postWaitId,
  );
  const cityName = REFERENCE_CITIES.find((c) => c.id === observer.cityId)?.name ?? observer.cityId;
  return scheduled.map((event) => milkyWayToListed(event, cityName));
}

export function buildEventPlaybackSchedule(v2: LibrationConfigV2): EventPlaybackListedEvent[] {
  const key = scheduleCacheKey(v2);
  const hit = scheduleCache.get(key);
  if (hit) {
    return hit;
  }
  const family: EventPlaybackFamilyId = v2.data.eventPlayback.family;
  const events =
    family === "milkyWay"
      ? buildMilkyWayPlaybackSchedule(v2)
      : buildEclipsePlaybackSchedule(v2).map(eclipseToListed);
  scheduleCache.set(key, events);
  if (scheduleCache.size > 8) {
    const oldest = scheduleCache.keys().next().value;
    if (oldest !== undefined) {
      scheduleCache.delete(oldest);
    }
  }
  return events;
}

export function eventPlaybackLiveLoop(v2: LibrationConfigV2): boolean {
  const pb = v2.data.eventPlayback;
  return pb.family === "milkyWay" ? pb.milkyWay.loop : pb.eclipse.loop;
}

export function resetEventPlaybackScheduleCacheForTests(): void {
  scheduleCache.clear();
}

/** @deprecated Use {@link buildEclipsePlaybackSchedule} / {@link buildEventPlaybackSchedule}. */
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
