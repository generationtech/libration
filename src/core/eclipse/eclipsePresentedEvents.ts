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
 * Presentation-only event selection. Does not alter EclipseFrame or authority truth.
 */

import { lunarEclipseTypeVisible, type LunarEclipsePresentation } from "./lunarEclipseAppearance";
import { solarEclipseTypeVisible, type SolarEclipsePresentation } from "./solarEclipseAppearance";
import type {
  EclipseFrame,
  SolarEclipseEvent,
  SolarEclipseForecastSelection,
} from "./solarEclipseTypes";
import type { LunarEclipseEvent, LunarEclipseForecastSelection } from "./lunarEclipseTypes";

export function presentedForecastSelections(
  frame: EclipseFrame,
  solar: SolarEclipsePresentation,
): readonly SolarEclipseForecastSelection[] {
  return frame.forecastSelections.filter((selection) =>
    solarEclipseTypeVisible(selection.event.subtype, solar),
  );
}

export function presentedUpcomingSolar(
  frame: EclipseFrame,
  solar: SolarEclipsePresentation,
): readonly SolarEclipseEvent[] {
  return frame.upcomingSolar.filter((event) => solarEclipseTypeVisible(event.subtype, solar));
}

export function presentedActiveSolar(
  frame: EclipseFrame,
  solar: SolarEclipsePresentation,
): SolarEclipseEvent | null {
  const event = frame.activeSolar;
  if (!event || !solarEclipseTypeVisible(event.subtype, solar)) {
    return null;
  }
  return event;
}

export function presentedActiveLunar(
  frame: EclipseFrame,
  lunar: LunarEclipsePresentation,
): LunarEclipseEvent | null {
  const event = frame.activeLunar;
  if (!event || !lunarEclipseTypeVisible(event.subtype, lunar)) {
    return null;
  }
  return event;
}

export function presentedUpcomingLunar(
  frame: EclipseFrame,
  lunar: LunarEclipsePresentation,
): readonly LunarEclipseEvent[] {
  return frame.upcomingLunar.filter((event) => lunarEclipseTypeVisible(event.subtype, lunar));
}

export function presentedLunarForecastSelections(
  frame: EclipseFrame,
  lunar: LunarEclipsePresentation,
): readonly LunarEclipseForecastSelection[] {
  return frame.lunarForecastSelections.filter((selection) =>
    lunarEclipseTypeVisible(selection.event.subtype, lunar),
  );
}

export function presentedPrimarySolar(
  frame: EclipseFrame,
  solar: SolarEclipsePresentation,
): SolarEclipseEvent | null {
  return presentedActiveSolar(frame, solar) ?? presentedUpcomingSolar(frame, solar)[0] ?? null;
}

export function presentedPrimaryLunar(
  frame: EclipseFrame,
  lunar: LunarEclipsePresentation,
): LunarEclipseEvent | null {
  return presentedActiveLunar(frame, lunar) ?? presentedUpcomingLunar(frame, lunar)[0] ?? null;
}

export type PresentedPrimaryEclipse =
  | { readonly kind: "solar"; readonly event: SolarEclipseEvent; readonly lifecycle: "upcoming" | "active" }
  | { readonly kind: "lunar"; readonly event: LunarEclipseEvent; readonly lifecycle: "upcoming" | "active" };

/**
 * One primary presented event for labels and event information.
 * Active solar, then active lunar, then the nearest upcoming of either kind.
 */
export function presentedPrimaryEclipse(
  frame: EclipseFrame,
  solar: SolarEclipsePresentation,
  lunar: LunarEclipsePresentation,
): PresentedPrimaryEclipse | null {
  const activeSolar = presentedActiveSolar(frame, solar);
  if (activeSolar) {
    return { kind: "solar", event: activeSolar, lifecycle: "active" };
  }
  const activeLunar = presentedActiveLunar(frame, lunar);
  if (activeLunar) {
    return { kind: "lunar", event: activeLunar, lifecycle: "active" };
  }
  const upcomingSolar = presentedUpcomingSolar(frame, solar)[0];
  const upcomingLunar = presentedUpcomingLunar(frame, lunar)[0];
  if (upcomingSolar && upcomingLunar) {
    return upcomingSolar.globalStartMs <= upcomingLunar.globalStartMs
      ? { kind: "solar", event: upcomingSolar, lifecycle: "upcoming" }
      : { kind: "lunar", event: upcomingLunar, lifecycle: "upcoming" };
  }
  if (upcomingSolar) {
    return { kind: "solar", event: upcomingSolar, lifecycle: "upcoming" };
  }
  if (upcomingLunar) {
    return { kind: "lunar", event: upcomingLunar, lifecycle: "upcoming" };
  }
  return null;
}
