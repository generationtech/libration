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
import { type EclipseAlignmentPresentation } from "../core/eclipse/eclipseAlignmentAppearance";
import { lunarEclipseMapLabel } from "../core/eclipse/eclipseEventLabels";
import {
  presentedActiveLunar,
  presentedLunarForecastSelections,
  presentedPrimaryEclipse,
} from "../core/eclipse/eclipsePresentedEvents";
import {
  normalizeLunarEclipsePresentation,
  resolveLunarEclipsePaint,
  type LunarEclipsePresentation,
} from "../core/eclipse/lunarEclipseAppearance";
import {
  forecastHorizonMsFromDays,
  normalizeSolarEclipsePresentation,
  scaleRgbaAlpha,
  type SolarEclipsePresentation,
} from "../core/eclipse/solarEclipseAppearance";
import {
  lunarHorizonBoundaryPolylines,
  lunarVisibilityPolarCloseLatDeg,
  lunarVisibilityRegionRing,
} from "../core/eclipse/lunarVisibilityGeometry";
import { sublunarPoint } from "../core/sublunarPoint";
import { SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED } from "../config/sceneLayerOrder";
import type { Layer, LayerState, TimeContext, UpdatePolicy } from "./types";
import {
  EQUIRECT_REGION_OVERLAY_KIND,
  type EquirectRegionAvoidCityLabel,
  type EquirectRegionAvoidDisc,
  type EquirectRegionFill,
  type EquirectRegionLabel,
  type EquirectRegionOverlayPayload,
  type EquirectRegionStroke,
} from "./equirectRegionPayload";

export const LUNAR_ECLIPSE_LAYER_ID = "layer.lunarEclipse.visibility";

const updatePolicy: UpdatePolicy = { type: "perFrame" };

function pushCurrentInstantMoonVisible(args: {
  moonLatDeg: number;
  moonLonDeg: number;
  showRegion: boolean;
  showBoundary: boolean;
  regionFill: string;
  boundaryStroke: string;
  boundaryWidthPx: number;
  fills: EquirectRegionFill[];
  strokes: EquirectRegionStroke[];
}): void {
  if (args.showRegion) {
    const ring = lunarVisibilityRegionRing(args.moonLatDeg, args.moonLonDeg);
    if (ring.length >= 4) {
      args.fills.push({
        ring,
        fill: args.regionFill,
        polarCloseLatDeg: lunarVisibilityPolarCloseLatDeg(args.moonLatDeg),
      });
    }
  }
  if (args.showBoundary) {
    for (const points of lunarHorizonBoundaryPolylines(args.moonLatDeg, args.moonLonDeg)) {
      if (points.length >= 2) {
        args.strokes.push({
          points,
          stroke: args.boundaryStroke,
          strokeWidthPx: args.boundaryWidthPx,
        });
      }
    }
  }
}

export function createLunarEclipseLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    presentation?: Partial<LunarEclipsePresentation> | Readonly<Record<string, unknown>>;
    alignment?: Partial<EclipseAlignmentPresentation> | Readonly<Record<string, unknown>>;
    labelsEnabled?: boolean;
    solarPresentation?: Partial<SolarEclipsePresentation> | Readonly<Record<string, unknown>>;
    /** Read-only city-name boxes for lunar event-label clearance. */
    cityLabelHints?: readonly EquirectRegionAvoidCityLabel[];
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const presentation = normalizeLunarEclipsePresentation(options.presentation);
  const solarPresentation = normalizeSolarEclipsePresentation(options.solarPresentation);
  const labelsEnabled = options.labelsEnabled !== false;
  const cityLabelHints = options.cityLabelHints ?? [];
  const lunarHorizonMs = forecastHorizonMsFromDays(presentation.forecastHorizonDays);
  const paint = resolveLunarEclipsePaint(presentation);
  return {
    id: LUNAR_ECLIPSE_LAYER_ID,
    name: "Lunar eclipses",
    enabled: true,
    zIndex,
    type: "vector",
    updatePolicy,
    getState(time: TimeContext): LayerState {
      const frame =
        time.eclipseFrame && time.eclipseFrame.lunarHorizonMs === lunarHorizonMs
          ? time.eclipseFrame
          : resolveEclipseFrame(time.now, {
              horizonMs: time.eclipseFrame?.horizonMs ?? 0,
              lunarHorizonMs,
            });
      const fills: EquirectRegionFill[] = [];
      const strokes: EquirectRegionStroke[] = [];
      const labels: EquirectRegionLabel[] = [];
      const labelAvoidDiscs: EquirectRegionAvoidDisc[] = [];
      const activeLunar = presentedActiveLunar(frame, presentation);
      const moon = sublunarPoint(time.now);
      if (frame.support.supported && activeLunar && frame.lunarGeometry) {
        pushCurrentInstantMoonVisible({
          moonLatDeg: moon.latDeg,
          moonLonDeg: moon.lonDeg,
          showRegion: presentation.showVisibilityRegion,
          showBoundary: presentation.showVisibilityBoundary,
          regionFill: paint.visibilityRegionFill,
          boundaryStroke: paint.visibilityBoundaryStroke,
          boundaryWidthPx: paint.visibilityBoundaryWidthPx,
          fills,
          strokes,
        });
      } else if (frame.support.supported && !activeLunar) {
        const nearest = presentedLunarForecastSelections(frame, presentation).find(
          (selection) => selection.nearestUpcoming,
        );
        if (nearest) {
          const regionFill = scaleRgbaAlpha(paint.visibilityRegionFill, nearest.prominence01);
          const boundaryStroke = scaleRgbaAlpha(
            paint.visibilityBoundaryStroke,
            nearest.prominence01,
          );
          pushCurrentInstantMoonVisible({
            moonLatDeg: moon.latDeg,
            moonLonDeg: moon.lonDeg,
            showRegion: presentation.showForecastVisibilityRegion,
            showBoundary: presentation.showForecastVisibilityBoundary,
            regionFill,
            boundaryStroke,
            boundaryWidthPx: paint.visibilityBoundaryWidthPx,
            fills,
            strokes,
          });
        }
      }
      if (labelsEnabled && frame.support.supported) {
        const primary = presentedPrimaryEclipse(frame, solarPresentation, presentation);
        if (primary?.kind === "lunar") {
          labels.push({
            ...lunarEclipseMapLabel({
              event: primary.event,
              lifecycle: primary.lifecycle,
              productUtcMs: frame.productUtcMs,
              latDeg: moon.latDeg,
              lonDeg: moon.lonDeg,
            }),
            placement: "lunar-glyph",
          });
          labelAvoidDiscs.push({
            latDeg: moon.latDeg,
            lonDeg: moon.lonDeg,
            haloMultiplier: 3.6,
          });
        }
      }
      const readabilityFrame = getOverlayReadabilityFrameOrCompute(time);
      const data: EquirectRegionOverlayPayload = {
        kind: EQUIRECT_REGION_OVERLAY_KIND,
        fills,
        strokes,
        ...(labels.length > 0
          ? {
              labels,
              labelAvoidDiscs,
              ...(cityLabelHints.length > 0 ? { labelAvoidCityLabels: cityLabelHints } : {}),
              ...(labels.length > 0
                ? {
                    labelPathHints: lunarHorizonBoundaryPolylines(
                      labels[0]!.latDeg,
                      labels[0]!.lonDeg,
                    ).map((points) => ({ points })),
                  }
                : {}),
            }
          : {}),
        readability: {
          nightVeil01: readabilityFrame.globalReadabilityVeil01,
          overlayReadabilityLiftScale01: readabilityFrame.substrateOverlayReadabilityLiftScale01,
        },
      };
      return { visible: true, opacity: op, data };
    },
  };
}
