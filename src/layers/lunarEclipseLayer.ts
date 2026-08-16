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
import { subsolarPoint } from "../core/subsolarPoint";
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
  type EquirectRegionFill,
  type EquirectRegionLabel,
  type EquirectRegionOverlayPayload,
  type EquirectRegionStroke,
} from "./equirectRegionPayload";

export const LUNAR_ECLIPSE_LAYER_ID = "layer.lunarEclipse.visibility";

const updatePolicy: UpdatePolicy = { type: "perFrame" };
const PENUMBRAL_FORECAST_SCALE = 0.75;

export function createLunarEclipseLayer(
  options: {
    zIndex?: number;
    opacity?: number;
    presentation?: Partial<LunarEclipsePresentation> | Readonly<Record<string, unknown>>;
    alignment?: Partial<EclipseAlignmentPresentation> | Readonly<Record<string, unknown>>;
    labelsEnabled?: boolean;
    solarPresentation?: Partial<SolarEclipsePresentation> | Readonly<Record<string, unknown>>;
  } = {},
): Layer {
  const zIndex = options.zIndex ?? SCENE_LAYER_Z_INDEX_WHEN_UNSCOPED;
  const op = options.opacity ?? 1;
  const presentation = normalizeLunarEclipsePresentation(options.presentation);
  const solarPresentation = normalizeSolarEclipsePresentation(options.solarPresentation);
  const alignment = normalizeEclipseAlignmentPresentation(options.alignment);
  const labelsEnabled = options.labelsEnabled !== false;
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
      const activeLunar = presentedActiveLunar(frame, presentation);
      if (frame.support.supported && activeLunar && frame.lunarGeometry) {
        const moon = sublunarPoint(time.now);
        const sun = subsolarPoint(time.now);
        if (presentation.showVisibilityRegion) {
          const ring = lunarVisibilityRegionRing(moon.latDeg, moon.lonDeg);
          if (ring.length >= 4) {
            fills.push({
              ring,
              fill: paint.visibilityRegionFill,
              polarCloseLatDeg: lunarVisibilityPolarCloseLatDeg(moon.latDeg),
            });
          }
        }
        const alignmentView = buildEclipseAlignmentPresentation({
          frame,
          alignment,
          solarLayerEnabled: false,
          lunarLayerEnabled: true,
          subsolar: { latDeg: sun.latDeg, lonDeg: sun.lonDeg },
          sublunar: { latDeg: moon.latDeg, lonDeg: moon.lonDeg },
        });
        if (alignmentView.lunar) {
          for (const band of alignmentView.lunar.bands) {
            if (band.ring.length >= 4) {
              fills.push({ ring: band.ring, fill: band.fill });
            }
          }
          for (const s of alignmentView.lunar.strokes) {
            if (s.points.length >= 2) {
              strokes.push({
                points: s.points,
                stroke: s.stroke,
                strokeWidthPx: s.strokeWidthPx,
              });
            }
          }
        }
        if (presentation.showVisibilityBoundary) {
          for (const points of lunarHorizonBoundaryPolylines(moon.latDeg, moon.lonDeg)) {
            if (points.length >= 2) {
              strokes.push({
                points,
                stroke: paint.visibilityBoundaryStroke,
                strokeWidthPx: paint.visibilityBoundaryWidthPx,
              });
            }
          }
        }
      } else if (frame.support.supported && !activeLunar) {
        const nearest = presentedLunarForecastSelections(frame, presentation).find(
          (selection) => selection.nearestUpcoming,
        );
        if (nearest) {
          const penumbralScale = nearest.event.subtype === "penumbral" ? PENUMBRAL_FORECAST_SCALE : 1;
          const regionFill = scaleRgbaAlpha(
            scaleRgbaAlpha(paint.forecastVisibilityRegionFill, nearest.prominence01),
            penumbralScale,
          );
          const boundaryStroke = scaleRgbaAlpha(
            scaleRgbaAlpha(paint.forecastVisibilityBoundaryStroke, nearest.prominence01),
            penumbralScale,
          );
          if (
            presentation.showForecastVisibilityRegion &&
            nearest.geometry.moonVisibleRegion.length >= 4
          ) {
            fills.push({
              ring: nearest.geometry.moonVisibleRegion,
              fill: regionFill,
              polarCloseLatDeg: nearest.geometry.polarCloseLatDeg,
            });
          }
          if (presentation.showForecastVisibilityBoundary) {
            for (const points of lunarHorizonBoundaryPolylines(
              nearest.geometry.zenithLatDeg,
              nearest.geometry.zenithLonDeg,
            )) {
              if (points.length >= 2) {
                strokes.push({
                  points,
                  stroke: boundaryStroke,
                  strokeWidthPx: paint.visibilityBoundaryWidthPx,
                });
              }
            }
          }
        }
      }
      if (labelsEnabled && frame.support.supported) {
        const primary = presentedPrimaryEclipse(frame, solarPresentation, presentation);
        if (primary?.kind === "lunar") {
          const moon = sublunarPoint(time.now);
          labels.push(
            lunarEclipseMapLabel({
              event: primary.event,
              lifecycle: primary.lifecycle,
              productUtcMs: frame.productUtcMs,
              latDeg:
                primary.lifecycle === "active" ? moon.latDeg : primary.event.zenithLatDeg,
              lonDeg:
                primary.lifecycle === "active" ? moon.lonDeg : primary.event.zenithLonDeg,
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
