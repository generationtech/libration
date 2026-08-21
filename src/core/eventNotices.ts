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
 * Presentation-level HUD event notices. Does not own astronomy or playback.
 * Each domain supplies already-eligible candidates; this module only ranks,
 * bounds, and formats overflow.
 */

export const EVENT_NOTICE_MAX_VISIBLE = 2;

export const EVENT_NOTICE_FAMILIES = ["solarEclipse", "lunarEclipse", "milkyWay"] as const;
export type EventNoticeFamily = (typeof EVENT_NOTICE_FAMILIES)[number];

export type EventNoticeLifecycle = "upcoming" | "active";

export type EventNotice = {
  readonly id: string;
  readonly family: EventNoticeFamily;
  readonly lifecycle: EventNoticeLifecycle;
  readonly startUtcMs: number;
  readonly endUtcMs: number | null;
  readonly text: string;
  readonly sortTimeUtcMs: number;
};

export type EventNoticeStack = {
  readonly visible: readonly EventNotice[];
  readonly overflowCount: number;
  readonly overflowText: string | null;
};

const FAMILY_RANK: Record<EventNoticeFamily, number> = {
  solarEclipse: 0,
  lunarEclipse: 1,
  milkyWay: 2,
};

function compareNotices(a: EventNotice, b: EventNotice): number {
  const aActive = a.lifecycle === "active" ? 0 : 1;
  const bActive = b.lifecycle === "active" ? 0 : 1;
  if (aActive !== bActive) {
    return aActive - bActive;
  }
  if (a.sortTimeUtcMs !== b.sortTimeUtcMs) {
    return a.sortTimeUtcMs - b.sortTimeUtcMs;
  }
  const rank = FAMILY_RANK[a.family] - FAMILY_RANK[b.family];
  if (rank !== 0) {
    return rank;
  }
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

export function formatEventNoticeOverflow(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count === 1 ? "+1 more event" : `+${count} more events`;
}

export function arbitrateEventNotices(
  candidates: readonly EventNotice[],
  maxVisible: number = EVENT_NOTICE_MAX_VISIBLE,
): EventNoticeStack {
  const seen = new Set<string>();
  const unique: EventNotice[] = [];
  for (const c of candidates) {
    const text = c.text.trim();
    if (!text) {
      continue;
    }
    if (seen.has(c.id)) {
      continue;
    }
    seen.add(c.id);
    unique.push(c);
  }
  unique.sort(compareNotices);
  const cap = Math.max(0, Math.floor(maxVisible));
  const visible = unique.slice(0, cap);
  const overflowCount = Math.max(0, unique.length - visible.length);
  return {
    visible,
    overflowCount,
    overflowText: formatEventNoticeOverflow(overflowCount),
  };
}
