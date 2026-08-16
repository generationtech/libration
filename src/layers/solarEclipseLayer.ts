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
  resolveSolarEclipsePaint,
  scaleRgbaAlpha,
  type SolarEclipsePaint,
  type SolarEclipsePresentation,
} from "../core/eclipse/solarEclipseAppearance";
import { sublunarPoint } from "../core/sublunarPoint";
import { subsolarPoint } from "../core/subsolarPoint";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECT_REGION_OVERLAY_KIND,
  type EquirectRegionFill,
  type EquirectRegionLabel,
  type EquirectRegionOverlayPayload,
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

function forecastPartialFill(selection: SolarEclipseForecastSelection, paint: SolarEclipsePaint): string {
  return scaleRgbaAlpha(paint.forecastPartialFill, selection.prominence01);
}

function forecastCenterlineStroke(selection: SolarEclipseForecastSelection, paint: SolarEclipsePaint): string {
  return scaleRgbaAlpha(paint.forecastCenterlineStroke, selection.prominence01);
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
      const selections = presentedForecastSelections(frame, presentation);
      const activeSolar = presentedActiveSolar(frame, presentation);
      if (frame.support.supported || selections.length > 0) {
        for (const selection of selections) {
          if (
            presentation.showForecastPartialRegion &&
            selection.lifecycle === "upcoming" &&
            selection.geometry.partialForecastRegion.length >= 4
          ) {
            fills.push({
              ring: selection.geometry.partialForecastRegion,
              fill: forecastPartialFill(selection, paint),
            });
          }
          if (presentation.showForecastCorridor) {
            for (const ring of selection.geometry.corridorBands) {
              if (ring.length >= 4) {
                fills.push({ ring, fill: corridorFill(selection, paint) });
                strokes.push({
                  points: ring,
                  stroke: scaleRgbaAlpha(paint.forecastCorridorStroke, selection.prominence01),
                  strokeWidthPx: paint.forecastCorridorStrokeWidthPx,
                });
              }
            }
          }
          if (
            presentation.showCentralLine &&
            selection.lifecycle === "upcoming" &&
            selection.geometry.centerline.length >= 2
          ) {
            strokes.push({
              points: selection.geometry.centerline,
              stroke: forecastCenterlineStroke(selection, paint),
              strokeWidthPx: paint.forecastCenterlineWidthPx,
            });
          }
        }
        const geom = frame.solarGeometry;
        if (geom && frame.support.supported && activeSolar) {
          if (presentation.showPartialRegion && geom.partialRegion.length >= 4) {
            fills.push({ ring: geom.partialRegion, fill: paint.livePartialFill });
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
                fills.push({ ring: band.ring, fill: band.fill });
              }
            }
          }
          if (presentation.showCentralBand && geom.centralBand.length >= 4) {
            fills.push({
              ring: geom.centralBand,
              fill: geom.centralShadowKind === "antumbra" ? paint.liveAntumbraFill : paint.liveUmbraFill,
            });
          }
          if (alignmentView.solar) {
            for (const s of alignmentView.solar.strokes) {
              if (s.points.length >= 2) {
                strokes.push({
                  points: s.points,
                  stroke: s.stroke,
                  strokeWidthPx: s.strokeWidthPx,
                });
              }
            }
          }
          if (presentation.showCentralLine && geom.centerline.length >= 2) {
            strokes.push({
              points: geom.centerline,
              stroke: paint.liveCenterlineStroke,
              strokeWidthPx: paint.liveCenterlineWidthPx,
            });
          }
        }
      }
      if (labelsEnabled && frame.support.supported) {
        const primary = presentedPrimaryEclipse(frame, presentation, lunarPresentation);
        if (primary?.kind === "solar") {
          const geom = frame.solarGeometry;
          labels.push(
            solarEclipseMapLabel({
              event: primary.event,
              lifecycle: primary.lifecycle,
              productUtcMs: frame.productUtcMs,
              latDeg:
                primary.lifecycle === "active"
                  ? (geom?.centralPoint?.latDeg ?? primary.event.geLatDeg)
                  : primary.event.geLatDeg,
              lonDeg:
                primary.lifecycle === "active"
                  ? (geom?.centralPoint?.lonDeg ?? primary.event.geLonDeg)
                  : primary.event.geLonDeg,
            }),
          );
        }
      }
      const readabilityFrame = getOverlayReadabilityFrameOrCompute(time);
      const data: EquirectRegionOverlayPayload = {
        kind: EQUIRECT_REGION_OVERLAY_KIND,
        fills,
        strokes,
        ...(labels.length > 0 ? { labels } : {}),
        readability: {
          nightVeil01: readabilityFrame.globalReadabilityVeil01,
          overlayReadabilityLiftScale01: readabilityFrame.substrateOverlayReadabilityLiftScale01,
        },
      };
      return { visible: true, opacity: op, data };
    },
  };
}
