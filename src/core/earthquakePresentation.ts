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
 * Earthquake overlay presentation (LIB-059).
 * Filters and labels are display policy over an already-acquired USGS snapshot.
 * They do not change acquisition, snapshot identity, or product time.
 */

export const EARTHQUAKE_MIN_MAGNITUDE_IDS = [
  "all",
  "1",
  "2",
  "2.5",
  "3",
  "4",
  "4.5",
  "5",
] as const;
export type EarthquakeMinMagnitudeId = (typeof EARTHQUAKE_MIN_MAGNITUDE_IDS)[number];

export const EARTHQUAKE_MAX_AGE_IDS = ["1h", "3h", "6h", "12h", "24h"] as const;
export type EarthquakeMaxAgeId = (typeof EARTHQUAKE_MAX_AGE_IDS)[number];

export const EARTHQUAKE_LABEL_MIN_MAGNITUDE_IDS = [
  "follow",
  "3",
  "4",
  "4.5",
  "5",
  "6",
] as const;
export type EarthquakeLabelMinMagnitudeId =
  (typeof EARTHQUAKE_LABEL_MIN_MAGNITUDE_IDS)[number];

/** Factory: M2.5+ — cuts micro-event clutter while keeping meaningful activity. */
export const DEFAULT_EARTHQUAKE_MIN_MAGNITUDE: EarthquakeMinMagnitudeId = "2.5";

/** Factory: past-day window, matching the USGS all_day feed. */
export const DEFAULT_EARTHQUAKE_MAX_AGE: EarthquakeMaxAgeId = "24h";

export const DEFAULT_EARTHQUAKE_SHOW_LABELS = true;

/** Factory: label M4.0+ so markers remain for smaller events. */
export const DEFAULT_EARTHQUAKE_LABEL_MIN_MAGNITUDE: EarthquakeLabelMinMagnitudeId =
  "4";

export const DEFAULT_EARTHQUAKE_EARTHQUAKES_ONLY = true;

/**
 * Factory ON: hover reveals compact labels without adding default map clutter.
 * Persistent labels remain independent (LIB-060).
 */
export const DEFAULT_EARTHQUAKE_SHOW_LABEL_ON_HOVER = true;

export const EARTHQUAKE_MAX_AGE_MS: Record<EarthquakeMaxAgeId, number> = {
  "1h": 1 * 60 * 60 * 1000,
  "3h": 3 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "12h": 12 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export const EARTHQUAKE_MIN_MAGNITUDE_VALUE: Record<
  Exclude<EarthquakeMinMagnitudeId, "all">,
  number
> = {
  "1": 1,
  "2": 2,
  "2.5": 2.5,
  "3": 3,
  "4": 4,
  "4.5": 4.5,
  "5": 5,
};

export const EARTHQUAKE_LABEL_MIN_MAGNITUDE_VALUE: Record<
  Exclude<EarthquakeLabelMinMagnitudeId, "follow">,
  number
> = {
  "3": 3,
  "4": 4,
  "4.5": 4.5,
  "5": 5,
  "6": 6,
};

/**
 * Provider timestamps slightly ahead of product UTC are treated as age 0.
 * Larger future offsets are excluded (not displayed as negative age).
 */
export const EARTHQUAKE_EVENT_FUTURE_SKEW_MS = 2 * 60 * 1000;

export type EarthquakePresentation = {
  minMagnitude: EarthquakeMinMagnitudeId;
  maxAge: EarthquakeMaxAgeId;
  showLabels: boolean;
  labelMinMagnitude: EarthquakeLabelMinMagnitudeId;
  earthquakesOnly: boolean;
  /** Transient compact label on pointer hover. Not a persistent map label. */
  showLabelOnHover: boolean;
};

export const DEFAULT_EARTHQUAKE_PRESENTATION: EarthquakePresentation = {
  minMagnitude: DEFAULT_EARTHQUAKE_MIN_MAGNITUDE,
  maxAge: DEFAULT_EARTHQUAKE_MAX_AGE,
  showLabels: DEFAULT_EARTHQUAKE_SHOW_LABELS,
  labelMinMagnitude: DEFAULT_EARTHQUAKE_LABEL_MIN_MAGNITUDE,
  earthquakesOnly: DEFAULT_EARTHQUAKE_EARTHQUAKES_ONLY,
  showLabelOnHover: DEFAULT_EARTHQUAKE_SHOW_LABEL_ON_HOVER,
};

function isOneOf<T extends string>(raw: unknown, ids: readonly T[]): raw is T {
  return (ids as readonly unknown[]).includes(raw);
}

export function earthquakeMinMagnitudeLabel(id: EarthquakeMinMagnitudeId): string {
  if (id === "all") return "All";
  return `${id}+`;
}

export function earthquakeMaxAgeLabel(id: EarthquakeMaxAgeId): string {
  switch (id) {
    case "1h":
      return "1 hour";
    case "3h":
      return "3 hours";
    case "6h":
      return "6 hours";
    case "12h":
      return "12 hours";
    case "24h":
      return "24 hours";
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

export function earthquakeLabelMinMagnitudeLabel(
  id: EarthquakeLabelMinMagnitudeId,
): string {
  if (id === "follow") return "Same as marker minimum";
  return `${id}+`;
}

export function earthquakeMinMagnitudeThreshold(
  id: EarthquakeMinMagnitudeId,
): number | null {
  if (id === "all") return null;
  return EARTHQUAKE_MIN_MAGNITUDE_VALUE[id];
}

export function earthquakeMaxAgeMs(id: EarthquakeMaxAgeId): number {
  return EARTHQUAKE_MAX_AGE_MS[id];
}

export function earthquakeLabelMinMagnitudeThreshold(
  presentation: EarthquakePresentation,
): number | null {
  if (presentation.labelMinMagnitude === "follow") {
    return earthquakeMinMagnitudeThreshold(presentation.minMagnitude);
  }
  return EARTHQUAKE_LABEL_MIN_MAGNITUDE_VALUE[presentation.labelMinMagnitude];
}

export function normalizeEarthquakePresentation(
  raw: unknown,
): EarthquakePresentation {
  const src =
    raw !== null && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  return {
    minMagnitude: isOneOf(src.minMagnitude, EARTHQUAKE_MIN_MAGNITUDE_IDS)
      ? src.minMagnitude
      : DEFAULT_EARTHQUAKE_MIN_MAGNITUDE,
    maxAge: isOneOf(src.maxAge, EARTHQUAKE_MAX_AGE_IDS)
      ? src.maxAge
      : DEFAULT_EARTHQUAKE_MAX_AGE,
    showLabels:
      typeof src.showLabels === "boolean"
        ? src.showLabels
        : DEFAULT_EARTHQUAKE_SHOW_LABELS,
    labelMinMagnitude: isOneOf(
      src.labelMinMagnitude,
      EARTHQUAKE_LABEL_MIN_MAGNITUDE_IDS,
    )
      ? src.labelMinMagnitude
      : DEFAULT_EARTHQUAKE_LABEL_MIN_MAGNITUDE,
    earthquakesOnly:
      typeof src.earthquakesOnly === "boolean"
        ? src.earthquakesOnly
        : DEFAULT_EARTHQUAKE_EARTHQUAKES_ONLY,
    showLabelOnHover:
      typeof src.showLabelOnHover === "boolean"
        ? src.showLabelOnHover
        : DEFAULT_EARTHQUAKE_SHOW_LABEL_ON_HOVER,
  };
}

export function magnitudeFromEarthquakeProperties(
  properties: Readonly<Record<string, unknown>> | undefined,
): number | undefined {
  if (properties === undefined) return undefined;
  const mag = properties.mag;
  if (typeof mag === "number" && Number.isFinite(mag)) return mag;
  return undefined;
}

export function eventTimeMsFromEarthquakeFeature(feature: {
  validTimeMs?: number;
  properties?: Readonly<Record<string, unknown>>;
}): number | undefined {
  const fromProps = feature.properties?.time;
  if (typeof fromProps === "number" && Number.isFinite(fromProps)) {
    return fromProps;
  }
  if (
    feature.validTimeMs !== undefined &&
    Number.isFinite(feature.validTimeMs)
  ) {
    return feature.validTimeMs;
  }
  return undefined;
}

export function eventTypeFromEarthquakeProperties(
  properties: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
  if (properties === undefined) return undefined;
  const type = properties.type;
  if (typeof type === "string" && type.trim() !== "") return type.trim();
  return undefined;
}

export function placeFromEarthquakeProperties(
  properties: Readonly<Record<string, unknown>> | undefined,
): string | undefined {
  if (properties === undefined) return undefined;
  const place = properties.place;
  if (typeof place === "string" && place.trim() !== "") return place.trim();
  return undefined;
}

/**
 * Compact map label: magnitude + place. Does not mutate provider `title`.
 */
export function formatEarthquakeMarkerLabel(
  magnitude: number | undefined,
  place: string | undefined,
): string | undefined {
  const magText =
    magnitude !== undefined && Number.isFinite(magnitude)
      ? formatCompactMagnitude(magnitude)
      : undefined;
  const placeText =
    place !== undefined && place.trim() !== "" ? place.trim() : undefined;
  if (magText !== undefined && placeText !== undefined) {
    return `${magText} · ${placeText}`;
  }
  if (placeText !== undefined) return placeText;
  if (magText !== undefined) return magText;
  return undefined;
}

function formatCompactMagnitude(mag: number): string {
  const rounded = Math.round(mag * 10) / 10;
  if (Object.is(rounded, -0)) {
    return "M0";
  }
  if (Number.isInteger(rounded)) {
    return `M${rounded}`;
  }
  return `M${rounded.toFixed(1)}`;
}

export function earthquakePassesTypeFilter(
  properties: Readonly<Record<string, unknown>> | undefined,
  earthquakesOnly: boolean,
): boolean {
  if (!earthquakesOnly) return true;
  return eventTypeFromEarthquakeProperties(properties) === "earthquake";
}

export function earthquakePassesMagnitudeFilter(
  magnitude: number | undefined,
  minMagnitude: EarthquakeMinMagnitudeId,
): boolean {
  const threshold = earthquakeMinMagnitudeThreshold(minMagnitude);
  if (threshold === null) return true;
  if (magnitude === undefined) return false;
  return magnitude >= threshold;
}

/**
 * Inclusive max-age. Slightly future timestamps (≤ 2 min) count as age 0.
 * Farther-future timestamps are excluded.
 */
export function earthquakePassesAgeFilter(
  eventTimeMs: number | undefined,
  productUtcMs: number,
  maxAge: EarthquakeMaxAgeId,
): boolean {
  if (eventTimeMs === undefined || !Number.isFinite(eventTimeMs)) return false;
  if (!Number.isFinite(productUtcMs)) return false;
  const rawAgeMs = productUtcMs - eventTimeMs;
  if (rawAgeMs < -EARTHQUAKE_EVENT_FUTURE_SKEW_MS) return false;
  const ageMs = Math.max(0, rawAgeMs);
  return ageMs <= earthquakeMaxAgeMs(maxAge);
}

export function earthquakeMarkerEligible(options: {
  magnitude: number | undefined;
  eventTimeMs: number | undefined;
  properties: Readonly<Record<string, unknown>> | undefined;
  productUtcMs: number;
  presentation: EarthquakePresentation;
}): boolean {
  const { presentation } = options;
  if (!earthquakePassesTypeFilter(options.properties, presentation.earthquakesOnly)) {
    return false;
  }
  if (!earthquakePassesMagnitudeFilter(options.magnitude, presentation.minMagnitude)) {
    return false;
  }
  return earthquakePassesAgeFilter(
    options.eventTimeMs,
    options.productUtcMs,
    presentation.maxAge,
  );
}

export function earthquakeLabelEligible(options: {
  magnitude: number | undefined;
  presentation: EarthquakePresentation;
}): boolean {
  if (!options.presentation.showLabels) return false;
  const threshold = earthquakeLabelMinMagnitudeThreshold(options.presentation);
  if (threshold === null) return true;
  if (options.magnitude === undefined) return false;
  return options.magnitude >= threshold;
}
