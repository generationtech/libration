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
 * Clouds origin, observation-age freshness, and paint eligibility.
 * Observation age is productUtcMs − validTimeMs (component TIME), never fetch time.
 * Freshness bands are source-specific. Composite status uses the visible
 * observation-age range, not one fake global TIME.
 */

import type { CloudsCompositeMeta } from "./dynamicSnapshotTypes";
import type { DynamicSourceLifecycleState } from "./dynamicLifecycleTypes";
import {
  CLOUDS_PROVIDER_COMPOSITE,
  CLOUDS_PROVIDER_EUMET,
  CLOUDS_SECTOR_SPECS,
  cloudsProviderFreshMaxAgeMs,
  cloudsProviderStaleMaxAgeMs,
  isCloudsProviderKind,
  isCloudsSectorId,
  type CloudsProviderKind,
  type CloudsSectorId,
} from "./cloudsSectors";

export const CLOUDS_OBSERVATION_FRESH_MAX_AGE_MS = 4 * 60 * 60 * 1000;
export const CLOUDS_OBSERVATION_STALE_MAX_AGE_MS = 8 * 60 * 60 * 1000;

export const CLOUDS_COVERAGE_NOTE =
  "Polar regions are not covered by the geostationary ring and stay transparent — not clear sky.";

export const CLOUDS_GLOBAL_COVERAGE_NOTE = CLOUDS_COVERAGE_NOTE;

export const CLOUDS_PARTIAL_COVERAGE_NOTE =
  "A regional sector is missing and no valid ring backstop covers that geography. Transparent is not clear sky. Polar holes remain.";

export const CLOUDS_EUMET_ATTRIBUTION =
  "Contains modified EUMETSAT Meteosat Geostationary Ring IR 10.8 µm (mumi:worldcloudmap_ir108) and Meteosat FES IR 10.8 µm (msg_fes:ir108) data 2026, via EUMETView WMS.";

export const CLOUDS_GIBS_ATTRIBUTION =
  "NASA GIBS GOES-East, GOES-West, and Himawari Band 13 Clean Infrared equirect PNG via in-app live WMS (explicit per-sector TIME).";

export const CLOUDS_CATALOG_ATTRIBUTION = `${CLOUDS_EUMET_ATTRIBUTION} ${CLOUDS_GIBS_ATTRIBUTION} Durable id global-clouds-ir-v1. DEV/tests may use a recorded PNG fixture; production never presents fixture as live.`;

export const CLOUDS_EUMET_LICENSE_NOTE =
  "EUMETView is a visualisation Web Map Service (not original numerical Recommended Data). Attribution required under the EUMETSAT Data Policy. Live feed URL is not persisted in SceneConfig — only the durable sourceId is.";

export const CLOUDS_GIBS_LICENSE_NOTE =
  "NASA GIBS / Earthdata imagery is free and open for public use with attribution. Live feed URL is not persisted in SceneConfig — only the durable sourceId is. Fixture bytes are app-local test/demo content.";

export type CloudsOriginStamp = "live" | "fixture";
export type CloudsOrigin = "live" | "cached-live" | "fixture";
export type CloudsObservationFreshnessBand = "fresh" | "stale" | "excessively-stale";
export type CloudsCoverageKind = "global" | "partial";

export type CloudsComponentProvenance = Readonly<{
  sectorId: CloudsSectorId;
  providerKind: CloudsProviderKind;
  observationTimeMs: number;
  acquiredAtMs: number;
  observationAgeMs: number | null;
  freshnessBand: CloudsObservationFreshnessBand | null;
}>;

export type CloudsProvenance = Readonly<{
  origin: CloudsOrigin;
  acquiredAtMs: number;
  validTimeMs: number;
  observationAgeMs: number | null;
  freshnessBand: CloudsObservationFreshnessBand | null;
  coverageKind: CloudsCoverageKind;
  providerKind: CloudsProviderKind | null;
  versionId: string;
  newestObservationTimeMs?: number;
  oldestObservationTimeMs?: number;
  components?: readonly CloudsComponentProvenance[];
  statusSectorIds?: readonly string[];
  ringFillsMissingRegional?: boolean;
}>;

export type CloudsConfigStatusHint =
  | "loading"
  | "recent"
  | "stale"
  | "mixed"
  | "unavailable"
  | "fixture";

export function isCloudsOriginStamp(value: unknown): value is CloudsOriginStamp {
  return value === "live" || value === "fixture";
}

export { isCloudsProviderKind };

export function cloudsObservationFreshnessBandFromAgeMs(
  ageMs: number,
  providerKind: CloudsProviderKind | null = CLOUDS_PROVIDER_EUMET,
): CloudsObservationFreshnessBand {
  const age = Math.max(0, ageMs);
  const provider = providerKind ?? CLOUDS_PROVIDER_EUMET;
  if (age <= cloudsProviderFreshMaxAgeMs(provider)) return "fresh";
  if (age <= cloudsProviderStaleMaxAgeMs(provider)) return "stale";
  return "excessively-stale";
}

export function cloudsSectorFreshnessBandFromAgeMs(
  ageMs: number,
  sectorId: CloudsSectorId,
): CloudsObservationFreshnessBand {
  const age = Math.max(0, ageMs);
  const spec = CLOUDS_SECTOR_SPECS[sectorId];
  if (age <= spec.freshMaxAgeMs) return "fresh";
  if (age <= spec.staleMaxAgeMs) return "stale";
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

function componentProvenanceFromMeta(
  meta: CloudsCompositeMeta,
  productUtcMs: number,
): CloudsComponentProvenance[] {
  const out: CloudsComponentProvenance[] = [];
  for (const c of meta.components) {
    if (!isCloudsSectorId(c.sectorId) || !isCloudsProviderKind(c.providerKind)) {
      continue;
    }
    const observationAgeMs = Number.isFinite(productUtcMs)
      ? productUtcMs - c.observationTimeMs
      : null;
    out.push({
      sectorId: c.sectorId,
      providerKind: c.providerKind,
      observationTimeMs: c.observationTimeMs,
      acquiredAtMs: c.acquiredAtMs,
      observationAgeMs,
      freshnessBand:
        observationAgeMs !== null
          ? cloudsSectorFreshnessBandFromAgeMs(observationAgeMs, c.sectorId)
          : null,
    });
  }
  return out;
}

function compositeFreshnessBand(
  components: readonly CloudsComponentProvenance[],
  statusSectorIds: readonly string[],
): CloudsObservationFreshnessBand | null {
  const visible = components.filter((c) => statusSectorIds.includes(c.sectorId));
  if (visible.length === 0) return null;
  let anyStale = false;
  for (const c of visible) {
    if (c.freshnessBand === "excessively-stale") return "excessively-stale";
    if (c.freshnessBand === "stale") anyStale = true;
  }
  return anyStale ? "stale" : "fresh";
}

export function resolveCloudsProvenance(options: {
  originStamp: CloudsOriginStamp | null;
  acquiredAtMs: number;
  validTimeMs: number;
  productUtcMs: number;
  lifecycleState: DynamicSourceLifecycleState;
  versionId: string;
  coverageKind?: CloudsCoverageKind;
  providerKind?: CloudsProviderKind | null;
  cloudComposite?: CloudsCompositeMeta | null;
}): CloudsProvenance {
  const originBase: CloudsOriginStamp = options.originStamp ?? "live";
  const origin: CloudsOrigin =
    originBase === "live" && options.lifecycleState === "stale"
      ? "cached-live"
      : originBase;
  const providerKind = options.providerKind ?? null;
  const composite = options.cloudComposite ?? null;
  const components =
    composite !== null ? componentProvenanceFromMeta(composite, options.productUtcMs) : undefined;
  const statusSectorIds = composite?.statusSectorIds;
  const newestObservationTimeMs = composite?.newestObservationTimeMs;
  const oldestObservationTimeMs = composite?.oldestObservationTimeMs;
  const rangeNewest = newestObservationTimeMs ?? options.validTimeMs;
  const observationAgeMs = Number.isFinite(options.productUtcMs)
    ? options.productUtcMs - rangeNewest
    : null;
  const freshnessBand =
    components !== undefined && statusSectorIds !== undefined
      ? compositeFreshnessBand(components, statusSectorIds)
      : observationAgeMs !== null
        ? cloudsObservationFreshnessBandFromAgeMs(observationAgeMs, providerKind)
        : null;
  return {
    origin,
    acquiredAtMs: options.acquiredAtMs,
    validTimeMs: options.validTimeMs,
    observationAgeMs,
    freshnessBand,
    coverageKind: options.coverageKind ?? "global",
    providerKind,
    versionId: options.versionId,
    ...(newestObservationTimeMs !== undefined ? { newestObservationTimeMs } : {}),
    ...(oldestObservationTimeMs !== undefined ? { oldestObservationTimeMs } : {}),
    ...(components !== undefined ? { components } : {}),
    ...(statusSectorIds !== undefined ? { statusSectorIds } : {}),
    ...(composite !== null
      ? { ringFillsMissingRegional: composite.ringFillsMissingRegional }
      : {}),
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
  const statusComponents = options.provenance.components?.filter((c) =>
    (options.provenance?.statusSectorIds ?? []).includes(c.sectorId),
  );
  if (statusComponents !== undefined && statusComponents.length > 1) {
    const bands = new Set(statusComponents.map((c) => c.freshnessBand));
    if (bands.has("stale") && bands.has("fresh")) {
      return "mixed";
    }
  }
  if (
    options.provenance.origin === "cached-live" ||
    options.provenance.freshnessBand === "stale"
  ) {
    return "stale";
  }
  return "recent";
}

function formatAgeMinutesHours(ageMs: number): { minutes: number; hours: number } {
  const minutes = Math.max(0, Math.round(Math.max(0, ageMs) / 60_000));
  const hours = Math.max(0, ageMs) / 3_600_000;
  return { minutes, hours };
}

function formatObservationAgeLabel(ageMs: number | null | undefined): string | null {
  if (ageMs === null || ageMs === undefined || !Number.isFinite(ageMs)) {
    return null;
  }
  const { minutes, hours } = formatAgeMinutesHours(ageMs);
  if (hours < 1) {
    if (minutes <= 0) return null;
    return `${minutes} min`;
  }
  if (hours < 1.5 && minutes < 90) {
    return `${minutes} min`;
  }
  const rounded = Math.round(hours);
  return `${rounded}h`;
}

function formatAgeToken(ageMs: number): string {
  const { minutes, hours } = formatAgeMinutesHours(ageMs);
  if (hours < 1) return `${Math.max(1, minutes)}m`;
  if (hours < 1.5) return `${Math.max(1, minutes)}m`;
  const roundedHours = Math.round(hours);
  if (roundedHours < 2 && minutes >= 60 && minutes % 60 !== 0 && minutes < 90) {
    return `${minutes}m`;
  }
  return `${roundedHours}h`;
}

export function formatCloudsObservationAgeRange(
  oldestAgeMs: number,
  newestAgeMs: number,
): string | null {
  if (!Number.isFinite(oldestAgeMs) || !Number.isFinite(newestAgeMs)) return null;
  const older = Math.max(0, oldestAgeMs, newestAgeMs);
  const newer = Math.max(0, Math.min(oldestAgeMs, newestAgeMs));
  if (Math.abs(older - newer) < 30_000) {
    const single = formatObservationAgeLabel(older);
    return single;
  }
  const olderHours = older / 3_600_000;
  const newerHours = newer / 3_600_000;
  if (olderHours < 1 && newerHours < 1) {
    const a = Math.max(1, Math.round(newer / 60_000));
    const b = Math.max(a, Math.round(older / 60_000));
    return `${a}–${b} min`;
  }
  return `${formatAgeToken(newer)}–${formatAgeToken(older)}`;
}

function formatMosaicUtcLabel(validTimeMs: number): string | null {
  if (!Number.isFinite(validTimeMs)) return null;
  const iso = new Date(validTimeMs).toISOString();
  const m = /^(\d{4}-\d{2}-\d{2}T)(\d{2}:\d{2}):\d{2}/.exec(iso);
  if (m === null || m[2] === undefined) return null;
  return `${m[2]} UTC`;
}

function coverageStatusSuffix(provenance: CloudsProvenance | null): string {
  if (provenance === null) return "";
  if (provenance.coverageKind === "partial") {
    return " · partial coverage";
  }
  return "";
}

export function cloudsConfigStatusHintCopy(
  hint: CloudsConfigStatusHint,
  provenance: CloudsProvenance | null = null,
): string {
  if (hint === "loading") return "Clouds loading…";
  if (hint === "unavailable") return "Cloud data unavailable";
  if (hint === "fixture") return "Clouds (DEV fixture)";

  const newest = provenance?.newestObservationTimeMs ?? provenance?.validTimeMs;
  const oldest = provenance?.oldestObservationTimeMs ?? provenance?.validTimeMs;
  const productAgeNewest =
    provenance !== null && newest !== undefined && provenance.observationAgeMs !== null
      ? provenance.observationAgeMs
      : null;
  const oldestAge =
    provenance !== null &&
    oldest !== undefined &&
    newest !== undefined &&
    productAgeNewest !== null
      ? productAgeNewest + (newest - oldest)
      : productAgeNewest;
  const rangeLabel =
    productAgeNewest !== null && oldestAge !== null
      ? formatCloudsObservationAgeRange(oldestAge, productAgeNewest)
      : formatObservationAgeLabel(provenance?.observationAgeMs);
  const coverage = coverageStatusSuffix(provenance);
  const mosaic = provenance !== null ? formatMosaicUtcLabel(provenance.validTimeMs) : null;

  if (hint === "mixed") {
    if (rangeLabel !== null) {
      return `Clouds · mixed freshness · ${rangeLabel} old${coverage}`;
    }
    return `Clouds · mixed freshness${coverage}`;
  }
  if (hint === "stale") {
    if (rangeLabel !== null) {
      return `Clouds stale · ${rangeLabel} old${coverage}`;
    }
    return mosaic !== null
      ? `Clouds stale · mosaic ${mosaic}${coverage}`
      : `Clouds stale${coverage}`;
  }
  if (rangeLabel !== null) {
    const lead =
      provenance?.providerKind === CLOUDS_PROVIDER_COMPOSITE ||
      (provenance?.components !== undefined && provenance.components.length > 1)
        ? "Clouds · observations"
        : provenance?.coverageKind === "partial"
          ? "Clouds · observations"
          : "Clouds · observations";
    return `${lead} ${rangeLabel} old${coverage}`;
  }
  return mosaic !== null
    ? `Clouds · mosaic ${mosaic}${coverage}`
    : provenance?.coverageKind === "partial"
      ? "Clouds · partial coverage"
      : "Clouds · polar gaps";
}

export function cloudsComponentObservationLines(
  provenance: CloudsProvenance,
): string[] {
  const statusIds = provenance.statusSectorIds;
  const components =
    statusIds !== undefined && statusIds.length > 0
      ? (provenance.components ?? []).filter((c) => statusIds.includes(c.sectorId))
      : (provenance.components ?? []);
  return components.map((c) => {
    const label = CLOUDS_SECTOR_SPECS[c.sectorId].label;
    const age = formatObservationAgeLabel(c.observationAgeMs);
    return age !== null ? `${label} · observed ${age} ago` : `${label} · observed`;
  });
}

export function originStampFromPreparedEquirect(view: {
  origin?: unknown;
}): CloudsOriginStamp | null {
  return isCloudsOriginStamp(view.origin) ? view.origin : null;
}
