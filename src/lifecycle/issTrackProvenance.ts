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
 * LIB-036 — ISS track origin, TLE-epoch freshness, and paint eligibility.
 * Product UTC remains the SGP4 instant. These bands are ISS-only and not
 * user-configurable.
 */

import type { DynamicSourceLifecycleState } from "./dynamicLifecycleTypes";
import type { DynamicTrack } from "./dynamicSnapshotTypes";
import {
  ISS_ORIGIN_PROPERTY,
  ISS_TLE_PROVIDER_PROPERTY,
  issTleEpochUnixMs,
  tleLinesFromTrackProperties,
  type IssTleLiveProviderId,
} from "./issOrbitalTrackAcquisition";

/** Age ≤ this is a current element set (CelesTrak typically refreshes ISS GP more than once per day). */
export const ISS_TLE_FRESH_MAX_AGE_MS = 18 * 60 * 60 * 1000;

/** Age above {@link ISS_TLE_FRESH_MAX_AGE_MS} and ≤ this may still paint, not labeled live. */
export const ISS_TLE_DEGRADED_MAX_AGE_MS = 48 * 60 * 60 * 1000;

export type IssTrackOriginStamp = "live-tle" | "fixture";

export type IssTrackOrigin = "live-tle" | "cached-live-tle" | "fixture";

export type IssTleFreshnessBand = "fresh" | "degraded" | "excessively-stale";

export type IssTrackProvenance = Readonly<{
  origin: IssTrackOrigin;
  tleEpochUtcMs: number | null;
  acquiredAtMs: number;
  ageMs: number | null;
  freshnessBand: IssTleFreshnessBand | null;
  propagatedProductUtcMs: number;
  tleProvider: IssTleLiveProviderId | null;
}>;

export type IssConfigStatusHint = "unavailable" | "degraded" | "loading";

export function isIssOriginStamp(value: unknown): value is IssTrackOriginStamp {
  return value === "live-tle" || value === "fixture";
}

export function issTleFreshnessBandFromAgeMs(ageMs: number): IssTleFreshnessBand {
  const age = Math.max(0, ageMs);
  if (age <= ISS_TLE_FRESH_MAX_AGE_MS) return "fresh";
  if (age <= ISS_TLE_DEGRADED_MAX_AGE_MS) return "degraded";
  return "excessively-stale";
}

/**
 * Paint the ISS overlay only for a usable live (or last-good live) TLE.
 * Fixture is never presented as the current ISS.
 */
export function issTrackShouldPaint(provenance: IssTrackProvenance): boolean {
  if (provenance.origin === "fixture") return false;
  return (
    provenance.freshnessBand === "fresh" ||
    provenance.freshnessBand === "degraded"
  );
}

export function resolveIssTrackProvenance(options: {
  track: Readonly<{
    properties?: Readonly<Record<string, unknown>>;
  }>;
  acquiredAtMs: number;
  productUtcMs: number;
  lifecycleState: DynamicSourceLifecycleState;
}): IssTrackProvenance {
  const stamp = originStampFromTrack(options.track);
  const tle = tleLinesFromTrackProperties(options.track.properties);
  const originBase: IssTrackOriginStamp =
    stamp ?? (tle !== null ? "live-tle" : "fixture");
  const origin: IssTrackOrigin =
    originBase === "live-tle" && options.lifecycleState === "stale"
      ? "cached-live-tle"
      : originBase;
  const tleEpochUtcMs = tle !== null ? issTleEpochUnixMs(tle) : null;
  const ageMs =
    tleEpochUtcMs !== null && Number.isFinite(options.productUtcMs)
      ? options.productUtcMs - tleEpochUtcMs
      : null;
  const freshnessBand =
    ageMs !== null ? issTleFreshnessBandFromAgeMs(ageMs) : null;
  return {
    origin,
    tleEpochUtcMs,
    acquiredAtMs: options.acquiredAtMs,
    ageMs,
    freshnessBand,
    propagatedProductUtcMs: options.productUtcMs,
    tleProvider: tleProviderFromTrack(options.track),
  };
}

/**
 * Concise Layers hint. Epoch/age stay off the HUD; historical live-only copy
 * already covers product-time suppression.
 */
export function issConfigStatusHint(options: {
  enabled: boolean;
  productTimeLiveEnough: boolean;
  lifecycleState: DynamicSourceLifecycleState;
  provenance: IssTrackProvenance | null;
}): IssConfigStatusHint | null {
  if (!options.enabled || options.productTimeLiveEnough === false) {
    return null;
  }
  if (options.provenance === null) {
    if (options.lifecycleState === "loading") return "loading";
    return "unavailable";
  }
  if (!issTrackShouldPaint(options.provenance)) {
    return "unavailable";
  }
  if (
    options.provenance.origin !== "live-tle" ||
    options.provenance.freshnessBand === "degraded"
  ) {
    return "degraded";
  }
  return null;
}

export function issConfigStatusHintCopy(hint: IssConfigStatusHint): string {
  if (hint === "degraded") return "ISS orbital track is degraded.";
  if (hint === "loading") return "ISS orbital track is loading…";
  return "ISS orbital track is unavailable.";
}

function originStampFromTrack(track: {
  properties?: Readonly<Record<string, unknown>>;
}): IssTrackOriginStamp | null {
  const raw = track.properties?.[ISS_ORIGIN_PROPERTY];
  return isIssOriginStamp(raw) ? raw : null;
}

function isIssTleLiveProviderId(value: unknown): value is IssTleLiveProviderId {
  return value === "celestrak" || value === "wheretheiss-at";
}

function tleProviderFromTrack(track: {
  properties?: Readonly<Record<string, unknown>>;
}): IssTleLiveProviderId | null {
  const raw = track.properties?.[ISS_TLE_PROVIDER_PROPERTY];
  return isIssTleLiveProviderId(raw) ? raw : null;
}

export function issProvenanceFromPreparedTrack(options: {
  tracks: readonly DynamicTrack[];
  acquiredAtMs: number;
  productUtcMs: number;
  lifecycleState: DynamicSourceLifecycleState;
}): IssTrackProvenance | null {
  const first = options.tracks[0];
  if (first === undefined) return null;
  return resolveIssTrackProvenance({
    track: first,
    acquiredAtMs: options.acquiredAtMs,
    productUtcMs: options.productUtcMs,
    lifecycleState: options.lifecycleState,
  });
}
