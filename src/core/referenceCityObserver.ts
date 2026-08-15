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

import type { DisplayTimeConfig, TopBandAnchorConfig } from "../config/appConfig";
import { REFERENCE_CITIES } from "../data/referenceCities";

/**
 * Terrestrial observer taken from the chrome reference-city selector.
 * Coordinates come only from {@link REFERENCE_CITIES} — never invented.
 */
export type ReferenceCityObserverLocation = {
  readonly cityId: string;
  readonly latitudeDeg: number;
  readonly longitudeDeg: number;
};

export function topBandAnchorEqual(a: TopBandAnchorConfig, b: TopBandAnchorConfig): boolean {
  if (a.mode !== b.mode) {
    return false;
  }
  if (a.mode === "fixedCity" && b.mode === "fixedCity") {
    return a.cityId === b.cityId;
  }
  if (a.mode === "fixedLongitude" && b.mode === "fixedLongitude") {
    return a.longitudeDeg === b.longitudeDeg;
  }
  return true;
}

/**
 * Resolve lat/lon from `displayTime.topBandAnchor` when it is a known catalog city.
 * Returns null for auto, fixed-longitude, or unknown city ids — callers fall back to map-oriented presentation.
 */
export function resolveReferenceCityObserverLocation(
  displayTime: DisplayTimeConfig,
): ReferenceCityObserverLocation | null {
  const anchor = displayTime.topBandAnchor ?? { mode: "auto" };
  if (anchor.mode !== "fixedCity") {
    return null;
  }
  const city = REFERENCE_CITIES.find((c) => c.id === anchor.cityId);
  if (
    city === undefined ||
    !Number.isFinite(city.latitude) ||
    !Number.isFinite(city.longitude)
  ) {
    return null;
  }
  return {
    cityId: city.id,
    latitudeDeg: city.latitude,
    longitudeDeg: city.longitude,
  };
}
