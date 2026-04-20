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
  DisplayTimeConfig,
  GeographyConfig,
  TopBandAnchorConfig,
  TopBandTimeMode,
} from "../config/appConfig.ts";
import { REFERENCE_CITIES } from "../data/referenceCities.ts";
import { resolveReferenceFrameCivilTimeZone } from "./displayTimeReference.ts";
import type { CivilProjection, ReadPoint, ReferenceFrame, TimeBasis } from "./chromeTimeDomain.ts";
import { deriveCivilProjection } from "./civilProjection.ts";
import {
  REFERENCE_ZONE_TO_LONGITUDE_CITY_ID,
  resolveTopBandAnchorLongitudeDeg,
  type TopBandAnchorLongitudeSource,
} from "./topBandAnchorLongitude.ts";
import { readPointXFromReferenceLongitudeDeg } from "./readPointLongitude.ts";
import { phasedTapeAnchorFraction } from "./tapeRegistration.ts";

export type ResolvedChromeTime = {
  basis: TimeBasis;
  referenceFrame: ReferenceFrame;
  civilProjection: CivilProjection;
  readPoint: ReadPoint;
};

function resolveReferenceFrameName(
  timeZoneId: string,
  topBandAnchor: TopBandAnchorConfig,
  geography: GeographyConfig | undefined,
  anchorSource: TopBandAnchorLongitudeSource,
): string {
  if (topBandAnchor.mode === "fixedCity") {
    const city = REFERENCE_CITIES.find((c) => c.id === topBandAnchor.cityId);
    if (city !== undefined) {
      return city.name;
    }
    return timeZoneId;
  }
  if (topBandAnchor.mode === "fixedLongitude") {
    return `${topBandAnchor.longitudeDeg.toFixed(2)}°`;
  }
  if (geography?.referenceMode === "fixedCoordinate" && anchorSource === "geographyFixedCoordinate") {
    const t = geography.fixedCoordinate.label.trim();
    if (t.length > 0) {
      return t;
    }
  }
  const mappedId = REFERENCE_ZONE_TO_LONGITUDE_CITY_ID[timeZoneId];
  if (mappedId !== undefined) {
    const city = REFERENCE_CITIES.find((c) => c.id === mappedId);
    if (city !== undefined) {
      return city.name;
    }
  }
  return timeZoneId;
}

/**
 * Resolver-owned chrome time: one {@link TimeBasis}, one {@link ReferenceFrame}, {@link CivilProjection} in that zone,
 * and {@link ReadPoint} from longitude (spatial only).
 */
export function resolveChromeTime(options: {
  timeBasis: TimeBasis;
  displayTime: DisplayTimeConfig;
  geography?: GeographyConfig;
  viewportWidthPx: number;
}): ResolvedChromeTime {
  const { nowUtcInstant } = options.timeBasis;
  const timeZoneId = resolveReferenceFrameCivilTimeZone(options.displayTime);
  const topBandAnchor = options.displayTime.topBandAnchor ?? { mode: "auto" };
  const anchor = resolveTopBandAnchorLongitudeDeg({
    nowMs: nowUtcInstant,
    referenceTimeZone: timeZoneId,
    topBandAnchor,
    geography: options.geography,
  });
  const referenceFrame: ReferenceFrame = {
    timeZoneId,
    longitudeDeg: anchor.referenceLongitudeDeg,
    name: resolveReferenceFrameName(timeZoneId, topBandAnchor, options.geography, anchor.anchorSource),
  };
  const civilProjection = deriveCivilProjection(nowUtcInstant, referenceFrame.timeZoneId);
  const w = Math.max(0, options.viewportWidthPx);
  const readPoint: ReadPoint = {
    x: readPointXFromReferenceLongitudeDeg(referenceFrame.longitudeDeg, w),
  };
  return {
    basis: { nowUtcInstant },
    referenceFrame,
    civilProjection,
    readPoint,
  };
}

/** Tape anchor [0,1) from resolver read point — the only registration input besides civil fractional hour. */
export function resolveTapeAnchorFraction(readPoint: ReadPoint, viewportWidthPx: number): number {
  return phasedTapeAnchorFraction(readPoint, viewportWidthPx);
}

/**
 * Same as {@link resolveChromeTime} using a resolved reference zone string (e.g. from
 * {@link resolveTopBandTimeFromConfig}) so callers do not need the full {@link DisplayTimeConfig} object.
 */
export function resolveChromeTimeFromResolvedTopBand(options: {
  timeBasis: TimeBasis;
  referenceTimeZone: string;
  topBandMode: TopBandTimeMode;
  topBandAnchor: TopBandAnchorConfig;
  geography?: GeographyConfig;
  viewportWidthPx: number;
}): ResolvedChromeTime {
  const displayTime: DisplayTimeConfig = {
    referenceTimeZone: { source: "fixed", timeZone: options.referenceTimeZone },
    topBandMode: options.topBandMode,
    topBandAnchor: options.topBandAnchor,
  };
  return resolveChromeTime({
    timeBasis: options.timeBasis,
    displayTime,
    geography: options.geography,
    viewportWidthPx: options.viewportWidthPx,
  });
}
