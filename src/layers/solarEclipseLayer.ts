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
  forecastHorizonMsFromDays,
  normalizeSolarEclipsePresentation,
  scaleRgbaAlpha,
  SOLAR_ECLIPSE_ACTIVE_CORRIDOR_ANTUMBRA_FILL,
  SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL,
  SOLAR_ECLIPSE_ANTUMBRA_FILL,
  SOLAR_ECLIPSE_CENTERLINE_STROKE,
  SOLAR_ECLIPSE_CENTERLINE_WIDTH_PX,
  SOLAR_ECLIPSE_FORECAST_CENTERLINE_STROKE,
  SOLAR_ECLIPSE_FORECAST_CENTERLINE_WIDTH_PX,
  SOLAR_ECLIPSE_FORECAST_CORRIDOR_ANTUMBRA_FILL,
  SOLAR_ECLIPSE_FORECAST_CORRIDOR_STROKE,
  SOLAR_ECLIPSE_FORECAST_CORRIDOR_STROKE_WIDTH_PX,
  SOLAR_ECLIPSE_FORECAST_CORRIDOR_UMBRA_FILL,
  SOLAR_ECLIPSE_FORECAST_PARTIAL_FILL,
  SOLAR_ECLIPSE_PARTIAL_FILL,
  SOLAR_ECLIPSE_UMBRA_FILL,
  type SolarEclipsePresentation,
} from "../core/eclipse/solarEclipseAppearance";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECT_REGION_OVERLAY_KIND,
  type EquirectRegionFill,
  type EquirectRegionOverlayPayload,
  type EquirectRegionStroke,
} from "./equirectRegionPayload";
import type { SolarEclipseForecastSelection } from "../core/eclipse/solarEclipseTypes";

export const SOLAR_ECLIPSE_LAYER_ID = "layer.solarEclipse.liveFootprint";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

function corridorFill(selection: SolarEclipseForecastSelection): string {
  const annular = selection.geometry.subtype === "annular";
  if (selection.lifecycle === "active") {
    return annular ? SOLAR_ECLIPSE_ACTIVE_CORRIDOR_ANTUMBRA_FILL : SOLAR_ECLIPSE_ACTIVE_CORRIDOR_UMBRA_FILL;
  }
  const base = annular ? SOLAR_ECLIPSE_FORECAST_CORRIDOR_ANTUMBRA_FILL : SOLAR_ECLIPSE_FORECAST_CORRIDOR_UMBRA_FILL;
  return scaleRgbaAlpha(base, selection.prominence01);
}

function forecastPartialFill(selection: SolarEclipseForecastSelection): string {
  return scaleRgbaAlpha(SOLAR_ECLIPSE_FORECAST_PARTIAL_FILL, selection.prominence01);
}

function forecastCenterlineStroke(selection: SolarEclipseForecastSelection): string {
  return scaleRgbaAlpha(SOLAR_ECLIPSE_FORECAST_CENTERLINE_STROKE, selection.prominence01);
}

export function createSolarEclipseLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    presentation?: Partial<SolarEclipsePresentation> | Readonly<Record<string, unknown>>;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const presentation = normalizeSolarEclipsePresentation(options.presentation);
  const horizonMs = forecastHorizonMsFromDays(presentation.forecastHorizonDays);
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
      if (frame.support.supported || frame.forecastSelections.length > 0) {
        for (const selection of frame.forecastSelections) {
          if (
            presentation.showForecastPartialRegion &&
            selection.lifecycle === "upcoming" &&
            selection.geometry.partialForecastRegion.length >= 4
          ) {
            fills.push({
              ring: selection.geometry.partialForecastRegion,
              fill: forecastPartialFill(selection),
            });
          }
          if (presentation.showForecastCorridor) {
            for (const ring of selection.geometry.corridorBands) {
              if (ring.length >= 4) {
                fills.push({ ring, fill: corridorFill(selection) });
                strokes.push({
                  points: ring,
                  stroke: scaleRgbaAlpha(SOLAR_ECLIPSE_FORECAST_CORRIDOR_STROKE, selection.prominence01),
                  strokeWidthPx: SOLAR_ECLIPSE_FORECAST_CORRIDOR_STROKE_WIDTH_PX,
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
              stroke: forecastCenterlineStroke(selection),
              strokeWidthPx: SOLAR_ECLIPSE_FORECAST_CENTERLINE_WIDTH_PX,
            });
          }
        }
        const geom = frame.solarGeometry;
        if (geom && frame.support.supported) {
          if (presentation.showPartialRegion && geom.partialRegion.length >= 4) {
            fills.push({ ring: geom.partialRegion, fill: SOLAR_ECLIPSE_PARTIAL_FILL });
          }
          if (presentation.showCentralBand && geom.centralBand.length >= 4) {
            fills.push({
              ring: geom.centralBand,
              fill: geom.centralShadowKind === "antumbra" ? SOLAR_ECLIPSE_ANTUMBRA_FILL : SOLAR_ECLIPSE_UMBRA_FILL,
            });
          }
          if (presentation.showCentralLine && geom.centerline.length >= 2) {
            strokes.push({
              points: geom.centerline,
              stroke: SOLAR_ECLIPSE_CENTERLINE_STROKE,
              strokeWidthPx: SOLAR_ECLIPSE_CENTERLINE_WIDTH_PX,
            });
          }
        }
      }
      const readabilityFrame = getOverlayReadabilityFrameOrCompute(time);
      const data: EquirectRegionOverlayPayload = {
        kind: EQUIRECT_REGION_OVERLAY_KIND,
        fills,
        strokes,
        readability: {
          nightVeil01: readabilityFrame.globalReadabilityVeil01,
          overlayReadabilityLiftScale01: readabilityFrame.substrateOverlayReadabilityLiftScale01,
        },
      };
      return { visible: true, opacity: op, data };
    },
  };
}
