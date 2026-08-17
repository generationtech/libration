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

import { getOverlayReadabilityFrameOrCompute } from "../core/overlayReadabilityFrame";
import { resolveEclipseFrame } from "../core/eclipse/eclipseEventService";
import {
  normalizeEclipseAlignmentPresentation,
  type EclipseAlignmentPresentation,
} from "../core/eclipse/eclipseAlignmentAppearance";
import { buildEclipseAlignmentPresentation } from "../core/eclipse/eclipseAlignmentPresentation";
import { solarEclipseMapLabel } from "../core/eclipse/eclipseEventLabels";
import {
  presentedActiveSolar,
  presentedForecastSelections,
  presentedPrimaryEclipse,
} from "../core/eclipse/eclipsePresentedEvents";
import {
  normalizeLunarEclipsePresentation,
  type LunarEclipsePresentation,
} from "../core/eclipse/lunarEclipseAppearance";
import {
  forecastHorizonMsFromDays,
  normalizeSolarEclipsePresentation,
  resolveSolarEclipseGroundPositionPaint,
  resolveSolarEclipsePaint,
  scaleRgbaAlpha,
  SOLAR_ECLIPSE_DRAW_ALIGNMENT_AXIS,
  SOLAR_ECLIPSE_DRAW_ALIGNMENT_BAND,
  SOLAR_ECLIPSE_DRAW_CENTERLINE,
  SOLAR_ECLIPSE_DRAW_CORRIDOR_FILL,
  SOLAR_ECLIPSE_DRAW_CORRIDOR_LIMIT,
  SOLAR_ECLIPSE_DRAW_FORECAST_PARTIAL,
  SOLAR_ECLIPSE_DRAW_LIVE_CENTRAL,
  SOLAR_ECLIPSE_DRAW_LIVE_PARTIAL,
  type SolarEclipsePaint,
  type SolarEclipsePresentation,
} from "../core/eclipse/solarEclipseAppearance";
import {
  resolveSolarEclipsePresentationPhase,
  solarEclipseForecastCenterlineRemainsVisible,
  solarEclipseForecastPartialRemainsVisible,
  type SolarEclipsePresentationPhase,
} from "../core/eclipse/solarEclipsePresentationLifecycle";
import { sublunarPoint } from "../core/sublunarPoint";
import { subsolarPoint } from "../core/subsolarPoint";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECT_REGION_OVERLAY_KIND,
  type EquirectRegionAvoidDisc,
  type EquirectRegionFill,
  type EquirectRegionLabel,
  type EquirectRegionLabelPathHint,
  type EquirectRegionOverlayPayload,
  type EquirectRegionPointMarker,
  type EquirectRegionStroke,
} from "./equirectRegionPayload";
import type { SolarEclipseForecastSelection } from "../core/eclipse/solarEclipseTypes";

export const SOLAR_ECLIPSE_LAYER_ID = "layer.solarEclipse.liveFootprint";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

function corridorFill(selection: SolarEclipseForecastSelection, paint: SolarEclipsePaint): string {
  const annular = selection.geometry.subtype === "annular";
  if (selection.lifecycle === "active") {
    return annular ? paint.activeCorridorAntumbraFill : paint.activeCorridorUmbraFill;
  }
  const base = annular ? paint.forecastCorridorAntumbraFill : paint.forecastCorridorUmbraFill;
  return scaleRgbaAlpha(base, selection.prominence01);
}

function corridorStroke(selection: SolarEclipseForecastSelection, paint: SolarEclipsePaint): string {
  if (selection.lifecycle === "active") {
    return paint.activeCorridorStroke;
  }
  return scaleRgbaAlpha(paint.forecastCorridorStroke, selection.prominence01);
}

function forecastPartialFill(selection: SolarEclipseForecastSelection, paint: SolarEclipsePaint): string {
  return scaleRgbaAlpha(paint.forecastPartialFill, selection.prominence01);
}

function forecastCenterlineStroke(selection: SolarEclipseForecastSelection, paint: SolarEclipsePaint): string {
  return scaleRgbaAlpha(paint.forecastCenterlineStroke, selection.prominence01);
}

function selectionPhase(
  selection: SolarEclipseForecastSelection,
  productUtcMs: number,
  activeEventId: string | null,
  centralPointPresent: boolean,
): SolarEclipsePresentationPhase | null {
  return resolveSolarEclipsePresentationPhase({
    productUtcMs,
    event: selection.event,
    selectionLifecycle: selection.lifecycle,
    centralPointPresent:
      selection.lifecycle === "active" &&
      selection.event.id === activeEventId &&
      centralPointPresent,
  });
}

function decimateLatLon(
  points: readonly { latDeg: number; lonDeg: number }[],
  max = 64,
): EquirectRegionLabelPathHint["points"] {
  if (points.length <= max) {
    return points.map((p) => ({ latDeg: p.latDeg, lonDeg: p.lonDeg }));
  }
  const step = (points.length - 1) / (max - 1);
  const out: { latDeg: number; lonDeg: number }[] = [];
  for (let i = 0; i < max; i += 1) {
    const p = points[Math.round(i * step)]!;
    out.push({ latDeg: p.latDeg, lonDeg: p.lonDeg });
  }
  return out;
}

export function createSolarEclipseLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    presentation?: Partial<SolarEclipsePresentation> | Readonly<Record<string, unknown>>;
    alignment?: Partial<EclipseAlignmentPresentation> | Readonly<Record<string, unknown>>;
    labelsEnabled?: boolean;
    lunarPresentation?: Partial<LunarEclipsePresentation> | Readonly<Record<string, unknown>>;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const presentation = normalizeSolarEclipsePresentation(options.presentation);
  const lunarPresentation = normalizeLunarEclipsePresentation(options.lunarPresentation);
  const alignment = normalizeEclipseAlignmentPresentation(options.alignment);
  const labelsEnabled = options.labelsEnabled !== false;
  const horizonMs = forecastHorizonMsFromDays(presentation.forecastHorizonDays);
  const paint = resolveSolarEclipsePaint(presentation);
  return {
    id: SOLAR_ECLIPSE_LAYER_ID,
    name: "Solar eclipses",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const frame =
        time.eclipseFrame && time.eclipseFrame.horizonMs === horizonMs
          ? time.eclipseFrame
          : resolveEclipseFrame(time.now, { horizonMs });
      const fills: EquirectRegionFill[] = [];
      const strokes: EquirectRegionStroke[] = [];
      const labels: EquirectRegionLabel[] = [];
      const labelAvoidDiscs: EquirectRegionAvoidDisc[] = [];
      const selections = presentedForecastSelections(frame, presentation);
      const activeSolar = presentedActiveSolar(frame, presentation);
      const centralPointPresent = Boolean(frame.solarGeometry?.centralPoint);
      if (frame.support.supported || selections.length > 0) {
        for (const selection of selections) {
          const phase = selectionPhase(
            selection,
            frame.productUtcMs,
            activeSolar?.id ?? null,
            centralPointPresent,
          );
          if (
            presentation.showForecastPartialRegion &&
            solarEclipseForecastPartialRemainsVisible(phase) &&
            selection.geometry.partialForecastRegion.length >= 4
          ) {
            fills.push({
              ring: selection.geometry.partialForecastRegion,
              fill: forecastPartialFill(selection, paint),
              drawOrder: SOLAR_ECLIPSE_DRAW_FORECAST_PARTIAL,
            });
          }
          if (presentation.showForecastCorridor) {
            for (const ring of selection.geometry.corridorBands) {
              if (ring.length >= 4) {
                fills.push({
                  ring,
                  fill: corridorFill(selection, paint),
                  drawOrder: SOLAR_ECLIPSE_DRAW_CORRIDOR_FILL,
                });
                strokes.push({
                  points: ring,
                  stroke: corridorStroke(selection, paint),
                  strokeWidthPx: paint.forecastCorridorStrokeWidthPx,
                  drawOrder: SOLAR_ECLIPSE_DRAW_CORRIDOR_LIMIT,
                });
              }
            }
          }
          if (
            presentation.showCentralLine &&
            solarEclipseForecastCenterlineRemainsVisible(phase) &&
            selection.geometry.centerline.length >= 2
          ) {
            strokes.push({
              points: selection.geometry.centerline,
              stroke: forecastCenterlineStroke(selection, paint),
              strokeWidthPx: paint.forecastCenterlineWidthPx,
              drawOrder: SOLAR_ECLIPSE_DRAW_CENTERLINE,
            });
          }
        }
        const geom = frame.solarGeometry;
        if (geom && frame.support.supported && activeSolar) {
          if (
            presentation.showPartialRegion &&
            !presentation.activeEclipseShadingEnabled &&
            geom.partialRegion.length >= 4
          ) {
            fills.push({
              ring: geom.partialRegion,
              fill: paint.livePartialFill,
              drawOrder: SOLAR_ECLIPSE_DRAW_LIVE_PARTIAL,
            });
          }
          const sun = subsolarPoint(time.now);
          const moon = sublunarPoint(time.now);
          const alignmentView = buildEclipseAlignmentPresentation({
            frame,
            alignment,
            solarLayerEnabled: true,
            lunarLayerEnabled: false,
            subsolar: { latDeg: sun.latDeg, lonDeg: sun.lonDeg },
            sublunar: { latDeg: moon.latDeg, lonDeg: moon.lonDeg },
          });
          if (alignmentView.solar) {
            for (const band of alignmentView.solar.bands) {
              if (band.ring.length >= 4) {
                fills.push({
                  ring: band.ring,
                  fill: band.fill,
                  drawOrder: SOLAR_ECLIPSE_DRAW_ALIGNMENT_BAND,
                });
              }
            }
          }
          if (presentation.showCentralBand && geom.centralBand.length >= 4) {
            fills.push({
              ring: geom.centralBand,
              fill: geom.centralShadowKind === "antumbra" ? paint.liveAntumbraFill : paint.liveUmbraFill,
              drawOrder: SOLAR_ECLIPSE_DRAW_LIVE_CENTRAL,
            });
          }
          if (alignmentView.solar) {
            for (const s of alignmentView.solar.strokes) {
              if (s.points.length >= 2) {
                strokes.push({
                  points: s.points,
                  stroke: s.stroke,
                  strokeWidthPx: s.strokeWidthPx,
                  drawOrder: SOLAR_ECLIPSE_DRAW_ALIGNMENT_AXIS,
                });
              }
            }
          }
          if (presentation.showCentralLine && geom.centerline.length >= 2) {
            strokes.push({
              points: geom.centerline,
              stroke: paint.liveCenterlineStroke,
              strokeWidthPx: paint.liveCenterlineWidthPx,
              drawOrder: SOLAR_ECLIPSE_DRAW_CENTERLINE,
            });
          }
        }
      }
      const pointMarkers: EquirectRegionPointMarker[] = [];
      if (
        presentation.showLiveGroundPosition &&
        frame.support.supported &&
        activeSolar &&
        frame.solarGeometry?.centralPoint
      ) {
        const markerPaint = resolveSolarEclipseGroundPositionPaint(presentation);
        const p = frame.solarGeometry.centralPoint;
        pointMarkers.push({
          latDeg: p.latDeg,
          lonDeg: p.lonDeg,
          radiusScale: markerPaint.radiusScale,
          fill: markerPaint.fill,
          stroke: markerPaint.stroke,
          underStroke: markerPaint.underStroke,
          haloFill: markerPaint.haloFill,
        });
      }
      const labelPathHints: EquirectRegionLabelPathHint[] = [];
      if (labelsEnabled && frame.support.supported) {
        const primary = presentedPrimaryEclipse(frame, presentation, lunarPresentation);
        if (primary?.kind === "solar") {
          const sun = subsolarPoint(time.now);
          const moon = sublunarPoint(time.now);
          const geom = frame.solarGeometry;
          const selection = presentedForecastSelections(frame, presentation).find(
            (s) => s.event.id === primary.event.id,
          );
          const liveCenterline = geom?.centerline;
          const forecastCenterline = selection?.geometry.centerline;
          const partialRing = selection?.geometry.partialForecastRegion;
          if (primary.lifecycle === "active" && liveCenterline && liveCenterline.length >= 2) {
            labelPathHints.push({ points: decimateLatLon(liveCenterline) });
          } else if (primary.lifecycle === "active" && geom?.centralPoint) {
            labelPathHints.push({ points: [geom.centralPoint] });
          }
          if (forecastCenterline && forecastCenterline.length >= 2) {
            labelPathHints.push({ points: decimateLatLon(forecastCenterline) });
          } else if (labelPathHints.length === 0 && partialRing && partialRing.length >= 4) {
            labelPathHints.push({ points: decimateLatLon(partialRing, 24) });
          }
          labels.push(
            solarEclipseMapLabel({
              event: primary.event,
              lifecycle: primary.lifecycle,
              productUtcMs: frame.productUtcMs,
              latDeg: moon.latDeg,
              lonDeg: moon.lonDeg,
            }),
          );
          labelAvoidDiscs.push(
            { latDeg: sun.latDeg, lonDeg: sun.lonDeg, haloMultiplier: 2.4 },
            { latDeg: moon.latDeg, lonDeg: moon.lonDeg, haloMultiplier: 2.4 },
          );
        }
      }
      const readabilityFrame = getOverlayReadabilityFrameOrCompute(time);
      const data: EquirectRegionOverlayPayload = {
        kind: EQUIRECT_REGION_OVERLAY_KIND,
        fills,
        strokes,
        ...(labels.length > 0 ? { labels, labelAvoidDiscs } : {}),
        ...(labelPathHints.length > 0 ? { labelPathHints } : {}),
        ...(pointMarkers.length > 0 ? { pointMarkers } : {}),
        readability: {
          nightVeil01: readabilityFrame.globalReadabilityVeil01,
          overlayReadabilityLiftScale01: readabilityFrame.substrateOverlayReadabilityLiftScale01,
        },
      };
      return { visible: true, opacity: op, data };
    },
  };
}
