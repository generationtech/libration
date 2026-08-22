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
 * DEV-only Clouds sector-footprint tint. Production never imports this module.
 * Ordinary current-time mode: `?cloudsSectorDebug=1` (not a `?scenario=`).
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

export const CLOUDS_SECTOR_DEBUG_TINT: Readonly<
  Record<CloudsSectorId, readonly [number, number, number]>
> = {
  [CLOUDS_SECTOR_EUMET_RING]: [160, 160, 160],
  [CLOUDS_SECTOR_GOES_WEST]: [80, 180, 220],
  [CLOUDS_SECTOR_GOES_EAST]: [220, 90, 160],
  [CLOUDS_SECTOR_METEOSAT]: [230, 200, 70],
  [CLOUDS_SECTOR_HIMAWARI]: [90, 200, 110],
};

export function tintCloudsCompositeByWinningSector(
  base: Uint8Array,
  layers: readonly CloudsHighlightLayer[],
  paintOrder: readonly CloudsSectorId[],
): Uint8Array {
  const out = base.slice();
  const pixelCount = Math.floor(out.length / 4);
  const winner = new Int8Array(pixelCount);
  winner.fill(-1);
  for (let li = 0; li < paintOrder.length; li++) {
    const layer = layers.find((l) => l.sectorId === paintOrder[li]);
    if (layer === undefined) continue;
    for (let i = 0; i < pixelCount; i++) {
      if (layer.rgba[i * 4 + 3]! > 0) winner[i] = li;
    }
  }
  for (let i = 0; i < pixelCount; i++) {
    const wi = winner[i]!;
    if (wi < 0) continue;
    const sectorId = paintOrder[wi]!;
    const [tr, tg, tb] = CLOUDS_SECTOR_DEBUG_TINT[sectorId];
    const o = i * 4;
    out[o] = tr;
    out[o + 1] = tg;
    out[o + 2] = tb;
  }
  return out;
}

export const applyDevCloudsSectorDebugTint: DevCloudsSectorDebugTintFn = (
  base,
  layers,
  paintOrder,
) => {
  const typedLayers: CloudsHighlightLayer[] = [];
  for (const layer of layers) {
    if (!isCloudsSectorId(layer.sectorId)) continue;
    typedLayers.push({
      sectorId: layer.sectorId,
      width: layer.width,
      height: layer.height,
      rgba: layer.rgba,
    });
  }
  const typedOrder = paintOrder.filter(isCloudsSectorId);
  return tintCloudsCompositeByWinningSector(base, typedLayers, typedOrder);
};
