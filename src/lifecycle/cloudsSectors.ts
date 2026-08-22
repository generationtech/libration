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
 * Clouds v3 geographic sectors. Each sector owns observation time, freshness,
 * and cadence. Do not force a common mosaic TIME across sectors.
 */

export const CLOUDS_SECTOR_EUMET_RING = "eumet-ring" as const;
export const CLOUDS_SECTOR_GOES_WEST = "goes-west" as const;
export const CLOUDS_SECTOR_GOES_EAST = "goes-east" as const;
export const CLOUDS_SECTOR_METEOSAT = "meteosat" as const;
export const CLOUDS_SECTOR_HIMAWARI = "himawari" as const;

export const CLOUDS_SECTOR_IDS = [
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_METEOSAT,
  CLOUDS_SECTOR_HIMAWARI,
] as const;

export type CloudsSectorId = (typeof CLOUDS_SECTOR_IDS)[number];

/** Regional GEO sectors that overwrite the ring inside their footprints. */
export const CLOUDS_REGIONAL_SECTOR_IDS = [
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_METEOSAT,
  CLOUDS_SECTOR_HIMAWARI,
] as const;

export type CloudsRegionalSectorId = (typeof CLOUDS_REGIONAL_SECTOR_IDS)[number];

/**
 * Stable bottom→top order among regionals when observation ages are within
 * hysteresis. East wins the Americas overlap; Himawari wins the Pacific
 * overlap with West; Meteosat owns Europe/Africa.
 */
export const CLOUDS_REGIONAL_STABLE_PAINT_ORDER: readonly CloudsRegionalSectorId[] =
  CLOUDS_REGIONAL_SECTOR_IDS;

export const CLOUDS_PROVIDER_EUMET = "eumet-worldcloudmap" as const;
export const CLOUDS_PROVIDER_EUMET_MSG_FES = "eumet-msg-fes" as const;
export const CLOUDS_PROVIDER_GIBS = "gibs-band13" as const;
export const CLOUDS_PROVIDER_GIBS_GOES_EAST = "gibs-goes-east" as const;
export const CLOUDS_PROVIDER_GIBS_GOES_WEST = "gibs-goes-west" as const;
export const CLOUDS_PROVIDER_GIBS_HIMAWARI = "gibs-himawari" as const;
export const CLOUDS_PROVIDER_COMPOSITE = "composite" as const;

export type CloudsProviderKind =
  | typeof CLOUDS_PROVIDER_EUMET
  | typeof CLOUDS_PROVIDER_EUMET_MSG_FES
  | typeof CLOUDS_PROVIDER_GIBS
  | typeof CLOUDS_PROVIDER_GIBS_GOES_EAST
  | typeof CLOUDS_PROVIDER_GIBS_GOES_WEST
  | typeof CLOUDS_PROVIDER_GIBS_HIMAWARI
  | typeof CLOUDS_PROVIDER_COMPOSITE;

/** Product catalog poll — GEO publication is ~10–15 min; ring is skipped internally. */
export const CLOUDS_COMPOSITE_REFRESH_INTERVAL_MS = 8 * 60 * 1000;

/** Do not re-GetMap the 3-hour ring more often than this when it is still valid. */
export const CLOUDS_EUMET_RING_MIN_REFETCH_MS = 30 * 60 * 1000;

export const CLOUDS_ACQUIRE_CONCURRENCY = 2;
export const CLOUDS_SECTOR_RETENTION = 3;
export const CLOUDS_GIBS_PROBE_WIDTH_PX = 128;
export const CLOUDS_GIBS_PROBE_HEIGHT_PX = 64;

/**
 * GIBS Band13 ingest lag observed ~70 min on 2026-08-22; 10-minute GEO
 * 30/90 min bands would mark every GIBS sector stale. Recent ≤ 2 h covers
 * that lag. Stale/suppress 4 h.
 */
export const CLOUDS_GIBS_GEO_FRESH_MAX_AGE_MS = 2 * 60 * 60 * 1000;
export const CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS = 4 * 60 * 60 * 1000;

/** MSG FES IR108: 15 min slots, ~20 min publication lag this session. */
export const CLOUDS_MSG_FES_FRESH_MAX_AGE_MS = 45 * 60 * 1000;
export const CLOUDS_MSG_FES_STALE_MAX_AGE_MS = 2 * 60 * 60 * 1000;

export const CLOUDS_EUMET_FRESH_MAX_AGE_MS = 4 * 60 * 60 * 1000;
export const CLOUDS_EUMET_STALE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

/** @deprecated WEATHER-2 stacked GIBS band; GEO sectors use GIBS_GEO bands. */
export const CLOUDS_GIBS_FRESH_MAX_AGE_MS = CLOUDS_GIBS_GEO_FRESH_MAX_AGE_MS;
/** @deprecated WEATHER-2 stacked GIBS band. */
export const CLOUDS_GIBS_STALE_MAX_AGE_MS = CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS;

export type CloudsSectorSpec = Readonly<{
  id: CloudsSectorId;
  label: string;
  providerKind: CloudsProviderKind;
  cadenceMs: number;
  freshMaxAgeMs: number;
  staleMaxAgeMs: number;
  minRefetchMs: number;
  /** Geographic backstop; painted under regionals. */
  isRing: boolean;
}>;

export const CLOUDS_SECTOR_SPECS: Readonly<Record<CloudsSectorId, CloudsSectorSpec>> = {
  [CLOUDS_SECTOR_EUMET_RING]: {
    id: CLOUDS_SECTOR_EUMET_RING,
    label: "EUMET ring",
    providerKind: CLOUDS_PROVIDER_EUMET,
    cadenceMs: 3 * 60 * 60 * 1000,
    freshMaxAgeMs: CLOUDS_EUMET_FRESH_MAX_AGE_MS,
    staleMaxAgeMs: CLOUDS_EUMET_STALE_MAX_AGE_MS,
    minRefetchMs: CLOUDS_EUMET_RING_MIN_REFETCH_MS,
    isRing: true,
  },
  [CLOUDS_SECTOR_GOES_WEST]: {
    id: CLOUDS_SECTOR_GOES_WEST,
    label: "GOES-West",
    providerKind: CLOUDS_PROVIDER_GIBS_GOES_WEST,
    cadenceMs: 10 * 60 * 1000,
    freshMaxAgeMs: CLOUDS_GIBS_GEO_FRESH_MAX_AGE_MS,
    staleMaxAgeMs: CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS,
    minRefetchMs: 8 * 60 * 1000,
    isRing: false,
  },
  [CLOUDS_SECTOR_GOES_EAST]: {
    id: CLOUDS_SECTOR_GOES_EAST,
    label: "GOES-East",
    providerKind: CLOUDS_PROVIDER_GIBS_GOES_EAST,
    cadenceMs: 10 * 60 * 1000,
    freshMaxAgeMs: CLOUDS_GIBS_GEO_FRESH_MAX_AGE_MS,
    staleMaxAgeMs: CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS,
    minRefetchMs: 8 * 60 * 1000,
    isRing: false,
  },
  [CLOUDS_SECTOR_METEOSAT]: {
    id: CLOUDS_SECTOR_METEOSAT,
    label: "Meteosat",
    providerKind: CLOUDS_PROVIDER_EUMET_MSG_FES,
    cadenceMs: 15 * 60 * 1000,
    freshMaxAgeMs: CLOUDS_MSG_FES_FRESH_MAX_AGE_MS,
    staleMaxAgeMs: CLOUDS_MSG_FES_STALE_MAX_AGE_MS,
    minRefetchMs: 8 * 60 * 1000,
    isRing: false,
  },
  [CLOUDS_SECTOR_HIMAWARI]: {
    id: CLOUDS_SECTOR_HIMAWARI,
    label: "Himawari",
    providerKind: CLOUDS_PROVIDER_GIBS_HIMAWARI,
    cadenceMs: 10 * 60 * 1000,
    freshMaxAgeMs: CLOUDS_GIBS_GEO_FRESH_MAX_AGE_MS,
    staleMaxAgeMs: CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS,
    minRefetchMs: 8 * 60 * 1000,
    isRing: false,
  },
};

export function isCloudsSectorId(value: unknown): value is CloudsSectorId {
  return (
    typeof value === "string" &&
    (CLOUDS_SECTOR_IDS as readonly string[]).includes(value)
  );
}

export function isCloudsProviderKind(value: unknown): value is CloudsProviderKind {
  return (
    value === CLOUDS_PROVIDER_EUMET ||
    value === CLOUDS_PROVIDER_EUMET_MSG_FES ||
    value === CLOUDS_PROVIDER_GIBS ||
    value === CLOUDS_PROVIDER_GIBS_GOES_EAST ||
    value === CLOUDS_PROVIDER_GIBS_GOES_WEST ||
    value === CLOUDS_PROVIDER_GIBS_HIMAWARI ||
    value === CLOUDS_PROVIDER_COMPOSITE
  );
}

export function cloudsSectorSpec(sectorId: CloudsSectorId): CloudsSectorSpec {
  return CLOUDS_SECTOR_SPECS[sectorId];
}

export function cloudsProviderFreshMaxAgeMs(provider: CloudsProviderKind): number {
  if (provider === CLOUDS_PROVIDER_EUMET) return CLOUDS_EUMET_FRESH_MAX_AGE_MS;
  if (provider === CLOUDS_PROVIDER_EUMET_MSG_FES) return CLOUDS_MSG_FES_FRESH_MAX_AGE_MS;
  if (provider === CLOUDS_PROVIDER_COMPOSITE) return CLOUDS_GIBS_GEO_FRESH_MAX_AGE_MS;
  return CLOUDS_GIBS_GEO_FRESH_MAX_AGE_MS;
}

export function cloudsProviderStaleMaxAgeMs(provider: CloudsProviderKind): number {
  if (provider === CLOUDS_PROVIDER_EUMET) return CLOUDS_EUMET_STALE_MAX_AGE_MS;
  if (provider === CLOUDS_PROVIDER_EUMET_MSG_FES) return CLOUDS_MSG_FES_STALE_MAX_AGE_MS;
  if (provider === CLOUDS_PROVIDER_COMPOSITE) return CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS;
  return CLOUDS_GIBS_GEO_STALE_MAX_AGE_MS;
}

export function cloudsSectorFreshMaxAgeMs(sectorId: CloudsSectorId): number {
  return CLOUDS_SECTOR_SPECS[sectorId].freshMaxAgeMs;
}

export function cloudsSectorStaleMaxAgeMs(sectorId: CloudsSectorId): number {
  return CLOUDS_SECTOR_SPECS[sectorId].staleMaxAgeMs;
}
