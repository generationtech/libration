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
 * Lunar: Earth-shadow directional cue lives on the Moon glyph (LIB-043),
 * not as a geographic map ribbon. This builder emits solar alignment only.
 */

import {
  eclipseAlignmentIntensityScale,
  resolveEclipseAlignmentPalette,
  scaleAlignmentFill,
  SOLAR_ALIGNMENT_AXIS_WIDTH_PX,
  type EclipseAlignmentPresentation as EclipseAlignmentConfig,
} from "./eclipseAlignmentAppearance";
import {
  circleAlignmentRing,
  greatCircleCenterline,
  midpointGreatCircle,
  taperedAlignmentRibbon,
  type LatLon,
} from "./eclipseAlignmentGeometry";
import type { LunarEclipseLiveGeometry } from "./lunarEclipseTypes";
import { lunarEarthShadowCueStrength01 } from "./lunarEarthShadowCue";
import type { EclipseFrame } from "./solarEclipseTypes";

export type EclipseAlignmentKind = "solar-central" | "solar-partial-field";

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

export function lunarAlignmentStrength01(geom: LunarEclipseLiveGeometry): number {
  return lunarEarthShadowCueStrength01(geom);
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

/**
 * Build alignment geometry from an already-resolved EclipseFrame.
 * Does not take a reference-city observer. Does not resample forecast corridors.
 * Lunar Earth-shadow cue is drawn on the Moon glyph, not as map geography.
 */
export function buildEclipseAlignmentPresentation(
  input: EclipseAlignmentBuilderInput,
): EclipseAlignmentView {
  const cfg = input.alignment;
  let solar: EclipseAlignmentEffect | null = null;
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
  return { solar, lunar: null };
}
