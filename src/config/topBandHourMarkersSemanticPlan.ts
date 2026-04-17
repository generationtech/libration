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

import { solarLocalWallClockStateFromUtcMs } from "../core/solarLocalWallClock.ts";
import type { EffectiveTopBandHourMarkers } from "./topBandHourMarkersTypes.ts";
import {
  buildStructuralAnchor,
  structuralColumnCenterLongitudeDeg,
  type SemanticHourMarkerContent,
  type SemanticHourMarkerInstance,
  type SemanticTopBandHourMarkersPlan,
} from "./topBandHourMarkersSemanticTypes.ts";

function semanticContentForInstance(
  effective: EffectiveTopBandHourMarkers,
  structuralHour0To23: number,
  referenceNowMs: number | undefined,
): SemanticHourMarkerContent {
  const h = structuralHour0To23;
  if (effective.content.kind === "localWallClock") {
    const lon = structuralColumnCenterLongitudeDeg(h);
    const wallClock =
      referenceNowMs !== undefined
        ? solarLocalWallClockStateFromUtcMs(referenceNowMs, lon)
        : solarLocalWallClockStateFromUtcMs(0, lon);
    return { kind: "localWallClock", structuralHour0To23: h, wallClock };
  }
  return { kind: "hour24Label", structuralHour0To23: h };
}

export type BuildSemanticTopBandHourMarkersOptions = {
  /** Required for analogClock local wall-clock content; drives per-zone hand angles. */
  referenceNowMs?: number;
};

/**
 * Builds 24 structural hour-marker instances from resolved effective top-band hour markers.
 * Renderer-agnostic: no layout x, canvas, or render-plan types.
 */
export function buildSemanticTopBandHourMarkers(
  effective: EffectiveTopBandHourMarkers,
  options?: BuildSemanticTopBandHourMarkersOptions,
): SemanticTopBandHourMarkersPlan {
  if (!effective.areaVisible) {
    return { source: effective, instances: [] };
  }
  const referenceNowMs = options?.referenceNowMs;
  const instances: SemanticHourMarkerInstance[] = [];
  for (let h = 0; h < 24; h += 1) {
    instances.push({
      structuralHour0To23: h,
      structuralAnchor: buildStructuralAnchor(h),
      behavior: effective.behavior,
      content: semanticContentForInstance(effective, h, referenceNowMs),
      realization: effective.realization,
      layout: effective.layout,
    });
  }
  return { source: effective, instances };
}
