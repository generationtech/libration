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

import type {
  GeographyConfig,
  PresentTimeReferenceMode,
  TopBandAnchorConfig,
  TopBandTimeMode,
} from "../config/appConfig";
import { REFERENCE_CITIES } from "../data/referenceCities";
import { utcOffsetHoursForTimeZone } from "../core/timeZoneOffset";

const REFERENCE_CITY_LONGITUDE_BY_ID: ReadonlyMap<string, number> = new Map(
  REFERENCE_CITIES.map((c) => [c.id, c.longitude]),
);

/**
 * Maps the **reference** IANA zone string (same as display chrome civil-time `referenceTimeZone`) to a
 * {@link REFERENCE_CITIES} id whose **longitude** supplies the default top-tape meridian in `auto` anchor mode.
 *
 * This is a convenience lookup for longitude only: civil timezone membership does **not** define structural
 * 15° column placement. Two cities in the same IANA zone may still fall in different structural letter columns.
 */
export const REFERENCE_ZONE_TO_LONGITUDE_CITY_ID: Readonly<Record<string, string>> = {
  "Africa/Cairo": "city.cairo",
  "America/Los_Angeles": "city.los_angeles",
  "America/New_York": "city.nyc",
  "America/Sao_Paulo": "city.sao_paulo",
  "Asia/Kolkata": "city.mumbai",
  "Asia/Tokyo": "city.tokyo",
  "Australia/Sydney": "city.sydney",
  "Europe/London": "city.london",
};

/** Discriminant for how {@link resolveTopBandAnchorLongitudeDeg} chose the anchor meridian (longitude-first; not civil-TZ columns). */
export type TopBandAnchorLongitudeSource =
  | "greenwich"
  | "fixedLongitude"
  | "fixedCity"
  | "referenceZoneLongitudeCity"
  | "greenwichFallback"
  | "geographyFixedCoordinate";

/**
 * When {@link GeographyConfig.showFixedCoordinateLabelInTimezoneStrip} is true and the resolved top-band meridian
 * came from geography’s fixed coordinate (see {@link resolveTopBandAnchorLongitudeDeg}), returns the trimmed
 * fixed-coordinate label for display; otherwise {@code null}. Does not apply when Chrome uses an explicit anchor.
 */
export function geographyTimezoneStripReferenceLabel(
  geography: GeographyConfig | undefined,
  anchorSource: TopBandAnchorLongitudeSource,
): string | null {
  if (!geography?.showFixedCoordinateLabelInTimezoneStrip) {
    return null;
  }
  if (anchorSource !== "geographyFixedCoordinate") {
    return null;
  }
  const t = geography.fixedCoordinate.label.trim();
  return t.length > 0 ? t : null;
}

function clampLongitudeDeg(lon: number): number {
  if (!Number.isFinite(lon)) {
    return 0;
  }
  return Math.max(-180, Math.min(180, lon));
}

function longitudeDegForReferenceCityId(cityId: string): number | undefined {
  const lon = REFERENCE_CITY_LONGITUDE_BY_ID.get(cityId);
  return lon !== undefined ? clampLongitudeDeg(lon) : undefined;
}

/**
 * Longitude of the default reference city for an IANA zone string (same mapping as auto top-band anchor’s
 * {@code referenceZoneLongitudeCity} path). Used for present-time instrumentation when decoupled from the tape anchor.
 */
export function instrumentationLongitudeDegForReferenceTimeZone(referenceTimeZone: string): number {
  const cityId = REFERENCE_ZONE_TO_LONGITUDE_CITY_ID[referenceTimeZone];
  const lon = cityId !== undefined ? longitudeDegForReferenceCityId(cityId) : undefined;
  return lon !== undefined ? lon : 0;
}

/**
 * Longitude for the present-time (“now”) tick when {@link PresentTimeReferenceMode} is {@code referenceCity}.
 * Uses the user’s {@link TopBandAnchorConfig} {@code fixedCity} longitude when that mode is active; otherwise falls
 * back to {@link instrumentationLongitudeDegForReferenceTimeZone} (reference zone’s bundled default city).
 */
export function resolvePresentTimeContextLongitudeDeg(args: {
  referenceTimeZone: string;
  topBandAnchor: TopBandAnchorConfig;
  presentTimeReferenceMode: PresentTimeReferenceMode;
}): number | undefined {
  if (args.presentTimeReferenceMode !== "referenceCity") {
    return undefined;
  }
  if (args.topBandAnchor.mode === "fixedCity") {
    const lon = longitudeDegForReferenceCityId(args.topBandAnchor.cityId);
    return lon !== undefined ? lon : 0;
  }
  return instrumentationLongitudeDegForReferenceTimeZone(args.referenceTimeZone);
}

/**
 * When {@link PresentTimeReferenceMode} is {@code referenceCity} and the authoring anchor is {@code fixedCity},
 * world/tape alignment follows the same meridian as {@code auto} for the reference IANA zone (see
 * {@link resolveTapeAlignmentLongitudeDeg}) so the expressed strip frame does not track the selected reference city.
 */
function effectiveTopBandAnchorForTapeAlignment(args: {
  topBandAnchor: TopBandAnchorConfig;
  presentTimeReferenceMode: PresentTimeReferenceMode;
}): TopBandAnchorConfig {
  const { topBandAnchor, presentTimeReferenceMode } = args;
  if (presentTimeReferenceMode === "referenceCity" && topBandAnchor.mode === "fixedCity") {
    return { mode: "auto" };
  }
  return topBandAnchor;
}

/**
 * Resolves the meridian used for **tape / world alignment** (top strip phase anchor, {@link TopBandLongitudeAnchor},
 * {@link UtcTopScaleLayout.expressedStripTimeFrame}). Call this from chrome layout; use {@link resolveTopBandAnchorLongitudeDeg}
 * for policy-neutral longitude resolution when the authoring anchor is already effective.
 *
 * In {@code presentTimeReferenceMode="referenceCity"} with a {@code fixedCity} authoring anchor, alignment is
 * zone-based ({@code auto} semantics) and **does not** use {@link GeographyConfig} fixed-coordinate override, so
 * changing the reference city or geography viewpoint does not re-phase the tape against a map pin.
 */
export function resolveTapeAlignmentLongitudeDeg(options: {
  nowMs: number;
  referenceTimeZone: string;
  topBandMode: TopBandTimeMode;
  topBandAnchor: TopBandAnchorConfig;
  presentTimeReferenceMode?: PresentTimeReferenceMode;
  geography?: GeographyConfig;
}): {
  referenceLongitudeDeg: number;
  referenceOffsetHours: number;
  anchorSource: TopBandAnchorLongitudeSource;
} {
  const presentTimeReferenceMode = options.presentTimeReferenceMode ?? "anchor";
  const effectiveAnchor = effectiveTopBandAnchorForTapeAlignment({
    topBandAnchor: options.topBandAnchor,
    presentTimeReferenceMode,
  });
  const ignoreGeographyForTapeAlignment =
    presentTimeReferenceMode === "referenceCity" && options.topBandAnchor.mode === "fixedCity";
  return resolveTopBandAnchorLongitudeDeg({
    nowMs: options.nowMs,
    referenceTimeZone: options.referenceTimeZone,
    topBandMode: options.topBandMode,
    topBandAnchor: effectiveAnchor,
    geography: ignoreGeographyForTapeAlignment ? undefined : options.geography,
  });
}

/**
 * Resolves the meridian used to place a top-band **longitude anchor** on the equirectangular strip from an explicit
 * {@link TopBandAnchorConfig} (no {@link PresentTimeReferenceMode} coupling). For display chrome tape alignment,
 * prefer {@link resolveTapeAlignmentLongitudeDeg}.
 *
 * Resolution order: `fixedLongitude` → `fixedCity` → `auto` (when {@link GeographyConfig.referenceMode}
 * is {@code fixedCoordinate}, use that longitude; else reference IANA zone → city lookup → Greenwich fallback).
 * Tape time-of-day phasing for `utc24` vs local modes is handled separately in {@link buildUtcTopScaleLayout};
 * this resolver only picks the geographic meridian for horizontal tape alignment.
 */
export function resolveTopBandAnchorLongitudeDeg(options: {
  nowMs: number;
  referenceTimeZone: string;
  topBandMode: TopBandTimeMode;
  topBandAnchor: TopBandAnchorConfig;
  /** When {@link TopBandAnchorConfig} is {@code auto} and mode is {@code fixedCoordinate}, overrides zone-based meridian. */
  geography?: GeographyConfig;
}): {
  referenceLongitudeDeg: number;
  /** Current zone offset (DST-aware) for the reference IANA zone; echoed for debugging only. */
  referenceOffsetHours: number;
  anchorSource: TopBandAnchorLongitudeSource;
} {
  const { nowMs, referenceTimeZone, geography } = options;
  const { topBandAnchor } = options;

  const referenceOffsetHours = utcOffsetHoursForTimeZone(nowMs, referenceTimeZone);

  if (topBandAnchor.mode === "fixedLongitude") {
    return {
      referenceLongitudeDeg: clampLongitudeDeg(topBandAnchor.longitudeDeg),
      referenceOffsetHours,
      anchorSource: "fixedLongitude",
    };
  }

  if (topBandAnchor.mode === "fixedCity") {
    const lon = longitudeDegForReferenceCityId(topBandAnchor.cityId);
    if (lon !== undefined) {
      return {
        referenceLongitudeDeg: lon,
        referenceOffsetHours,
        anchorSource: "fixedCity",
      };
    }
    return {
      referenceLongitudeDeg: 0,
      referenceOffsetHours,
      anchorSource: "greenwichFallback",
    };
  }

  if (geography?.referenceMode === "fixedCoordinate") {
    return {
      referenceLongitudeDeg: clampLongitudeDeg(geography.fixedCoordinate.longitude),
      referenceOffsetHours,
      anchorSource: "geographyFixedCoordinate",
    };
  }

  const cityId = REFERENCE_ZONE_TO_LONGITUDE_CITY_ID[referenceTimeZone];
  const lonFromZone = cityId !== undefined ? longitudeDegForReferenceCityId(cityId) : undefined;
  if (lonFromZone !== undefined) {
    return {
      referenceLongitudeDeg: lonFromZone,
      referenceOffsetHours,
      anchorSource: "referenceZoneLongitudeCity",
    };
  }

  return {
    referenceLongitudeDeg: 0,
    referenceOffsetHours,
    anchorSource: "greenwichFallback",
  };
}
