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
 * Clouds v1 origin, observation-age freshness, and paint eligibility.
 * Observation age is productUtcMs − validTimeMs (mosaic TIME), never fetch time.
 */

import type { DynamicSourceLifecycleState } from "./dynamicLifecycleTypes";

export const CLOUDS_OBSERVATION_FRESH_MAX_AGE_MS = 3 * 60 * 60 * 1000;
export const CLOUDS_OBSERVATION_STALE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export const CLOUDS_COVERAGE_NOTE =
  "Africa, Europe, and polar regions are not covered by this mosaic and stay transparent — not clear sky.";

export type CloudsOriginStamp = "live" | "fixture";
export type CloudsOrigin = "live" | "cached-live" | "fixture";
export type CloudsObservationFreshnessBand = "fresh" | "stale" | "excessively-stale";

export type CloudsProvenance = Readonly<{
  origin: CloudsOrigin;
  acquiredAtMs: number;
  validTimeMs: number;
  observationAgeMs: number | null;
  freshnessBand: CloudsObservationFreshnessBand | null;
  coverageKind: "partial";
  versionId: string;
}>;

export type CloudsConfigStatusHint =
  | "loading"
  | "recent"
  | "stale"
  | "unavailable"
  | "fixture";

export function isCloudsOriginStamp(value: unknown): value is CloudsOriginStamp {
  return value === "live" || value === "fixture";
}

export function cloudsObservationFreshnessBandFromAgeMs(
  ageMs: number,
): CloudsObservationFreshnessBand {
  const age = Math.max(0, ageMs);
  if (age <= CLOUDS_OBSERVATION_FRESH_MAX_AGE_MS) return "fresh";
  if (age <= CLOUDS_OBSERVATION_STALE_MAX_AGE_MS) return "stale";
  return "excessively-stale";
}

export function cloudsShouldPaint(
  provenance: CloudsProvenance,
  options: Readonly<{ allowFixturePaint?: boolean }> = {},
): boolean {
  if (provenance.origin === "fixture") {
    return options.allowFixturePaint === true;
  }
  return (
    provenance.freshnessBand === "fresh" || provenance.freshnessBand === "stale"
  );
}

export function resolveCloudsProvenance(options: {
  originStamp: CloudsOriginStamp | null;
  acquiredAtMs: number;
  validTimeMs: number;
  productUtcMs: number;
  lifecycleState: DynamicSourceLifecycleState;
  versionId: string;
}): CloudsProvenance {
  const originBase: CloudsOriginStamp = options.originStamp ?? "live";
  const origin: CloudsOrigin =
    originBase === "live" && options.lifecycleState === "stale"
      ? "cached-live"
      : originBase;
  const observationAgeMs = Number.isFinite(options.productUtcMs)
    ? options.productUtcMs - options.validTimeMs
    : null;
  const freshnessBand =
    observationAgeMs !== null
      ? cloudsObservationFreshnessBandFromAgeMs(observationAgeMs)
      : null;
  return {
    origin,
    acquiredAtMs: options.acquiredAtMs,
    validTimeMs: options.validTimeMs,
    observationAgeMs,
    freshnessBand,
    coverageKind: "partial",
    versionId: options.versionId,
  };
}

export function cloudsConfigStatusHint(options: {
  enabled: boolean;
  productTimeLiveEnough: boolean;
  lifecycleState: DynamicSourceLifecycleState;
  provenance: CloudsProvenance | null;
}): CloudsConfigStatusHint | null {
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
  if (!cloudsShouldPaint(options.provenance)) {
    return "unavailable";
  }
  if (
    options.provenance.origin === "cached-live" ||
    options.provenance.freshnessBand === "stale"
  ) {
    return "stale";
  }
  return "recent";
}

function formatObservationAgeLabel(ageMs: number | null | undefined): string | null {
  if (ageMs === null || ageMs === undefined || !Number.isFinite(ageMs)) {
    return null;
  }
  const hours = Math.max(0, ageMs) / 3_600_000;
  if (hours < 1.5) {
    const minutes = Math.max(0, Math.round(Math.max(0, ageMs) / 60_000));
    if (minutes <= 0) return null;
    return `${minutes} min`;
  }
  const rounded = Math.round(hours);
  return `${rounded}h`;
}

function formatMosaicUtcLabel(validTimeMs: number): string | null {
  if (!Number.isFinite(validTimeMs)) return null;
  const iso = new Date(validTimeMs).toISOString();
  const m = /^(\d{4}-\d{2}-\d{2}T)(\d{2}:\d{2}):\d{2}/.exec(iso);
  if (m === null || m[2] === undefined) return null;
  return `${m[2]} UTC`;
}

export function cloudsConfigStatusHintCopy(
  hint: CloudsConfigStatusHint,
  provenance: CloudsProvenance | null = null,
): string {
  if (hint === "loading") return "Clouds loading…";
  if (hint === "unavailable") return "Cloud data unavailable";
  if (hint === "fixture") return "Clouds (DEV fixture)";
  const mosaic = provenance !== null ? formatMosaicUtcLabel(provenance.validTimeMs) : null;
  const ageLabel = formatObservationAgeLabel(provenance?.observationAgeMs);
  if (hint === "stale") {
    if (ageLabel !== null) {
      return `Clouds stale · ${ageLabel} old · partial coverage`;
    }
    return mosaic !== null
      ? `Clouds stale · mosaic ${mosaic} · partial coverage`
      : "Clouds stale · partial coverage";
  }
  if (ageLabel !== null) {
    return `Clouds · observed ${ageLabel} ago · partial coverage`;
  }
  return mosaic !== null
    ? `Clouds · mosaic ${mosaic} · partial coverage`
    : "Clouds · partial coverage";
}

export function originStampFromPreparedEquirect(view: {
  origin?: unknown;
}): CloudsOriginStamp | null {
  return isCloudsOriginStamp(view.origin) ? view.origin : null;
}
