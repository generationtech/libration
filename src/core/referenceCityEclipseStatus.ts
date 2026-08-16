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
 * Presentation-only formatting of reference-city eclipse circumstances.
 * Domain times remain UTC. Local wall-clock strings use the city's IANA zone.
 */

import { formatWallClockInTimeZone } from "./timeFormat";
import type { DisplayTimeMode } from "./chromeTimeDomain";
import type { ReferenceCityEclipseCircumstances } from "./eclipse/referenceCityEclipseTypes";

export function formatReferenceCityEclipseTime(
  utcMs: number,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
  includeSeconds = true,
): string {
  if (displayTimeMode === "utc") {
    return formatWallClockInTimeZone(utcMs, "UTC", false, { includeSeconds });
  }
  return formatWallClockInTimeZone(utcMs, timeZone, displayTimeMode === "12hr", {
    includeSeconds,
  });
}

function percent(n: number | null): string | null {
  if (n === null || !Number.isFinite(n)) {
    return null;
  }
  return `${Math.round(n * 100)}%`;
}

function solarVisibleLine(
  circumstances: ReferenceCityEclipseCircumstances,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
): string {
  const solar = circumstances.solar!;
  const kind =
    solar.observableKind === "total"
      ? "Total"
      : solar.observableKind === "annular"
        ? "Annular"
        : "Partial";
  const pct =
    solar.observableKind === "partial" ? percent(solar.obscuration ?? solar.magnitude) : null;
  const kindBit = pct ? `${kind} ${pct}` : kind;
  const max = solar.maximum
    ? formatReferenceCityEclipseTime(solar.maximum.utcMs, timeZone, displayTimeMode, false)
    : null;
  return max ? `Eclipse · ${kindBit} · max ${max}` : `Eclipse · ${kindBit}`;
}

function lunarVisibleLine(circumstances: ReferenceCityEclipseCircumstances): string {
  const lunar = circumstances.lunar!;
  const kind =
    lunar.globalSubtype === "total"
      ? "Total"
      : lunar.globalSubtype === "partial"
        ? "Partial"
        : "Penumbral";
  return `Lunar eclipse · ${kind} · visible`;
}

export type EclipseChromeStatusOptions = {
  readonly unsupported?: boolean;
  readonly presented?: boolean;
  readonly lifecycle?: "upcoming" | "active" | null;
  readonly relativeTime?: string | null;
};

/**
 * Compact persistent chrome line. Null when there is no relevant eclipse.
 * Never implies the global event is absent because the city cannot see it.
 */
export function formatReferenceCityEclipseChromeStatus(
  circumstances: ReferenceCityEclipseCircumstances | null,
  cityName: string,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
  options?: EclipseChromeStatusOptions,
): string | null {
  if (options?.unsupported) {
    return "Eclipse data unavailable outside 1900–2100.";
  }
  if (options?.presented === false) {
    return null;
  }
  if (!circumstances) {
    return null;
  }
  const solar = circumstances.solar;
  const lunar = circumstances.lunar;
  if (!solar && !lunar) {
    return null;
  }
  const relative = options?.relativeTime && options.relativeTime !== "now" ? options.relativeTime : null;
  if (solar?.locallyVisible) {
    if (options?.lifecycle === "upcoming" && relative) {
      const kind =
        solar.observableKind === "total"
          ? "Total"
          : solar.observableKind === "annular"
            ? "Annular"
            : "Partial";
      const pct =
        solar.observableKind === "partial" ? percent(solar.obscuration ?? solar.magnitude) : null;
      const kindBit = pct ? `${kind} ${pct}` : kind;
      return `Eclipse · ${kindBit} · ${relative}`;
    }
    return solarVisibleLine(circumstances, timeZone, displayTimeMode);
  }
  if (lunar?.locallyVisible) {
    if (options?.lifecycle === "upcoming" && relative) {
      const kind =
        lunar.globalSubtype === "total"
          ? "Total"
          : lunar.globalSubtype === "partial"
            ? "Partial"
            : "Penumbral";
      return `Lunar eclipse · ${kind} · ${relative}`;
    }
    return lunarVisibleLine(circumstances);
  }
  if (solar) {
    if (options?.lifecycle === "upcoming" && relative) {
      return `Eclipse · ${relative} · not visible from ${cityName}`;
    }
    return `Eclipse not visible from ${cityName}`;
  }
  if (options?.lifecycle === "upcoming" && relative) {
    return `Lunar eclipse · not visible locally · ${relative}`;
  }
  return `Lunar eclipse not visible from ${cityName}`;
}
