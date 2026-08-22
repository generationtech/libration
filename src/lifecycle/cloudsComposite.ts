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
  /**
   * Viewing-quality plane: 0 = extreme geometry, 255 = nadir-quality.
   * Missing means full usable quality (255). Quality 0 is still coverage.
   * Quality 0 does not punch coverage holes. For the ring, missing quality
   * is treated as good (q>0); production attaches the component-geometry plane.
   */
  qualityWeight?: Uint8Array;
  /** Observation time for freshness-vs-quality. Missing treats age as equal. */
  observationTimeMs?: number;
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
 * actually owns geographic pixels in the composed product — not merely because
 * it was fetched, and not merely because it peeks through disk gaps under
 * usable q>0 regional coverage.
 *
 * `ringOwnsPixels` is the composed-product truth. When omitted, a missing
 * regional plus a painted ring is treated as contributing (legacy heuristic
 * for callers that have not scanned the winner map).
 */
export function selectCloudsStatusComponents(
  painted: readonly CloudsPaintedComponent[],
  ringOwnsPixels?: boolean,
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
  const ringContributes =
    ring !== undefined &&
    (ringOwnsPixels === true ||
      (ringOwnsPixels === undefined && (regionals.length === 0 || missingRegional)));
  if (regionals.length === 0) {
    return {
      components: ringContributes && ring !== undefined ? [ring] : [],
      ringFillsMissingRegional: ringContributes,
    };
  }
  if (ringContributes && ring !== undefined) {
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
  ringOwnsPixels?: boolean,
): CloudsCompositeMeta | null {
  const status = selectCloudsStatusComponents(painted, ringOwnsPixels);
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

/** Composite-result cache identity. Transfer version is independent. */
export const CLOUDS_COMPOSITE_AUTHORITY_VERSION = "wx53-ring-geo-q1";

type RegionalOverlapSlot = Readonly<{
  layer: CloudsHighlightLayer;
  coverage: Uint8Array;
  quality: Uint8Array | null;
  rgba: Uint8Array;
  ageMs: number;
  cadenceMs: number;
  stableIndex: number;
}>;

function layerAgeMs(layer: CloudsHighlightLayer, productUtcMs: number): number {
  const t = layer.observationTimeMs;
  if (t === undefined || !Number.isFinite(t) || !Number.isFinite(productUtcMs)) {
    return 0;
  }
  return productUtcMs - t;
}

function slotQualityAt(slot: RegionalOverlapSlot, i: number): number {
  if (slot.quality === null) return 255;
  return slot.quality[i] ?? 0;
}

function fresherOrStableBeats(a: RegionalOverlapSlot, b: RegionalOverlapSlot): boolean {
  const hyst = Math.max(a.cadenceMs, b.cadenceMs);
  if (Math.abs(a.ageMs - b.ageMs) >= hyst) {
    return a.ageMs < b.ageMs;
  }
  return a.stableIndex > b.stableIndex;
}

/**
 * Lexicographic overlap authority for two regional observations that both
 * have valid coverage at a pixel.
 *
 * 1. If one has quality == 0 and the other quality > 0, the usable source wins.
 * 2. If both have quality == 0, existing freshness / stable-order.
 * 3. If both are usable and |age difference| ≥ max(cadence), fresher wins.
 * 4. Otherwise higher viewing quality wins.
 * 5. Genuine ties use stable West → East → Meteosat → Himawari (later wins).
 */
function cloudsRegionalOverlapChallengerBeats(
  challenger: RegionalOverlapSlot,
  incumbent: RegionalOverlapSlot,
  pixelIndex: number,
): boolean {
  const qA = slotQualityAt(challenger, pixelIndex);
  const qB = slotQualityAt(incumbent, pixelIndex);
  const usableA = qA > 0;
  const usableB = qB > 0;
  if (usableA !== usableB) return usableA;
  if (!usableA && !usableB) {
    return fresherOrStableBeats(challenger, incumbent);
  }
  const hyst = Math.max(challenger.cadenceMs, incumbent.cadenceMs);
  if (Math.abs(challenger.ageMs - incumbent.ageMs) >= hyst) {
    return challenger.ageMs < incumbent.ageMs;
  }
  if (qA !== qB) return qA > qB;
  return challenger.stableIndex > incumbent.stableIndex;
}

export function cloudsOverlapCadenceThresholdMs(
  sectorA: CloudsRegionalSectorId,
  sectorB: CloudsRegionalSectorId,
): number {
  return Math.max(
    CLOUDS_SECTOR_SPECS[sectorA].cadenceMs,
    CLOUDS_SECTOR_SPECS[sectorB].cadenceMs,
  );
}

function prepareOverlapSlots(
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
  productUtcMs: number,
): {
  width: number;
  height: number;
  pixelCount: number;
  ring: RegionalOverlapSlot | null;
  regionals: RegionalOverlapSlot[];
} | null {
  if (layers.length === 0 || paintOrder.length === 0) return null;
  const byId = new Map(layers.map((l) => [l.sectorId, l]));
  const first = byId.get(paintOrder[0]!);
  if (first === undefined) return null;
  const { width, height } = first;
  const pixelCount = width * height;
  let ring: RegionalOverlapSlot | null = null;
  const regionals: RegionalOverlapSlot[] = [];
  for (const sectorId of paintOrder) {
    const layer = byId.get(sectorId);
    if (layer === undefined) continue;
    if (layer.width !== width || layer.height !== height) return null;
    const src = layer.rgba;
    const coverage = layer.coverageMask;
    if (src.length < pixelCount * 4 || coverage.length < pixelCount) return null;
    if (
      layer.qualityWeight !== undefined &&
      layer.qualityWeight.length < pixelCount
    ) {
      return null;
    }
    const slot: RegionalOverlapSlot = {
      layer,
      coverage,
      quality: layer.qualityWeight ?? null,
      rgba: src,
      ageMs: layerAgeMs(layer, productUtcMs),
      cadenceMs: CLOUDS_SECTOR_SPECS[sectorId].cadenceMs,
      stableIndex: isRegionalSectorId(sectorId) ? regionalStableIndex(sectorId) : -1,
    };
    if (sectorId === CLOUDS_SECTOR_EUMET_RING) {
      ring = slot;
      continue;
    }
    if (isRegionalSectorId(sectorId)) {
      regionals.push(slot);
    }
  }
  return { width, height, pixelCount, ring, regionals };
}

function copyLayerPixel(out: Uint8Array, src: Uint8Array, i: number): void {
  const o = i * 4;
  out[o] = src[o]!;
  out[o + 1] = src[o + 1]!;
  out[o + 2] = src[o + 2]!;
  out[o + 3] = src[o + 3]!;
}

function pickCoveringRegionalWinner(
  regionals: readonly RegionalOverlapSlot[],
  i: number,
): RegionalOverlapSlot | null {
  let best: RegionalOverlapSlot | null = null;
  for (const slot of regionals) {
    if (slot.coverage[i]! === 0) continue;
    if (best === null || cloudsRegionalOverlapChallengerBeats(slot, best, i)) {
      best = slot;
    }
  }
  return best;
}

function pickUsableRegionalWinner(
  regionals: readonly RegionalOverlapSlot[],
  i: number,
): RegionalOverlapSlot | null {
  let best: RegionalOverlapSlot | null = null;
  for (const slot of regionals) {
    if (slot.coverage[i]! === 0) continue;
    if (slotQualityAt(slot, i) === 0) continue;
    if (best === null || cloudsRegionalOverlapChallengerBeats(slot, best, i)) {
      best = slot;
    }
  }
  return best;
}

function pickZeroQualityRegionalWinner(
  regionals: readonly RegionalOverlapSlot[],
  i: number,
): RegionalOverlapSlot | null {
  let best: RegionalOverlapSlot | null = null;
  for (const slot of regionals) {
    if (slot.coverage[i]! === 0) continue;
    if (slotQualityAt(slot, i) !== 0) continue;
    if (best === null || fresherOrStableBeats(slot, best)) {
      best = slot;
    }
  }
  return best;
}

function ringHasCoverage(ring: RegionalOverlapSlot | null, i: number): boolean {
  return ring !== null && ring.coverage[i]! !== 0;
}

/**
 * Final per-pixel authority:
 * 1. usable regional (coverage && q>0) — existing WEATHER-4.3 lex rule
 * 2. good ring (provider coverage && ring q>0)
 * 3. q=0 regional — existing freshness / stable order
 * 4. poor ring (provider coverage && ring q==0)
 * 5. no data
 *
 * Coverage is unchanged. Quality 0 remains observational coverage.
 * Ring q>0 means at least one documented ring component views the pixel
 * at θ<75°. Classes are compared, not raw regional-vs-ring q magnitudes.
 */
function pickCompositeAuthority(
  regionals: readonly RegionalOverlapSlot[],
  ring: RegionalOverlapSlot | null,
  i: number,
): RegionalOverlapSlot | null {
  const usable = pickUsableRegionalWinner(regionals, i);
  if (usable !== null) return usable;
  if (ringHasCoverage(ring, i) && slotQualityAt(ring!, i) > 0) return ring;
  const zeroQuality = pickZeroQualityRegionalWinner(regionals, i);
  if (zeroQuality !== null) return zeroQuality;
  if (ringHasCoverage(ring, i)) return ring;
  return null;
}

export type CloudsCompositeRgba = Readonly<{
  width: number;
  height: number;
  rgba: Uint8Array;
  ringOwnsPixels: boolean;
}>;

/**
 * Coverage-then-quality replacement. Usable (q>0) regionals keep the
 * WEATHER-4.3 lexicographic winner and still suppress the ring, including
 * cloud signal 0. When every covering regional is q=0, a paintable ring with
 * provider coverage and ring q>0 wins; otherwise q=0 regional wins; poor
 * (q=0) ring still paints if no regional covers. Quality 0 does not punch
 * coverage holes. Cloud signal is copied, not blended. Same dimensions required.
 */
export function compositeCloudHighlightLayers(
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
  productUtcMs = 0,
): CloudsCompositeRgba | null {
  const prepared = prepareOverlapSlots(layers, paintOrder, productUtcMs);
  if (prepared === null) return null;
  const { width, height, pixelCount, ring, regionals } = prepared;
  const out = new Uint8Array(pixelCount * 4);
  let ringOwnsPixels = false;
  for (let i = 0; i < pixelCount; i++) {
    const winner = pickCompositeAuthority(regionals, ring, i);
    if (winner === null) continue;
    copyLayerPixel(out, winner.rgba, i);
    if (winner === ring) ringOwnsPixels = true;
  }
  return { width, height, rgba: out, ringOwnsPixels };
}

/**
 * Per-pixel selected source for DEV diagnostics. Same authority as
 * composition: usable regional, else good ring, else q=0 regional, else poor ring.
 */
export function resolveCloudsCompositeWinnerSectorIds(
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
  productUtcMs = 0,
): { width: number; height: number; winners: Int8Array; ringOwnsPixels: boolean } | null {
  const prepared = prepareOverlapSlots(layers, paintOrder, productUtcMs);
  if (prepared === null) return null;
  const { width, height, pixelCount, ring, regionals } = prepared;
  const indexById = new Map(paintOrder.map((id, idx) => [id, idx]));
  const winners = new Int8Array(pixelCount);
  winners.fill(-1);
  let ringOwnsPixels = false;
  for (let i = 0; i < pixelCount; i++) {
    const winner = pickCompositeAuthority(regionals, ring, i);
    if (winner === null) continue;
    winners[i] = indexById.get(winner.layer.sectorId) ?? -1;
    if (winner === ring) ringOwnsPixels = true;
  }
  return { width, height, winners, ringOwnsPixels };
}

/**
 * WEATHER-4.3 regional-only winner (all covering regionals, ring ignored).
 * Used to prove q>0 identity and to diagnose q=0 pixels the ring may replace.
 */
export function resolveCloudsRegionalOnlyWinnerSectorIds(
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
  productUtcMs = 0,
): { width: number; height: number; winners: Int8Array } | null {
  const prepared = prepareOverlapSlots(layers, paintOrder, productUtcMs);
  if (prepared === null) return null;
  const { width, height, pixelCount, regionals } = prepared;
  const indexById = new Map(paintOrder.map((id, idx) => [id, idx]));
  const winners = new Int8Array(pixelCount);
  winners.fill(-1);
  for (let i = 0; i < pixelCount; i++) {
    const winner = pickCoveringRegionalWinner(regionals, i);
    if (winner !== null) {
      winners[i] = indexById.get(winner.layer.sectorId) ?? -1;
    }
  }
  return { width, height, winners };
}

export function pixelHasUsableRegionalCoverage(
  layers: readonly CloudsHighlightLayer[],
  i: number,
): boolean {
  for (const layer of layers) {
    if (layer.sectorId === CLOUDS_SECTOR_EUMET_RING) continue;
    if (layer.coverageMask[i]! === 0) continue;
    const q = layer.qualityWeight?.[i] ?? 255;
    if (q > 0) return true;
  }
  return false;
}
