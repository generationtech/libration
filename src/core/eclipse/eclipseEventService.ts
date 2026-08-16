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

import {
  activeLunarEclipseAt,
  activeSolarEclipseAt,
  eclipseAuthoritySupport,
  SOLAR_ECLIPSE_AUTHORITY_METADATA,
  solarEclipsesUpcomingInHorizon,
} from "./eclipseAuthority";
import { lunarEclipseGeometryAt } from "./lunarEclipseGeometry";
import { solarEclipseEventForecastGeometry } from "./solarEclipseCorridor";
import { solarEclipseGeometryAt } from "./solarEclipseGeometry";
import type {
  EclipseForecastCoverage,
  EclipseFrame,
  SolarEclipseEvent,
  SolarEclipseForecastSelection,
} from "./solarEclipseTypes";

let cached: EclipseFrame | null = null;

export type ResolveEclipseFrameOptions = {
  readonly horizonMs?: number;
};

function clipForecastCoverage(utcMs: number, horizonMs: number): EclipseForecastCoverage {
  const { startMs: authStart, endMs: authEnd } = SOLAR_ECLIPSE_AUTHORITY_METADATA.supportedUtcRange;
  const requestedStartMs = utcMs;
  const requestedEndMs = utcMs + Math.max(0, horizonMs);
  if (horizonMs <= 0) {
    return {
      requestedStartMs,
      requestedEndMs,
      queryStartMs: utcMs,
      queryEndMs: utcMs,
      truncated: false,
    };
  }
  const queryStartMs = Math.max(requestedStartMs, authStart);
  const queryEndMs = Math.min(requestedEndMs, authEnd);
  const truncated = requestedStartMs < authStart || requestedEndMs > authEnd;
  if (queryEndMs <= queryStartMs) {
    return {
      requestedStartMs,
      requestedEndMs,
      queryStartMs,
      queryEndMs: queryStartMs,
      truncated: true,
    };
  }
  return {
    requestedStartMs,
    requestedEndMs,
    queryStartMs,
    queryEndMs,
    truncated,
  };
}

function prominence01(args: {
  lifecycle: "upcoming" | "active";
  msUntilStart: number;
  horizonMs: number;
  nearestUpcoming: boolean;
}): number {
  if (args.lifecycle === "active") {
    return 1;
  }
  if (!(args.horizonMs > 0)) {
    return 0;
  }
  const u = Math.max(0, Math.min(1, args.msUntilStart / args.horizonMs));
  const approach = 0.7 + 0.3 * (1 - u);
  return args.nearestUpcoming ? approach : approach * 0.5;
}

function buildForecastSelections(
  utcMs: number,
  horizonMs: number,
  coverage: EclipseForecastCoverage,
  activeSolar: SolarEclipseEvent | null,
): {
  upcomingSolar: SolarEclipseEvent[];
  forecastSelections: SolarEclipseForecastSelection[];
} {
  if (horizonMs <= 0 || coverage.queryEndMs <= coverage.queryStartMs) {
    return { upcomingSolar: [], forecastSelections: [] };
  }
  const { startMs: authStart, endMs: authEnd } = SOLAR_ECLIPSE_AUTHORITY_METADATA.supportedUtcRange;
  const upcomingSolar = solarEclipsesUpcomingInHorizon(utcMs, horizonMs).filter(
    (e) =>
      e.globalStartMs >= authStart &&
      e.globalStartMs < authEnd &&
      e.globalStartMs >= coverage.queryStartMs &&
      e.globalStartMs <= coverage.queryEndMs,
  );
  const nearestId = upcomingSolar[0]?.id;
  const selections: SolarEclipseForecastSelection[] = [];
  if (activeSolar) {
    selections.push({
      event: activeSolar,
      lifecycle: "active",
      nearestUpcoming: false,
      prominence01: prominence01({
        lifecycle: "active",
        msUntilStart: 0,
        horizonMs,
        nearestUpcoming: false,
      }),
      geometry: solarEclipseEventForecastGeometry(activeSolar),
    });
  }
  for (const event of upcomingSolar) {
    selections.push({
      event,
      lifecycle: "upcoming",
      nearestUpcoming: event.id === nearestId,
      prominence01: prominence01({
        lifecycle: "upcoming",
        msUntilStart: event.globalStartMs - utcMs,
        horizonMs,
        nearestUpcoming: event.id === nearestId,
      }),
      geometry: solarEclipseEventForecastGeometry(event),
    });
  }
  return { upcomingSolar, forecastSelections: selections };
}

export function resolveEclipseFrame(
  utcMs: number,
  options?: ResolveEclipseFrameOptions,
): EclipseFrame {
  const horizonMs = Math.max(0, options?.horizonMs ?? 0);
  if (cached && cached.productUtcMs === utcMs && cached.horizonMs === horizonMs) {
    return cached;
  }
  const support = eclipseAuthoritySupport(utcMs);
  const forecastCoverage = clipForecastCoverage(utcMs, horizonMs);
  const activeSolar = support.supported ? activeSolarEclipseAt(utcMs) : null;
  const activeLunar = support.supported ? activeLunarEclipseAt(utcMs) : null;
  const { upcomingSolar, forecastSelections } = buildForecastSelections(
    utcMs,
    horizonMs,
    forecastCoverage,
    activeSolar,
  );
  cached = {
    support,
    productUtcMs: utcMs,
    horizonMs,
    forecastCoverage,
    activeSolar,
    solarGeometry: activeSolar ? solarEclipseGeometryAt(activeSolar, utcMs) : null,
    upcomingSolar,
    forecastSelections,
    activeLunar,
    lunarGeometry: activeLunar ? lunarEclipseGeometryAt(activeLunar, utcMs) : null,
  };
  return cached;
}

export function resetEclipseEventServiceCacheForTests(): void {
  cached = null;
}
