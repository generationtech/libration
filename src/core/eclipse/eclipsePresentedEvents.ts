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
import type { LunarEclipseEvent } from "./lunarEclipseTypes";

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

export function presentedPrimarySolar(
  frame: EclipseFrame,
  solar: SolarEclipsePresentation,
): SolarEclipseEvent | null {
  return presentedActiveSolar(frame, solar) ?? presentedUpcomingSolar(frame, solar)[0] ?? null;
}
