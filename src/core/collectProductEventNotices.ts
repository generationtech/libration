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
 * Collect HUD event-notice candidates from existing domain authorities.
 * Presentation arbitration only. Independent of Data event-playback filters.
 */

import {
  buildLunarEclipsePresentationState,
  buildSolarEclipsePresentationState,
  type BuildEclipsePresentationStateInput,
} from "./eclipse/eclipsePresentationState";
import { formatEclipseHudStatus } from "./referenceCityEclipseStatus";
import { arbitrateEventNotices, type EventNotice, type EventNoticeStack } from "./eventNotices";
import { resolvePresentedMilkyWayWindow } from "./milkyWayEventLabel";
import type { MilkyWayPresentation } from "./milkyWayPresentation";
import { formatMilkyWayViewingNoticeText } from "./milkyWayViewingStatus";
import type { MilkyWayViewingObserver } from "./milkyWayViewingWindows";
import type { DisplayTimeMode } from "./chromeTimeDomain";

export function collectProductEventNotices(args: {
  readonly eclipseInput: BuildEclipsePresentationStateInput;
  readonly chromeStatusEnabled: boolean;
  readonly eclipseUnsupported: boolean;
  readonly timeZone: string;
  readonly displayTimeMode: DisplayTimeMode;
  readonly milkyWayPresentation: MilkyWayPresentation;
  readonly milkyWayObserver: MilkyWayViewingObserver | null;
  readonly productUtcMs: number;
}): EventNoticeStack {
  const candidates: EventNotice[] = [];
  if (args.chromeStatusEnabled && args.eclipseUnsupported) {
    candidates.push({
      id: "eclipse-unsupported",
      family: "solarEclipse",
      lifecycle: "upcoming",
      startUtcMs: args.productUtcMs,
      endUtcMs: null,
      text: "Eclipse data unavailable outside 1900–2100.",
      sortTimeUtcMs: args.productUtcMs,
    });
  } else if (args.chromeStatusEnabled) {
    const solar = buildSolarEclipsePresentationState(args.eclipseInput);
    const solarText = formatEclipseHudStatus(solar, args.timeZone, args.displayTimeMode);
    if (solar && solarText) {
      candidates.push({
        id: `solar:${solar.eventId}`,
        family: "solarEclipse",
        lifecycle: solar.lifecycle,
        startUtcMs: solar.startUtcMs,
        endUtcMs: null,
        text: solarText,
        sortTimeUtcMs: solar.startUtcMs,
      });
    }
    const lunar = buildLunarEclipsePresentationState(args.eclipseInput);
    const lunarText = formatEclipseHudStatus(lunar, args.timeZone, args.displayTimeMode);
    if (lunar && lunarText) {
      candidates.push({
        id: `lunar:${lunar.eventId}`,
        family: "lunarEclipse",
        lifecycle: lunar.lifecycle,
        startUtcMs: lunar.startUtcMs,
        endUtcMs: null,
        text: lunarText,
        sortTimeUtcMs: lunar.startUtcMs,
      });
    }
  }

  const presented = resolvePresentedMilkyWayWindow({
    presentation: args.milkyWayPresentation,
    observer: args.milkyWayObserver,
    productUtcMs: args.productUtcMs,
  });
  if (presented) {
    const text = formatMilkyWayViewingNoticeText(
      presented.window,
      args.productUtcMs,
      args.timeZone,
    );
    candidates.push({
      id: presented.window.id,
      family: "milkyWay",
      lifecycle: presented.lifecycle,
      startUtcMs: presented.window.startUtcMs,
      endUtcMs: presented.window.endUtcMs,
      sortTimeUtcMs: presented.window.startUtcMs,
      text,
    });
  }

  return arbitrateEventNotices(candidates);
}
