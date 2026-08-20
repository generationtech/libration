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
 * Milky Way zenith ribbon in equirectangular scene space.
 * Canvas executes primitives only.
 */

import { parseCssColorToRgba8888 } from "../../color/contrastForegroundOnCssBackground";
import { PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID } from "../../config/productTextFont";
import { cityPinNameLabelScreenBox } from "../../layers/cityPinsPayload";
import { parallelYFromLatitudeDeg } from "../../core/equirectangularGridSampling";
import { mapXFromLongitudeDeg } from "../../core/equirectangularProjection";
import { astronomyPathStrokeWidthPx } from "../../core/astronomyOverlayStrokeAppearance";
import {
  eclipseMapLabelBox,
  placeEclipseMapLabel,
  type LabelAvoidBox,
  type LabelAvoidDisc,
  type LabelPathPolyline,
} from "../../core/eclipse/eclipseMapLabelPlacement";
import type { MilkyWayTaggedPoint } from "../../core/milkyWayGeometry";
import { effectiveOverlayReadabilityLiftVeil01 } from "../../layers/overlayReadabilityHints";
import type { MilkyWayPayload } from "../../layers/milkyWayPayload";
import { createDescriptorPathItem } from "./pathItemFactories";
import {
  galacticAnticenterGlyphPathDescriptor,
  galacticCenterGlyphPathDescriptor,
} from "./milkyWayGlyphPaths";
import type { RenderLineItem, RenderPlan, RenderTextItem } from "./renderPlanTypes";
import {
  adjustPairToShortStripPath,
  equirectXFromUnwrappedLon,
  unwrappedLongitudes,
} from "./equirectSeamPath";
import type { MilkyWayGcAltitudeContourDeg } from "../../core/milkyWayPresentation";
import {
  milkyWayVisibilityNightFactor,
  type MilkyWayVisibilitySample,
} from "../../core/milkyWayVisibilityGeometry";

const GALACTIC_CENTER_LABEL = "Galactic center";
const DAY_ALPHA = 0.28;
const NIGHT_ALPHA = 0.78;
const UNIFORM_ALPHA = 0.62;

const CONTOUR_BASE_ALPHA: Record<MilkyWayGcAltitudeContourDeg, number> = {
  0: 0.22,
  30: 0.35,
  45: 0.5,
  60: 0.68,
  75: 0.85,
};

const CONTOUR_WIDTH_MULT: Record<MilkyWayGcAltitudeContourDeg, number> = {
  0: 0.82,
  30: 0.9,
  45: 1,
  60: 1.08,
  75: 1.18,
};

function strokeRgba(css: string, alpha: number): string {
  const px = parseCssColorToRgba8888(css);
  if (!px) {
    return `rgba(200, 200, 200, ${alpha})`;
  }
  return `rgba(${px.r}, ${px.g}, ${px.b}, ${alpha})`;
}

function mapLatToY(latDeg: number, viewportHeightPx: number): number {
  return parallelYFromLatitudeDeg(latDeg, viewportHeightPx);
}

function segmentAlpha(aNight: boolean, bNight: boolean, emphasizeNight: boolean): number {
  if (!emphasizeNight) {
    return UNIFORM_ALPHA;
  }
  if (aNight && bNight) {
    return NIGHT_ALPHA;
  }
  if (!aNight && !bNight) {
    return DAY_ALPHA;
  }
  return (NIGHT_ALPHA + DAY_ALPHA) / 2;
}

function pushSeamAwarePolyline(
  items: RenderPlan["items"],
  points: readonly MilkyWayTaggedPoint[],
  w: number,
  h: number,
  colorCss: string,
  strokeWidthPx: number,
  alphaFn: (a: MilkyWayTaggedPoint, b: MilkyWayTaggedPoint) => number,
): void {
  if (points.length < 2) {
    return;
  }
  const lons = unwrappedLongitudes(points.map((p) => p.lonDeg));
  for (let i = 0; i < lons.length - 1; i += 1) {
    const raw0 = equirectXFromUnwrappedLon(lons[i]!, w);
    const raw1 = equirectXFromUnwrappedLon(lons[i + 1]!, w);
    const { x0, x1 } = adjustPairToShortStripPath(raw0, raw1, w);
    const y0 = mapLatToY(points[i]!.latDeg, h);
    const y1 = mapLatToY(points[i + 1]!.latDeg, h);
    if (!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(y0) || !Number.isFinite(y1)) {
      continue;
    }
    const line: RenderLineItem = {
      kind: "line",
      x1: x0,
      y1: y0,
      x2: x1,
      y2: y1,
      stroke: strokeRgba(colorCss, alphaFn(points[i]!, points[i + 1]!)),
      strokeWidthPx,
      lineCap: "round",
    };
    items.push(line);
  }
}

function visibilitySegmentAlpha(
  a: MilkyWayVisibilitySample,
  b: MilkyWayVisibilitySample,
  emphasizeNight: boolean,
  deemphasizeMoon: boolean,
  baseAlpha: number,
): number {
  const night = emphasizeNight
    ? (milkyWayVisibilityNightFactor(a.solarAltitudeDeg) +
        milkyWayVisibilityNightFactor(b.solarAltitudeDeg)) /
      2
    : 1;
  const moon = deemphasizeMoon ? (a.moonFactor + b.moonFactor) / 2 : 1;
  return baseAlpha * night * moon;
}

function pushVisibilityContour(
  items: RenderPlan["items"],
  points: readonly MilkyWayVisibilitySample[],
  w: number,
  h: number,
  colorCss: string,
  strokeWidthPx: number,
  baseAlpha: number,
  emphasizeNight: boolean,
  deemphasizeMoon: boolean,
  alphaScale: (alpha: number) => number,
): void {
  if (points.length < 2) {
    return;
  }
  const lons = unwrappedLongitudes(points.map((p) => p.lonDeg));
  for (let i = 0; i < lons.length - 1; i += 1) {
    const p0 = points[i]!;
    const p1 = points[i + 1]!;
    if (
      Math.abs(p0.latDeg) > 86 &&
      Math.abs(p1.latDeg) > 86 &&
      Math.abs(lons[i + 1]! - lons[i]!) > 20
    ) {
      continue;
    }
    const raw0 = equirectXFromUnwrappedLon(lons[i]!, w);
    const raw1 = equirectXFromUnwrappedLon(lons[i + 1]!, w);
    const { x0, x1 } = adjustPairToShortStripPath(raw0, raw1, w);
    const y0 = mapLatToY(p0.latDeg, h);
    const y1 = mapLatToY(p1.latDeg, h);
    if (!Number.isFinite(x0) || !Number.isFinite(x1) || !Number.isFinite(y0) || !Number.isFinite(y1)) {
      continue;
    }
    if (Math.abs(x1 - x0) > w * 0.48) {
      continue;
    }
    const line: RenderLineItem = {
      kind: "line",
      x1: x0,
      y1: y0,
      x2: x1,
      y2: y1,
      stroke: strokeRgba(
        colorCss,
        alphaScale(visibilitySegmentAlpha(p0, p1, emphasizeNight, deemphasizeMoon, baseAlpha)),
      ),
      strokeWidthPx,
      lineCap: "round",
    };
    items.push(line);
  }
}

function screenPolyline(points: readonly MilkyWayTaggedPoint[], w: number, h: number): LabelPathPolyline {
  return {
    points: points.map((p) => ({
      x: mapXFromLongitudeDeg(p.lonDeg, w),
      y: mapLatToY(p.latDeg, h),
    })),
  };
}

export interface MilkyWayRenderPlanOptions {
  viewportWidthPx: number;
  viewportHeightPx: number;
  layerOpacity: number;
  payload: MilkyWayPayload;
}

/**
 * Build order: band edges, ribs, Galactic plane, visibility contours, glyphs, labels.
 */
export function buildMilkyWayRenderPlan(options: MilkyWayRenderPlanOptions): RenderPlan {
  const w = options.viewportWidthPx;
  const h = options.viewportHeightPx;
  if (!(w > 0) || !(h > 0)) {
    return { items: [] };
  }
  if (!options.payload.supported) {
    return { items: [] };
  }
  const eventLabel = options.payload.eventLabel;
  if (!options.payload.geometry && !eventLabel) {
    return { items: [] };
  }
  const op = Math.max(0, Math.min(1, options.layerOpacity));
  if (op <= 0) {
    return { items: [] };
  }
  const veil = effectiveOverlayReadabilityLiftVeil01(
    options.payload.readability?.nightVeil01,
    options.payload.readability?.overlayReadabilityLiftScale01,
  );
  const a = (alpha: number) => Math.min(0.92 * op, alpha * op * (1 + 0.22 * veil));
  const pres = options.payload.presentation;
  const geom = options.payload.geometry;
  const emphasize = pres.emphasizeNightSide;
  const items: RenderPlan["items"] = [];

  const alphaFor = (p0: MilkyWayTaggedPoint, p1: MilkyWayTaggedPoint) =>
    a(segmentAlpha(p0.night, p1.night, emphasize));

  if (geom) {
  const planeWidth = astronomyPathStrokeWidthPx(veil, pres.planeThickness);
  const bandWidth = Math.max(0.7, astronomyPathStrokeWidthPx(veil, pres.bandThickness) * 0.85);

  if (pres.bandEnabled) {
    pushSeamAwarePolyline(items, geom.northEdge, w, h, pres.bandColor, bandWidth, alphaFor);
    pushSeamAwarePolyline(items, geom.southEdge, w, h, pres.bandColor, bandWidth, alphaFor);
  }
  if (pres.ribsEnabled && pres.bandEnabled) {
    for (const rib of geom.ribs) {
      pushSeamAwarePolyline(items, rib.points, w, h, pres.bandColor, bandWidth, alphaFor);
    }
  }
  if (pres.planeEnabled) {
    pushSeamAwarePolyline(items, geom.plane, w, h, pres.planeColor, planeWidth, alphaFor);
  }

  const vis = options.payload.visibility;
  if (pres.visibilityContoursEnabled && vis) {
    const visWidth = astronomyPathStrokeWidthPx(veil, pres.visibilityThickness);
    for (const contour of vis.contours) {
      pushVisibilityContour(
        items,
        contour.points,
        w,
        h,
        pres.visibilityColor,
        Math.max(0.7, visWidth * CONTOUR_WIDTH_MULT[contour.altitudeDeg]),
        CONTOUR_BASE_ALPHA[contour.altitudeDeg],
        pres.emphasizeAstronomicalNight,
        pres.deemphasizeMoonlight,
        a,
      );
    }
    if (pres.showVisibilityContourLabels) {
      const contourLabelSize = Math.min(10, Math.max(7, w * 0.011));
      const preferredLon = vis.galacticCenter.lonDeg + 50;
      for (const contour of vis.contours) {
        const unique = contour.points.slice(0, Math.max(0, contour.points.length - 1));
        let best: MilkyWayVisibilitySample | null = null;
        let bestScore = Infinity;
        for (const p of unique) {
          if (Math.abs(p.latDeg) > 72) {
            continue;
          }
          const dLon = Math.abs(((p.lonDeg - preferredLon + 540) % 360) - 180);
          const score = dLon + Math.abs(p.latDeg) * 0.15;
          if (score < bestScore) {
            bestScore = score;
            best = p;
          }
        }
        if (!best) {
          continue;
        }
        const lx = mapXFromLongitudeDeg(best.lonDeg, w);
        const ly = mapLatToY(best.latDeg, h);
        if (!Number.isFinite(lx) || !Number.isFinite(ly)) {
          continue;
        }
        const label = `${contour.altitudeDeg}°`;
        const text: RenderTextItem = {
          kind: "text",
          x: lx + 4,
          y: ly - 3,
          text: label,
          fill: strokeRgba(pres.visibilityColor, a(0.78)),
          font: {
            assetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
            displayName: "Renderer default",
            sizePx: contourLabelSize,
            weight: 500,
            style: "normal",
          },
          textAlign: "left",
          textBaseline: "bottom",
          stroke: {
            color: `rgba(12, 20, 28, ${a(0.62)})`,
            widthPx: Math.max(1.6, contourLabelSize * 0.24),
            lineJoin: "round",
            miterLimit: 2,
          },
          opacity: op,
        };
        items.push(text);
      }
    }
  }
  }

  const glyphScale = Math.min(9, Math.max(4.6, 5.2 * Math.max(0.7, w / 1400)));
  const placedGlyphs: LabelAvoidDisc[] = [];
  const avoidPaths: LabelPathPolyline[] = [];
  if (geom && pres.planeEnabled && geom.plane.length >= 2) {
    avoidPaths.push(screenPolyline(geom.plane, w, h));
  }
  if (geom && pres.bandEnabled && geom.northEdge.length >= 2) {
    avoidPaths.push(screenPolyline(geom.northEdge, w, h));
    avoidPaths.push(screenPolyline(geom.southEdge, w, h));
  }
  const visForAvoid = options.payload.visibility;
  if (pres.visibilityContoursEnabled && visForAvoid) {
    for (const contour of visForAvoid.contours) {
      if (contour.points.length >= 2) {
        avoidPaths.push(
          screenPolyline(
            contour.points.map((p) => ({
              latDeg: p.latDeg,
              lonDeg: p.lonDeg,
              night: true,
              lDeg: 0,
            })),
            w,
            h,
          ),
        );
      }
    }
  }

  const drawGlyph = (
    point: MilkyWayTaggedPoint,
    kind: "center" | "anticenter",
    colorCss: string,
  ): { x: number; y: number; r: number } | null => {
    const gx = mapXFromLongitudeDeg(point.lonDeg, w);
    const gy = mapLatToY(point.latDeg, h);
    if (!Number.isFinite(gx) || !Number.isFinite(gy)) {
      return null;
    }
    const scale = kind === "center" ? glyphScale : glyphScale * 0.72;
    const pathDescriptor =
      kind === "center"
        ? galacticCenterGlyphPathDescriptor(gx, gy, scale)
        : galacticAnticenterGlyphPathDescriptor(gx, gy, scale);
    const nightBoost = emphasize ? (point.night ? 0.96 : 0.42) : 0.88;
    items.push(
      createDescriptorPathItem({
        pathDescriptor,
        stroke: strokeRgba(colorCss, a(nightBoost)),
        strokeWidthPx: kind === "center" ? 1.35 : 1.05,
      }),
    );
    placedGlyphs.push({ x: gx, y: gy, radiusPx: scale + 3 });
    return { x: gx, y: gy, r: scale };
  };

  let centerScreen: { x: number; y: number; r: number } | null = null;
  if (geom) {
    if (pres.galacticCenterEnabled && geom.galacticCenter) {
      centerScreen = drawGlyph(geom.galacticCenter, "center", pres.planeColor);
    }
    if (pres.galacticAnticenterEnabled && geom.galacticAnticenter) {
      drawGlyph(geom.galacticAnticenter, "anticenter", pres.bandColor);
    }
  }

  const cityAvoidBoxes: LabelAvoidBox[] = (options.payload.labelAvoidCityLabels ?? []).map((city) =>
    cityPinNameLabelScreenBox({
      pinX: mapXFromLongitudeDeg(city.lonDeg, w),
      pinY: mapLatToY(city.latDeg, h),
      name: city.name,
      viewportWidthPx: w,
    }),
  );

  if (pres.galacticCenterEnabled && pres.galacticCenterLabelEnabled && centerScreen) {
    const labelSize = Math.min(11, Math.max(8, w * 0.012));
    const placed = placeEclipseMapLabel({
      preferredX: centerScreen.x,
      preferredY: centerScreen.y,
      text: GALACTIC_CENTER_LABEL,
      sizePx: labelSize,
      viewportWidthPx: w,
      viewportHeightPx: h,
      avoidDiscs: placedGlyphs,
      avoidPolylines: avoidPaths,
      avoidBoxes: cityAvoidBoxes,
      placement: "lunar-glyph",
    });
    const text: RenderTextItem = {
      kind: "text",
      x: placed.x,
      y: placed.y,
      text: GALACTIC_CENTER_LABEL,
      fill: strokeRgba(pres.planeColor, a(0.94)),
      font: {
        assetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
        displayName: "Renderer default",
        sizePx: labelSize,
        weight: 500,
        style: "normal",
      },
      textAlign: placed.textAlign,
      textBaseline: placed.textBaseline === "middle" ? "middle" : placed.textBaseline,
      stroke: {
        color: `rgba(12, 20, 28, ${a(0.7)})`,
        widthPx: Math.max(2, labelSize * 0.28),
        lineJoin: "round",
        miterLimit: 2,
      },
      opacity: op,
    };
    items.push(text);
    cityAvoidBoxes.push(
      eclipseMapLabelBox(
        placed.x,
        placed.y,
        GALACTIC_CENTER_LABEL,
        labelSize,
        placed.textAlign,
        placed.textBaseline,
      ),
    );
  }

  if (eventLabel && eventLabel.text.trim()) {
    const preferredX = mapXFromLongitudeDeg(eventLabel.lonDeg, w);
    const preferredY = mapLatToY(eventLabel.latDeg, h);
    if (Number.isFinite(preferredX) && Number.isFinite(preferredY)) {
      const avoidDiscs = [...placedGlyphs];
      if (avoidDiscs.length === 0) {
        const r = Math.min(9, Math.max(4.6, 5.2 * Math.max(0.7, w / 1400))) + 3;
        avoidDiscs.push({ x: preferredX, y: preferredY, radiusPx: r });
      }
      const labelSize = Math.min(11, Math.max(8, w * 0.012));
      const placed = placeEclipseMapLabel({
        preferredX,
        preferredY,
        text: eventLabel.text,
        sizePx: labelSize,
        viewportWidthPx: w,
        viewportHeightPx: h,
        avoidDiscs,
        avoidPolylines: avoidPaths,
        avoidBoxes: cityAvoidBoxes,
        placement: "lunar-glyph",
      });
      items.push({
        kind: "text",
        x: placed.x,
        y: placed.y,
        text: eventLabel.text,
        fill: strokeRgba(pres.planeColor, a(0.96)),
        font: {
          assetId: PRODUCT_TEXT_RENDERER_DEFAULT_FONT_ASSET_ID,
          displayName: "Renderer default",
          sizePx: labelSize,
          weight: 500,
          style: "normal",
        },
        textAlign: placed.textAlign,
        textBaseline: placed.textBaseline === "middle" ? "middle" : placed.textBaseline,
        stroke: {
          color: `rgba(12, 20, 28, ${a(0.72)})`,
          widthPx: Math.max(2, labelSize * 0.28),
          lineJoin: "round",
          miterLimit: 2,
        },
        opacity: op,
      });
    }
  }

  return { items };
}
