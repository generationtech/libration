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
 * Clouds live-authority selection. Coverage quality outranks a newer partial
 * mosaic. Do not compare providers solely on timestamp.
 */

export const CLOUDS_PROVIDER_EUMET = "eumet-worldcloudmap" as const;
export const CLOUDS_PROVIDER_GIBS = "gibs-band13" as const;

export type CloudsProviderKind =
  | typeof CLOUDS_PROVIDER_EUMET
  | typeof CLOUDS_PROVIDER_GIBS;

export const CLOUDS_EUMET_FRESH_MAX_AGE_MS = 4 * 60 * 60 * 1000;
export const CLOUDS_EUMET_STALE_MAX_AGE_MS = 8 * 60 * 60 * 1000;
export const CLOUDS_GIBS_FRESH_MAX_AGE_MS = 3 * 60 * 60 * 1000;
export const CLOUDS_GIBS_STALE_MAX_AGE_MS = 6 * 60 * 60 * 1000;

export type CloudsProviderCandidate =
  | Readonly<{ ok: true; observationAgeMs: number; coverageOk: boolean }>
  | Readonly<{ ok: false }>;

export type CloudsLiveAuthority = CloudsProviderKind | "none";

/**
 * EUMET global ring if usable and within its stale band.
 * Otherwise GIBS partial if usable and within its stale band.
 * Expired / uncovered / missing → none (caller may keep last-good).
 */
export function selectCloudsLiveAuthority(input: {
  eumet: CloudsProviderCandidate;
  gibs: CloudsProviderCandidate;
}): CloudsLiveAuthority {
  if (
    input.eumet.ok &&
    input.eumet.coverageOk &&
    input.eumet.observationAgeMs <= CLOUDS_EUMET_STALE_MAX_AGE_MS
  ) {
    return CLOUDS_PROVIDER_EUMET;
  }
  if (
    input.gibs.ok &&
    input.gibs.coverageOk &&
    input.gibs.observationAgeMs <= CLOUDS_GIBS_STALE_MAX_AGE_MS
  ) {
    return CLOUDS_PROVIDER_GIBS;
  }
  return "none";
}

export function cloudsProviderStaleMaxAgeMs(
  provider: CloudsProviderKind,
): number {
  return provider === CLOUDS_PROVIDER_EUMET
    ? CLOUDS_EUMET_STALE_MAX_AGE_MS
    : CLOUDS_GIBS_STALE_MAX_AGE_MS;
}

export function cloudsProviderFreshMaxAgeMs(
  provider: CloudsProviderKind,
): number {
  return provider === CLOUDS_PROVIDER_EUMET
    ? CLOUDS_EUMET_FRESH_MAX_AGE_MS
    : CLOUDS_GIBS_FRESH_MAX_AGE_MS;
}
