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
 *   ?cloudsSectorDebug=1|coverage|winner — coverage-authority footprints
 *   ?cloudsSectorDebug=signal — derived cloud-signal winners (old diagnostic)
 *   ?cloudsSectorDebug=leak — pixels where later coverage is clear and
 *     suppressed an earlier source's cloud
 */

import type { CloudsHighlightLayer } from "../lifecycle/cloudsComposite";
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

export type CloudsSectorDebugMode = "coverage" | "signal" | "leak";

export const CLOUDS_SECTOR_DEBUG_TINT: Readonly<
  Record<CloudsSectorId, readonly [number, number, number]>
> = {
  [CLOUDS_SECTOR_EUMET_RING]: [160, 160, 160],
  [CLOUDS_SECTOR_GOES_WEST]: [80, 180, 220],
  [CLOUDS_SECTOR_GOES_EAST]: [220, 90, 160],
  [CLOUDS_SECTOR_METEOSAT]: [230, 200, 70],
  [CLOUDS_SECTOR_HIMAWARI]: [90, 200, 110],
};

const LEAK_RGB = [255, 64, 48] as const;

let debugMode: CloudsSectorDebugMode = "coverage";

export function parseCloudsSectorDebugMode(
  value: string | null,
): CloudsSectorDebugMode | null {
  if (value === null) return null;
  const v = value.trim().toLowerCase();
  if (v === "1" || v === "coverage" || v === "winner") return "coverage";
  if (v === "signal" || v === "cloud") return "signal";
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

export function tintCloudsCompositeByWinningSector(
  base: Uint8Array,
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
  mode: CloudsSectorDebugMode = "coverage",
): Uint8Array {
  const out = base.slice();
  const pixelCount = Math.floor(out.length / 4);
  const winner = new Int8Array(pixelCount);
  winner.fill(-1);
  const suppressed = mode === "leak" ? new Uint8Array(pixelCount) : null;
  for (let li = 0; li < paintOrder.length; li++) {
    const layer = layers.find((l) => l.sectorId === paintOrder[li]);
    if (layer === undefined) continue;
    for (let i = 0; i < pixelCount; i++) {
      const signal = layer.rgba[i * 4 + 3]!;
      const owns = mode === "signal" ? signal > 0 : layerHasCoverage(layer, i);
      if (!owns) continue;
      if (suppressed !== null && winner[i]! >= 0 && signal === 0) {
        const prev = layers.find((l) => l.sectorId === paintOrder[winner[i]!]);
        if (prev !== undefined && prev.rgba[i * 4 + 3]! > 0) {
          suppressed[i] = 1;
        }
      }
      winner[i] = li;
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
    const [tr, tg, tb] = CLOUDS_SECTOR_DEBUG_TINT[sectorId];
    out[o] = tr;
    out[o + 1] = tg;
    out[o + 2] = tb;
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
    });
  }
  return typedLayers;
}

export const applyDevCloudsSectorDebugTint: DevCloudsSectorDebugTintFn = (
  base,
  layers,
  paintOrder,
) => {
  return tintCloudsCompositeByWinningSector(
    base,
    toTypedLayers(layers),
    paintOrder.filter(isCloudsSectorId),
    debugMode,
  );
};
