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
 * DEV-only Clouds sector diagnostic. Production never imports this module.
 * Ordinary current-time mode only (not a `?scenario=`):
 *   ?cloudsSectorDebug=1|coverage — coverage footprints (paint-order, ignore quality)
 *   ?cloudsSectorDebug=winner — quality-aware selected source (ring distinct)
 *   ?cloudsSectorDebug=ring — pixels the ring actually owns after authority
 *   ?cloudsSectorDebug=q0ring — covering regional would be q=0 and ring is available
 *   ?cloudsSectorDebug=quality — selected-source quality (nadir bright, limb dark)
 *   ?cloudsSectorDebug=signal — derived cloud-confidence winners
 *   ?cloudsSectorDebug=canonical — winner canonical display-IR (grayscale)
 *   ?cloudsSectorDebug=leak — pixels where the selected source is clear and
 *     suppressed another source's cloud
 */

import type { CloudsHighlightLayer } from "../lifecycle/cloudsComposite";
import {
  pixelHasUsableRegionalCoverage,
  resolveCloudsCompositeWinnerSectorIds,
  resolveCloudsRegionalOnlyWinnerSectorIds,
} from "../lifecycle/cloudsComposite";
import {
  CLOUDS_SECTOR_EUMET_RING,
  CLOUDS_SECTOR_GOES_EAST,
  CLOUDS_SECTOR_GOES_WEST,
  CLOUDS_SECTOR_HIMAWARI,
  CLOUDS_SECTOR_METEOSAT,
  isCloudsSectorId,
  type CloudsSectorId,
} from "../lifecycle/cloudsSectors";
import type { DevCloudsSectorDebugTintFn } from "./visualScenarioRuntime";

export type CloudsSectorDebugMode =
  | "coverage"
  | "winner"
  | "ring"
  | "q0ring"
  | "quality"
  | "signal"
  | "canonical"
  | "leak";

export const CLOUDS_SECTOR_DEBUG_TINT: Readonly<
  Record<CloudsSectorId, readonly [number, number, number]>
> = {
  [CLOUDS_SECTOR_EUMET_RING]: [180, 90, 255],
  [CLOUDS_SECTOR_GOES_WEST]: [80, 180, 220],
  [CLOUDS_SECTOR_GOES_EAST]: [220, 90, 160],
  [CLOUDS_SECTOR_METEOSAT]: [230, 200, 70],
  [CLOUDS_SECTOR_HIMAWARI]: [90, 200, 110],
};

const LEAK_RGB = [255, 64, 48] as const;
const Q0_RING_RGB = [255, 140, 40] as const;

let debugMode: CloudsSectorDebugMode = "coverage";

export function parseCloudsSectorDebugMode(
  value: string | null,
): CloudsSectorDebugMode | null {
  if (value === null) return null;
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "coverage") return "coverage";
  if (v === "winner") return "winner";
  if (v === "ring") return "ring";
  if (v === "q0ring" || v === "q0-ring" || v === "limb") return "q0ring";
  if (v === "quality" || v === "q") return "quality";
  if (v === "signal" || v === "cloud") return "signal";
  if (v === "canonical" || v === "canonicalir" || v === "ir") return "canonical";
  if (v === "leak") return "leak";
  return null;
}

export function setDevCloudsSectorDebugMode(mode: CloudsSectorDebugMode): void {
  debugMode = mode;
}

export function getDevCloudsSectorDebugMode(): CloudsSectorDebugMode {
  return debugMode;
}

function layerHasCoverage(layer: CloudsHighlightLayer, i: number): boolean {
  const mask = layer.coverageMask;
  if (mask !== undefined && i < mask.length) return mask[i]! > 0;
  return layer.rgba[i * 4 + 3]! > 0;
}

function layerQualityAt(layer: CloudsHighlightLayer, i: number): number {
  const q = layer.qualityWeight;
  if (q !== undefined && i < q.length) return q[i]!;
  return 255;
}

function coveragePaintOrderWinners(
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
  pixelCount: number,
): Int8Array {
  const winner = new Int8Array(pixelCount);
  winner.fill(-1);
  for (let li = 0; li < paintOrder.length; li++) {
    const layer = layers.find((l) => l.sectorId === paintOrder[li]);
    if (layer === undefined) continue;
    for (let i = 0; i < pixelCount; i++) {
      if (layerHasCoverage(layer, i)) winner[i] = li;
    }
  }
  return winner;
}

function signalPaintOrderWinners(
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
  pixelCount: number,
): Int8Array {
  const winner = new Int8Array(pixelCount);
  winner.fill(-1);
  for (let li = 0; li < paintOrder.length; li++) {
    const layer = layers.find((l) => l.sectorId === paintOrder[li]);
    if (layer === undefined) continue;
    for (let i = 0; i < pixelCount; i++) {
      if (layer.rgba[i * 4 + 3]! > 0) winner[i] = li;
    }
  }
  return winner;
}

export function tintCloudsCompositeByWinningSector(
  base: Uint8Array,
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
  mode: CloudsSectorDebugMode = "coverage",
  productUtcMs = 0,
): Uint8Array {
  const out = base.slice();
  const pixelCount = Math.floor(out.length / 4);
  let winner: Int8Array;
  if (mode === "signal") {
    winner = signalPaintOrderWinners(layers, paintOrder, pixelCount);
  } else if (mode === "coverage") {
    winner = coveragePaintOrderWinners(layers, paintOrder, pixelCount);
  } else {
    const resolved = resolveCloudsCompositeWinnerSectorIds(
      layers,
      paintOrder,
      productUtcMs,
    );
    winner = resolved?.winners ?? coveragePaintOrderWinners(layers, paintOrder, pixelCount);
  }
  const ringLayer = layers.find((l) => l.sectorId === CLOUDS_SECTOR_EUMET_RING);
  const regionalOnly =
    mode === "q0ring"
      ? resolveCloudsRegionalOnlyWinnerSectorIds(layers, paintOrder, productUtcMs)
      : null;
  const suppressed = mode === "leak" ? new Uint8Array(pixelCount) : null;
  if (suppressed !== null) {
    for (let i = 0; i < pixelCount; i++) {
      const wi = winner[i]!;
      if (wi < 0) continue;
      const sectorId = paintOrder[wi]!;
      const selected = layers.find((l) => l.sectorId === sectorId);
      if (selected === undefined) continue;
      if (selected.rgba[i * 4 + 3]! !== 0) continue;
      if (!layerHasCoverage(selected, i)) continue;
      for (const layer of layers) {
        if (layer.sectorId === sectorId) continue;
        if (!layerHasCoverage(layer, i)) continue;
        if (layer.rgba[i * 4 + 3]! > 0) {
          suppressed[i] = 1;
          break;
        }
      }
    }
  }
  for (let i = 0; i < pixelCount; i++) {
    const wi = winner[i]!;
    if (wi < 0) continue;
    const sectorId = paintOrder[wi]!;
    const o = i * 4;
    if (mode === "leak") {
      if (suppressed !== null && suppressed[i] === 1) {
        out[o] = LEAK_RGB[0];
        out[o + 1] = LEAK_RGB[1];
        out[o + 2] = LEAK_RGB[2];
        out[o + 3] = 220;
      }
      continue;
    }
    if (mode === "ring") {
      if (sectorId !== CLOUDS_SECTOR_EUMET_RING) continue;
      const [tr, tg, tb] = CLOUDS_SECTOR_DEBUG_TINT[CLOUDS_SECTOR_EUMET_RING];
      out[o] = tr;
      out[o + 1] = tg;
      out[o + 2] = tb;
      out[o + 3] = 220;
      continue;
    }
    if (mode === "q0ring") {
      const regionalWi = regionalOnly?.winners[i] ?? -1;
      const regionalId = regionalWi >= 0 ? paintOrder[regionalWi] : undefined;
      const regionalLayer =
        regionalId !== undefined
          ? layers.find((l) => l.sectorId === regionalId)
          : undefined;
      const regionalQ0 =
        regionalLayer !== undefined &&
        layerHasCoverage(regionalLayer, i) &&
        layerQualityAt(regionalLayer, i) === 0 &&
        !pixelHasUsableRegionalCoverage(layers, i);
      const ringAvailable = ringLayer !== undefined && layerHasCoverage(ringLayer, i);
      if (regionalQ0 && ringAvailable) {
        out[o] = Q0_RING_RGB[0];
        out[o + 1] = Q0_RING_RGB[1];
        out[o + 2] = Q0_RING_RGB[2];
        out[o + 3] = 220;
      }
      continue;
    }
    const [tr, tg, tb] = CLOUDS_SECTOR_DEBUG_TINT[sectorId];
    if (mode === "quality") {
      const layer = layers.find((l) => l.sectorId === sectorId);
      const q = layer !== undefined ? layerQualityAt(layer, i) : 255;
      out[o] = Math.round((tr * q) / 255);
      out[o + 1] = Math.round((tg * q) / 255);
      out[o + 2] = Math.round((tb * q) / 255);
      out[o + 3] = 220;
      continue;
    }
    out[o] = tr;
    out[o + 1] = tg;
    out[o + 2] = tb;
    out[o + 3] = 220;
  }
  return out;
}

function toTypedLayers(
  layers: readonly {
    readonly sectorId: string;
    readonly width: number;
    readonly height: number;
    readonly rgba: Uint8Array;
    readonly coverageMask?: Uint8Array;
    readonly qualityWeight?: Uint8Array;
    readonly observationTimeMs?: number;
  }[],
): CloudsHighlightLayer[] {
  const typedLayers: CloudsHighlightLayer[] = [];
  for (const layer of layers) {
    if (!isCloudsSectorId(layer.sectorId)) continue;
    typedLayers.push({
      sectorId: layer.sectorId,
      width: layer.width,
      height: layer.height,
      rgba: layer.rgba,
      coverageMask:
        layer.coverageMask ??
        Uint8Array.from({ length: layer.width * layer.height }, (_, i) =>
          layer.rgba[i * 4 + 3]! > 0 ? 255 : 0,
        ),
      qualityWeight: layer.qualityWeight,
      observationTimeMs: layer.observationTimeMs,
    });
  }
  return typedLayers;
}

export const applyDevCloudsSectorDebugTint: DevCloudsSectorDebugTintFn = (
  base,
  layers,
  paintOrder,
  productUtcMs = 0,
) => {
  return tintCloudsCompositeByWinningSector(
    base,
    toTypedLayers(layers),
    paintOrder.filter(isCloudsSectorId),
    debugMode,
    productUtcMs,
  );
};
