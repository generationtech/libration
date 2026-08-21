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
 * LIB-059 — earthquake origin, snapshot-age freshness, and paint eligibility.
 * Snapshot age is acquisition metadata, not per-event origin time.
 */

import type { DynamicSourceLifecycleState } from "./dynamicLifecycleTypes";

/** Snapshot age ≤ this is a current USGS copy (two 5-minute poll intervals). */
export const EARTHQUAKE_SNAPSHOT_FRESH_MAX_AGE_MS = 10 * 60 * 1000;

/** Snapshot age above fresh and ≤ this may still paint, not labeled live. */
export const EARTHQUAKE_SNAPSHOT_STALE_MAX_AGE_MS = 60 * 60 * 1000;

export const EARTHQUAKE_ORIGIN_PROPERTY = "earthquakeOrigin";

export type EarthquakeOriginStamp = "live" | "fixture";

export type EarthquakeOrigin = "live" | "cached-live" | "fixture";

export type EarthquakeSnapshotFreshnessBand = "fresh" | "stale" | "excessively-stale";

export type EarthquakeProvenance = Readonly<{
  origin: EarthquakeOrigin;
  acquiredAtMs: number;
  snapshotAgeMs: number | null;
  freshnessBand: EarthquakeSnapshotFreshnessBand | null;
  versionId: string;
}>;

export type EarthquakeConfigStatusHint =
  | "loading"
  | "live"
  | "stale"
  | "unavailable"
  | "fixture";

export function isEarthquakeOriginStamp(
  value: unknown,
): value is EarthquakeOriginStamp {
  return value === "live" || value === "fixture";
}

export function earthquakeSnapshotFreshnessBandFromAgeMs(
  ageMs: number,
): EarthquakeSnapshotFreshnessBand {
  const age = Math.max(0, ageMs);
  if (age <= EARTHQUAKE_SNAPSHOT_FRESH_MAX_AGE_MS) return "fresh";
  if (age <= EARTHQUAKE_SNAPSHOT_STALE_MAX_AGE_MS) return "stale";
  return "excessively-stale";
}

/**
 * Paint live (or last-good live) snapshots that are still fresh or stale.
 * Fixture is never presented as current USGS earthquakes.
 */
export function earthquakeShouldPaint(provenance: EarthquakeProvenance): boolean {
  if (provenance.origin === "fixture") return false;
  return (
    provenance.freshnessBand === "fresh" || provenance.freshnessBand === "stale"
  );
}

export function resolveEarthquakeProvenance(options: {
  originStamp: EarthquakeOriginStamp | null;
  acquiredAtMs: number;
  productUtcMs: number;
  lifecycleState: DynamicSourceLifecycleState;
  versionId: string;
}): EarthquakeProvenance {
  const originBase: EarthquakeOriginStamp = options.originStamp ?? "live";
  const origin: EarthquakeOrigin =
    originBase === "live" && options.lifecycleState === "stale"
      ? "cached-live"
      : originBase;
  const snapshotAgeMs = Number.isFinite(options.productUtcMs)
    ? options.productUtcMs - options.acquiredAtMs
    : null;
  const freshnessBand =
    snapshotAgeMs !== null
      ? earthquakeSnapshotFreshnessBandFromAgeMs(snapshotAgeMs)
      : null;
  return {
    origin,
    acquiredAtMs: options.acquiredAtMs,
    snapshotAgeMs,
    freshnessBand,
    versionId: options.versionId,
  };
}

export function earthquakeConfigStatusHint(options: {
  enabled: boolean;
  productTimeLiveEnough: boolean;
  lifecycleState: DynamicSourceLifecycleState;
  provenance: EarthquakeProvenance | null;
}): EarthquakeConfigStatusHint | null {
  if (!options.enabled) {
    return null;
  }
  if (options.provenance?.origin === "fixture") {
    return "fixture";
  }
  if (options.productTimeLiveEnough === false) {
    return null;
  }
  if (options.provenance === null) {
    if (options.lifecycleState === "loading") return "loading";
    return "unavailable";
  }
  if (!earthquakeShouldPaint(options.provenance)) {
    return "unavailable";
  }
  if (
    options.provenance.origin === "cached-live" ||
    options.provenance.freshnessBand === "stale"
  ) {
    return "stale";
  }
  return "live";
}

export function earthquakeConfigStatusHintCopy(
  hint: EarthquakeConfigStatusHint,
  provenance: EarthquakeProvenance | null = null,
): string {
  if (hint === "loading") return "Earthquake data loading…";
  if (hint === "unavailable") return "Earthquake data unavailable";
  if (hint === "fixture") return "Earthquake data (DEV fixture)";
  const ageMs = provenance?.snapshotAgeMs;
  const ageLabel = formatSnapshotAgeLabel(ageMs);
  if (hint === "stale") {
    return ageLabel !== null
      ? `Earthquake data stale · last update ${ageLabel} ago`
      : "Earthquake data stale";
  }
  return ageLabel !== null
    ? `Earthquake data live · ${ageLabel} old`
    : "Earthquake data live";
}

function formatSnapshotAgeLabel(ageMs: number | null | undefined): string | null {
  if (ageMs === null || ageMs === undefined || !Number.isFinite(ageMs)) {
    return null;
  }
  const minutes = Math.max(0, Math.round(Math.max(0, ageMs) / 60_000));
  if (minutes <= 0) return null;
  return `${minutes} min`;
}

export function originStampFromPreparedPointFeatures(view: {
  origin?: unknown;
}): EarthquakeOriginStamp | null {
  return isEarthquakeOriginStamp(view.origin) ? view.origin : null;
}
