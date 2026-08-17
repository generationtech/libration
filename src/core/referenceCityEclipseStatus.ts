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

import type { EclipsePresentationState } from "./eclipse/eclipsePresentationState";
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

/**
 * HUD obscuration percent. The value is solar-disc *area* covered (obscuration),
 * not NASA magnitude. Integer below 99%. From 99% to &lt;100% uses one decimal
 * and never rounds a partial eclipse up to the literal string "100%".
 */
export function formatEclipseHudObscurationPercent(fraction: number): string {
  if (!Number.isFinite(fraction) || fraction < 0) {
    return "";
  }
  const pct = Math.min(100, fraction * 100);
  if (pct >= 100 - 1e-12) {
    return "100%";
  }
  if (pct >= 99) {
    const tenths = Math.floor(pct * 10) / 10;
    return `${tenths.toFixed(1)}%`;
  }
  return `${Math.round(pct)}%`;
}

function percent(n: number | null): string | null {
  if (n === null || !Number.isFinite(n)) {
    return null;
  }
  return formatEclipseHudObscurationPercent(n);
}

function solarVisibleLine(
  circumstances: ReferenceCityEclipseCircumstances,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
  options?: EclipseChromeStatusOptions,
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
  const productUtcMs = options?.productUtcMs;
  if (options?.lifecycle === "upcoming") {
    if (solar.c1) {
      const begins = formatReferenceCityEclipseTime(
        solar.c1.utcMs,
        timeZone,
        displayTimeMode,
        false,
      );
      return `Eclipse · ${kindBit} · begins ${begins}`;
    }
    const relative =
      options.relativeTime && options.relativeTime !== "now" ? options.relativeTime : null;
    return relative ? `Eclipse · ${kindBit} · ${relative}` : `Eclipse · ${kindBit}`;
  }
  if (
    typeof productUtcMs === "number" &&
    Number.isFinite(productUtcMs) &&
    solar.maximum &&
    productUtcMs >= solar.maximum.utcMs &&
    solar.c4
  ) {
    const ends = formatReferenceCityEclipseTime(solar.c4.utcMs, timeZone, displayTimeMode, false);
    return `Eclipse · ${kindBit} · ends ${ends}`;
  }
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
  readonly productUtcMs?: number;
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
    return solarVisibleLine(circumstances, timeZone, displayTimeMode, options);
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

/**
 * HUD line from the canonical presentation projection. Local/reference-city only.
 */
export function formatEclipseHudStatus(
  state: EclipsePresentationState | null,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
  options?: { readonly unsupported?: boolean },
): string | null {
  if (options?.unsupported) {
    return "Eclipse data unavailable outside 1900–2100.";
  }
  if (!state) {
    return null;
  }
  const local = state.local;
  if (state.kind === "solar") {
    if (!local) {
      return null;
    }
    if (!local.visible) {
      if (state.lifecycle === "upcoming" && state.relativeTime) {
        return `Eclipse · ${state.relativeTime} · not visible from ${local.cityName}`;
      }
      return `Eclipse not visible from ${local.cityName}`;
    }
    const pct =
      local.kindLabel === "Partial" ? percent(local.obscuration ?? local.magnitude) : null;
    const kindBit = pct ? `${local.kindLabel ?? "Partial"} ${pct}` : (local.kindLabel ?? "Partial");
    if (state.lifecycle === "upcoming") {
      if (local.c1UtcMs !== null) {
        const begins = formatReferenceCityEclipseTime(
          local.c1UtcMs,
          timeZone,
          displayTimeMode,
          false,
        );
        return `Eclipse · ${kindBit} · begins ${begins}`;
      }
      return state.relativeTime
        ? `Eclipse · ${kindBit} · ${state.relativeTime}`
        : `Eclipse · ${kindBit}`;
    }
    if (
      local.maximumUtcMs !== null &&
      state.productUtcMs >= local.maximumUtcMs &&
      local.c4UtcMs !== null
    ) {
      const ends = formatReferenceCityEclipseTime(
        local.c4UtcMs,
        timeZone,
        displayTimeMode,
        false,
      );
      return `Eclipse · ${kindBit} · ends ${ends}`;
    }
    if (local.maximumUtcMs !== null) {
      const max = formatReferenceCityEclipseTime(
        local.maximumUtcMs,
        timeZone,
        displayTimeMode,
        false,
      );
      return `Eclipse · ${kindBit} · max ${max}`;
    }
    return `Eclipse · ${kindBit}`;
  }
  if (!local) {
    return null;
  }
  const kind = local.kindLabel ?? "Total";
  if (!local.visible) {
    if (state.lifecycle === "upcoming" && state.relativeTime) {
      return `Lunar eclipse · not visible locally · ${state.relativeTime}`;
    }
    return `Lunar eclipse not visible from ${local.cityName}`;
  }
  if (state.lifecycle === "upcoming" && state.relativeTime) {
    return `Lunar eclipse · ${kind} · ${state.relativeTime}`;
  }
  return `Lunar eclipse · ${kind} · visible`;
}
