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
 * Durable Eclipse playback configuration. Shared lead-in/post-wait ids live in
 * `eventPlaybackOffsets`. Runtime sequencing is not persisted.
 */

import {
  DEFAULT_EVENT_PLAYBACK_LEAD_IN_ID,
  DEFAULT_EVENT_PLAYBACK_POST_WAIT_ID,
  EVENT_PLAYBACK_OFFSET_IDS,
  eventPlaybackOffsetLabel,
  eventPlaybackOffsetMs,
  normalizeEventPlaybackOffsetId,
  type EventPlaybackOffsetId,
} from "../eventPlayback/eventPlaybackOffsets";

export const ECLIPSE_TOUR_OFFSET_IDS = EVENT_PLAYBACK_OFFSET_IDS;
export type EclipseTourOffsetId = EventPlaybackOffsetId;

export const DEFAULT_ECLIPSE_TOUR_INCLUDE_SOLAR = true;
export const DEFAULT_ECLIPSE_TOUR_INCLUDE_LUNAR = true;
export const DEFAULT_ECLIPSE_TOUR_LOOP = true;
export const DEFAULT_ECLIPSE_TOUR_LEAD_IN_ID: EclipseTourOffsetId = DEFAULT_EVENT_PLAYBACK_LEAD_IN_ID;
export const DEFAULT_ECLIPSE_TOUR_POST_WAIT_ID: EclipseTourOffsetId = DEFAULT_EVENT_PLAYBACK_POST_WAIT_ID;

export type EclipseTourPresentation = {
  readonly startDateYmd: string;
  readonly endDateYmd: string;
  readonly includeSolar: boolean;
  readonly includeLunar: boolean;
  readonly loop: boolean;
  readonly leadInId: EclipseTourOffsetId;
  readonly postWaitId: EclipseTourOffsetId;
};

export function eclipseTourOffsetMs(id: EclipseTourOffsetId): number {
  return eventPlaybackOffsetMs(id);
}

export function eclipseTourOffsetLabel(id: EclipseTourOffsetId): string {
  return eventPlaybackOffsetLabel(id);
}

function flag(raw: unknown, fallback: boolean): boolean {
  if (raw === undefined) {
    return fallback;
  }
  return raw === true;
}

function normalizeOffsetId(raw: unknown, fallback: EclipseTourOffsetId): EclipseTourOffsetId {
  return normalizeEventPlaybackOffsetId(raw, fallback);
}

const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function parseIsoCalendarYmd(
  ymd: string,
): { readonly y: number; readonly m: number; readonly d: number } | null {
  const m = YMD_RE.exec(ymd.trim());
  if (!m) {
    return null;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (!Number.isInteger(y) || !Number.isInteger(mo) || !Number.isInteger(d)) {
    return null;
  }
  if (mo < 1 || mo > 12 || d < 1 || d > 31) {
    return null;
  }
  const utc = Date.UTC(y, mo - 1, d);
  const dt = new Date(utc);
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() + 1 !== mo || dt.getUTCDate() !== d) {
    return null;
  }
  return { y, m: mo, d };
}

export function formatIsoCalendarYmd(y: number, m: number, d: number): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

export function utcYmdFromUnixMs(utcMs: number): string {
  const dt = new Date(utcMs);
  return formatIsoCalendarYmd(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

export function compareIsoCalendarYmd(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

export function clampIsoCalendarYmd(ymd: string, minYmd: string, maxYmd: string): string {
  if (compareIsoCalendarYmd(ymd, minYmd) < 0) {
    return minYmd;
  }
  if (compareIsoCalendarYmd(ymd, maxYmd) > 0) {
    return maxYmd;
  }
  return ymd;
}

export type EclipseTourDateBounds = {
  readonly minYmd: string;
  readonly maxYmd: string;
};

/**
 * Normalize durable tour preferences. `nowMs` stamps a missing start date.
 * `bounds` clamps dates to the authority-supported calendar span.
 */
export function normalizeEclipseTourPresentation(
  raw: Readonly<Record<string, unknown>> | undefined,
  bounds: EclipseTourDateBounds,
  nowMs: number = Date.now(),
): EclipseTourPresentation {
  const factoryStart = clampIsoCalendarYmd(utcYmdFromUnixMs(nowMs), bounds.minYmd, bounds.maxYmd);
  const parsedStart = typeof raw?.startDateYmd === "string" ? parseIsoCalendarYmd(raw.startDateYmd) : null;
  const parsedEnd = typeof raw?.endDateYmd === "string" ? parseIsoCalendarYmd(raw.endDateYmd) : null;
  let startDateYmd = parsedStart
    ? clampIsoCalendarYmd(formatIsoCalendarYmd(parsedStart.y, parsedStart.m, parsedStart.d), bounds.minYmd, bounds.maxYmd)
    : factoryStart;
  let endDateYmd = parsedEnd
    ? clampIsoCalendarYmd(formatIsoCalendarYmd(parsedEnd.y, parsedEnd.m, parsedEnd.d), bounds.minYmd, bounds.maxYmd)
    : bounds.maxYmd;
  if (compareIsoCalendarYmd(startDateYmd, endDateYmd) > 0) {
    endDateYmd = startDateYmd;
  }
  return {
    startDateYmd,
    endDateYmd,
    includeSolar: flag(raw?.includeSolar, DEFAULT_ECLIPSE_TOUR_INCLUDE_SOLAR),
    includeLunar: flag(raw?.includeLunar, DEFAULT_ECLIPSE_TOUR_INCLUDE_LUNAR),
    loop: flag(raw?.loop, DEFAULT_ECLIPSE_TOUR_LOOP),
    leadInId: normalizeOffsetId(raw?.leadInId, DEFAULT_ECLIPSE_TOUR_LEAD_IN_ID),
    postWaitId: normalizeOffsetId(raw?.postWaitId, DEFAULT_ECLIPSE_TOUR_POST_WAIT_ID),
  };
}
