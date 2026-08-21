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
 * Milky Way Viewing Window map-label presentation. Consumes ADR 0021 windows;
 * does not redefine thresholds. One label: active selected window, else the
 * next window within the advance horizon.
 */

import {
  milkyWayEventLabelHorizonMs,
  type MilkyWayPresentation,
} from "./milkyWayPresentation";
import { formatMilkyWayViewingRelativePhrase } from "./milkyWayViewingStatus";
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
  readonly cityName: string;
  readonly windowId: string;
  readonly peakUtcMs: number;
};

type CacheEntry = {
  readonly key: string;
  readonly windows: readonly MilkyWayViewingWindow[];
};

let labelCache: CacheEntry | null = null;

export function resetMilkyWayEventLabelCacheForTests(): void {
  labelCache = null;
}

export function formatMilkyWayEventLabelText(args: {
  readonly cityName: string;
  readonly lifecycle: MilkyWayEventLabelLifecycle;
  readonly relative: string | null;
}): string {
  const city = args.cityName.trim();
  if (args.lifecycle === "active") {
    const compact = `${city} · MW viewing`;
    const full = `${city} · Milky Way viewing`;
    return full.length > 36 ? compact : full;
  }
  const rel = args.relative && args.relative !== "now" ? args.relative : null;
  const full = rel ? `${city} · Milky Way · ${rel}` : `${city} · Milky Way`;
  if (full.length > 40) {
    return rel ? `${city} · MW viewing · ${rel}` : `${city} · MW viewing`;
  }
  return full;
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
    if (!best || w.startUtcMs < best.startUtcMs) {
      best = w;
    }
  }
  return best;
}

function windowsForLabel(args: {
  readonly observer: MilkyWayViewingObserver;
  readonly nowUtcMs: number;
  readonly horizonMs: number;
}): readonly MilkyWayViewingWindow[] {
  const bucket = Math.floor(args.nowUtcMs / LABEL_BUCKET_MS);
  const key = [
    args.observer.cityId,
    args.observer.latitudeDeg.toFixed(4),
    args.observer.longitudeDeg.toFixed(4),
    String(bucket),
    String(args.horizonMs),
  ].join("|");
  if (labelCache && labelCache.key === key) {
    return labelCache.windows;
  }
  const listed = listMilkyWayViewingWindows({
    observer: args.observer,
    startUtcMs: args.nowUtcMs - LOOKUP_PAD_MS,
    endUtcMs: args.nowUtcMs + Math.max(args.horizonMs, LOOKUP_PAD_MS) + LOOKUP_PAD_MS,
  });
  labelCache = { key, windows: listed.windows };
  return listed.windows;
}

export function resolvePresentedMilkyWayWindow(args: {
  readonly presentation: MilkyWayPresentation;
  readonly observer: MilkyWayViewingObserver | null;
  readonly productUtcMs: number;
}): { window: MilkyWayViewingWindow; lifecycle: MilkyWayEventLabelLifecycle } | null {
  const pres = args.presentation;
  if (!pres.viewingEventsEnabled) {
    return null;
  }
  if (!args.observer) {
    return null;
  }
  const horizonMs = milkyWayEventLabelHorizonMs(pres.eventLabelAdvanceHorizonId);
  const windows = windowsForLabel({
    observer: args.observer,
    nowUtcMs: args.productUtcMs,
    horizonMs,
  });
  const active = windowContainingUtc(windows, args.productUtcMs);
  const chosen = active ?? (horizonMs > 0 ? pickUpcoming(windows, args.productUtcMs, horizonMs) : null);
  if (!chosen) {
    return null;
  }
  return { window: chosen, lifecycle: active ? "active" : "upcoming" };
}

export function resolveMilkyWayEventMapLabel(args: {
  readonly presentation: MilkyWayPresentation;
  readonly observer: MilkyWayViewingObserver | null;
  readonly cityName: string;
  readonly productUtcMs: number;
  readonly timeZone?: string;
}): MilkyWayEventMapLabel | null {
  const pres = args.presentation;
  if (!pres.showViewingEventLabels) {
    return null;
  }
  if (!args.cityName.trim()) {
    return null;
  }
  const presented = resolvePresentedMilkyWayWindow(args);
  if (!presented) {
    return null;
  }
  const { window: chosen, lifecycle } = presented;
  const relative =
    lifecycle === "upcoming"
      ? formatMilkyWayViewingRelativePhrase(
          args.productUtcMs,
          chosen.startUtcMs,
          args.timeZone ?? "UTC",
        )
      : null;
  const sub = galacticCenterSubpointAt(args.productUtcMs);
  if (!sub) {
    return null;
  }
  return {
    text: formatMilkyWayEventLabelText({
      cityName: args.cityName,
      lifecycle,
      relative,
    }),
    latDeg: sub.latDeg,
    lonDeg: sub.lonDeg,
    lifecycle,
    cityName: args.cityName,
    windowId: chosen.id,
    peakUtcMs: chosen.peakUtcMs,
  };
}
