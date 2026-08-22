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
 * Best-current Clouds composition. Each sector keeps its own observation time.
 * Do not force min(latestEast, latestWest, latestMeteosat, latestHimawari).
 * No temporal interpolation and no nowcast.
 */

import type { CloudsCompositeMeta } from "./dynamicSnapshotTypes";
import {
  CLOUDS_REGIONAL_SECTOR_IDS,
  CLOUDS_REGIONAL_STABLE_PAINT_ORDER,
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_SPECS,
  type CloudsRegionalSectorId,
  type CloudsSectorId,
} from "./cloudsSectors";

export type CloudsComponentCandidate = Readonly<{
  sectorId: CloudsSectorId;
  observationTimeMs: number;
  acquiredAtMs: number;
  coverageOk: boolean;
}>;

export type CloudsPaintedComponent = Readonly<{
  sectorId: CloudsSectorId;
  observationTimeMs: number;
  acquiredAtMs: number;
}>;

export type CloudsHighlightLayer = Readonly<{
  sectorId: CloudsSectorId;
  width: number;
  height: number;
  /** Derived cloud-highlight RGBA. Alpha is cloud signal, not coverage. */
  rgba: Uint8Array;
  /**
   * Provider coverage plane: 0 = no data, >0 = valid observation.
   * Length is width * height. Authoritative clear is coverage > 0 with
   * rgba alpha 0.
   */
  coverageMask: Uint8Array;
}>;

function regionalStableIndex(sectorId: CloudsRegionalSectorId): number {
  return CLOUDS_REGIONAL_STABLE_PAINT_ORDER.indexOf(sectorId);
}

function isRegionalSectorId(id: CloudsSectorId): id is CloudsRegionalSectorId {
  return (CLOUDS_REGIONAL_SECTOR_IDS as readonly string[]).includes(id);
}

/**
 * Include a sector when coverage is usable and observation age is within its
 * own stale band. Ages are independent — a fresh East is not delayed for West.
 */
export function selectCloudsPaintableComponents(
  candidates: readonly CloudsComponentCandidate[],
  productUtcMs: number,
): CloudsPaintedComponent[] {
  const out: CloudsPaintedComponent[] = [];
  for (const c of candidates) {
    if (!c.coverageOk) continue;
    if (!Number.isFinite(c.observationTimeMs) || !Number.isFinite(c.acquiredAtMs)) {
      continue;
    }
    const age = productUtcMs - c.observationTimeMs;
    if (age > CLOUDS_SECTOR_SPECS[c.sectorId].staleMaxAgeMs) continue;
    out.push({
      sectorId: c.sectorId,
      observationTimeMs: c.observationTimeMs,
      acquiredAtMs: c.acquiredAtMs,
    });
  }
  return out;
}

/**
 * Paint order: ring baseline first (if present), then regionals.
 * When two regionals differ by at least one cadence, the fresher paints later
 * (on top). Near-equal ages keep stable geographic priority so the composite
 * does not flicker every poll.
 */
export function cloudsCompositePaintOrder(
  painted: readonly CloudsPaintedComponent[],
  productUtcMs: number,
): CloudsSectorId[] {
  const ring = painted.find((c) => c.sectorId === CLOUDS_SECTOR_EUMET_RING);
  const regionals = painted.filter((c): c is CloudsPaintedComponent & {
    sectorId: CloudsRegionalSectorId;
  } => isRegionalSectorId(c.sectorId));
  regionals.sort((a, b) => {
    const ageA = productUtcMs - a.observationTimeMs;
    const ageB = productUtcMs - b.observationTimeMs;
    const hyst = Math.max(
      CLOUDS_SECTOR_SPECS[a.sectorId].cadenceMs,
      CLOUDS_SECTOR_SPECS[b.sectorId].cadenceMs,
    );
    if (Math.abs(ageA - ageB) >= hyst) {
      return ageB - ageA;
    }
    return regionalStableIndex(a.sectorId) - regionalStableIndex(b.sectorId);
  });
  const order: CloudsSectorId[] = [];
  if (ring !== undefined) order.push(CLOUDS_SECTOR_EUMET_RING);
  for (const r of regionals) order.push(r.sectorId);
  return order;
}

/**
 * Status ages come from painted regionals. The ring is included only when it
 * is filling at least one missing regional footprint — not merely because it
 * peeks through disk gaps under fresh sector data.
 */
export function selectCloudsStatusComponents(
  painted: readonly CloudsPaintedComponent[],
): {
  components: CloudsPaintedComponent[];
  ringFillsMissingRegional: boolean;
} {
  const byId = new Map(painted.map((c) => [c.sectorId, c]));
  const regionals = CLOUDS_REGIONAL_SECTOR_IDS.map((id) => byId.get(id)).filter(
    (c): c is CloudsPaintedComponent => c !== undefined,
  );
  const ring = byId.get(CLOUDS_SECTOR_EUMET_RING);
  const missingRegional = regionals.length < CLOUDS_REGIONAL_SECTOR_IDS.length;
  const ringFillsMissingRegional = missingRegional && ring !== undefined;
  if (regionals.length === 0) {
    return {
      components: ring !== undefined ? [ring] : [],
      ringFillsMissingRegional: ring !== undefined,
    };
  }
  if (ringFillsMissingRegional && ring !== undefined) {
    return { components: [...regionals, ring], ringFillsMissingRegional: true };
  }
  return { components: regionals, ringFillsMissingRegional: false };
}

export function cloudsCompositeObservationRange(components: readonly CloudsPaintedComponent[]): {
  newestObservationTimeMs: number;
  oldestObservationTimeMs: number;
} | null {
  if (components.length === 0) return null;
  let newest = components[0]!.observationTimeMs;
  let oldest = components[0]!.observationTimeMs;
  for (const c of components) {
    if (c.observationTimeMs > newest) newest = c.observationTimeMs;
    if (c.observationTimeMs < oldest) oldest = c.observationTimeMs;
  }
  return { newestObservationTimeMs: newest, oldestObservationTimeMs: oldest };
}

export function buildCloudsCompositeMeta(
  painted: readonly CloudsPaintedComponent[],
): CloudsCompositeMeta | null {
  const status = selectCloudsStatusComponents(painted);
  const range = cloudsCompositeObservationRange(status.components);
  if (range === null) return null;
  return {
    newestObservationTimeMs: range.newestObservationTimeMs,
    oldestObservationTimeMs: range.oldestObservationTimeMs,
    components: painted.map((c) => ({
      sectorId: c.sectorId,
      providerKind: CLOUDS_SECTOR_SPECS[c.sectorId].providerKind,
      observationTimeMs: c.observationTimeMs,
      acquiredAtMs: c.acquiredAtMs,
    })),
    statusSectorIds: status.components.map((c) => c.sectorId),
    ringFillsMissingRegional: status.ringFillsMissingRegional,
  };
}

/**
 * Coverage-authority replacement: later selected sources own every pixel
 * where they have valid provider coverage, including cloud signal 0
 * (authoritative clear). No-data (coverage 0) leaves the destination.
 * Cloud signal is copied, not alpha-blended with earlier sources.
 * Same dimensions required.
 */
export function compositeCloudHighlightLayers(
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
): { width: number; height: number; rgba: Uint8Array } | null {
  if (layers.length === 0 || paintOrder.length === 0) return null;
  const byId = new Map(layers.map((l) => [l.sectorId, l]));
  const first = byId.get(paintOrder[0]!);
  if (first === undefined) return null;
  const { width, height } = first;
  const pixelCount = width * height;
  const out = new Uint8Array(pixelCount * 4);
  for (const sectorId of paintOrder) {
    const layer = byId.get(sectorId);
    if (layer === undefined) continue;
    if (layer.width !== width || layer.height !== height) return null;
    const src = layer.rgba;
    const coverage = layer.coverageMask;
    if (src.length < pixelCount * 4 || coverage.length < pixelCount) return null;
    for (let i = 0; i < pixelCount; i++) {
      if (coverage[i]! === 0) continue;
      const o = i * 4;
      out[o] = src[o]!;
      out[o + 1] = src[o + 1]!;
      out[o + 2] = src[o + 2]!;
      out[o + 3] = src[o + 3]!;
    }
  }
  return { width, height, rgba: out };
}
