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
 * Observer-derived eclipse circumstances. Never filters EclipseEvent existence
 * or global solar/lunar geography. Cached by event id + authority version +
 * observer lat/lon. Product time only selects which event is relevant.
 */

import type { ReferenceCityObserverLocation } from "../referenceCityObserver";
import {
  LUNAR_ECLIPSE_AUTHORITY_METADATA,
  SOLAR_ECLIPSE_AUTHORITY_METADATA,
} from "./eclipseAuthority";
import { solveLunarLocalCircumstances } from "./lunarLocalCircumstances";
import type { ReferenceCityEclipseCircumstances } from "./referenceCityEclipseTypes";
import type { EclipseFrame, SolarEclipseEvent } from "./solarEclipseTypes";
import type { LunarEclipseEvent } from "./lunarEclipseTypes";
import { solveSolarLocalCircumstances } from "./solarLocalCircumstances";
import type { SolarLocalCircumstances } from "./referenceCityEclipseTypes";
import type { LunarLocalCircumstances } from "./referenceCityEclipseTypes";

const solarCache = new Map<string, SolarLocalCircumstances>();
const lunarCache = new Map<string, LunarLocalCircumstances>();

function coordKey(latDeg: number, lonDeg: number): string {
  return `${latDeg.toFixed(5)},${lonDeg.toFixed(5)}`;
}

function solarCacheKey(eventId: string, latDeg: number, lonDeg: number): string {
  return `${SOLAR_ECLIPSE_AUTHORITY_METADATA.authorityVersion}|${eventId}|${coordKey(latDeg, lonDeg)}`;
}

function lunarCacheKey(eventId: string, latDeg: number, lonDeg: number): string {
  return `${LUNAR_ECLIPSE_AUTHORITY_METADATA.authorityVersion}|${eventId}|${coordKey(latDeg, lonDeg)}`;
}

export function solarLocalCircumstancesForObserver(
  event: SolarEclipseEvent,
  latitudeDeg: number,
  longitudeDeg: number,
): SolarLocalCircumstances {
  const key = solarCacheKey(event.id, latitudeDeg, longitudeDeg);
  const hit = solarCache.get(key);
  if (hit) {
    return hit;
  }
  const solved = solveSolarLocalCircumstances(event, latitudeDeg, longitudeDeg);
  solarCache.set(key, solved);
  return solved;
}

export function lunarLocalCircumstancesForObserver(
  event: LunarEclipseEvent,
  latitudeDeg: number,
  longitudeDeg: number,
): LunarLocalCircumstances {
  const key = lunarCacheKey(event.id, latitudeDeg, longitudeDeg);
  const hit = lunarCache.get(key);
  if (hit) {
    return hit;
  }
  const solved = solveLunarLocalCircumstances(event, latitudeDeg, longitudeDeg);
  lunarCache.set(key, solved);
  return solved;
}

function primarySolarEvent(frame: EclipseFrame): SolarEclipseEvent | null {
  if (frame.activeSolar) {
    return frame.activeSolar;
  }
  const nearest = frame.forecastSelections.find((s) => s.lifecycle === "upcoming" && s.nearestUpcoming);
  return nearest?.event ?? frame.upcomingSolar[0] ?? null;
}

function primaryLunarEvent(frame: EclipseFrame): LunarEclipseEvent | null {
  if (frame.activeLunar) {
    return frame.activeLunar;
  }
  const nearest = frame.lunarForecastSelections.find(
    (s) => s.lifecycle === "upcoming" && s.nearestUpcoming,
  );
  return nearest?.event ?? frame.upcomingLunar[0] ?? null;
}

/**
 * Derived observer view. Returns null when no concrete catalog-city observer
 * exists (auto, fixed longitude, unknown city). Does not invent a city.
 * Global frame fields are read, never rewritten.
 */
export function resolveReferenceCityEclipseCircumstances(
  frame: EclipseFrame,
  observer: ReferenceCityObserverLocation | null,
): ReferenceCityEclipseCircumstances | null {
  if (observer === null) {
    return null;
  }
  const solarEvent = primarySolarEvent(frame);
  const lunarEvent = primaryLunarEvent(frame);
  if (!solarEvent && !lunarEvent) {
    return {
      cityId: observer.cityId,
      latitudeDeg: observer.latitudeDeg,
      longitudeDeg: observer.longitudeDeg,
      globalSolarEventId: null,
      globalLunarEventId: null,
      solar: null,
      lunar: null,
    };
  }
  return {
    cityId: observer.cityId,
    latitudeDeg: observer.latitudeDeg,
    longitudeDeg: observer.longitudeDeg,
    globalSolarEventId: solarEvent?.id ?? null,
    globalLunarEventId: lunarEvent?.id ?? null,
    solar: solarEvent
      ? solarLocalCircumstancesForObserver(solarEvent, observer.latitudeDeg, observer.longitudeDeg)
      : null,
    lunar: lunarEvent
      ? lunarLocalCircumstancesForObserver(lunarEvent, observer.latitudeDeg, observer.longitudeDeg)
      : null,
  };
}

export function resetReferenceCityEclipseCircumstancesCacheForTests(): void {
  solarCache.clear();
  lunarCache.clear();
}
