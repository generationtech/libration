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
 */

import {
  DEFAULT_ECLIPSE_TOUR_LOOP,
  normalizeEclipseTourPresentation,
  utcYmdFromUnixMs,
  type EclipseTourDateBounds,
  type EclipseTourPresentation,
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

export const EVENT_PLAYBACK_FAMILY_IDS = ["eclipses", "milkyWay"] as const;
export type EventPlaybackFamilyId = (typeof EVENT_PLAYBACK_FAMILY_IDS)[number];

export const DEFAULT_EVENT_PLAYBACK_FAMILY: EventPlaybackFamilyId = "eclipses";
export const DEFAULT_EVENT_PLAYBACK_LOOP = DEFAULT_ECLIPSE_TOUR_LOOP;
export const DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_VIEWING = false;
export const DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_STRONG = true;
export const DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_PRIME = true;

export type EventPlaybackEclipseConfig = EclipseTourPresentation;

export type EventPlaybackMilkyWayConfig = {
  readonly startDateYmd: string;
  readonly endDateYmd: string;
  readonly includeViewing: boolean;
  readonly includeStrong: boolean;
  readonly includePrime: boolean;
  readonly loop: boolean;
  readonly leadInId: EventPlaybackOffsetId;
  readonly postWaitId: EventPlaybackOffsetId;
};

export type EventPlaybackConfig = {
  readonly family: EventPlaybackFamilyId;
  readonly eclipse: EventPlaybackEclipseConfig;
  readonly milkyWay: EventPlaybackMilkyWayConfig;
};

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

function normalizeMilkyWayPlayback(
  raw: Readonly<Record<string, unknown>> | undefined,
  bounds: EclipseTourDateBounds,
  nowMs: number,
): EventPlaybackMilkyWayConfig {
  const eclipseShaped = normalizeEclipseTourPresentation(
    {
      startDateYmd: raw?.startDateYmd,
      endDateYmd: raw?.endDateYmd,
      loop: raw?.loop,
      leadInId: raw?.leadInId,
      postWaitId: raw?.postWaitId,
      includeSolar: true,
      includeLunar: true,
    },
    bounds,
    nowMs,
  );
  return {
    startDateYmd: eclipseShaped.startDateYmd,
    endDateYmd: eclipseShaped.endDateYmd,
    includeViewing: flag(raw?.includeViewing, DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_VIEWING),
    includeStrong: flag(raw?.includeStrong, DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_STRONG),
    includePrime: flag(raw?.includePrime, DEFAULT_MILKY_WAY_PLAYBACK_INCLUDE_PRIME),
    loop: flag(raw?.loop, DEFAULT_EVENT_PLAYBACK_LOOP),
    leadInId: normalizeEventPlaybackOffsetId(raw?.leadInId, DEFAULT_EVENT_PLAYBACK_LEAD_IN_ID),
    postWaitId: normalizeEventPlaybackOffsetId(raw?.postWaitId, DEFAULT_EVENT_PLAYBACK_POST_WAIT_ID),
  };
}

function normalizeFamily(raw: unknown): EventPlaybackFamilyId {
  return raw === "milkyWay" ? "milkyWay" : DEFAULT_EVENT_PLAYBACK_FAMILY;
}

export type NormalizeEventPlaybackOptions = {
  readonly legacyEclipseTour?: Readonly<Record<string, unknown>>;
  readonly nowMs?: number;
};

/**
 * Normalize durable event-playback preferences.
 * `legacyEclipseTour` migrates pre-LIB-052 `scene.eclipseTour` when `eclipse` is absent.
 */
export function normalizeEventPlayback(
  raw: unknown,
  options: NormalizeEventPlaybackOptions = {},
): EventPlaybackConfig {
  const nowMs = options.nowMs ?? Date.now();
  const o = isPlainObject(raw) ? raw : {};
  const eclipseRaw = isPlainObject(o.eclipse)
    ? o.eclipse
    : options.legacyEclipseTour;
  const eclipseBounds = getEclipseTourAuthorityRange().calendarBounds;
  const eclipse = normalizeEclipseTourPresentation(eclipseRaw, eclipseBounds, nowMs);
  const milkyWay = normalizeMilkyWayPlayback(
    isPlainObject(o.milkyWay) ? o.milkyWay : undefined,
    getMilkyWayPlaybackCalendarBounds(),
    nowMs,
  );
  return {
    family: normalizeFamily(o.family),
    eclipse,
    milkyWay,
  };
}

export function defaultEventPlaybackConfig(nowMs: number = Date.now()): EventPlaybackConfig {
  return normalizeEventPlayback(undefined, { nowMs });
}

export function cloneEventPlayback(c: EventPlaybackConfig): EventPlaybackConfig {
  return {
    family: c.family,
    eclipse: { ...c.eclipse },
    milkyWay: { ...c.milkyWay },
  };
}

export function applyEventPlaybackEclipse(
  current: EventPlaybackConfig,
  patch: Partial<EventPlaybackEclipseConfig>,
  nowMs: number = Date.now(),
): EventPlaybackConfig {
  return normalizeEventPlayback(
    {
      family: current.family,
      eclipse: { ...current.eclipse, ...patch },
      milkyWay: current.milkyWay,
    },
    { nowMs },
  );
}

export function applyEventPlaybackMilkyWay(
  current: EventPlaybackConfig,
  patch: Partial<EventPlaybackMilkyWayConfig>,
  nowMs: number = Date.now(),
): EventPlaybackConfig {
  return normalizeEventPlayback(
    {
      family: current.family,
      eclipse: current.eclipse,
      milkyWay: { ...current.milkyWay, ...patch },
    },
    { nowMs },
  );
}

export function eventPlaybackEclipseFromData(data: { eventPlayback: EventPlaybackConfig }): EventPlaybackEclipseConfig {
  return data.eventPlayback.eclipse;
}

export function milkyWayPlaybackLevels(
  mw: EventPlaybackMilkyWayConfig,
): Array<"viewing" | "strong" | "prime"> {
  const out: Array<"viewing" | "strong" | "prime"> = [];
  if (mw.includeViewing) {
    out.push("viewing");
  }
  if (mw.includeStrong) {
    out.push("strong");
  }
  if (mw.includePrime) {
    out.push("prime");
  }
  return out;
}
