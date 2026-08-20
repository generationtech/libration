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
 * Durable Data-tab event-playback preferences. Runtime phase/index are session-only.
 * Enabled event types merge into one chronological stream — there is no family submode.
 */

import {
  DEFAULT_ECLIPSE_TOUR_LOOP,
  normalizeEclipseTourPresentation,
  utcYmdFromUnixMs,
  type EclipseTourDateBounds,
} from "../eclipse/eclipseTourAppearance";
import { getEclipseTourAuthorityRange } from "../eclipse/eclipseTourCatalog";
import {
  PLANETARY_EPHEMERIS_RANGE_END_MS,
  PLANETARY_EPHEMERIS_RANGE_START_MS,
} from "../planetaryEphemeris";
import {
  DEFAULT_EVENT_PLAYBACK_LEAD_IN_ID,
  DEFAULT_EVENT_PLAYBACK_POST_WAIT_ID,
  normalizeEventPlaybackOffsetId,
  type EventPlaybackOffsetId,
} from "./eventPlaybackOffsets";

export const DEFAULT_EVENT_PLAYBACK_LOOP = DEFAULT_ECLIPSE_TOUR_LOOP;
export const DEFAULT_EVENT_PLAYBACK_SOLAR_ENABLED = true;
export const DEFAULT_EVENT_PLAYBACK_LUNAR_ENABLED = true;
export const DEFAULT_EVENT_PLAYBACK_MILKY_WAY_ENABLED = true;
export const DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_VIEWING = false;
export const DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_STRONG = true;
export const DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_PRIME = true;

export type EventPlaybackConfig = {
  readonly startDateYmd: string;
  readonly endDateYmd: string;
  readonly loop: boolean;
  readonly leadInId: EventPlaybackOffsetId;
  readonly postWaitId: EventPlaybackOffsetId;
  readonly solarEnabled: boolean;
  readonly lunarEnabled: boolean;
  readonly milkyWayEnabled: boolean;
  readonly includeViewing: boolean;
  readonly includeStrong: boolean;
  readonly includePrime: boolean;
};

export type EventPlaybackConfigPatch = Partial<EventPlaybackConfig>;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function flag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === true;
}

export function getMilkyWayPlaybackCalendarBounds(): EclipseTourDateBounds {
  return {
    minYmd: utcYmdFromUnixMs(PLANETARY_EPHEMERIS_RANGE_START_MS),
    maxYmd: utcYmdFromUnixMs(PLANETARY_EPHEMERIS_RANGE_END_MS - 1),
  };
}

export function getEventPlaybackCalendarBounds(): EclipseTourDateBounds {
  const eclipse = getEclipseTourAuthorityRange().calendarBounds;
  const mw = getMilkyWayPlaybackCalendarBounds();
  return {
    minYmd: eclipse.minYmd < mw.minYmd ? eclipse.minYmd : mw.minYmd,
    maxYmd: eclipse.maxYmd > mw.maxYmd ? eclipse.maxYmd : mw.maxYmd,
  };
}

function isLegacyFamilyShape(o: Record<string, unknown>): boolean {
  return (
    o.family === "eclipses" ||
    o.family === "milkyWay" ||
    (typeof o.solarEnabled !== "boolean" && (isPlainObject(o.eclipse) || isPlainObject(o.milkyWay)))
  );
}

export type NormalizeEventPlaybackOptions = {
  readonly legacyEclipseTour?: Readonly<Record<string, unknown>>;
  readonly nowMs?: number;
};

/**
 * Normalize durable event-playback preferences.
 * `legacyEclipseTour` migrates pre-LIB-052 `scene.eclipseTour` when playback prefs are absent.
 * LIB-052 `{ family, eclipse, milkyWay }` migrates to a shared range plus enabled-type set.
 */
export function normalizeEventPlayback(
  raw: unknown,
  options: NormalizeEventPlaybackOptions = {},
): EventPlaybackConfig {
  const nowMs = options.nowMs ?? Date.now();
  const bounds = getEventPlaybackCalendarBounds();
  const o = isPlainObject(raw) ? raw : {};

  if (!isPlainObject(raw) && options.legacyEclipseTour) {
    const eclipse = normalizeEclipseTourPresentation(options.legacyEclipseTour, bounds, nowMs);
    return {
      startDateYmd: eclipse.startDateYmd,
      endDateYmd: eclipse.endDateYmd,
      loop: eclipse.loop,
      leadInId: eclipse.leadInId,
      postWaitId: eclipse.postWaitId,
      solarEnabled: eclipse.includeSolar,
      lunarEnabled: eclipse.includeLunar,
      milkyWayEnabled: false,
      includeViewing: DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_VIEWING,
      includeStrong: DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_STRONG,
      includePrime: DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_PRIME,
    };
  }

  if (isLegacyFamilyShape(o)) {
    const eclipseRaw = isPlainObject(o.eclipse) ? o.eclipse : options.legacyEclipseTour;
    const eclipse = normalizeEclipseTourPresentation(eclipseRaw, getEclipseTourAuthorityRange().calendarBounds, nowMs);
    const mwShaped = normalizeEclipseTourPresentation(
      isPlainObject(o.milkyWay) ? o.milkyWay : undefined,
      getMilkyWayPlaybackCalendarBounds(),
      nowMs,
    );
    const mwRaw = isPlainObject(o.milkyWay) ? o.milkyWay : {};
    const family = o.family === "milkyWay" ? "milkyWay" : "eclipses";
    const shared = family === "milkyWay" ? mwShaped : eclipse;
    return {
      startDateYmd: shared.startDateYmd,
      endDateYmd: shared.endDateYmd,
      loop: flag(shared.loop, DEFAULT_EVENT_PLAYBACK_LOOP),
      leadInId: normalizeEventPlaybackOffsetId(shared.leadInId, DEFAULT_EVENT_PLAYBACK_LEAD_IN_ID),
      postWaitId: normalizeEventPlaybackOffsetId(shared.postWaitId, DEFAULT_EVENT_PLAYBACK_POST_WAIT_ID),
      solarEnabled: family === "eclipses" ? eclipse.includeSolar : false,
      lunarEnabled: family === "eclipses" ? eclipse.includeLunar : false,
      milkyWayEnabled: family === "milkyWay",
      includeViewing: flag(mwRaw.includeViewing, DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_VIEWING),
      includeStrong: flag(mwRaw.includeStrong, DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_STRONG),
      includePrime: flag(mwRaw.includePrime, DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_PRIME),
    };
  }

  const shaped = normalizeEclipseTourPresentation(
    {
      startDateYmd: o.startDateYmd,
      endDateYmd: o.endDateYmd,
      loop: o.loop,
      leadInId: o.leadInId,
      postWaitId: o.postWaitId,
      includeSolar: true,
      includeLunar: true,
    },
    bounds,
    nowMs,
  );
  return {
    startDateYmd: shaped.startDateYmd,
    endDateYmd: shaped.endDateYmd,
    loop: flag(o.loop, DEFAULT_EVENT_PLAYBACK_LOOP),
    leadInId: normalizeEventPlaybackOffsetId(o.leadInId, DEFAULT_EVENT_PLAYBACK_LEAD_IN_ID),
    postWaitId: normalizeEventPlaybackOffsetId(o.postWaitId, DEFAULT_EVENT_PLAYBACK_POST_WAIT_ID),
    solarEnabled: flag(o.solarEnabled, DEFAULT_EVENT_PLAYBACK_SOLAR_ENABLED),
    lunarEnabled: flag(o.lunarEnabled, DEFAULT_EVENT_PLAYBACK_LUNAR_ENABLED),
    milkyWayEnabled: flag(o.milkyWayEnabled, DEFAULT_EVENT_PLAYBACK_MILKY_WAY_ENABLED),
    includeViewing: flag(o.includeViewing, DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_VIEWING),
    includeStrong: flag(o.includeStrong, DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_STRONG),
    includePrime: flag(o.includePrime, DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_PRIME),
  };
}

export function defaultEventPlaybackConfig(nowMs: number = Date.now()): EventPlaybackConfig {
  return normalizeEventPlayback(undefined, { nowMs });
}

export function cloneEventPlayback(c: EventPlaybackConfig): EventPlaybackConfig {
  return { ...c };
}

export function applyEventPlayback(
  current: EventPlaybackConfig,
  patch: EventPlaybackConfigPatch,
  nowMs: number = Date.now(),
): EventPlaybackConfig {
  return normalizeEventPlayback({ ...current, ...patch }, { nowMs });
}

export function milkyWayPlaybackLevels(
  pb: Pick<EventPlaybackConfig, "includeViewing" | "includeStrong" | "includePrime">,
): Array<"viewing" | "strong" | "prime"> {
  const out: Array<"viewing" | "strong" | "prime"> = [];
  if (pb.includeViewing) {
    out.push("viewing");
  }
  if (pb.includeStrong) {
    out.push("strong");
  }
  if (pb.includePrime) {
    out.push("prime");
  }
  return out;
}

export function eventPlaybackHasEnabledType(pb: EventPlaybackConfig): boolean {
  if (pb.solarEnabled || pb.lunarEnabled) {
    return true;
  }
  return pb.milkyWayEnabled && milkyWayPlaybackLevels(pb).length > 0;
}

export function eventPlaybackStartBlockedReason(
  pb: EventPlaybackConfig,
  hasReferenceCity: boolean,
): string | null {
  if (!pb.solarEnabled && !pb.lunarEnabled && !pb.milkyWayEnabled) {
    return "Select at least one event type";
  }
  if (pb.milkyWayEnabled && milkyWayPlaybackLevels(pb).length === 0) {
    if (!pb.solarEnabled && !pb.lunarEnabled) {
      return "No selected MW levels.";
    }
  }
  if (pb.milkyWayEnabled && !hasReferenceCity && !pb.solarEnabled && !pb.lunarEnabled) {
    return "Select a reference city to sequence Milky Way windows.";
  }
  return null;
}
