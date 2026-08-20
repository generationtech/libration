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
 * Shared lead-in / post-wait offsets for domain event playback (Eclipse and
 * Milky Way). One authority — do not duplicate these ids per family.
 */

export const EVENT_PLAYBACK_OFFSET_IDS = [
  "immediate",
  "1h",
  "2h",
  "6h",
  "1d",
  "2d",
  "1w",
] as const;

export type EventPlaybackOffsetId = (typeof EVENT_PLAYBACK_OFFSET_IDS)[number];

const OFFSET_MS: Record<EventPlaybackOffsetId, number> = {
  immediate: 0,
  "1h": 3_600_000,
  "2h": 7_200_000,
  "6h": 21_600_000,
  "1d": 86_400_000,
  "2d": 172_800_000,
  "1w": 604_800_000,
};

const OFFSET_SET = new Set<string>(EVENT_PLAYBACK_OFFSET_IDS);

export const DEFAULT_EVENT_PLAYBACK_LEAD_IN_ID: EventPlaybackOffsetId = "1d";
export const DEFAULT_EVENT_PLAYBACK_POST_WAIT_ID: EventPlaybackOffsetId = "1h";

export function eventPlaybackOffsetMs(id: EventPlaybackOffsetId): number {
  return OFFSET_MS[id];
}

export function eventPlaybackOffsetLabel(id: EventPlaybackOffsetId): string {
  switch (id) {
    case "immediate":
      return "Immediate";
    case "1h":
      return "1 hour";
    case "2h":
      return "2 hours";
    case "6h":
      return "6 hours";
    case "1d":
      return "1 day";
    case "2d":
      return "2 days";
    case "1w":
      return "1 week";
  }
}

export function isEventPlaybackOffsetId(raw: unknown): raw is EventPlaybackOffsetId {
  return typeof raw === "string" && OFFSET_SET.has(raw);
}

export function normalizeEventPlaybackOffsetId(
  raw: unknown,
  fallback: EventPlaybackOffsetId,
): EventPlaybackOffsetId {
  return isEventPlaybackOffsetId(raw) ? raw : fallback;
}
