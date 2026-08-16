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
 * Semantic eclipse alignment presentation. Downstream of EclipseFrame,
 * upstream of RenderPlan. Canvas must not evaluate this.
 *
 * Solar: glyph cluster → live umbra/antumbra while a terrestrial central target exists.
 * Partial-only has no central target (local glyph field only). Central events before/after
 * the umbra/antumbra is on Earth emit no beam — the event corridor remains independent context.
 * Lunar: Earth-shadow axis toward the Moon (Sun → Earth → Moon), not a terrestrial path.
 */

import {
  eclipseAlignmentIntensityScale,
  LUNAR_ALIGNMENT_AXIS_WIDTH_PX,
  resolveEclipseAlignmentPalette,
  scaleAlignmentFill,
  SOLAR_ALIGNMENT_AXIS_WIDTH_PX,
  type EclipseAlignmentPresentation as EclipseAlignmentConfig,
} from "./eclipseAlignmentAppearance";
import {
  angularDistanceDeg,
  antiSolarPoint,
  circleAlignmentRing,
  greatCircleCenterline,
  midpointGreatCircle,
  offsetAlongGreatCircle,
  taperedAlignmentRibbon,
  type LatLon,
} from "./eclipseAlignmentGeometry";
import type { LunarEclipseLiveGeometry } from "./lunarEclipseTypes";
import type { EclipseFrame } from "./solarEclipseTypes";

export type EclipseAlignmentKind = "solar-central" | "solar-partial-field" | "lunar-axis";

export type EclipseAlignmentBand = {
  readonly ring: readonly LatLon[];
  readonly fill: string;
};

export type EclipseAlignmentStroke = {
  readonly points: readonly LatLon[];
  readonly stroke: string;
  readonly strokeWidthPx: number;
};

export type EclipseAlignmentEffect = {
  readonly kind: EclipseAlignmentKind;
  readonly eventId: string;
  readonly strength01: number;
  readonly origin: LatLon;
  readonly target: LatLon | null;
  readonly bands: readonly EclipseAlignmentBand[];
  readonly strokes: readonly EclipseAlignmentStroke[];
};

export type EclipseAlignmentView = {
  readonly solar: EclipseAlignmentEffect | null;
  readonly lunar: EclipseAlignmentEffect | null;
};

export type EclipseAlignmentBuilderInput = {
  readonly frame: EclipseFrame;
  readonly alignment: EclipseAlignmentConfig;
  readonly solarLayerEnabled: boolean;
  readonly lunarLayerEnabled: boolean;
  readonly subsolar: LatLon;
  readonly sublunar: LatLon;
};

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function lunarAlignmentStrength01(geom: LunarEclipseLiveGeometry): number {
  if (geom.phase === "none") {
    return 0;
  }
  const p = clamp01(geom.penumbralMagnitude);
  const u = geom.umbralMagnitude;
  if (geom.phase === "penumbral") {
    return clamp01(0.12 + 0.2 * p);
  }
  if (geom.phase === "partial-umbral") {
    return clamp01(0.4 + 0.28 * clamp01(u));
  }
  return clamp01(0.78 + 0.22 * clamp01(u - 1));
}

function solarOrigin(subsolar: LatLon, sublunar: LatLon): LatLon {
  return midpointGreatCircle(subsolar, sublunar);
}

function solarCentralEffect(
  input: EclipseAlignmentBuilderInput,
  eventId: string,
  target: LatLon,
  strength01: number,
  pathWidthKm: number | null,
): EclipseAlignmentEffect {
  const origin = solarOrigin(input.subsolar, input.sublunar);
  const scale = eclipseAlignmentIntensityScale(input.alignment.intensity);
  const startHalf = 5.4 * scale.width;
  const umbraHalfDeg =
    pathWidthKm !== null && Number.isFinite(pathWidthKm)
      ? Math.max(0.55, Math.min(2.4, pathWidthKm / 222))
      : 0.9;
  const endHalf = umbraHalfDeg * scale.width;
  const outer = taperedAlignmentRibbon(origin, target, startHalf, endHalf * 1.45, 20);
  const mid = taperedAlignmentRibbon(origin, target, startHalf * 0.52, endHalf * 1.05, 20);
  const core = taperedAlignmentRibbon(origin, target, startHalf * 0.22, endHalf * 0.62, 18);
  const axis = greatCircleCenterline(origin, target, 16);
  const a = scale.alpha;
  const paint = resolveEclipseAlignmentPalette(input.alignment);
  return {
    kind: "solar-central",
    eventId,
    strength01,
    origin,
    target,
    bands: [
      { ring: outer, fill: scaleAlignmentFill(paint.solarOuter, strength01, a) },
      { ring: mid, fill: scaleAlignmentFill(paint.solarMid, strength01, a) },
      { ring: core, fill: scaleAlignmentFill(paint.solarCore, strength01, a) },
    ],
    strokes: [
      {
        points: axis,
        stroke: scaleAlignmentFill(paint.solarAxis, strength01, a),
        strokeWidthPx: SOLAR_ALIGNMENT_AXIS_WIDTH_PX,
      },
    ],
  };
}

function solarPartialField(
  input: EclipseAlignmentBuilderInput,
  eventId: string,
  strength01: number,
): EclipseAlignmentEffect {
  const origin = solarOrigin(input.subsolar, input.sublunar);
  const scale = eclipseAlignmentIntensityScale(input.alignment.intensity);
  const a = scale.alpha * 0.7;
  const r0 = 4.2 * scale.width;
  const paint = resolveEclipseAlignmentPalette(input.alignment);
  return {
    kind: "solar-partial-field",
    eventId,
    strength01,
    origin,
    target: null,
    bands: [
      {
        ring: circleAlignmentRing(origin, r0 * 1.55, 28),
        fill: scaleAlignmentFill(paint.solarOuter, strength01, a),
      },
      {
        ring: circleAlignmentRing(origin, r0, 28),
        fill: scaleAlignmentFill(paint.solarMid, strength01, a * 0.85),
      },
    ],
    strokes: [],
  };
}

function lunarAxisEffect(
  input: EclipseAlignmentBuilderInput,
  eventId: string,
  geom: LunarEclipseLiveGeometry,
): EclipseAlignmentEffect {
  const moon = input.sublunar;
  const anti = antiSolarPoint(input.subsolar);
  const strength01 = lunarAlignmentStrength01(geom);
  const scale = eclipseAlignmentIntensityScale(input.alignment.intensity);
  const sep = angularDistanceDeg(anti, moon);
  const origin =
    sep < 8
      ? offsetAlongGreatCircle(moon, anti, Math.max(10, 14 * scale.width))
      : anti;
  const startHalf = (sep < 8 ? 7.5 : 6.2) * scale.width;
  const endHalf = 1.1 * scale.width;
  const outer = taperedAlignmentRibbon(origin, moon, startHalf, endHalf * 1.7, 18);
  const mid = taperedAlignmentRibbon(origin, moon, startHalf * 0.58, endHalf * 1.1, 18);
  const core = taperedAlignmentRibbon(origin, moon, startHalf * 0.26, endHalf * 0.65, 16);
  const halo = circleAlignmentRing(moon, 2.4 * scale.width, 24);
  const axis = greatCircleCenterline(origin, moon, 14);
  const a = scale.alpha;
  const paint = resolveEclipseAlignmentPalette(input.alignment);
  const bands: EclipseAlignmentBand[] = [
    { ring: outer, fill: scaleAlignmentFill(paint.lunarOuter, strength01, a) },
    { ring: mid, fill: scaleAlignmentFill(paint.lunarMid, strength01, a) },
    { ring: core, fill: scaleAlignmentFill(paint.lunarCore, strength01, a) },
    { ring: halo, fill: scaleAlignmentFill(paint.lunarMid, strength01, a * 0.55) },
  ];
  if (geom.phase === "total-umbral") {
    bands.push({
      ring: circleAlignmentRing(moon, 3.4 * scale.width, 24),
      fill: scaleAlignmentFill(paint.lunarTotalityWash, strength01, a),
    });
  }
  return {
    kind: "lunar-axis",
    eventId,
    strength01,
    origin,
    target: moon,
    bands,
    strokes: [
      {
        points: axis,
        stroke: scaleAlignmentFill(paint.lunarAxis, strength01, a),
        strokeWidthPx: LUNAR_ALIGNMENT_AXIS_WIDTH_PX,
      },
    ],
  };
}

/**
 * Build alignment geometry from an already-resolved EclipseFrame.
 * Does not take a reference-city observer. Does not resample forecast corridors.
 */
export function buildEclipseAlignmentPresentation(
  input: EclipseAlignmentBuilderInput,
): EclipseAlignmentView {
  const cfg = input.alignment;
  let solar: EclipseAlignmentEffect | null = null;
  let lunar: EclipseAlignmentEffect | null = null;
  if (
    cfg.enabled &&
    cfg.solarEnabled &&
    input.solarLayerEnabled &&
    input.frame.support.supported &&
    input.frame.activeSolar &&
    input.frame.solarGeometry
  ) {
    const event = input.frame.activeSolar;
    const geom = input.frame.solarGeometry;
    if (geom.centralPoint && event.subtype !== "partial") {
      solar = solarCentralEffect(
        input,
        event.id,
        geom.centralPoint,
        geom.alignmentStrength01,
        geom.pathWidthKm,
      );
    } else if (event.subtype === "partial") {
      // Partial-only: local alignment field only — no fabricated terrestrial target.
      solar = solarPartialField(input, event.id, geom.alignmentStrength01);
    }
    // Central events before/after the umbra/antumbra is on Earth: no targeted beam
    // and no glyph-field bloom. The event corridor remains independent context.
  }
  if (
    cfg.enabled &&
    cfg.lunarEnabled &&
    input.lunarLayerEnabled &&
    input.frame.support.supported &&
    input.frame.activeLunar &&
    input.frame.lunarGeometry &&
    input.frame.lunarGeometry.phase !== "none"
  ) {
    lunar = lunarAxisEffect(input, input.frame.activeLunar.id, input.frame.lunarGeometry);
  }
  return { solar, lunar };
}
