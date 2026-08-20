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
 * Presentation-only formatting for Milky Way Viewing Windows.
 * Domain times remain UTC. Local strings use the reference city's IANA zone.
 */

import type { DisplayTimeMode } from "./chromeTimeDomain";
import { formatWallClockInTimeZone } from "./timeFormat";
import {
  PRIME_MAX_MOONLIGHT_01,
  STRONG_MAX_MOONLIGHT_01,
  STRONG_MAX_SUN_ALTITUDE_DEG,
  type MilkyWayViewingLevel,
} from "./milkyWayViewingPolicy";
import type {
  MilkyWayViewingFeasibility,
  MilkyWayViewingWindow,
} from "./milkyWayViewingWindows";
import { windowContainingUtc } from "./milkyWayViewingWindows";

export type MilkyWayViewingEventState = "upcoming" | "active" | "completed";

const MONTH_DAY_FMT = new Map<string, Intl.DateTimeFormat>();

function monthDayFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = MONTH_DAY_FMT.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      month: "short",
      day: "numeric",
    });
    MONTH_DAY_FMT.set(timeZone, fmt);
  }
  return fmt;
}

export function milkyWayViewingLevelLabel(level: MilkyWayViewingLevel): string {
  switch (level) {
    case "viewing":
      return "Viewing";
    case "strong":
      return "Strong";
    case "prime":
      return "Prime";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function milkyWayViewingEventState(
  window: MilkyWayViewingWindow,
  nowUtcMs: number,
): MilkyWayViewingEventState {
  if (nowUtcMs < window.startUtcMs) {
    return "upcoming";
  }
  if (nowUtcMs >= window.endUtcMs) {
    return "completed";
  }
  return "active";
}

function formatClock(
  utcMs: number,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
): string {
  if (displayTimeMode === "utc") {
    return formatWallClockInTimeZone(utcMs, "UTC", false, { includeSeconds: false });
  }
  return formatWallClockInTimeZone(utcMs, timeZone, displayTimeMode === "12hr", {
    includeSeconds: false,
  });
}

export function formatMilkyWayViewingWindowLocalRange(
  window: Pick<MilkyWayViewingWindow, "startUtcMs" | "endUtcMs">,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
): string {
  const zone = displayTimeMode === "utc" ? "UTC" : timeZone;
  const startDay = monthDayFormatter(zone).format(new Date(window.startUtcMs));
  const endDay = monthDayFormatter(zone).format(new Date(window.endUtcMs));
  const startClock = formatClock(window.startUtcMs, timeZone, displayTimeMode);
  const endClock = formatClock(window.endUtcMs, timeZone, displayTimeMode);
  if (startDay === endDay) {
    return `${startDay}, ${startClock}–${endClock}`;
  }
  return `${startDay}, ${startClock} – ${endDay}, ${endClock}`;
}

function darknessPhrase(sunAltitudeDeg: number): string {
  if (sunAltitudeDeg <= STRONG_MAX_SUN_ALTITUDE_DEG) {
    return "Astronomical night";
  }
  return "Nautical twilight or darker";
}

function moonlightPhrase(moonlight01: number): string {
  if (moonlight01 <= PRIME_MAX_MOONLIGHT_01) {
    return "low moonlight";
  }
  if (moonlight01 <= STRONG_MAX_MOONLIGHT_01) {
    return "moderate moonlight";
  }
  return "moonlit";
}

export function milkyWayViewingFeasibilityCopy(
  feasibility: MilkyWayViewingFeasibility,
): string | null {
  switch (feasibility) {
    case "gcNeverRises":
      return "Galactic center does not rise at this latitude.";
    case "gcInsufficient":
      return "Galactic center does not rise sufficiently at this latitude.";
    case "unsupportedRange":
      return "Milky Way viewing windows unavailable outside 1600–2500.";
    case "emptyRange":
      return "No Galactic-center viewing windows in this range.";
    case "ok":
      return null;
    default: {
      const _exhaustive: never = feasibility;
      return _exhaustive;
    }
  }
}

export const MILKY_WAY_VIEWING_WINDOW_HONEST_COPY =
  "A Milky Way Viewing Window marks times when the Galactic center is favorably elevated from the reference city under sufficiently dark solar conditions and acceptable modeled moonlight. Actual visibility also depends on weather, transparency, light pollution, and obstructions.";

export type MilkyWayViewingStatusModel = {
  readonly active: MilkyWayViewingWindow | null;
  readonly next: MilkyWayViewingWindow | null;
  readonly nextPrime: MilkyWayViewingWindow | null;
  readonly state: MilkyWayViewingEventState | null;
};

export function resolveMilkyWayViewingStatus(
  windows: readonly MilkyWayViewingWindow[],
  nowUtcMs: number,
): MilkyWayViewingStatusModel {
  const active = windowContainingUtc(windows, nowUtcMs);
  let next: MilkyWayViewingWindow | null = null;
  let nextPrime: MilkyWayViewingWindow | null = null;
  for (const w of windows) {
    if (w.startUtcMs > nowUtcMs) {
      if (!next) {
        next = w;
      }
      if (!nextPrime && w.level === "prime") {
        nextPrime = w;
      }
    }
    if (next && nextPrime) {
      break;
    }
  }
  return {
    active,
    next,
    nextPrime,
    state: active ? "active" : next ? "upcoming" : null,
  };
}

export function formatMilkyWayViewingActiveLines(
  window: MilkyWayViewingWindow,
  nowUtcMs: number,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
  gcAltitudeDeg: number | null,
): string[] {
  const lines = [
    `Milky Way · ${milkyWayViewingLevelLabel(window.level)}`,
  ];
  const alt = gcAltitudeDeg ?? window.peakAltitudeDeg;
  lines.push(`Galactic center ${alt.toFixed(1)}°`);
  lines.push(`${Math.round(window.peakAltitudeQuality01 * 100)}% of nightly maximum`);
  lines.push(
    `${darknessPhrase(window.minimumSunAltitudeDeg)} · ${moonlightPhrase(window.representativeMoonlight01)}`,
  );
  lines.push(`Ends ${formatClock(window.endUtcMs, timeZone, displayTimeMode)}`);
  void nowUtcMs;
  return lines;
}

export function formatMilkyWayViewingNextWindowLines(
  window: MilkyWayViewingWindow,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
): string[] {
  return [
    `Next ${milkyWayViewingLevelLabel(window.level)} window`,
    formatMilkyWayViewingWindowLocalRange(window, timeZone, displayTimeMode),
    `Peak GC altitude ${window.peakAltitudeDeg.toFixed(1)}°`,
    `${darknessPhrase(window.minimumSunAltitudeDeg)} · ${moonlightPhrase(window.representativeMoonlight01)}`,
  ];
}

export function formatMilkyWayViewingNextPrimeLines(
  window: MilkyWayViewingWindow,
  timeZone: string,
  displayTimeMode: DisplayTimeMode,
): string[] {
  return formatMilkyWayViewingNextWindowLines(window, timeZone, displayTimeMode);
}
