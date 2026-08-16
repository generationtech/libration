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
 * Product event-information view model. Formats from EclipseFrame + filters.
 * Domain times stay UTC. Does not invent events or fall back to ambient astronomy.
 */

import {
  ECLIPSE_AUTHORITY_UNAVAILABLE_COPY,
  formatEclipseCalendarDate,
  formatEclipseRelativeTime,
  formatEclipseUtcClock,
  lunarEclipseTypeTitle,
  solarCentralPathLabel,
  solarEclipseTypeTitle,
} from "./eclipseEventCopy";
import type { EclipseInfoPresentation } from "./eclipseInfoAppearance";
import type { LunarEclipsePresentation } from "./lunarEclipseAppearance";
import {
  presentedActiveLunar,
  presentedActiveSolar,
  presentedForecastSelections,
  presentedPrimaryEclipse,
  presentedPrimarySolar,
  presentedUpcomingLunar,
  presentedUpcomingSolar,
} from "./eclipsePresentedEvents";
import type { SolarEclipsePresentation } from "./solarEclipseAppearance";
import type { EclipseFrame, SolarEclipseEvent } from "./solarEclipseTypes";
import type { LunarEclipseEvent, LunarEclipseLiveGeometry } from "./lunarEclipseTypes";
import type { ReferenceCityEclipseCircumstances } from "./referenceCityEclipseTypes";

export type EclipseEventInformationRow = {
  readonly label: string;
  readonly value: string;
};

export type EclipseLegendItem = {
  readonly id: string;
  readonly label: string;
};

export type EclipseEventInformationView = {
  readonly unsupported: boolean;
  readonly unsupportedCopy: string | null;
  readonly title: string | null;
  readonly lifecycle: "upcoming" | "active" | null;
  readonly kind: "solar" | "lunar" | null;
  readonly relativeTime: string | null;
  readonly upcomingCount: number;
  readonly rows: readonly EclipseEventInformationRow[];
  readonly legend: readonly EclipseLegendItem[];
  readonly circumstances: ReferenceCityEclipseCircumstances | null;
};

export type BuildEclipseEventInformationInput = {
  readonly frame: EclipseFrame | null;
  readonly solarEnabled: boolean;
  readonly lunarEnabled: boolean;
  readonly solar: SolarEclipsePresentation;
  readonly lunar: LunarEclipsePresentation;
  readonly info: EclipseInfoPresentation;
  readonly circumstances: ReferenceCityEclipseCircumstances | null;
};

function lunarPhaseCopy(geom: LunarEclipseLiveGeometry | null): string | null {
  if (!geom) {
    return null;
  }
  if (geom.phase === "total-umbral") {
    return "Total";
  }
  if (geom.phase === "partial-umbral") {
    return "Partial umbral";
  }
  if (geom.phase === "penumbral") {
    return "Penumbral";
  }
  return null;
}

function solarRows(event: SolarEclipseEvent, frame: EclipseFrame, upcoming: boolean): EclipseEventInformationRow[] {
  const rows: EclipseEventInformationRow[] = [
    { label: "Event", value: solarEclipseTypeTitle(event.subtype) },
    { label: "Date", value: formatEclipseCalendarDate(event) },
    { label: "Greatest eclipse", value: formatEclipseUtcClock(event.greatestEclipseUtcMs) },
    { label: "Lifecycle", value: upcoming ? "Upcoming" : "Active" },
  ];
  if (upcoming) {
    const relative = formatEclipseRelativeTime(frame.productUtcMs, event.globalStartMs);
    if (relative) {
      rows.push({ label: "Time until event", value: relative });
    }
    rows.push({ label: "Forecast path", value: solarCentralPathLabel(event.subtype) });
  } else {
    const geom = frame.solarGeometry;
    const shadow =
      geom?.centralShadowKind === "antumbra"
        ? "Annularity (central shadow)"
        : geom?.centralShadowKind === "umbra"
          ? "Totality (central shadow)"
          : "Partial";
    rows.push({ label: "Current shadow", value: shadow });
  }
  return rows;
}

function lunarRows(
  event: LunarEclipseEvent,
  frame: EclipseFrame,
  upcoming: boolean,
): EclipseEventInformationRow[] {
  const rows: EclipseEventInformationRow[] = [
    { label: "Event", value: lunarEclipseTypeTitle(event.subtype) },
    { label: "Date", value: formatEclipseCalendarDate(event) },
    { label: "Greatest eclipse", value: formatEclipseUtcClock(event.greatestEclipseUtcMs) },
    { label: "Lifecycle", value: upcoming ? "Upcoming" : "Active" },
  ];
  if (upcoming) {
    const relative = formatEclipseRelativeTime(frame.productUtcMs, event.globalStartMs);
    if (relative) {
      rows.push({ label: "Time until event", value: relative });
    }
    rows.push({
      label: "Forecast Moon-visible region",
      value: "Where the Moon is above the geometric horizon at greatest eclipse",
    });
  } else {
    const phase = lunarPhaseCopy(frame.lunarGeometry);
    if (phase) {
      rows.push({ label: "Current phase", value: phase });
    }
  }
  rows.push({ label: "Penumbral magnitude", value: event.penumbralMagnitude.toFixed(3) });
  rows.push({ label: "Umbral magnitude", value: event.umbralMagnitude.toFixed(3) });
  if (!upcoming) {
    rows.push({
      label: "Moon-visible region",
      value: "Where the eclipsed Moon is above the geometric horizon",
    });
  }
  return rows;
}

function solarLegend(args: {
  upcoming: boolean;
  active: boolean;
  annular: boolean;
  alignment: boolean;
}): EclipseLegendItem[] {
  const items: EclipseLegendItem[] = [];
  if (args.upcoming) {
    items.push({
      id: "forecast-path",
      label: args.annular ? "Forecast path of annularity" : "Forecast path",
    });
    items.push({ id: "forecast-partial", label: "Forecast partial visibility" });
  }
  if (args.active) {
    items.push({
      id: "live-central",
      label: args.annular ? "Live path of annularity" : "Live central shadow",
    });
    items.push({ id: "live-partial", label: "Partial visibility" });
    if (args.alignment) {
      items.push({ id: "alignment", label: "Alignment" });
    }
  }
  return items;
}

function lunarLegend(upcoming: boolean): EclipseLegendItem[] {
  if (upcoming) {
    return [
      { id: "forecast-moon-visible", label: "Forecast Moon-visible region at greatest eclipse" },
      { id: "forecast-lunar-horizon", label: "Forecast boundary: geometric lunar horizon at GE" },
    ];
  }
  return [
    { id: "moon-visible", label: "Moon-visible region" },
    { id: "lunar-horizon", label: "Boundary: geometric lunar horizon" },
    { id: "alignment", label: "Alignment" },
  ];
}

export function buildEclipseEventInformation(
  input: BuildEclipseEventInformationInput,
): EclipseEventInformationView {
  const empty: EclipseEventInformationView = {
    unsupported: false,
    unsupportedCopy: null,
    title: null,
    lifecycle: null,
    kind: null,
    relativeTime: null,
    upcomingCount: 0,
    rows: [],
    legend: [],
    circumstances: null,
  };
  const featuresOn = input.solarEnabled || input.lunarEnabled;
  if (!featuresOn || !input.frame) {
    return empty;
  }
  if (!input.frame.support.supported) {
    return {
      ...empty,
      unsupported: true,
      unsupportedCopy: ECLIPSE_AUTHORITY_UNAVAILABLE_COPY,
    };
  }

  const activeSolar = input.solarEnabled ? presentedActiveSolar(input.frame, input.solar) : null;
  const upcomingSolar = input.solarEnabled ? presentedUpcomingSolar(input.frame, input.solar) : [];
  const primarySolar = input.solarEnabled ? presentedPrimarySolar(input.frame, input.solar) : null;
  const activeLunar = input.lunarEnabled ? presentedActiveLunar(input.frame, input.lunar) : null;
  const upcomingLunar = input.lunarEnabled ? presentedUpcomingLunar(input.frame, input.lunar) : [];
  const presentedSelections = input.solarEnabled
    ? presentedForecastSelections(input.frame, input.solar)
    : [];
  const primary = presentedPrimaryEclipse(
    input.frame,
    input.solarEnabled ? input.solar : { ...input.solar, showTypeTotal: false, showTypeAnnular: false, showTypePartial: false, showTypeHybrid: false },
    input.lunarEnabled ? input.lunar : { ...input.lunar, showTypeTotal: false, showTypePartial: false, showTypePenumbral: false },
  );

  const circumstancesEventId = input.circumstances?.globalSolarEventId ?? null;
  const circumstancesLunarId = input.circumstances?.globalLunarEventId ?? null;
  const showCircumstances = Boolean(
    input.circumstances &&
      ((circumstancesEventId &&
        (primarySolar?.id === circumstancesEventId ||
          activeSolar?.id === circumstancesEventId ||
          (primary?.kind === "solar" && primary.event.id === circumstancesEventId))) ||
        (circumstancesLunarId &&
          (activeLunar?.id === circumstancesLunarId ||
            (primary?.kind === "lunar" && primary.event.id === circumstancesLunarId)))),
  );

  if (primary?.kind === "solar" && primary.lifecycle === "active" && activeSolar) {
    return {
      unsupported: false,
      unsupportedCopy: null,
      title: solarEclipseTypeTitle(activeSolar.subtype),
      lifecycle: "active",
      kind: "solar",
      relativeTime: null,
      upcomingCount: upcomingSolar.length + upcomingLunar.length,
      rows: solarRows(activeSolar, input.frame, false),
      legend: solarLegend({
        upcoming: presentedSelections.some((s) => s.lifecycle === "active" || s.lifecycle === "upcoming"),
        active: true,
        annular: activeSolar.subtype === "annular",
        alignment: true,
      }),
      circumstances: showCircumstances ? input.circumstances : null,
    };
  }

  if (primary?.kind === "lunar" && primary.lifecycle === "active" && activeLunar) {
    return {
      unsupported: false,
      unsupportedCopy: null,
      title: lunarEclipseTypeTitle(activeLunar.subtype),
      lifecycle: "active",
      kind: "lunar",
      relativeTime: null,
      upcomingCount: upcomingSolar.length + upcomingLunar.length,
      rows: lunarRows(activeLunar, input.frame, false),
      legend: lunarLegend(false),
      circumstances: showCircumstances ? input.circumstances : null,
    };
  }

  if (primary?.kind === "solar" && primarySolar) {
    const relative = formatEclipseRelativeTime(input.frame.productUtcMs, primarySolar.globalStartMs);
    return {
      unsupported: false,
      unsupportedCopy: null,
      title: solarEclipseTypeTitle(primarySolar.subtype),
      lifecycle: "upcoming",
      kind: "solar",
      relativeTime: relative || null,
      upcomingCount: upcomingSolar.length + upcomingLunar.length,
      rows: solarRows(primarySolar, input.frame, true),
      legend: solarLegend({
        upcoming: true,
        active: false,
        annular: primarySolar.subtype === "annular",
        alignment: false,
      }),
      circumstances: showCircumstances ? input.circumstances : null,
    };
  }

  if (primary?.kind === "lunar") {
    const relative = formatEclipseRelativeTime(input.frame.productUtcMs, primary.event.globalStartMs);
    return {
      unsupported: false,
      unsupportedCopy: null,
      title: lunarEclipseTypeTitle(primary.event.subtype),
      lifecycle: "upcoming",
      kind: "lunar",
      relativeTime: relative || null,
      upcomingCount: upcomingSolar.length + upcomingLunar.length,
      rows: lunarRows(primary.event, input.frame, true),
      legend: lunarLegend(true),
      circumstances: showCircumstances ? input.circumstances : null,
    };
  }

  return empty;
}
