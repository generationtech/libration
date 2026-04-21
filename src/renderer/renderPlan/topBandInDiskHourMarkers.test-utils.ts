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
 * Test helpers: full 24-column top-band hour-disk inputs for semantic in-disk pipelines.
 * Uses real layout math from {@link buildUtcTopScaleLayout} and {@link resolveEffectiveTopBandHourMarkers}.
 */

import {
  buildUtcTopScaleLayout,
  computeTopBandCircleStackMetrics,
  computeUtcCircleMarkerRadius,
  computeUtcTopScaleRowMetrics,
  resolveTopBandTimeFromConfig,
} from "../displayChrome.ts";
import { structuralHourIndexFromReferenceLongitudeDeg } from "../structuralLongitudeGrid.ts";
import {
  DEFAULT_DISPLAY_TIME_CONFIG,
  type DisplayChromeLayoutConfig,
} from "../../config/appConfig.ts";
import { resolveEffectiveTopBandHourMarkers } from "../../config/topBandHourMarkersResolver.ts";
import type { EffectiveTopBandHourMarkers } from "../../config/topBandHourMarkersTypes.ts";
import { computeHourDiskLabelSizePx } from "../../config/topChromeStyle.ts";

/** Shared resolved UTC top-band time for deterministic tests (matches prior test defaults). */
export const RESOLVED_UTC_FOR_HOUR_DISK_TESTS = resolveTopBandTimeFromConfig({
  ...DEFAULT_DISPLAY_TIME_CONFIG,
  referenceTimeZone: { source: "fixed", timeZone: "UTC" },
  topBandMode: "utc24",
  topBandAnchor: { mode: "auto" },
});

/** Marker row passed to {@link buildTopBandCircleBandHourStackRenderPlan}. */
export type TopBandHourDiskStackMarkerInput = {
  centerX: number;
  radiusPx: number;
  nextHourLabel: string;
  currentHourLabel: string;
  annotationKind: "none" | "noon" | "midnight" | "hour00" | "hour12";
  annotationLabel?: string;
  structuralHour0To23: number;
};

export type FullUtcTopBandHourDiskFixture = {
  /** Band-frame civil fractional hour-of-day (see `UtcTopScaleLayout.referenceFractionalHour`). */
  referenceFractionalHour: number;
  /** Structural column index of the present-time tick (reference longitude segment). */
  presentTimeStructuralHour0To23: number;
  viewportWidthPx: number;
  topBandYPx: number;
  circleBandHeightPx: number;
  tickBandHeightPx: number;
  circleStack: ReturnType<typeof computeTopBandCircleStackMetrics>;
  markers: TopBandHourDiskStackMarkerInput[];
  diskLabelSizePx: number;
  /** Length 24 — structural column centers from {@link UtcTopScaleLayout.segments}. */
  structuralZoneCenterXPx: readonly number[];
};

/**
 * Full 24-hour UTC tape geometry + labels for in-disk semantic tests (text, analog, radialLine, radialWedge).
 */
export function buildFullUtcTopBandHourDiskFixture(options?: {
  nowMs?: number;
  widthPx?: number;
  topBandHeightPx?: number;
}): FullUtcTopBandHourDiskFixture {
  const w = options?.widthPx ?? 960;
  const top = options?.topBandHeightPx ?? 88;
  const nowMs = options?.nowMs ?? Date.now();
  const scale = buildUtcTopScaleLayout(nowMs, w, top, RESOLVED_UTC_FOR_HOUR_DISK_TESTS);
  const rows = scale.rows ?? computeUtcTopScaleRowMetrics(top);
  const circleStack = scale.circleStack ?? computeTopBandCircleStackMetrics(rows.circleBandH);
  const sw = w / 24;
  const r = computeUtcCircleMarkerRadius(circleStack.diskBandH, sw);
  const diskLabelSizePx = computeHourDiskLabelSizePx(r, w);

  const markers = scale.circleMarkers.map((m) => ({
    centerX: m.centerX,
    radiusPx: m.radiusPx,
    nextHourLabel: m.nextHourLabel,
    currentHourLabel: m.currentHourLabel,
    annotationKind: m.annotationKind,
    annotationLabel: m.annotationLabel,
    structuralHour0To23: m.utcHour,
  }));

  const presentTimeStructuralHour0To23 = structuralHourIndexFromReferenceLongitudeDeg(
    scale.topBandAnchor.referenceLongitudeDeg,
  );

  return {
    referenceFractionalHour: scale.referenceFractionalHour,
    presentTimeStructuralHour0To23,
    viewportWidthPx: w,
    topBandYPx: 0,
    circleBandHeightPx: rows.circleBandH,
    tickBandHeightPx: rows.tickBandH,
    circleStack,
    markers,
    diskLabelSizePx,
    structuralZoneCenterXPx: scale.segments.map((s) => s.centerX),
  };
}

export function effectiveTopBandHourMarkersForLayout(
  layout: DisplayChromeLayoutConfig,
): EffectiveTopBandHourMarkers {
  return resolveEffectiveTopBandHourMarkers(layout);
}
