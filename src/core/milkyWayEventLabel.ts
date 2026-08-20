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
 * Milky Way Viewing Window map-label presentation. Consumes ADR 0018 windows;
 * does not redefine thresholds. One label: active selected window, else the
 * next highest-quality selected window within the advance horizon.
 */

import { formatEclipseRelativeTime } from "./eclipse/eclipseEventCopy";
import {
  milkyWayEnabledViewingLevels,
  milkyWayEventLabelHorizonMs,
  type MilkyWayPresentation,
} from "./milkyWayPresentation";
import { milkyWayViewingLevelRank, type MilkyWayViewingLevel } from "./milkyWayViewingPolicy";
import {
  galacticCenterSubpointAt,
  listMilkyWayViewingWindows,
  windowContainingUtc,
  type MilkyWayViewingObserver,
  type MilkyWayViewingWindow,
} from "./milkyWayViewingWindows";

const LABEL_BUCKET_MS = 60_000;
const LOOKUP_PAD_MS = 86_400_000;

export type MilkyWayEventLabelLifecycle = "upcoming" | "active";

export type MilkyWayEventMapLabel = {
  readonly text: string;
  readonly latDeg: number;
  readonly lonDeg: number;
  readonly lifecycle: MilkyWayEventLabelLifecycle;
  readonly level: MilkyWayViewingLevel;
  readonly cityName: string;
};

type CacheEntry = {
  readonly key: string;
  readonly windows: readonly MilkyWayViewingWindow[];
};

let labelCache: CacheEntry | null = null;

export function resetMilkyWayEventLabelCacheForTests(): void {
  labelCache = null;
}

export function milkyWayEventLabelLevelBit(level: MilkyWayViewingLevel): string {
  switch (level) {
    case "prime":
      return "MW Prime";
    case "strong":
      return "MW Strong";
    case "viewing":
      return "MW Viewing";
    default: {
      const _exhaustive: never = level;
      return _exhaustive;
    }
  }
}

export function formatMilkyWayEventLabelText(args: {
  readonly cityName: string;
  readonly level: MilkyWayViewingLevel;
  readonly lifecycle: MilkyWayEventLabelLifecycle;
  readonly relative: string | null;
}): string {
  const bit = milkyWayEventLabelLevelBit(args.level);
  if (args.lifecycle === "active") {
    return `${args.cityName} · ${bit}`;
  }
  const rel = args.relative && args.relative !== "now" ? args.relative : null;
  return rel ? `${args.cityName} · ${bit} · ${rel}` : `${args.cityName} · ${bit}`;
}

function pickUpcoming(
  windows: readonly MilkyWayViewingWindow[],
  nowUtcMs: number,
  horizonMs: number,
): MilkyWayViewingWindow | null {
  const until = nowUtcMs + horizonMs;
  let best: MilkyWayViewingWindow | null = null;
  for (const w of windows) {
    if (!(w.startUtcMs > nowUtcMs && w.startUtcMs <= until)) {
      continue;
    }
    if (!best) {
      best = w;
      continue;
    }
    const rank = milkyWayViewingLevelRank(w.level);
    const bestRank = milkyWayViewingLevelRank(best.level);
    if (rank > bestRank || (rank === bestRank && w.startUtcMs < best.startUtcMs)) {
      best = w;
    }
  }
  return best;
}

function windowsForLabel(args: {
  readonly observer: MilkyWayViewingObserver;
  readonly nowUtcMs: number;
  readonly levels: readonly MilkyWayViewingLevel[];
  readonly horizonMs: number;
}): readonly MilkyWayViewingWindow[] {
  const bucket = Math.floor(args.nowUtcMs / LABEL_BUCKET_MS);
  const key = [
    args.observer.cityId,
    args.observer.latitudeDeg.toFixed(4),
    args.observer.longitudeDeg.toFixed(4),
    String(bucket),
    args.levels.join(","),
    String(args.horizonMs),
  ].join("|");
  if (labelCache && labelCache.key === key) {
    return labelCache.windows;
  }
  const listed = listMilkyWayViewingWindows({
    observer: args.observer,
    startUtcMs: args.nowUtcMs - LOOKUP_PAD_MS,
    endUtcMs: args.nowUtcMs + Math.max(args.horizonMs, LOOKUP_PAD_MS) + LOOKUP_PAD_MS,
    levels: args.levels,
  });
  labelCache = { key, windows: listed.windows };
  return listed.windows;
}

export function resolveMilkyWayEventMapLabel(args: {
  readonly presentation: MilkyWayPresentation;
  readonly observer: MilkyWayViewingObserver | null;
  readonly cityName: string;
  readonly productUtcMs: number;
}): MilkyWayEventMapLabel | null {
  const pres = args.presentation;
  if (!pres.viewingEventsEnabled || !pres.showViewingEventLabels) {
    return null;
  }
  if (!args.observer || !args.cityName.trim()) {
    return null;
  }
  const levels = milkyWayEnabledViewingLevels(pres);
  if (levels.length === 0) {
    return null;
  }
  const horizonMs = milkyWayEventLabelHorizonMs(pres.eventLabelAdvanceHorizonId);
  const windows = windowsForLabel({
    observer: args.observer,
    nowUtcMs: args.productUtcMs,
    levels,
    horizonMs,
  });
  const active = windowContainingUtc(windows, args.productUtcMs);
  const chosen = active ?? (horizonMs > 0 ? pickUpcoming(windows, args.productUtcMs, horizonMs) : null);
  if (!chosen) {
    return null;
  }
  const lifecycle: MilkyWayEventLabelLifecycle = active ? "active" : "upcoming";
  const relative =
    lifecycle === "upcoming" ? formatEclipseRelativeTime(args.productUtcMs, chosen.startUtcMs) : null;
  const sub = galacticCenterSubpointAt(args.productUtcMs);
  if (!sub) {
    return null;
  }
  return {
    text: formatMilkyWayEventLabelText({
      cityName: args.cityName,
      level: chosen.level,
      lifecycle,
      relative,
    }),
    latDeg: sub.latDeg,
    lonDeg: sub.lonDeg,
    lifecycle,
    level: chosen.level,
    cityName: args.cityName,
  };
}
