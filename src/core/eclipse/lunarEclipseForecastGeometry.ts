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
 * Representative lunar-eclipse forecast geography: the Moon-above-horizon
 * region at greatest eclipse. Reuses E3 horizon construction. Not a path of
 * totality and not visibility for every contact. Map presentation no longer
 * draws this frozen GE hemisphere (LIB-044); placard copy may still describe it.
 */

import { LUNAR_ECLIPSE_AUTHORITY_METADATA } from "./eclipseAuthority";
import type { LunarEclipseEvent, LunarEclipseEventForecastGeometry } from "./lunarEclipseTypes";
import {
  lunarVisibilityPolarCloseLatDeg,
  lunarVisibilityRegionRing,
} from "./lunarVisibilityGeometry";

export const LUNAR_FORECAST_VISIBILITY_ALGORITHM_ID = "lunar-forecast-visibility-v1";

const forecastCache = new Map<string, LunarEclipseEventForecastGeometry>();

function cacheKey(eventId: string): string {
  return `${LUNAR_ECLIPSE_AUTHORITY_METADATA.authorityVersion}|${LUNAR_FORECAST_VISIBILITY_ALGORITHM_ID}|${eventId}`;
}

export function lunarEclipseEventForecastGeometry(
  event: LunarEclipseEvent,
): LunarEclipseEventForecastGeometry {
  const key = cacheKey(event.id);
  const hit = forecastCache.get(key);
  if (hit) {
    return hit;
  }
  const moonVisibleRegion = lunarVisibilityRegionRing(event.zenithLatDeg, event.zenithLonDeg);
  const geometry: LunarEclipseEventForecastGeometry = {
    eventId: event.id,
    authorityVersion: LUNAR_ECLIPSE_AUTHORITY_METADATA.authorityVersion,
    algorithmId: LUNAR_FORECAST_VISIBILITY_ALGORITHM_ID,
    subtype: event.subtype,
    zenithLatDeg: event.zenithLatDeg,
    zenithLonDeg: event.zenithLonDeg,
    moonVisibleRegion,
    polarCloseLatDeg: lunarVisibilityPolarCloseLatDeg(event.zenithLatDeg),
  };
  forecastCache.set(key, geometry);
  return geometry;
}

export function resetLunarEclipseForecastGeometryCacheForTests(): void {
  forecastCache.clear();
}
